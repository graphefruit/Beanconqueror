import { DestroyRef, DOCUMENT, inject, NgZone, Service } from '@angular/core';

/** Overlays that hold focus while they are open; toasts never take it. */
const OVERLAYS =
  'ion-modal, ion-popover, ion-alert, ion-action-sheet, ion-loading';

const OVERLAY_EVENT_PREFIXES = [
  'ionModal',
  'ionPopover',
  'ionAlert',
  'ionActionSheet',
  'ionLoading',
];

const PRESENT_EVENTS = OVERLAY_EVENT_PREFIXES.map((p) => `${p}WillPresent`);
const DISMISS_EVENTS = OVERLAY_EVENT_PREFIXES.map((p) => `${p}DidDismiss`);

/** What can take focus, also when it is not in the tab order. */
const FOCUSABLE =
  'a[href], button, input, select, textarea, [tabindex], .ion-focusable';

const LEVEL_1_HEADING = 'h1, [role="heading"][aria-level="1"]';

/**
 * How long after a tap an overlay that opens counts as opened by it; enough
 * for a dialog built after an await, short of the next tap.
 */
const TAP_OPENS_WITHIN_MS = 1000;

/** On screen and not hidden from assistive technology. */
function isShown(element: Element): boolean {
  return (
    element.isConnected &&
    element.getClientRects().length > 0 &&
    !element.closest('[aria-hidden="true"], [inert], .ion-page-hidden')
  );
}

const OPEN_OVERLAY = `:is(${OVERLAYS}):not(.overlay-hidden)`;

/** Whether `root` holds an overlay that is open or still opening. */
function hasOpenOverlay(root: ParentNode): boolean {
  return root.querySelector(OPEN_OVERLAY) !== null;
}

/** The title of the screen on show, outside the overlays. */
function shownHeading(root: ParentNode): HTMLElement | undefined {
  return [...root.querySelectorAll<HTMLElement>(LEVEL_1_HEADING)].find(
    (heading) => !heading.closest(OVERLAYS) && isShown(heading),
  );
}

/**
 * The element with focus, also inside the shadow root of a component, e.g.
 * the link ion-item renders; its host cannot take focus itself.
 */
function focusedElement(document: Document): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

/** `element`, or the host in the page whose shadow tree holds it. */
function inPage(element: Element): Element {
  let node = element;
  for (
    let root = node.getRootNode();
    root instanceof ShadowRoot;
    root = node.getRootNode()
  ) {
    node = root.host;
  }
  return node;
}

/** Moves focus to `element`; false when it cannot take it. */
function moveFocus(element: HTMLElement, document: Document): boolean {
  const host = inPage(element);
  if (!isShown(host)) {
    return false;
  }
  element.focus({ preventScroll: true });
  return host.contains(document.activeElement);
}

/** The control a click went to: the first one on its path that takes focus. */
function clickedControl(event: Event): HTMLElement | undefined {
  return event
    .composedPath()
    .find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.matches(FOCUSABLE),
    );
}

function focusHeading(heading: HTMLElement, document: Document): void {
  if (!heading.hasAttribute('tabindex')) {
    heading.tabIndex = -1;
  }
  moveFocus(heading, document);
}

/**
 * Puts focus where a screen reader user expects it after a change of screen
 * or the end of a dialog; focus left on a screen that is gone would start
 * them over at the top or nowhere.
 *
 * - A new screen: its title, the level-1 heading, so its name is read out.
 * - Back on a screen: the control that led away from it, e.g. the list entry.
 * - A tab of the tab bar: the tab keeps focus, as in the tabs pattern.
 * - A dialog closed: Ionic gives focus back to the control that had focus
 *   when it opened. WebKit does not focus a button that is tapped, nor does
 *   VoiceOver on iOS when it activates one, so there Ionic has nothing to
 *   give it back to: the control last clicked or focused before the dialog
 *   opened takes it then, if it was tapped just before or still had focus.
 *   If that control is gone with a menu that opened the dialog, the control
 *   that opened the menu does; if that is gone too, e.g. the card of an entry
 *   just deleted, the title of the screen. A dialog the app opened by itself,
 *   e.g. a wait, leaves focus where it is.
 *
 * Nothing is announced through the live region: moving focus makes the
 * screen reader read the title, and an announcement would repeat it.
 */
