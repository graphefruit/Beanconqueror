import {
  DestroyRef,
  DOCUMENT,
  inject,
  Injectable,
  NgZone,
} from '@angular/core';

/**
 * Ionic overlays that are modal, with the prefix of their lifecycle events
 * (`ionModalWillPresent`, `ionAlertDidDismiss`, …). Selects, date pickers and
 * the app's loading message open one of these. Toasts are status messages that
 * never take focus and are left out.
 */
const MODAL_OVERLAY_EVENT_PREFIXES: Readonly<Record<string, string>> = {
  'ion-modal': 'ionModal',
  'ion-popover': 'ionPopover',
  'ion-alert': 'ionAlert',
  'ion-action-sheet': 'ionActionSheet',
  'ion-loading': 'ionLoading',
  'ion-picker-legacy': 'ionPicker',
};

const MODAL_OVERLAYS = Object.keys(MODAL_OVERLAY_EVENT_PREFIXES).join(',');

/** All overlay hosts, toasts included, to tell the page apart from them. */
const ALL_OVERLAYS = `${MODAL_OVERLAYS},ion-toast`;

const LIFECYCLE_EVENTS = Object.values(MODAL_OVERLAY_EVENT_PREFIXES).flatMap(
  (prefix) =>
    ['WillPresent', 'DidPresent', 'WillDismiss', 'DidDismiss'].map(
      (phase) => prefix + phase,
    ),
);

/** Children of the overlay root that are never rendered. */
const UNRENDERED = new Set(['LINK', 'META', 'SCRIPT', 'STYLE', 'TEMPLATE']);

/** Marks the focus guards, which are neither overlay nor page. */
const FOCUS_GUARD = 'data-overlay-focus-guard';

/** What Ionic hides behind an overlay that blocks the page. */
const VIEW_CONTAINER = 'ion-router-outlet, #ion-view-container-root';

/** On the content of an ion-menu from the start of opening until it is closed. */
const BEHIND_SIDE_MENU = 'menu-content-open';

const CONCEALING_ATTRIBUTES = ['aria-hidden', 'inert'] as const;
type ConcealingAttribute = (typeof CONCEALING_ATTRIBUTES)[number];
type SavedAttributes = Record<ConcealingAttribute, string | null>;

/** Properties of an Ionic overlay host that decide how it stacks. */
interface OverlayHost extends HTMLElement {
  /** Rises with every overlay created or moved; Ionic's z-index follows it. */
  overlayIndex?: number;
  showBackdrop?: boolean;
  backdropBreakpoint?: number;
  focusTrap?: boolean;
}

/**
 * Same rule as Ionic's for hiding the page: without a backdrop, with a
 * backdrop only above a breakpoint or without focus trap, the content behind
 * the overlay stays usable.
 */
function blocksWhatIsBehind(overlay: OverlayHost): boolean {
  return (
    overlay.focusTrap !== false &&
    overlay.showBackdrop !== false &&
    !((overlay.backdropBreakpoint ?? 0) > 0)
  );
}

function stackLevel(overlay: OverlayHost): number {
  return overlay.overlayIndex ?? 0;
}

/**
 * The page next to the overlays: everything in the root Ionic presents
 * overlays in (ion-app) that is not an overlay itself.
 */
function pageLayers(root: Element): Element[] {
  return [...root.children].filter(
    (child) =>
      !child.matches(ALL_OVERLAYS) &&
      !child.hasAttribute(FOCUS_GUARD) &&
      !UNRENDERED.has(child.tagName),
  );
}

/** The child of `root` that is or holds `element`, if it is in `root`. */
function childOfRootHolding(root: Element, element: Element): Element | null {
  let current: Element | null = element;
  while (current && current.parentElement !== root) {
    current = current.parentElement;
  }
  return current;
}

/**
 * Keeps assistive technology on the overlay on top.
 *
 * Ionic hides the page behind an open overlay (aria-hidden on the router
 * outlet) but leaves every other open overlay in the accessibility tree. With
 * stacked dialogs, VoiceOver and TalkBack then read the dialog underneath, for
 * example when the user touches the empty space above a sheet or has the
 * screen read from the top. This service makes everything below the topmost
 * modal overlay inert and aria-hidden: the overlays underneath and the page
 * next to them (split pane with menu, router outlet and tab bar), which Ionic
 * hides only partly and without inert.
 *
 * When the overlay on top starts to close, the layer below gets its previous
 * attribute values back, before Ionic returns focus to the element that opened
 * the overlay. The stack follows Ionic's lifecycle events and its stacking
 * order (`overlayIndex`). A mutation observer notices overlays that leave the
 * DOM without an event and restores the attributes when Ionic removes them
 * from a covered overlay, which it does whenever an overlay finishes opening.
 * Once no blocking overlay is open any more, the view container Ionic hides
 * is shown again in case Ionic has left it hidden.
 *
 * Tab past the last control of a modal or popover, or Shift+Tab before the
 * first, moves focus out of it, and only then does Ionic pull focus back to
 * the other end. Alerts, action sheets and loading messages have focusable
 * guards of their own for this; modals and popovers rely on focus landing
 * outside. With everything else inert, focus would leave the document
 * instead, and Tab could not bring it back: the overlay's host has tabindex
 * -1, which keeps the tab order from entering it from outside. So two empty
 * guards, focusable but hidden from assistive technology, sit right before
 * and after such an overlay on top.
 */
