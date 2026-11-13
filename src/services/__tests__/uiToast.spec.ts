import {
  fakeAsync,
  flushMicrotasks,
  TestBed,
  tick,
} from '@angular/core/testing';

import { ToastController } from '@ionic/angular/standalone';

import { TranslateService } from '@ngx-translate/core';

import {
  AnnouncementPoliteness,
  LIVE_REGION,
  LiveRegion,
} from '../a11y/live-region';
import { UIToast } from '../uiToast';

const TRANSLATIONS: Record<string, string> = {
  TOAST_BREW_ADDED_SUCCESSFULLY: 'Brew added successfully',
  'VISUALIZER.CONNECTION.SUCCESSFULLY': 'Connected to Visualizer',
  SAVING_BREW_COUNTDOWN: 'Saving brew in {{time}}',
  CANCEL: 'Cancel',
  SAVE_NOW: 'Save now',
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

  function createService(): UIToast {
    liveRegion = new FakeLiveRegion();
    toasts = [];
    withShadowRoot = true;
    TestBed.configureTestingModule({
      providers: [
        { provide: LIVE_REGION, useValue: liveRegion },
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
            create: (options: { message: string }) => {
              const toast = createToast(withShadowRoot);
              toast.message = options.message;
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
});
