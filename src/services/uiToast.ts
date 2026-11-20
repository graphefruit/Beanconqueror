import { inject, InjectionToken, Service } from '@angular/core';

import { ToastButton, ToastController } from '@ionic/angular';

import { Capacitor } from '@capacitor/core';
import { ScreenReader, ScreenReaderPlugin } from '@capacitor/screen-reader';
import { TranslateService } from '@ngx-translate/core';

import { Announcer } from './a11y/announcer.service';
import { UILog } from './uiLog';

export const INFO_TOAST_DURATION_MS = 2000;

/**
 * An info toast stays this long while VoiceOver or TalkBack is on. The toast
 * is spoken through the app's live region, and a polite message waits until
 * the screen reader has finished what it is saying; the user then needs time
 * to swipe to the toast or its close button (WCAG 2.2.1).
 */
export const INFO_TOAST_DURATION_SCREEN_READER_MS = 7000;

export type ScreenReaderSource = Pick<
  ScreenReaderPlugin,
  'isEnabled' | 'addListener'
>;

/**
 * The screen reader plugin, or null where it cannot tell (the web build).
 * Capacitor plugin proxies cannot be spied on; unit tests replace this token.
 */
export const SCREEN_READER = new InjectionToken<ScreenReaderSource | null>(
  'SCREEN_READER',
  {
    providedIn: 'root',
    factory: () => (Capacitor.isNativePlatform() ? ScreenReader : null),
  },
);

/**
 * Live regions in the shadow root of an Ionic toast. Ionic 9 renders one, the
 * role="status" element around the message; the selector also catches others
 * a later version might add.
 */
const OWN_LIVE_REGIONS =
  '[aria-live], [role="status"], [role="alert"], [role="log"]';

/**
 * Ionic's toast announces itself: once it has appeared, it puts the message
 * into a polite live region in its shadow root. The app announces the message
 * through its own live region instead (see `Announcer`), so this one is
 * turned off; screen readers would otherwise speak every toast twice. Ionic
 * has no option for it, and `htmlAttributes` only reach the host. The message
 * and the buttons stay readable by touch and swipe. Ionic re-renders the toast
 * but only writes attributes whose rendered value changes, so the setting
 * holds until the toast is removed.
 */
function turnOffOwnLiveRegion(toast: HTMLElement): void {
  toast.shadowRoot
    ?.querySelectorAll(OWN_LIVE_REGIONS)
    .forEach((region) => region.setAttribute('aria-live', 'off'));
}

/**
 * Toasts are announced politely, errors included: they confirm what the user
 * has just done or report the state of a device, none of them needs an answer,
 * and whatever needs a decision is shown as an alert, which takes focus. A
 * polite message is spoken at once when the screen reader is quiet; an
 * assertive one would cut off what it is saying, for example the control the
 * user has just activated.
 */
@Service()
export class UIToast {
  private readonly translate = inject(TranslateService);
  private readonly toastController = inject(ToastController);
  private readonly announcer = inject(Announcer);
  private readonly uiLog = inject(UILog);

  /** Read once and then kept current, so a toast never waits for the plugin. */
  private screenReaderOn = false;

  constructor() {
    void this.followScreenReader(inject(SCREEN_READER));
  }

  /**
   * Only the first message is announced: one announcement per second of the
   * countdown would pile up in the screen reader and lag behind.
   */
  public async showAutomaticSaveTimer(_seconds: number) {
    let message = this.translate.instant('SAVING_BREW_COUNTDOWN', {
      time: _seconds.toString(),
    });

    const toast = await this.toastController.create({
      message: message,
      duration: _seconds * 1000,
      position: 'top',
      animated: false,
      cssClass: 'toast-automatic-save-timer',
      buttons: [
        {
          text: this.translate.instant('CANCEL'),
          role: 'cancel',
        },
        {
          text: this.translate.instant('SAVE_NOW'),
          role: 'save',
        },
      ],
    });
    await this.present(toast, message);
    let delayCounter = _seconds;

    let delayIntv = setInterval(() => {
      delayCounter = delayCounter - 1;
      if (delayCounter <= 0) {
        toast.message = this.translate.instant('SAVING_BREW_COUNTDOWN', {
          time: delayCounter.toString(),
        });
        clearInterval(delayIntv);
        delayIntv = undefined;
      } else {
        toast.message = this.translate.instant('SAVING_BREW_COUNTDOWN', {
          time: delayCounter.toString(),
        });
      }
    }, 1000);

    const responseToast = await toast.onDidDismiss();
    if (delayIntv) {
      clearInterval(delayIntv);
    }
    return responseToast.role;
  }
  public async showInfoToast(_message: string, translate: boolean = true) {
    let message = _message;
    if (translate === true) {
      message = this.translate.instant(_message);
    }
    const toast = await this.toastController.create({
      message: message,
      duration: this.infoToastDuration(),
      position: 'top',
      animated: false,
      buttons: [this.closeButton()],
    });
    void this.present(toast, message);
  }

  public async showInfoToastBottom(_message: string) {
    const message = this.translate.instant(_message);
    const toast = await this.toastController.create({
      message: message,
      duration: this.infoToastDuration(),
      position: 'bottom',
      animated: false,
      buttons: [this.closeButton()],
    });
    void this.present(toast, message);
  }

  /** Shows "X"; screen readers say what it does, in the app language. */
  private closeButton(): ToastButton {
    return {
      side: 'end',
      text: 'X',
      role: 'cancel',
      htmlAttributes: { 'aria-label': this.translate.instant('CLOSE') },
    };
  }

  private infoToastDuration(): number {
    return this.screenReaderOn
      ? INFO_TOAST_DURATION_SCREEN_READER_MS
      : INFO_TOAST_DURATION_MS;
  }

  private async followScreenReader(
    screenReader: ScreenReaderSource | null,
  ): Promise<void> {
    if (screenReader === null) {
      return;
    }
    try {
      await screenReader.addListener('stateChange', ({ value }) => {
        this.screenReaderOn = value;
      });
      this.screenReaderOn = (await screenReader.isEnabled()).value;
    } catch (error) {
      this.uiLog.warn('Screen reader state unavailable', error);
    }
  }

  private present(toast: HTMLIonToastElement, message: string): Promise<void> {
    turnOffOwnLiveRegion(toast);
    const presented = toast.present();
    this.announcer.announce(message);
    return presented;
  }
}