@Injectable({
  providedIn: 'root',
})
export class OverlayStackA11yService {
  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  /** Overlays from willPresent until didDismiss. */
  private readonly presented = new Set<OverlayHost>();
  /** Presented overlays that are closing (after willDismiss). */
  private readonly leaving = new Set<OverlayHost>();
  /** Elements made inert here, with the attribute values they had before. */
  private readonly concealed = new Map<Element, SavedAttributes>();
  private observer?: MutationObserver;
  private observedRoot?: Element;
  /** Placed right before and after the guarded overlay. */
  private readonly focusGuards = [
    this.createFocusGuard(),
    this.createFocusGuard(),
  ] as const;
  /** The overlay on top whose focus guards are in place. */
  private guarded?: OverlayHost;

  public start(): void {
    if (this.observer) {
      return;
    }
    // Nothing here changes Angular state, so no change detection is needed.
    this.zone.runOutsideAngular(() => {
      this.observer = new MutationObserver((records) => {
        this.adoptForeignChanges(records);
        this.update();
      });
      for (const guard of this.focusGuards) {
        guard.addEventListener('focus', this.onFocusGuardFocus);
      }
      for (const type of LIFECYCLE_EVENTS) {
        // Capture: before listeners of the overlay itself move focus.
        this.document.addEventListener(type, this.onLifecycleEvent, true);
      }
    });
    this.destroyRef.onDestroy(() => this.stop());
  }

  private stop(): void {
    for (const type of LIFECYCLE_EVENTS) {
      this.document.removeEventListener(type, this.onLifecycleEvent, true);
    }
    this.observer?.disconnect();
    this.observer = undefined;
    this.observedRoot = undefined;
    for (const [element, saved] of [...this.concealed]) {
      this.reveal(element, saved);
    }
    for (const guard of this.focusGuards) {
      guard.removeEventListener('focus', this.onFocusGuardFocus);
      guard.remove();
    }
    this.guarded = undefined;
    this.presented.clear();
    this.leaving.clear();
  }

  private readonly onLifecycleEvent = (event: Event): void => {
    const overlay = event.target;
    if (!(overlay instanceof HTMLElement)) {
      return;
    }
    const prefix = MODAL_OVERLAY_EVENT_PREFIXES[overlay.localName];
    if (!prefix || !event.type.startsWith(prefix)) {
      return;
    }
    switch (event.type.slice(prefix.length)) {
      case 'WillPresent':
        this.presented.add(overlay);
        this.leaving.delete(overlay);
        break;
      case 'WillDismiss':
        this.leaving.add(overlay);
        break;
      case 'DidDismiss':
        this.presented.delete(overlay);
        this.leaving.delete(overlay);
        break;
    }
    this.update();
  };

  private update(): void {
    const root = this.document.querySelector('ion-app') ?? this.document.body;
    if (!root) {
      return;
    }
    this.observeRoot(root);
    for (const overlay of this.presented) {
      if (!overlay.isConnected) {
        this.presented.delete(overlay);
        this.leaving.delete(overlay);
      }
    }

    // Bottom to top; the sort is stable, so ties keep the order of opening.
    const stack = [...this.presented].sort(
      (a, b) => stackLevel(a) - stackLevel(b),
    );
    let topIndex = stack.length - 1;
    while (
      topIndex >= 0 &&
      (this.leaving.has(stack[topIndex]) ||
        !blocksWhatIsBehind(stack[topIndex]))
    ) {
      topIndex--;
    }

    const conceal = new Set<Element>();
    if (topIndex >= 0) {
      // The top overlay and the open ones above it that let it be used.
      const exposed = stack
        .slice(topIndex)
        .filter((overlay) => !this.leaving.has(overlay));
      for (const element of [
        ...stack.slice(0, topIndex),
        ...pageLayers(root),
      ]) {
        // Never take an open overlay down with the element it sits in.
        if (!exposed.some((overlay) => element.contains(overlay))) {
          conceal.add(element);
        }
      }
    }
    // A closing overlay above the top one stays as it is until it is gone.
    const unchanged: Element[] = stack.filter(
      (overlay) => this.leaving.has(overlay) && !conceal.has(overlay),
    );
    // Ionic keeps focus in overlays with a shadow root (modals, popovers) by
    // pulling it back once it has landed outside; see the class comment.
    const top = topIndex >= 0 ? stack[topIndex] : undefined;
    const guarded = top?.shadowRoot ? top : undefined;

    this.write(() => {
      for (const [element, saved] of [...this.concealed]) {
        if (!conceal.has(element) && !unchanged.includes(element)) {
          this.reveal(element, saved);
        }
      }
      for (const element of conceal) {
        this.conceal(element);
      }
      if (!top) {
        this.showViewContainer(root);
      }
      this.placeFocusGuards(root, guarded);
    });
  }