@Service()
export class PageFocusService {
  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  /** Per screen, the element that had focus when the user left it. */
  private readonly lastFocus = new WeakMap<Element, HTMLElement>();
  /** A screen was left and the one entered still needs focus. */
  private navigating = false;
  /** The control last clicked or focused. */
  private lastControl: HTMLElement | undefined;
  /** When the last click came, from `performance.now()`. */
  private lastClickAt = Number.NEGATIVE_INFINITY;
  /** Per overlay, the control that opened it; null when none did. */
  private readonly openedBy = new WeakMap<Element, HTMLElement | null>();
  /**
   * Focus moved to a screen that is still coming in: the screen, the element
   * that had focus before and the one remembered for the screen.
   */
  private entering:
    | {
        page: HTMLElement;
        before: Element | null;
        remembered: HTMLElement | undefined;
      }
    | undefined;

  public start(): void {
    const listeners: [string, (event: Event) => void][] = [
      ['ionViewWillLeave', this.onViewWillLeave],
      ['ionViewWillEnter', this.onViewEnter],
      ['ionViewDidEnter', this.onViewEnter],
      ['ionNavDidChange', this.onNavDidChange],
      ['click', this.onClick],
      ['focusin', this.onFocusIn],
      ...PRESENT_EVENTS.map((type): [string, (event: Event) => void] => [
        type,
        this.onPresent,
      ]),
      ...DISMISS_EVENTS.map((type): [string, (event: Event) => void] => [
        type,
        this.onDismissed,
      ]),
    ];
    // Focus is no Angular state; no change detection needed.
    this.zone.runOutsideAngular(() => {
      for (const [type, listener] of listeners) {
        // Capture: the view events do not bubble.
        this.document.addEventListener(type, listener, true);
      }
    });
    this.destroyRef.onDestroy(() => {
      for (const [type, listener] of listeners) {
        this.document.removeEventListener(type, listener, true);
      }
    });
  }

  private readonly onViewWillLeave = (event: Event): void => {
    const page = event.target;
    if (!(page instanceof HTMLElement)) {
      return;
    }
    this.navigating = true;
    const active = focusedElement(this.document);
    if (active instanceof HTMLElement && page.contains(inPage(active))) {
      this.lastFocus.set(page, active);
    }
  };

  /**
   * Focus moves as the screen starts to come in, while the screen left is
   * still shown. Moved once the transition is over, TalkBack on Android ends
   * up on the whole screen: Ionic hides the screen left then, with the control
   * TalkBack was on. A screen whose title is not there yet gets focus once it
   * is in.
   */
  private readonly onViewEnter = (event: Event): void => {
    const page = event.target;
    if (event.type === 'ionViewDidEnter') {
      this.entering = undefined;
    }
    if (!this.navigating || !(page instanceof HTMLElement)) {
      return;
    }
    const active = this.document.activeElement;
    if (
      active?.closest('ion-tab-bar') ||
      hasOpenOverlay(this.document) ||
      (active !== this.document.body && page.contains(active))
    ) {
      this.navigating = false;
      return;
    }
    const before = focusedElement(this.document);
    const remembered = this.lastFocus.get(page);
    this.lastFocus.delete(page);
    if (remembered && moveFocus(remembered, this.document)) {
      this.navigating = false;
    } else {
      const heading = shownHeading(page);
      // A screen that holds the screen entered next, e.g. the tabs, has no
      // title of its own yet; the next one entered gets focus then.
      if (!heading) {
        return;
      }
      this.navigating = false;
      focusHeading(heading, this.document);
    }
    if (event.type === 'ionViewWillEnter') {
      this.entering = { page, before, remembered };
    }
  };

