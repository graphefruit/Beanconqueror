import { DestroyRef, DOCUMENT, inject, NgZone, Service } from '@angular/core';

/** Overlays that hold focus while they are open; toasts never take it. */
const OVERLAYS =
  'ion-modal, ion-popover, ion-alert, ion-action-sheet, ion-loading';

const DISMISS_EVENTS = [
  'ionModalDidDismiss',
  'ionPopoverDidDismiss',
  'ionAlertDidDismiss',
  'ionActionSheetDidDismiss',
  'ionLoadingDidDismiss',
];

const LEVEL_1_HEADING = 'h1, [role="heading"][aria-level="1"]';

/** On screen and not hidden from assistive technology. */
function isShown(element: Element): boolean {
  return (
    element.isConnected &&
    element.getClientRects().length > 0 &&
    !element.closest('[aria-hidden="true"], [inert], .ion-page-hidden')
  );
}

/** Whether `root` holds an overlay that is open or still opening. */
function hasOpenOverlay(root: ParentNode): boolean {
  return root.querySelector(`:is(${OVERLAYS}):not(.overlay-hidden)`) !== null;
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
 * - A dialog closed: Ionic gives focus back to the control that opened it.
 *   If that control is gone, e.g. the card of an entry just deleted, the
 *   title of the screen takes it.
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

  public start(): void {
    const listeners: [string, (event: Event) => void][] = [
      ['ionViewWillLeave', this.onViewWillLeave],
      ['ionViewDidEnter', this.onViewDidEnter],
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

  private readonly onViewDidEnter = (event: Event): void => {
    const page = event.target;
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
    const remembered = this.lastFocus.get(page);
    this.lastFocus.delete(page);
    if (remembered && moveFocus(remembered, this.document)) {
      this.navigating = false;
      return;
    }
    const heading = shownHeading(page);
    // A screen that holds the screen entered next, e.g. the tabs, has no
    // title of its own yet; the next one entered gets focus then.
    if (heading) {
      this.navigating = false;
      focusHeading(heading, this.document);
    }
  };

  /** After Ionic has given focus back, which it does once closed. */
  private readonly onDismissed = (): void => {
    setTimeout(() => {
      const active = this.document.activeElement;
      if (
        hasOpenOverlay(this.document) ||
        (active && active !== this.document.body && isShown(active))
      ) {
        return;
      }
      const heading = shownHeading(this.document);
      if (heading) {
        focusHeading(heading, this.document);
      }
    });
  };
}