  /**
   * Ionic takes the view container back into the accessibility tree when the
   * last blocking overlay starts to close, and counts one that is still
   * closing as open until its animation has ended. A question answered while
   * the menu that led to it still closes is therefore never the last one, and
   * the container would stay hidden with nothing open. The side menu hides
   * its content the same way, on purpose, and shows it again by itself.
   */
  private showViewContainer(root: Element): void {
    const container = root.querySelector(VIEW_CONTAINER);
    if (container && !container.classList.contains(BEHIND_SIDE_MENU)) {
      container.removeAttribute('aria-hidden');
    }
  }

  private createFocusGuard(): HTMLElement {
    const guard = this.document.createElement('div');
    guard.setAttribute(FOCUS_GUARD, '');
    guard.setAttribute('aria-hidden', 'true');
    guard.tabIndex = 0;
    // An empty box still takes focus. Fixed in the corner, out of the layout
    // of ion-app, so that taking focus never scrolls anything.
    Object.assign(guard.style, { position: 'fixed', top: '0', left: '0' });
    return guard;
  }

  /**
   * Right before and after `overlay`; an overlay that sits in another element
   * of the root gets them around that element, never inside app content.
   * Without an overlay, they are removed.
   */
  private placeFocusGuards(
    root: Element,
    overlay: OverlayHost | undefined,
  ): void {
    const [before, after] = this.focusGuards;
    const anchor = overlay && childOfRootHolding(root, overlay);
    this.guarded = anchor ? overlay : undefined;
    if (!anchor) {
      before.remove();
      after.remove();
      return;
    }
    if (anchor.previousSibling !== before) {
      root.insertBefore(before, anchor);
    }
    if (anchor.nextSibling !== after) {
      root.insertBefore(after, anchor.nextSibling);
    }
  }

  /**
   * Ionic's focus trap runs first and has moved focus into the overlay by
   * now. Should it not have, focus goes to the overlay itself rather than
   * stay on an element nobody can see.
   */
  private readonly onFocusGuardFocus = (event: FocusEvent): void => {
    if (this.document.activeElement === event.target) {
      this.guarded?.focus();
    }
  };

  private observeRoot(root: Element): void {
    if (this.observedRoot !== root) {
      this.observedRoot = root;
      this.observer?.observe(root, { childList: true });
    }
  }

  /**
   * Applies a change of our own. Records taken before are someone else's and
   * are adopted; the records our change causes are dropped.
   */
  private write(change: () => void): void {
    this.adoptForeignChanges(this.observer?.takeRecords() ?? []);
    change();
    this.observer?.takeRecords();
  }

  /**
   * Somebody else changed aria-hidden or inert of a concealed element, e.g.
   * Ionic when the overlay finished opening. That value is restored later
   * instead of the one saved before.
   */
  private adoptForeignChanges(records: MutationRecord[]): void {
    for (const record of records) {
      const element = record.target as Element;
      const saved = this.concealed.get(element);
      if (record.type === 'attributes' && saved) {
        const name = record.attributeName as ConcealingAttribute;
        saved[name] = element.getAttribute(name);
      }
    }
  }

  private conceal(element: Element): void {
    if (!this.concealed.has(element)) {
      this.concealed.set(element, {
        'aria-hidden': element.getAttribute('aria-hidden'),
        inert: element.getAttribute('inert'),
      });
      this.observer?.observe(element, {
        attributes: true,
        attributeFilter: [...CONCEALING_ATTRIBUTES],
      });
    }
    if (element.getAttribute('aria-hidden') !== 'true') {
      element.setAttribute('aria-hidden', 'true');
    }
    if (!element.hasAttribute('inert')) {
      element.setAttribute('inert', '');
    }
  }

  private reveal(element: Element, saved: SavedAttributes): void {
    this.concealed.delete(element);
    for (const name of CONCEALING_ATTRIBUTES) {
      const value = saved[name];
      if (value === null) {
        element.removeAttribute(name);
      } else if (element.getAttribute(name) !== value) {
        element.setAttribute(name, value);
      }
    }
  }
}
