import {
  fakeAsync,
  flushMicrotasks,
  TestBed,
  tick,
} from '@angular/core/testing';

import { AlertController, ModalController } from '@ionic/angular/standalone';

import { TranslateService } from '@ngx-translate/core';

import { createMockTranslateService } from '../../test-utils/mock-services';
import { PROGRESS_INTERVAL_MS } from '../a11y/announcer.service';
import { LIVE_REGION, LiveRegion } from '../a11y/live-region';
import { UIAlert } from '../uiAlert';

class FakeLiveRegion implements LiveRegion {
  public readonly heard: string[] = [];

  public announce(message: string): void {
    this.heard.push(message);
  }
}

/** An ion-modal as far as the service sees it. */
interface FakeModal {
  options: Record<string, any>;
  present: jasmine.Spy<() => Promise<void>>;
  dismiss: (data?: unknown) => Promise<boolean>;
  onWillDismiss: () => Promise<{ data?: unknown }>;
  /** Emits ionModalWillDismiss, which dismiss() does at once by default. */
  startClosing: (detail: { data?: unknown }) => void;
}

function createModal(options: Record<string, any>): FakeModal {
  let startClosing: (detail: { data?: unknown }) => void;
  const willDismiss = new Promise<{ data?: unknown }>((resolve) => {
    startClosing = resolve;
  });
  return {
    options,
    present: jasmine.createSpy('present').and.resolveTo(),
    dismiss: (data) => {
      startClosing({ data });
      return Promise.resolve(true);
    },
    onWillDismiss: () => willDismiss,
    startClosing: (detail) => startClosing(detail),
  };
}

