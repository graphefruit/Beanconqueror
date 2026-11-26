import { TestBed } from '@angular/core/testing';

import { FOCUS_LOST_EVENT, PageFocusService } from '../page-focus.service';

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

  beforeEach(async () => {
    root = document.createElement('div');
    document.body.append(root);
    profile = screen('Profile', 'Settings');
    settingsLink = profile.querySelector('button');
    settings = screen('Settings', 'Back');
    show(settings, false);
    const tabBar = document.createElement('ion-tab-bar') as HTMLElement & {
      componentOnReady?: () => Promise<unknown>;
    };
    homeTab = document.createElement('button');
    tabBar.append(homeTab);
    root.append(tabBar);
    // Once another test has rendered Ionic's tab bar, its tabs can only take
    // focus after it has rendered here, too.
    await tabBar.componentOnReady?.();
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

  it('puts focus on the title as the new screen comes in, while the one left is still shown', () => {
    settingsLink.focus();
    fire(profile, 'ionViewWillLeave');
    show(settings, true);

    fire(settings, 'ionViewWillEnter');

    expect(document.activeElement).toBe(heading(settings));
    expect(profile.hidden).toBeFalse();

    // Ionic hides the screen left and fires the end of the transition.
    show(profile, false);
    const focus = spyOn(heading(settings), 'focus');
    fire(settings, 'ionViewDidEnter');

    expect(focus).not.toHaveBeenCalled();
  });

  it('puts focus back where it was when a swipe back is let go of early', () => {
    settingsLink.focus();
    navigate(profile, settings);
    const back = settings.querySelector('button');
    back.focus();

    // The swipe starts: Ionic fires the start of the transition only.
    fire(settings, 'ionViewWillLeave');
    show(profile, true);
    fire(profile, 'ionViewWillEnter');
    expect(document.activeElement).toBe(settingsLink);

    // Let go of early: Ionic hides the screen again and ends the transition.
    show(profile, false);
    fire(root, 'ionNavDidChange');

    expect(document.activeElement).toBe(back);

    // The control remembered for the screen still gets focus on the way back.
    navigate(settings, profile);

    expect(document.activeElement).toBe(settingsLink);
  });

  it('puts focus on the title of the screen shown when a swipe back is let go of early with nothing focused before', () => {
    navigate(profile, settings);
    heading(settings).blur();

    fire(settings, 'ionViewWillLeave');
    show(profile, true);
    fire(profile, 'ionViewWillEnter');
    show(profile, false);
    fire(root, 'ionNavDidChange');

    expect(document.activeElement).toBe(heading(settings));
  });

  it('leaves focus on the new screen when its transition ends', () => {
    settingsLink.focus();
    fire(profile, 'ionViewWillLeave');
    show(settings, true);
    fire(settings, 'ionViewWillEnter');
    show(profile, false);
    fire(settings, 'ionViewDidEnter');

    fire(root, 'ionNavDidChange');

    expect(document.activeElement).toBe(heading(settings));
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

    describe('that the app opened without a tap', () => {
      let now: number;

      beforeEach(() => {
        now = 0;
        spyOn(performance, 'now').and.callFake(() => now);
      });

      it('leaves focus alone instead of moving it to the control tapped long before', async () => {
        settingsLink.click();
        now = 5000;
        const loading = await presented('ion-loading');
        fire(loading, 'ionLoadingWillPresent');
        const title = spyOn(heading(profile), 'focus');

        dismissed(loading, 'ionLoadingDidDismiss');
        await afterDismiss();

        expect(document.activeElement).toBe(document.body);
        expect(title).not.toHaveBeenCalled();
      });

      it('puts focus back on the control that had it when the dialog opened', async () => {
        settingsLink.focus();
        now = 5000;
        const alert = await presented('ion-alert');
        fire(alert, 'ionAlertWillPresent');
        settingsLink.blur();

        dismissed(alert, 'ionAlertDidDismiss');
        await afterDismiss();

        expect(document.activeElement).toBe(settingsLink);
      });

      it('puts focus on the control tapped to save after an error shown long after under the wait', async () => {
        settingsLink.click();
        const loading = await presented('ion-loading');
        fire(loading, 'ionLoadingWillPresent');
        now = 5000;
        const alert = await presented('ion-alert');
        fire(alert, 'ionAlertWillPresent');
        const ok = document.createElement('button');
        alert.append(ok);
        ok.focus();
        dismissed(loading, 'ionLoadingDidDismiss');
        await afterDismiss();

        dismissed(alert, 'ionAlertDidDismiss');
        await afterDismiss();

        expect(document.activeElement).toBe(settingsLink);
      });

      it('puts focus on the control tapped to save after an error shown long after the wait', async () => {
        settingsLink.click();
        const loading = await presented('ion-loading');
        fire(loading, 'ionLoadingWillPresent');
        now = 3000;
        dismissed(loading, 'ionLoadingDidDismiss');
        await afterDismiss();
        now = 5000;
        const alert = await presented('ion-alert');
        fire(alert, 'ionAlertWillPresent');

        dismissed(alert, 'ionAlertDidDismiss');
        await afterDismiss();

        expect(document.activeElement).toBe(settingsLink);
      });
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

    it('puts focus on the control that opened the menu once the content of the menu is gone', async () => {
      settingsLink.click();
      const menu = await presented('ion-modal');
      fire(menu, 'ionModalWillPresent');
      const content = document.createElement('div');
      const remove = document.createElement('button');
      content.append(remove);
      menu.append(content);
      remove.click();
      const alert = await presented('ion-alert');
      fire(alert, 'ionAlertWillPresent');
      const yes = document.createElement('button');
      alert.append(yes);
      yes.focus();
      // Angular takes the content out of the menu that closes.
      content.remove();
      dismissed(menu, 'ionModalDidDismiss');
      await afterDismiss();

      dismissed(alert, 'ionAlertDidDismiss');
      await afterDismiss();

      expect(document.activeElement).toBe(settingsLink);
    });

    it('forgets the menu of a dialog that opens again from outside a menu', async () => {
      homeTab.click();
      const menu = await presented('ion-modal');
      fire(menu, 'ionModalWillPresent');
      const remove = document.createElement('button');
      menu.append(remove);
      remove.click();
      const alert = await presented('ion-alert');
      fire(alert, 'ionAlertWillPresent');
      dismissed(menu, 'ionModalDidDismiss');
      // An inline dialog stays in the page, hidden, and opens again.
      fire(alert, 'ionAlertDidDismiss');
      alert.classList.add('overlay-hidden');
      await afterDismiss();
      expect(document.activeElement).toBe(homeTab);
      homeTab.blur();

      settingsLink.click();
      alert.classList.remove('overlay-hidden');
      fire(alert, 'ionAlertWillPresent');
      settingsLink.remove();
      dismissed(alert, 'ionAlertDidDismiss');
      await afterDismiss();

      expect(document.activeElement).toBe(heading(profile));
    });

    it('leaves focus to a list that puts it on the entry at the place of the one deleted', async () => {
      settingsLink.click();
      const alert = await presented('ion-alert');
      fire(alert, 'ionAlertWillPresent');
      settingsLink.remove();
      const list = (event: Event) => {
        event.preventDefault();
        homeTab.focus();
      };
      document.addEventListener(FOCUS_LOST_EVENT, list);

      dismissed(alert, 'ionAlertDidDismiss');
      await afterDismiss();
      document.removeEventListener(FOCUS_LOST_EVENT, list);

      expect(document.activeElement).toBe(homeTab);
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

    describe('from a dialog that takes focus as the one above closes', () => {
      /** A form dialog that gets focus itself while the picker above closes. */
      async function form(control: HTMLElement): Promise<HTMLElement> {
        const modal = await presented('ion-modal');
        modal.tabIndex = -1;
        modal.append(control);
        return modal;
      }

      async function closePickerWhileFormTakesFocus(
        modal: HTMLElement,
      ): Promise<void> {
        const picker = await presented('ion-modal');
        fire(picker, 'ionModalWillPresent');
        modal.focus();
        dismissed(picker, 'ionModalDidDismiss');
        await afterDismiss();
      }

      it('puts focus back on the field that opened the picker', async () => {
        // Stand-ins for ion-item and ion-input, which other tests define.
        const item = document.createElement('div');
        item.className = 'ion-focusable';
        item.innerHTML = '<span><input readonly /></span>';
        const modal = await form(item);
        const field = item.querySelector('input');
        field.focus();
        // ion-input passes the click on its field on to itself.
        field.click();
        field.parentElement.dispatchEvent(
          new MouseEvent('click', { bubbles: true }),
        );

        await closePickerWhileFormTakesFocus(modal);

        expect(document.activeElement).toBe(field);
      });

      it('puts focus back on a control in a shadow root', async () => {
        const select = document.createElement('div');
        const button = document.createElement('button');
        select.attachShadow({ mode: 'open' }).append(button);
        const modal = await form(select);
        button.click();

        await closePickerWhileFormTakesFocus(modal);

        expect(select.shadowRoot.activeElement).toBe(button);
      });

      it('leaves focus on another dialog the app opened', async () => {
        const button = document.createElement('button');
        const modal = await form(button);
        button.click();
        const other = await form(document.createElement('button'));

        await closePickerWhileFormTakesFocus(other);

        // Ionic, once defined, may move focus on into that dialog.
        expect(other.contains(document.activeElement)).toBe(true);
        expect(modal.contains(document.activeElement)).toBe(false);
      });
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