  /**
   * The end of a transition. A swipe back the user lets go of early fires
   * `ionViewWillEnter` but no `ionViewDidEnter`, and Ionic hides the screen
   * again that had focus already: focus goes back where it was.
   */
  private readonly onNavDidChange = (): void => {
    const entering = this.entering;
    this.entering = undefined;
    if (!entering || isShown(entering.page)) {
      return;
    }
    if (entering.remembered) {
      this.lastFocus.set(entering.page, entering.remembered);
    }
    if (
      entering.before instanceof HTMLElement &&
      entering.before !== this.document.body &&
      moveFocus(entering.before, this.document)
    ) {
      return;
    }
    const heading = shownHeading(this.document);
    if (heading) {
      focusHeading(heading, this.document);
    }
  };

  private readonly onClick = (event: Event): void => {
    const control = clickedControl(event);
    const active = focusedElement(this.document);
    this.lastClickAt = performance.now();
    // ion-input passes a click on its field on to itself, which then goes to
    // the item around it: the field with focus stays the control.
    this.lastControl =
      active instanceof HTMLElement && control?.contains(active)
        ? active
        : control;
  };

  private readonly onFocusIn = (event: Event): void => {
    const target = event.composedPath()[0];
    if (target instanceof HTMLElement) {
      this.lastControl = target;
    }
  };

  private readonly onPresent = (event: Event): void => {
    const overlay = event.target;
    if (!(overlay instanceof Element)) {
      return;
    }
    const control = this.lastControl;
    this.openedBy.set(
      overlay,
      control &&
        !overlay.contains(inPage(control)) &&
        (performance.now() - this.lastClickAt <= TAP_OPENS_WITHIN_MS ||
          control === focusedElement(this.document) ||
          this.openerOfOpenOverlay(control))
        ? control
        : null,
    );
  };

  /** After Ionic has given focus back, which it does once closed. */
  private readonly onDismissed = (event: Event): void => {
    const overlay = event.target;
    setTimeout(() => {
      const active = this.document.activeElement;
      const opener =
        overlay instanceof Element ? this.openedBy.get(overlay) : undefined;
      if (
        (active &&
          active !== this.document.body &&
          isShown(active) &&
          // As the dialog above closes, focus can land on the host of the
          // dialog under it (Ionic when that one finishes opening late,
          // WebKit when the focused dialog is removed): not a real choice.
          !(
            opener &&
            active.matches(OVERLAYS) &&
            active.contains(inPage(opener))
          )) ||
        (overlay instanceof Element &&
          (this.openedBy.get(overlay) === null || this.focusOpener(overlay))) ||
        hasOpenOverlay(this.document)
      ) {
        return;
      }
      const heading = shownHeading(this.document);
      if (heading) {
        focusHeading(heading, this.document);
      }
    });
  };

  /**
   * Whether `control` opened an overlay still open, e.g. the wait while
   * saving, under which an error message can come long after the tap.
   */
  private openerOfOpenOverlay(control: HTMLElement): boolean {
    return [...this.document.querySelectorAll(OPEN_OVERLAY)].some(
      (overlay) => this.openedBy.get(overlay) === control,
    );
  }

  /**
   * Focuses the control that opened `overlay`, or, when that control was in a
   * menu that is gone now, the control that opened the menu.
   */
  private focusOpener(overlay: Element): boolean {
    // An inline overlay opened again could otherwise lead in a circle.
    const seen = new Set<Element>();
    let current: Element | null = overlay;
    while (current && !seen.has(current)) {
      seen.add(current);
      const control = this.openedBy.get(current);
      if (!control) {
        return false;
      }
      if (moveFocus(control, this.document)) {
        return true;
      }
      current = inPage(control).closest(OVERLAYS);
    }
    return false;
  }
}
