import { DOCUMENT, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { OverlayStackA11yService } from '../overlay-stack-a11y.service';

/** What the service reads from an Ionic overlay host. */
interface FakeOverlay extends HTMLElement {
  overlayIndex?: number;
  showBackdrop?: boolean;
  backdropBreakpoint?: number;
  focusTrap?: boolean;
}

type Phase = 'WillPresent' | 'DidPresent' | 'WillDismiss' | 'DidDismiss';

const EVENT_PREFIX: Record<string, string> = {
  'ion-modal': 'ionModal',
  'ion-popover': 'ionPopover',
  'ion-alert': 'ionAlert',
  'ion-action-sheet': 'ionActionSheet',
  'ion-loading': 'ionLoading',
  'ion-picker-legacy': 'ionPicker',
  'ion-toast': 'ionToast',
};

const CONCEALED = { ariaHidden: 'true', inert: '' };
const UNTOUCHED = { ariaHidden: null, inert: null };

function state(element: Element) {
  return {
    ariaHidden: element.getAttribute('aria-hidden'),
    inert: element.getAttribute('inert'),
  };
}

/** Lets the mutation observer report what happened in the current task. */
function mutationsDelivered(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}

/**
 * Overlays are simulated in a document of their own, so the elements are not
 * upgraded to Ionic components: each test drives the lifecycle Ionic would run.
 */
describe('OverlayStackA11yService', () => {
  let doc: Document;
  let app: HTMLElement;
  let page: HTMLElement;
  let nextOverlayIndex: number;

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument('');
    app = doc.createElement('ion-app');
    page = doc.createElement('ion-split-pane');
    app.append(page);
    doc.body.append(app);
    nextOverlayIndex = 1;
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: doc }],
    });
    TestBed.inject(OverlayStackA11yService).start();
  });

  /**
   * Like Ionic's controllers: appended to ion-app, hidden, next stack index.
   * As in Ionic, modals and popovers render into a shadow root.
   */
  function create(
    tag = 'ion-modal',
    properties: Partial<FakeOverlay> = {},
    parent: Element = app,
  ): FakeOverlay {
    const overlay = doc.createElement(tag) as FakeOverlay;
    if (tag === 'ion-modal' || tag === 'ion-popover') {
      overlay.attachShadow({ mode: 'open' });
    }
    overlay.classList.add('overlay-hidden');
    overlay.overlayIndex = nextOverlayIndex++;
    Object.assign(overlay, properties);
    parent.append(overlay);
    return overlay;
  }

  function fire(overlay: Element, phase: Phase): void {
    overlay.dispatchEvent(
      new CustomEvent(EVENT_PREFIX[overlay.localName] + phase, {
        bubbles: true,
        composed: true,
      }),
    );
  }

  function startPresenting(overlay: FakeOverlay): void {
    fire(overlay, 'WillPresent');
    overlay.classList.remove('overlay-hidden');
  }

  /** Ionic clears aria-hidden and inert of an overlay that finished opening. */
  function finishPresenting(overlay: FakeOverlay): void {
    fire(overlay, 'DidPresent');
    overlay.removeAttribute('aria-hidden');
    overlay.removeAttribute('inert');
  }

  async function present(tag = 'ion-modal', properties = {}) {
    const overlay = create(tag, properties);
    startPresenting(overlay);
    finishPresenting(overlay);
    await mutationsDelivered();
    return overlay;
  }

  function finishDismissing(overlay: FakeOverlay): void {
    fire(overlay, 'DidDismiss');
    overlay.classList.add('overlay-hidden');
    overlay.remove();
  }

  async function dismiss(overlay: FakeOverlay): Promise<void> {
    fire(overlay, 'WillDismiss');
    finishDismissing(overlay);
    await mutationsDelivered();
  }

  /** Empty elements that take focus but are hidden from assistive technology. */
  function focusGuards(): HTMLElement[] {
    return [
      ...doc.querySelectorAll<HTMLElement>(
        '[tabindex="0"][aria-hidden="true"]',
      ),
    ];
  }

  /** Whether the two focus guards sit right before and after `element`. */
  function guarded(element: Element): boolean {
    const guards = focusGuards();
    return (
      guards.length === 2 &&
      element.previousElementSibling === guards[0] &&
      element.nextElementSibling === guards[1]
    );
  }

  it('hides the page behind an overlay and gives it back afterwards', async () => {
    const dialog = await present();
    expect(state(page)).toEqual(CONCEALED);
    expect(state(dialog)).toEqual(UNTOUCHED);

    fire(dialog, 'WillDismiss');
    expect(state(page))
      .withContext('back before Ionic returns focus')
      .toEqual(UNTOUCHED);
    finishDismissing(dialog);
    await mutationsDelivered();
    expect(state(page)).toEqual(UNTOUCHED);
  });

  it('hides a dialog while another one is open above it', async () => {
    const cupping = await present();
    const picker = await present();

    expect(state(cupping)).toEqual(CONCEALED);
    expect(state(page)).toEqual(CONCEALED);
    expect(state(picker)).toEqual(UNTOUCHED);

    fire(picker, 'WillDismiss');
    expect(state(cupping))
      .withContext('back as soon as the picker starts to close')
      .toEqual(UNTOUCHED);
    expect(state(page)).toEqual(CONCEALED);
    expect(state(picker))
      .withContext('a closing dialog on top is left alone')
      .toEqual(UNTOUCHED);

    finishDismissing(picker);
    await mutationsDelivered();
    expect(state(cupping)).toEqual(UNTOUCHED);
    expect(state(page)).toEqual(CONCEALED);
  });

  it('covers every kind of modal overlay', async () => {
    for (const tag of [
      'ion-popover',
      'ion-alert',
      'ion-action-sheet',
      'ion-loading',
      'ion-picker-legacy',
    ]) {
      const form = await present('ion-modal');
      const overlay = await present(tag);
      expect(state(form)).withContext(tag).toEqual(CONCEALED);
      await dismiss(overlay);
      expect(state(form)).withContext(tag).toEqual(UNTOUCHED);
      await dismiss(form);
      expect(state(page)).withContext(tag).toEqual(UNTOUCHED);
    }
  });

  it('peels three levels off one by one', async () => {
    const welcome = await present();
    const beanForm = await present();
    const choices = await present('ion-alert');
    expect([welcome, beanForm, page].map(state)).toEqual([
      CONCEALED,
      CONCEALED,
      CONCEALED,
    ]);

    await dismiss(choices);
    expect(state(beanForm)).toEqual(UNTOUCHED);
    expect(state(welcome)).toEqual(CONCEALED);

    await dismiss(beanForm);
    expect(state(welcome)).toEqual(UNTOUCHED);
    expect(state(page)).toEqual(CONCEALED);

    await dismiss(welcome);
    expect(state(page)).toEqual(UNTOUCHED);
  });

  it('keeps the top dialog in front when one below closes first', async () => {
    const bottom = await present();
    const middle = await present();
    const top = await present();

    fire(middle, 'WillDismiss');
    expect(state(middle))
      .withContext('still covered while it closes')
      .toEqual(CONCEALED);
    expect(state(bottom)).toEqual(CONCEALED);
    expect(state(top)).toEqual(UNTOUCHED);
    finishDismissing(middle);
    await mutationsDelivered();
    expect(state(middle))
      .withContext('its own values are back for the next time it opens')
      .toEqual(UNTOUCHED);
    expect(state(bottom)).toEqual(CONCEALED);

    await dismiss(top);
    expect(state(bottom)).toEqual(UNTOUCHED);
  });

  it('keeps a closing dialog hidden when the one above closes as well', async () => {
    const bottom = await present();
    const middle = await present();
    const top = await present();

    fire(middle, 'WillDismiss');
    fire(top, 'WillDismiss');
    expect(state(bottom)).toEqual(UNTOUCHED);
    expect(state(middle)).toEqual(CONCEALED);
    expect(state(top)).toEqual(UNTOUCHED);

    finishDismissing(middle);
    finishDismissing(top);
    await mutationsDelivered();
    expect([bottom, middle, top].map(state)).toEqual([
      UNTOUCHED,
      UNTOUCHED,
      UNTOUCHED,
    ]);
    expect(state(page)).toEqual(CONCEALED);
  });

  it('hides a dialog that is still opening when the next one opens', async () => {
    const first = create();
    startPresenting(first);
    const second = create();
    startPresenting(second);
    expect(state(first)).toEqual(CONCEALED);

    // The first one finishes its animation only now, and Ionic clears its
    // attributes although the second one covers it.
    finishPresenting(first);
    await mutationsDelivered();
    expect(state(first)).toEqual(CONCEALED);

    finishPresenting(second);
    await mutationsDelivered();
    await dismiss(second);
    expect(state(first)).toEqual(UNTOUCHED);
  });

  it('notices a dialog that leaves the DOM without closing', async () => {
    const form = await present();
    const chooser = await present();

    chooser.remove();
    await mutationsDelivered();
    expect(state(form)).toEqual(UNTOUCHED);
    expect(state(page)).toEqual(CONCEALED);

    form.remove();
    await mutationsDelivered();
    expect(state(page)).toEqual(UNTOUCHED);
  });

  it('restores the values the elements had before', async () => {
    page.setAttribute('aria-hidden', 'false');
    const decoration = doc.createElement('div');
    decoration.setAttribute('aria-hidden', 'true');
    decoration.setAttribute('inert', 'inert');
    app.prepend(decoration);

    const dialog = await present();
    expect(state(page)).toEqual(CONCEALED);
    expect(state(decoration)).toEqual({ ariaHidden: 'true', inert: 'inert' });

    await dismiss(dialog);
    expect(state(page)).toEqual({ ariaHidden: 'false', inert: null });
    expect(state(decoration)).toEqual({ ariaHidden: 'true', inert: 'inert' });
  });

  it('restores what someone else set while an element was hidden', async () => {
    const form = await present();
    const sheet = await present();

    form.setAttribute('aria-hidden', 'false');
    form.removeAttribute('inert');
    await mutationsDelivered();
    expect(state(form))
      .withContext('hidden again while the sheet is open')
      .toEqual(CONCEALED);

    await dismiss(sheet);
    expect(state(form)).toEqual({ ariaHidden: 'false', inert: null });
  });

  it('hides nothing behind an overlay that leaves the background usable', async () => {
    for (const properties of [
      { showBackdrop: false },
      { backdropBreakpoint: 0.5 },
      { focusTrap: false },
    ]) {
      const label = JSON.stringify(properties);
      const nonBlocking = await present('ion-modal', properties);
      expect(state(page)).withContext(label).toEqual(UNTOUCHED);

      const form = await present();
      const hint = await present('ion-popover', properties);
      expect(state(form))
        .withContext(`${label}: the form below stays usable`)
        .toEqual(UNTOUCHED);
      expect(state(hint)).withContext(label).toEqual(UNTOUCHED);
      expect(state(nonBlocking))
        .withContext(`${label}: below the blocking form`)
        .toEqual(CONCEALED);
      expect(state(page)).withContext(label).toEqual(CONCEALED);

      await dismiss(hint);
      await dismiss(form);
      await dismiss(nonBlocking);
      expect(state(page)).withContext(label).toEqual(UNTOUCHED);
    }
  });

  it('never hides toasts and ignores their events', async () => {
    const toast = create('ion-toast');
    startPresenting(toast);
    finishPresenting(toast);
    await mutationsDelivered();
    expect(state(page)).toEqual(UNTOUCHED);

    const dialog = await present();
    expect(state(toast)).toEqual(UNTOUCHED);
    expect(state(page)).toEqual(CONCEALED);
    await dismiss(dialog);
    expect(state(toast)).toEqual(UNTOUCHED);
  });

  it("follows Ionic's stacking order rather than the order of opening", async () => {
    const createdFirst = create();
    const createdSecond = create();
    startPresenting(createdSecond);
    startPresenting(createdFirst);
    await mutationsDelivered();

    // Ionic draws the later created overlay on top and traps focus in it.
    expect(state(createdFirst)).toEqual(CONCEALED);
    expect(state(createdSecond)).toEqual(UNTOUCHED);
  });

  it('opens a dialog again that was hidden before it closed', async () => {
    const inline = create();
    startPresenting(inline);
    finishPresenting(inline);
    const above = await present();
    expect(state(inline)).toEqual(CONCEALED);

    // An inline overlay closes and goes back into the page …
    fire(inline, 'WillDismiss');
    fire(inline, 'DidDismiss');
    inline.classList.add('overlay-hidden');
    page.append(inline);
    await dismiss(above);
    expect(state(inline)).toEqual(UNTOUCHED);

    // … and is moved to ion-app again when it opens the next time.
    app.append(inline);
    inline.overlayIndex = nextOverlayIndex++;
    startPresenting(inline);
    finishPresenting(inline);
    await mutationsDelivered();
    expect(state(inline)).toEqual(UNTOUCHED);
    expect(state(page)).toEqual(CONCEALED);
  });

  it('does not hide an overlay together with the element it sits in', async () => {
    const outer = await present();
    const nested = create('ion-popover', {}, outer);
    startPresenting(nested);
    finishPresenting(nested);
    await mutationsDelivered();
    expect(state(outer)).toEqual(UNTOUCHED);
    expect(state(nested)).toEqual(UNTOUCHED);
    expect(state(page)).toEqual(CONCEALED);

    // Not moved to ion-app: the page it sits in stays usable, as with Ionic.
    const inPage = create('ion-popover', {}, page);
    startPresenting(inPage);
    finishPresenting(inPage);
    await mutationsDelivered();
    expect(state(page)).toEqual(UNTOUCHED);
    expect(state(outer)).toEqual(CONCEALED);
    expect(state(inPage)).toEqual(UNTOUCHED);
  });

  it('ignores lifecycle events of anything but the overlay itself', async () => {
    const dialog = await present();
    const other = await present();
    const notAnOverlay = doc.createElement('div');
    doc.body.append(notAnOverlay);

    notAnOverlay.dispatchEvent(
      new CustomEvent('ionModalWillDismiss', { bubbles: true }),
    );
    // A modal does not fire alert events; this one comes from elsewhere.
    other.dispatchEvent(
      new CustomEvent('ionAlertWillDismiss', { bubbles: true }),
    );
    doc.dispatchEvent(new CustomEvent('ionModalWillDismiss'));
    await mutationsDelivered();
    expect(state(dialog)).toEqual(CONCEALED);
    expect(state(other)).toEqual(UNTOUCHED);
    expect(state(notAnOverlay)).toEqual(UNTOUCHED);
  });

  it('works without ion-app, with overlays in the body', async () => {
    app.remove();
    const content = doc.createElement('main');
    doc.body.append(content);
    const dialog = create('ion-modal', {}, doc.body);
    startPresenting(dialog);
    finishPresenting(dialog);
    await mutationsDelivered();

    expect(state(content)).toEqual(CONCEALED);
    expect(state(dialog)).toEqual(UNTOUCHED);
    expect(guarded(dialog)).toBeTrue();
  });

  // Ionic wraps focus around in a modal or popover only once it has left it,
  // so focus needs somewhere to go outside while the rest is inert.
  it('puts focus guards around a modal or popover on top', async () => {
    for (const tag of ['ion-modal', 'ion-popover']) {
      const overlay = await present(tag);
      expect(guarded(overlay)).withContext(tag).toBeTrue();
      for (const guard of focusGuards()) {
        expect(guard.parentElement).withContext(tag).toBe(app);
        expect(guard.tabIndex).withContext(tag).toBe(0);
        expect(guard.childNodes.length).withContext(tag).toBe(0);
        expect(guard.closest('[inert]'))
          .withContext(`${tag}: a guard is never inert`)
          .toBeNull();
      }
      expect(state(page)).withContext(tag).toEqual(CONCEALED);

      await dismiss(overlay);
      expect(focusGuards()).withContext(tag).toEqual([]);
      expect(state(page)).withContext(tag).toEqual(UNTOUCHED);
    }
  });

  it('moves the focus guards along with the dialog on top', async () => {
    const form = await present();
    const sheet = await present();
    expect(guarded(sheet)).toBeTrue();

    fire(sheet, 'WillDismiss');
    expect(guarded(form))
      .withContext('back at the form as soon as the sheet starts to close')
      .toBeTrue();
    finishDismissing(sheet);
    await mutationsDelivered();
    expect(guarded(form)).toBeTrue();

    const chooser = await present('ion-popover');
    expect(guarded(chooser)).toBeTrue();
    expect(guarded(form)).toBeFalse();
    chooser.remove();
    await mutationsDelivered();
    expect(guarded(form))
      .withContext('back after the chooser left without an event')
      .toBeTrue();

    await dismiss(form);
    expect(focusGuards()).toEqual([]);
  });

  it('leaves alerts, action sheets and loading messages to their own guards', async () => {
    for (const tag of [
      'ion-alert',
      'ion-action-sheet',
      'ion-loading',
      'ion-picker-legacy',
    ]) {
      const overlay = await present(tag);
      expect(focusGuards()).withContext(tag).toEqual([]);
      await dismiss(overlay);
    }

    const form = await present();
    const choices = await present('ion-alert');
    expect(focusGuards()).withContext('an alert above a dialog').toEqual([]);
    await dismiss(choices);
    expect(guarded(form)).toBeTrue();
  });

  it('puts the focus guards around what holds a nested overlay', async () => {
    const outer = await present();
    const nested = create('ion-popover', {}, outer);
    startPresenting(nested);
    finishPresenting(nested);
    await mutationsDelivered();

    expect(guarded(outer)).toBeTrue();
    expect(nested.parentElement).toBe(outer);
  });

  it('moves focus into the dialog only if nothing took it off a guard', async () => {
    const dialog = await present();
    const focusDialog = spyOn(dialog, 'focus');
    const activeElement = spyOnProperty(doc, 'activeElement');
    const [before, after] = focusGuards();

    // Ionic's focus trap listens first and has moved focus into the dialog.
    const control = doc.createElement('button');
    dialog.append(control);
    activeElement.and.returnValue(control);
    before.dispatchEvent(new FocusEvent('focus'));
    after.dispatchEvent(new FocusEvent('focus'));
    expect(focusDialog).not.toHaveBeenCalled();

    for (const guard of [before, after]) {
      activeElement.and.returnValue(guard);
      guard.dispatchEvent(new FocusEvent('focus'));
    }
    expect(focusDialog).toHaveBeenCalledTimes(2);
  });

  describe('with the view container Ionic hides behind an overlay', () => {
    let outlet: HTMLElement;

    beforeEach(() => {
      outlet = doc.createElement('ion-router-outlet');
      page.append(outlet);
    });

    function locksViewContainer(overlay: FakeOverlay): boolean {
      return (
        overlay.focusTrap !== false &&
        overlay.showBackdrop !== false &&
        !((overlay.backdropBreakpoint ?? 0) > 0)
      );
    }

    /** Ionic hides the view container right after the event. */
    function ionicStartsPresenting(overlay: FakeOverlay): void {
      startPresenting(overlay);
      if (locksViewContainer(overlay)) {
        outlet.setAttribute('aria-hidden', 'true');
      }
    }

    /**
     * Ionic shows the view container again before the event, but only when
     * no other locking overlay is on screen. One that is still closing counts
     * until its animation has ended.
     */
    function ionicStartsDismissing(overlay: FakeOverlay): void {
      const onScreen = [
        ...doc.querySelectorAll<FakeOverlay>(Object.keys(EVENT_PREFIX).join()),
      ].filter(
        (other) =>
          !other.classList.contains('overlay-hidden') &&
          other.localName !== 'ion-toast' &&
          locksViewContainer(other),
      );
      if (
        locksViewContainer(overlay) &&
        onScreen.length === 1 &&
        onScreen[0] === overlay
      ) {
        outlet.removeAttribute('aria-hidden');
      }
      fire(overlay, 'WillDismiss');
    }

    it('shows it again when a question is answered while the menu before it still closes', async () => {
      const cardMenu = create('ion-popover');
      ionicStartsPresenting(cardMenu);
      finishPresenting(cardMenu);
      await mutationsDelivered();
      expect(outlet.getAttribute('aria-hidden')).toBe('true');

      ionicStartsDismissing(cardMenu);
      expect(outlet.hasAttribute('aria-hidden')).toBeFalse();
      const question = create('ion-alert');
      ionicStartsPresenting(question);
      finishPresenting(question);
      await mutationsDelivered();
      expect(outlet.getAttribute('aria-hidden')).toBe('true');

      ionicStartsDismissing(question);
      expect(outlet.hasAttribute('aria-hidden'))
        .withContext('nothing that blocks the page is open any more')
        .toBeFalse();

      finishDismissing(cardMenu);
      finishDismissing(question);
      await mutationsDelivered();
      expect(outlet.hasAttribute('aria-hidden')).toBeFalse();
      expect(state(page)).toEqual(UNTOUCHED);
    });

    it('shows it again when the last overlay leaves the DOM without closing', async () => {
      const dialog = create();
      ionicStartsPresenting(dialog);
      finishPresenting(dialog);
      await mutationsDelivered();

      dialog.remove();
      await mutationsDelivered();
      expect(outlet.hasAttribute('aria-hidden')).toBeFalse();
    });

    it('leaves it hidden as long as a blocking overlay is open', async () => {
      const cardMenu = create('ion-popover');
      ionicStartsPresenting(cardMenu);
      finishPresenting(cardMenu);
      ionicStartsDismissing(cardMenu);
      const question = create('ion-alert');
      ionicStartsPresenting(question);
      expect(outlet.getAttribute('aria-hidden'))
        .withContext('while the question opens')
        .toBe('true');
      finishPresenting(question);
      finishDismissing(cardMenu);
      await mutationsDelivered();
      expect(outlet.getAttribute('aria-hidden'))
        .withContext('after the menu is gone')
        .toBe('true');

      const hint = create('ion-popover', { showBackdrop: false });
      ionicStartsPresenting(hint);
      finishPresenting(hint);
      ionicStartsDismissing(hint);
      finishDismissing(hint);
      await mutationsDelivered();
      expect(outlet.getAttribute('aria-hidden'))
        .withContext('after an overlay above the question is gone')
        .toBe('true');

      ionicStartsDismissing(question);
      finishDismissing(question);
      await mutationsDelivered();
      expect(outlet.hasAttribute('aria-hidden')).toBeFalse();
    });

    it('leaves it hidden while the side menu covers it', async () => {
      // What ion-menu does to its content from opening until it is closed.
      outlet.classList.add('menu-content-open');
      outlet.setAttribute('aria-hidden', 'true');

      const hint = create('ion-popover', { showBackdrop: false });
      ionicStartsPresenting(hint);
      finishPresenting(hint);
      ionicStartsDismissing(hint);
      finishDismissing(hint);
      await mutationsDelivered();
      expect(outlet.getAttribute('aria-hidden')).toBe('true');
    });

    it('takes the container Ionic takes: the first outlet or the marked element', async () => {
      const inner = doc.createElement('ion-router-outlet');
      inner.setAttribute('aria-hidden', 'true');
      outlet.append(inner);
      outlet.setAttribute('aria-hidden', 'true');
      await dismiss(await present());
      expect(outlet.hasAttribute('aria-hidden')).toBeFalse();
      expect(inner.getAttribute('aria-hidden'))
        .withContext('not the container of the views')
        .toBe('true');

      outlet.remove();
      const views = doc.createElement('div');
      views.id = 'ion-view-container-root';
      views.setAttribute('aria-hidden', 'true');
      page.append(views);
      await dismiss(await present());
      expect(views.hasAttribute('aria-hidden')).toBeFalse();
    });
  });

  it('starts once and gives everything back when the app is destroyed', async () => {
    TestBed.inject(OverlayStackA11yService).start();
    const form = await present();
    const sheet = await present();
    expect(state(form)).toEqual(CONCEALED);
    expect(focusGuards().length).toBe(2);

    TestBed.inject(EnvironmentInjector).destroy();
    expect(state(form)).toEqual(UNTOUCHED);
    expect(state(page)).toEqual(UNTOUCHED);
    expect(focusGuards()).toEqual([]);

    await dismiss(sheet);
    await present();
    expect(state(page)).withContext('no longer listening').toEqual(UNTOUCHED);
  });
});