describe('UIAlert loading spinner', () => {
  let liveRegion: FakeLiveRegion;
  let modals: FakeModal[];
  /** While set, ModalController.create() waits until the test releases it. */
  let holdCreate: boolean;
  let heldCreates: (() => void)[];
  let uiAlert: UIAlert;

  beforeEach(() => {
    liveRegion = new FakeLiveRegion();
    modals = [];
    holdCreate = false;
    heldCreates = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: LIVE_REGION, useValue: liveRegion },
        {
          provide: TranslateService,
          useValue: createMockTranslateService({
            PLEASE_WAIT: 'Please wait...',
          }),
        },
        { provide: AlertController, useValue: {} },
        {
          provide: ModalController,
          useValue: {
            create: (options: Record<string, any>) => {
              const modal = createModal(options);
              modals.push(modal);
              if (!holdCreate) {
                return Promise.resolve(modal);
              }
              return new Promise<FakeModal>((resolve) =>
                heldCreates.push(() => resolve(modal)),
              );
            },
          },
        },
      ],
    });
    uiAlert = TestBed.inject(UIAlert);
  });

  it('is a dialog named after its message that does not take focus', fakeAsync(() => {
    void uiAlert.showLoadingSpinner();
    flushMicrotasks();

    expect(modals.length).toBe(1);
    expect(modals[0].options).toEqual(
      jasmine.objectContaining({
        keyboardClose: false,
        htmlAttributes: { 'aria-label': 'Please wait...' },
        componentProps: jasmine.objectContaining({
          message: 'Please wait...',
        }),
      }),
    );
    expect(modals[0].present).toHaveBeenCalledTimes(1);
  }));

  it('announces its message once when it opens', fakeAsync(() => {
    void uiAlert.showLoadingSpinner();
    flushMicrotasks();
    tick(PROGRESS_INTERVAL_MS);

    expect(liveRegion.heard).toEqual(['Please wait...']);
  }));

  it('announces a new message at most once per interval, the latest one', fakeAsync(() => {
    void uiAlert.showLoadingSpinner('Reading the photo', false);
    flushMicrotasks();

    tick(1000);
    uiAlert.setLoadingSpinnerMessage('Reading the roaster');
    tick(1000);
    uiAlert.setLoadingSpinnerMessage('Reading the origin');
    expect(liveRegion.heard).toEqual(['Reading the photo']);

    tick(PROGRESS_INTERVAL_MS - 2000);
    expect(liveRegion.heard).toEqual([
      'Reading the photo',
      'Reading the origin',
    ]);
    void uiAlert.hideLoadingSpinner();
    flushMicrotasks();
  }));

  it('says nothing when it closes and drops a message update still waiting', fakeAsync(() => {
    void uiAlert.showLoadingSpinner();
    flushMicrotasks();
    tick(1000);
    uiAlert.setLoadingSpinnerMessage('Almost done');

    void uiAlert.hideLoadingSpinner();
    flushMicrotasks();
    tick(PROGRESS_INTERVAL_MS);

    expect(liveRegion.heard).toEqual(['Please wait...']);
    expect(uiAlert.isLoadingSpinnerShown()).toBeFalse();
  }));

  it('drops a waiting message update at once when hidden while it is still opening', fakeAsync(() => {
    void uiAlert.showLoadingSpinner();
    flushMicrotasks();
    tick(1000);
    uiAlert.setLoadingSpinnerMessage('Almost done');
    // Ionic does not start to close an overlay that is still opening.
    let finishOpening: () => void;
    modals[0].dismiss = (data) =>
      new Promise<boolean>((resolve) => {
        finishOpening = () => {
          modals[0].startClosing({ data });
          resolve(true);
        };
      });

    void uiAlert.hideLoadingSpinner();
    flushMicrotasks();
    uiAlert.setLoadingSpinnerMessage('Done');
    tick(PROGRESS_INTERVAL_MS);

    expect(liveRegion.heard).toEqual(['Please wait...']);
    finishOpening();
    flushMicrotasks();
    expect(uiAlert.isLoadingSpinnerShown()).toBeFalse();
  }));

  it('drops what was waiting for a loading spinner that another one opened at the same time replaces', fakeAsync(() => {
    holdCreate = true;
    void uiAlert.showLoadingSpinner('Connecting', false);
    void uiAlert.showLoadingSpinner('Reading the scale', false);
    flushMicrotasks();
    expect(heldCreates.length).toBe(2);

    heldCreates[0]();
    flushMicrotasks();
    tick(1000);
    uiAlert.setLoadingSpinnerMessage('Connected');
    heldCreates[1]();
    flushMicrotasks();
    tick(PROGRESS_INTERVAL_MS);

    // 'Connected' was meant for the first one, which is no longer on top.
    expect(liveRegion.heard).toEqual(['Connecting', 'Reading the scale']);
    void uiAlert.hideLoadingSpinner();
    flushMicrotasks();
  }));

  it('stops announcing once it is closed with its own cancel button', fakeAsync(() => {
    void uiAlert.showLoadingSpinner();
    flushMicrotasks();
    tick(1000);
    uiAlert.setLoadingSpinnerMessage('Still connecting');

    void modals[0].dismiss({ dismissed: true });
    flushMicrotasks();
    tick(PROGRESS_INTERVAL_MS);
    uiAlert.setLoadingSpinnerMessage('Giving up');
    tick(PROGRESS_INTERVAL_MS);

    expect(liveRegion.heard).toEqual(['Please wait...']);
    void uiAlert.hideLoadingSpinner();
    flushMicrotasks();
  }));

  it('does not repeat the message when another loading spinner replaces it', fakeAsync(() => {
    void uiAlert.showLoadingSpinner();
    flushMicrotasks();
    void uiAlert.showLoadingSpinner();
    flushMicrotasks();
    tick(PROGRESS_INTERVAL_MS);

    expect(modals.length).toBe(2);
    expect(liveRegion.heard).toEqual(['Please wait...']);

    // Updates go to the loading spinner on screen, not to the one it replaced.
    uiAlert.setLoadingSpinnerMessage('Saving');
    expect(liveRegion.heard).toEqual(['Please wait...', 'Saving']);
    void uiAlert.hideLoadingSpinner();
    flushMicrotasks();
  }));

  it('announces the message of one with a custom timeout and returns how it closed', fakeAsync(() => {
    let result: unknown;
    void uiAlert
      .showLoadingMessageWithCustomTimeout('Connecting', false, true, 5000)
      .then((data: unknown) => {
        result = data;
      });
    flushMicrotasks();

    expect(modals[0].options).toEqual(
      jasmine.objectContaining({
        keyboardClose: false,
        htmlAttributes: { 'aria-label': 'Connecting' },
        componentProps: {
          showDismissAfterSpecificTimeout: true,
          dismissTimeoutInMilliseconds: 5000,
          showLogs: false,
          message: 'Connecting',
        },
      }),
    );
    expect(liveRegion.heard).toEqual(['Connecting']);

    void modals[0].dismiss({ dismissed: true });
    flushMicrotasks();
    expect(result).toEqual({ dismissed: true });
  }));

  it('announces once while an action runs and closes afterwards', fakeAsync(() => {
    let done = false;
    void uiAlert
      .withLoadingSpinner(() => Promise.resolve('exported'))
      .then(() => (done = true));
    flushMicrotasks();
    tick(PROGRESS_INTERVAL_MS);

    expect(done).toBeTrue();
    expect(liveRegion.heard).toEqual(['Please wait...']);
    expect(uiAlert.isLoadingSpinnerShown()).toBeFalse();
  }));
});
