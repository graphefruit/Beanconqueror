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

  /** Like Ionic's controllers: appended to ion-app, hidden, next stack index. */
  function create(
    tag = 'ion-modal',
    properties: Partial<FakeOverlay> = {},
    parent: Element = app,
  ): FakeOverlay {
    const overlay = doc.createElement(tag) as FakeOverlay;
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
  });

  it('starts once and gives everything back when the app is destroyed', async () => {
    TestBed.inject(OverlayStackA11yService).start();
    const form = await present();
    const sheet = await present();
    expect(state(form)).toEqual(CONCEALED);

    TestBed.inject(EnvironmentInjector).destroy();
    expect(state(form)).toEqual(UNTOUCHED);
    expect(state(page)).toEqual(UNTOUCHED);

    await dismiss(sheet);
    await present();
    expect(state(page)).withContext('no longer listening').toEqual(UNTOUCHED);
  });
});
