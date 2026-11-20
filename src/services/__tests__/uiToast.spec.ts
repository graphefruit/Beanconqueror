import {
  fakeAsync,
  flushMicrotasks,
  TestBed,
  tick,
} from '@angular/core/testing';

import { ToastButton, ToastController } from '@ionic/angular';

import { Capacitor } from '@capacitor/core';
import { ScreenReader, StateChangeListener } from '@capacitor/screen-reader';
import { TranslateService } from '@ngx-translate/core';

import {
  AnnouncementPoliteness,
  LIVE_REGION,
  LiveRegion,
} from '../a11y/live-region';
import { UILog } from '../uiLog';
import {
  INFO_TOAST_DURATION_MS,
  INFO_TOAST_DURATION_SCREEN_READER_MS,
  SCREEN_READER,
  ScreenReaderSource,
  UIToast,
} from '../uiToast';

const TRANSLATIONS: Record<string, string> = {
  TOAST_BREW_ADDED_SUCCESSFULLY: 'Brew added successfully',
  'VISUALIZER.CONNECTION.SUCCESSFULLY': 'Connected to Visualizer',
  SAVING_BREW_COUNTDOWN: 'Saving brew in {{time}}',
  CANCEL: 'Cancel',
  SAVE_NOW: 'Save now',
  CLOSE: 'Schließen',
};

class FakeLiveRegion implements LiveRegion {
  public readonly heard: {
    message: string;
    politeness: AnnouncementPoliteness;
  }[] = [];

  public announce(message: string, politeness: AnnouncementPoliteness): void {
    this.heard.push({ message, politeness });
  }
}

/** An ion-toast as far as the service sees it, with Ionic's live region. */
interface FakeToast extends HTMLElement {
  message: string;
  buttons?: ToastButton[];
  duration: number;
  present: jasmine.Spy<() => Promise<void>>;
  onDidDismiss: () => Promise<{ role?: string }>;
  /** aria-live of the toast's own live region when present() was called. */
  liveWhenPresented?: string | null;
  close(role: string): void;
}

function createToast(withShadowRoot = true): FakeToast {
  const toast = document.createElement('div') as unknown as FakeToast;
  let close: (detail: { role?: string }) => void;
  const dismissed = new Promise<{ role?: string }>((resolve) => {
    close = resolve;
  });
  const region = document.createElement('div');
  region.setAttribute('role', 'status');
  region.setAttribute('aria-atomic', 'true');
  region.setAttribute('aria-live', 'polite');
  if (withShadowRoot) {
    toast.attachShadow({ mode: 'open' }).append(region);
  }
  toast.present = jasmine.createSpy('present').and.callFake(() => {
    toast.liveWhenPresented = region.getAttribute('aria-live');
    return Promise.resolve();
  });
  toast.onDidDismiss = () => dismissed;
  toast.close = (role) => close({ role });
  return toast;
}

