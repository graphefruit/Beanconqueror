import { inject, InjectionToken, Service, signal } from '@angular/core';

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
 * Whether VoiceOver or TalkBack is on. Read once and then kept current, so a
 * caller never waits for the plugin; off on the web and when it cannot be read.
 */
@Service()
export class ScreenReaderState {
  private readonly uiLog = inject(UILog);
  private readonly enabled = signal(false);

  public readonly on = this.enabled.asReadonly();

  constructor() {
    void this.follow(inject(SCREEN_READER));
  }

  private async follow(screenReader: ScreenReaderSource | null): Promise<void> {
    if (screenReader === null) {
      return;
    }
    try {
      await screenReader.addListener('stateChange', ({ value }) => {
        this.enabled.set(value);
      });
      this.enabled.set((await screenReader.isEnabled()).value);
    } catch (error) {
      this.uiLog.warn('Screen reader state unavailable', error);
    }
  }
}
