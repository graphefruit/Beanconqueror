import { TestBed } from '@angular/core/testing';

import { PageFocusService } from '../page-focus.service';

/**
 * Screens and overlays are plain elements in the page; each test fires the
 * events Ionic fires on a change of screen or the end of a dialog. Focus
 * needs elements that are rendered, so they live in the test's document.
 */
describe('PageFocusService', () => {
  let root: HTMLElement;
  let profile: HTMLElement;
  let settings: HTMLElement;
  let settingsLink: HTMLElement;
  let homeTab: HTMLElement;

  function screen(title: string, control: string): HTMLElement {
    const page = document.createElement('div');
    page.className = 'ion-page';
    page.innerHTML = `<span role="heading" aria-level="1">${title}</span>
      <button>${control}</button>`;
    root.append(page);
    return page;
  }

  function heading(page: HTMLElement): HTMLElement {
    return page.querySelector('[role="heading"]');
  }

  function show(page: HTMLElement, shown: boolean): void {
    page.hidden = !shown;
    page.classList.toggle('ion-page-hidden', !shown);
  }

  function fire(target: Element, type: string): void {
    target.dispatchEvent(new CustomEvent(type, { bubbles: false }));
  }

  /** From `from` to `to`, as Ionic does it. */
  function navigate(from: HTMLElement, to: HTMLElement): void {
    fire(from, 'ionViewWillLeave');
    show(to, true);
    show(from, false);
    fire(to, 'ionViewDidEnter');
  }

  /** An overlay on show; Ionic takes its class overlay-hidden off then. */
  async function presented(tag: string): Promise<HTMLElement> {
    const overlay = document.createElement(tag) as HTMLElement & {
      componentOnReady?: () => Promise<unknown>;
    };
    root.append(overlay);
    await overlay.componentOnReady?.();
    overlay.classList.remove('overlay-hidden');
    return overlay;
  }

  /** Ionic fires the event, then takes the overlay out of the page. */
  function dismissed(overlay: HTMLElement, type: string): void {
    fire(overlay, type);
    overlay.remove();
  }

  /** After the timer that waits for Ionic to give focus back. */
  function afterDismiss(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve));
  }

  beforeEach(() => {
    root = document.createElement('div');
    document.body.append(root);
    profile = screen('Profile', 'Settings');
    settingsLink = profile.querySelector('button');
    settings = screen('Settings', 'Back');
    show(settings, false);
    const tabBar = document.createElement('ion-tab-bar');
    homeTab = document.createElement('button');
    tabBar.append(homeTab);
    root.append(tabBar);
    TestBed.inject(PageFocusService).start();
  });

  afterEach(() => {
    root.remove();
  });

  it('leaves focus alone when the app starts', () => {
    fire(profile, 'ionViewDidEnter');

    expect(document.activeElement).toBe(document.body);
  });

  it('puts focus on the title of a new screen', () => {
    settingsLink.focus();

    navigate(profile, settings);

    expect(document.activeElement).toBe(heading(settings));
    expect(heading(settings).tabIndex).toBe(-1);
  });

  it('puts focus back on the control that led away from a screen', () => {
    settingsLink.focus();
    navigate(profile, settings);

    navigate(settings, profile);

    expect(document.activeElement).toBe(settingsLink);
  });

  it('takes the title when that control is gone', () => {
    settingsLink.focus();
    navigate(profile, settings);
    settingsLink.remove();

    navigate(settings, profile);

    expect(document.activeElement).toBe(heading(profile));
  });

  it('leaves focus on a tab of the tab bar', () => {
    homeTab.focus();

    navigate(profile, settings);

    expect(document.activeElement).toBe(homeTab);
  });

  it('leaves focus alone while a dialog is open', async () => {
    await presented('ion-modal');
    settingsLink.focus();
    const focus = spyOn(heading(settings), 'focus');

    navigate(profile, settings);

    expect(focus).not.toHaveBeenCalled();
  });

  it('leaves focus in the screen when it is already there', () => {
    settingsLink.focus();
    fire(profile, 'ionViewWillLeave');
    show(settings, true);
    settings.querySelector('button').focus();
    fire(settings, 'ionViewDidEnter');

    expect(document.activeElement).toBe(settings.querySelector('button'));
  });

  it('waits for the screen that holds a title', () => {
    settingsLink.focus();
    const tabs = document.createElement('div');
    root.append(tabs);
    fire(profile, 'ionViewWillLeave');
    show(profile, false);
    // The tabs are entered first, their first tab after them.
    fire(tabs, 'ionViewDidEnter');
    show(settings, true);
    fire(settings, 'ionViewDidEnter');

    expect(document.activeElement).toBe(heading(settings));
  });

  describe('when a dialog has closed', () => {
    it('leaves focus on the control Ionic gave it back to', async () => {
      settingsLink.focus();

      fire(document.body, 'ionModalDidDismiss');
      await afterDismiss();

      expect(document.activeElement).toBe(settingsLink);
    });

    it('puts focus on the title when the control that opened it is gone', async () => {
      settingsLink.focus();
      settingsLink.remove();

      fire(document.body, 'ionAlertDidDismiss');
      await afterDismiss();

      expect(document.activeElement).toBe(heading(profile));
    });

    it('puts focus on the control tapped to open it, which WebKit does not focus', async () => {
      // A tap in WebKit, or VoiceOver activating the button: a click, no focus.
      settingsLink.click();
      const sheet = await presented('ion-action-sheet');
      fire(sheet, 'ionActionSheetWillPresent');

      dismissed(sheet, 'ionActionSheetDidDismiss');
      await afterDismiss();

      expect(document.activeElement).toBe(settingsLink);
    });

    it('puts focus on the control that opened the menu the dialog came from', async () => {
      settingsLink.click();
      const sheet = await presented('ion-action-sheet');
      fire(sheet, 'ionActionSheetWillPresent');
      const edit = document.createElement('button');
      sheet.append(edit);
      edit.click();
      const modal = await presented('ion-modal');
      fire(modal, 'ionModalWillPresent');
      dismissed(sheet, 'ionActionSheetDidDismiss');

      dismissed(modal, 'ionModalDidDismiss');
      await afterDismiss();

      expect(document.activeElement).toBe(settingsLink);
    });

    it('takes the title when the control tapped to open it is gone', async () => {
      settingsLink.click();
      const alert = await presented('ion-alert');
      fire(alert, 'ionAlertWillPresent');
      settingsLink.remove();

      dismissed(alert, 'ionAlertDidDismiss');
      await afterDismiss();

      expect(document.activeElement).toBe(heading(profile));
    });

    it('leaves focus alone while another dialog is open', async () => {
      const alert = await presented('ion-alert');
      settingsLink.focus();
      settingsLink.remove();
      const focus = spyOn(heading(profile), 'focus');

      fire(alert, 'ionModalDidDismiss');
      await afterDismiss();

      expect(focus).not.toHaveBeenCalled();
    });
  });
});
