import { inject, InjectionToken, Service, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Platform } from '@ionic/angular';

import { Capacitor } from '@capacitor/core';
import { ScreenReader, ScreenReaderPlugin } from '@capacitor/screen-reader';

import { UILog } from '../uiLog';

export type ScreenReaderSource = Pick<
  ScreenReaderPlugin,
  'isEnabled' | 'addListener' | 'speak'
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
 * Whether VoiceOver or TalkBack is on. Read at start and on every return to the
 * foreground and kept current in between, so a caller never waits for the
 * plugin; off on the web and when it cannot be read.
 */
@Service()
export class ScreenReaderState {
  private readonly uiLog = inject(UILog);
  private readonly enabled = signal(false);

  public readonly on = this.enabled.asReadonly();

  constructor() {
    const screenReader = inject(SCREEN_READER);
    if (screenReader === null) {
      return;
    }
    void this.follow(screenReader);
    // stateChange can get lost while the app is in the background, for example
    // when VoiceOver is switched in the Settings app.
    inject(Platform)
      .resume.pipe(takeUntilDestroyed())
      .subscribe(() => void this.read(screenReader));
  }

  private async follow(screenReader: ScreenReaderSource): Promise<void> {
    try {
      await screenReader.addListener('stateChange', ({ value }) => {
        this.enabled.set(value);
      });
    } catch (error) {
      this.uiLog.warn('Screen reader state unavailable', error);
      return;
    }
    await this.read(screenReader);
  }

  private async read(screenReader: ScreenReaderSource): Promise<void> {
    try {
      this.enabled.set((await screenReader.isEnabled()).value);
    } catch (error) {
      this.uiLog.warn('Screen reader state unavailable', error);
    }
  }
}