describe('UIToast', () => {
  let liveRegion: FakeLiveRegion;
  let toasts: FakeToast[];
  let withShadowRoot: boolean;

  function createService(
    screenReader: ScreenReaderSource | null = null,
  ): UIToast {
    liveRegion = new FakeLiveRegion();
    toasts = [];
    withShadowRoot = true;
    TestBed.configureTestingModule({
      providers: [
        { provide: LIVE_REGION, useValue: liveRegion },
        { provide: SCREEN_READER, useValue: screenReader },
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string, params?: Record<string, string>) =>
              (TRANSLATIONS[key] ?? key).replace(
                /{{(\w+)}}/g,
                (_, name: string) => params?.[name] ?? '',
              ),
          },
        },
        {
          provide: ToastController,
          useValue: {
            create: (options: {
              message: string;
              buttons?: ToastButton[];
              duration: number;
            }) => {
              const toast = createToast(withShadowRoot);
              toast.message = options.message;
              toast.buttons = options.buttons;
              toast.duration = options.duration;
              toasts.push(toast);
              return Promise.resolve(toast);
            },
          },
        },
      ],
    });
    return TestBed.inject(UIToast);
  }

  function liveState(toast: FakeToast): string | null | undefined {
    return toast.shadowRoot
      ?.querySelector('[role="status"]')
      ?.getAttribute('aria-live');
  }

  it('announces an info toast once and politely, with its own live region turned off', fakeAsync(() => {
    const uiToast = createService();

    void uiToast.showInfoToast('TOAST_BREW_ADDED_SUCCESSFULLY');
    flushMicrotasks();

    expect(toasts.length).toBe(1);
    expect(toasts[0].present).toHaveBeenCalledTimes(1);
    expect(toasts[0].liveWhenPresented).toBe('off');
    expect(liveState(toasts[0])).toBe('off');
    expect(liveRegion.heard).toEqual([
      { message: 'Brew added successfully', politeness: 'polite' },
    ]);
  }));

  it('announces a message it is told not to translate as it is', fakeAsync(() => {
    const uiToast = createService();

    void uiToast.showInfoToast('Could not read the logs', false);
    flushMicrotasks();

    expect(toasts[0].message).toBe('Could not read the logs');
    expect(liveRegion.heard).toEqual([
      { message: 'Could not read the logs', politeness: 'polite' },
    ]);
  }));

  it('announces a toast at the bottom the same way', fakeAsync(() => {
    const uiToast = createService();

    void uiToast.showInfoToastBottom('VISUALIZER.CONNECTION.SUCCESSFULLY');
    flushMicrotasks();

    expect(toasts[0].message).toBe('Connected to Visualizer');
    expect(toasts[0].liveWhenPresented).toBe('off');
    expect(liveRegion.heard).toEqual([
      { message: 'Connected to Visualizer', politeness: 'polite' },
    ]);
  }));

  it('names the close button of info toasts in the app language', fakeAsync(() => {
    const uiToast = createService();

    void uiToast.showInfoToast('TOAST_BREW_ADDED_SUCCESSFULLY');
    void uiToast.showInfoToastBottom('VISUALIZER.CONNECTION.SUCCESSFULLY');
    flushMicrotasks();

    for (const toast of toasts) {
      expect(toast.buttons).toEqual([
        jasmine.objectContaining({
          text: 'X',
          role: 'cancel',
          htmlAttributes: { 'aria-label': 'Schließen' },
        }),
      ]);
    }
  }));

  it('still announces a toast that has no shadow root', fakeAsync(() => {
    const uiToast = createService();
    withShadowRoot = false;

    void uiToast.showInfoToast('TOAST_BREW_ADDED_SUCCESSFULLY');
    flushMicrotasks();

    expect(toasts[0].present).toHaveBeenCalledTimes(1);
    expect(liveRegion.heard.length).toBe(1);
  }));

  it('announces the automatic save countdown once, not every second', fakeAsync(() => {
    const uiToast = createService();
    let role: string | undefined;

    void uiToast.showAutomaticSaveTimer(3).then((result) => (role = result));
    flushMicrotasks();
    const [toast] = toasts;
    expect(toast.liveWhenPresented).toBe('off');

    tick(1000);
    expect(toast.message).toBe('Saving brew in 2');
    tick(2000);
    expect(toast.message).toBe('Saving brew in 0');
    toast.close('timeout');
    flushMicrotasks();

    expect(role).toBe('timeout');
    expect(liveRegion.heard).toEqual([
      { message: 'Saving brew in 3', politeness: 'polite' },
    ]);
  }));

  describe('with a screen reader', () => {
    let stateChange: StateChangeListener | undefined;

    function screenReader(enabled: Promise<{ value: boolean }>) {
      stateChange = undefined;
      return {
        isEnabled: jasmine.createSpy('isEnabled').and.returnValue(enabled),
        addListener: jasmine
          .createSpy('addListener')
          .and.callFake((_event: string, listener: StateChangeListener) => {
            stateChange = listener;
            return Promise.resolve({ remove: () => Promise.resolve() });
          }),
      };
    }

    function durationsOfInfoToasts(uiToast: UIToast): number[] {
      void uiToast.showInfoToast('TOAST_BREW_ADDED_SUCCESSFULLY');
      void uiToast.showInfoToastBottom('VISUALIZER.CONNECTION.SUCCESSFULLY');
      flushMicrotasks();
      return toasts.splice(0).map((toast) => toast.duration);
    }

    it('keeps the short duration where the state is not known (web)', fakeAsync(() => {
      const uiToast = createService(null);

      expect(durationsOfInfoToasts(uiToast)).toEqual([
        INFO_TOAST_DURATION_MS,
        INFO_TOAST_DURATION_MS,
      ]);
    }));

    it('shows info toasts longer while it is on, reading its state once', fakeAsync(() => {
      const plugin = screenReader(Promise.resolve({ value: true }));
      const uiToast = createService(plugin);
      flushMicrotasks();

      expect(durationsOfInfoToasts(uiToast)).toEqual([
        INFO_TOAST_DURATION_SCREEN_READER_MS,
        INFO_TOAST_DURATION_SCREEN_READER_MS,
      ]);
      durationsOfInfoToasts(uiToast);
      expect(plugin.isEnabled).toHaveBeenCalledTimes(1);
    }));

    it('follows the screen reader being turned on and off', fakeAsync(() => {
      const uiToast = createService(
        screenReader(Promise.resolve({ value: false })),
      );
      flushMicrotasks();
      expect(durationsOfInfoToasts(uiToast)).toEqual([
        INFO_TOAST_DURATION_MS,
        INFO_TOAST_DURATION_MS,
      ]);

      stateChange({ value: true });
      expect(durationsOfInfoToasts(uiToast)).toEqual([
        INFO_TOAST_DURATION_SCREEN_READER_MS,
        INFO_TOAST_DURATION_SCREEN_READER_MS,
      ]);

      stateChange({ value: false });
      expect(durationsOfInfoToasts(uiToast)).toEqual([
        INFO_TOAST_DURATION_MS,
        INFO_TOAST_DURATION_MS,
      ]);
    }));

    it('keeps the short duration when the state cannot be read', fakeAsync(() => {
      const uiToast = createService(
        screenReader(Promise.reject(new Error('unavailable'))),
      );
      const warn = spyOn(TestBed.inject(UILog), 'warn');
      flushMicrotasks();

      expect(warn).toHaveBeenCalledTimes(1);

      expect(durationsOfInfoToasts(uiToast)).toEqual([
        INFO_TOAST_DURATION_MS,
        INFO_TOAST_DURATION_MS,
      ]);
    }));

    it('does not change the duration of the automatic save countdown', fakeAsync(() => {
      const uiToast = createService(
        screenReader(Promise.resolve({ value: true })),
      );
      flushMicrotasks();

      void uiToast.showAutomaticSaveTimer(3);
      flushMicrotasks();

      expect(toasts[0].duration).toBe(3000);
      toasts[0].close('cancel');
      tick(3000);
    }));
  });
});

describe('SCREEN_READER', () => {
  it('is not used on the web', () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);

    expect(TestBed.inject(SCREEN_READER)).toBeNull();
  });

  it('is the screen reader plugin on a device', () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);

    // Plugin proxies answer every property, so Jasmine cannot print them.
    expect(TestBed.inject(SCREEN_READER) === ScreenReader).toBeTrue();
  });
});
