import {
  fakeAsync,
  flushMicrotasks,
  TestBed,
  tick,
} from '@angular/core/testing';

import { AlertController, ModalController } from '@ionic/angular';

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

describe('UIAlert database dialog', () => {
  let alerts: { options: Record<string, any>; dismiss: () => void }[];
  let uiAlert: UIAlert;

  beforeEach(() => {
    alerts = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: LIVE_REGION, useValue: new FakeLiveRegion() },
        { provide: TranslateService, useValue: createMockTranslateService() },
        { provide: ModalController, useValue: {} },
        {
          provide: AlertController,
          useValue: {
            create: (options: Record<string, any>) => {
              let dismiss: () => void;
              const dismissed = new Promise<void>((_resolve) => {
                dismiss = _resolve;
              });
              alerts.push({ options, dismiss: () => dismiss() });
              return Promise.resolve({
                present: () => Promise.resolve(),
                onDidDismiss: () => dismissed,
              });
            },
          },
        },
      ],
    });
    uiAlert = TestBed.inject(UIAlert);
  });

  it('only offers to reload the app and cannot be closed otherwise', fakeAsync(() => {
    void uiAlert.showIOSIndexedDBIssues('MESSAGE', 'TITLE', true);
    flushMicrotasks();

    expect(alerts.length).toBe(1);
    expect(alerts[0].options.backdropDismiss).toBeFalse();
    expect(
      alerts[0].options.buttons.map(
        (_button: { text: string }) => _button.text,
      ),
    ).toEqual(['RELOAD_APP']);
  }));

  it('also offers to choose a backup and resolves once that is pressed', fakeAsync(() => {
    let resolved = false;
    void uiAlert
      .showIOSIndexedDBIssues('MESSAGE', 'TITLE', true, 'CHOOSE_BACKUP')
      .then(() => (resolved = true));
    flushMicrotasks();

    const [reload, chooseBackup] = alerts[0].options.buttons;
    expect(reload.text).toBe('RELOAD_APP');
    expect(chooseBackup.text).toBe('CHOOSE_BACKUP');
    // The alert closes by itself for a button without a handler.
    expect(chooseBackup.handler).toBeUndefined();
    expect(resolved).toBeFalse();

    alerts[0].dismiss();
    flushMicrotasks();

    expect(resolved).toBeTrue();
  }));
});

describe('UIAlert message with technical details', () => {
  let alerts: { options: Record<string, any>; element: HTMLElement }[];
  let dismiss: () => void;
  let uiAlert: UIAlert;

  beforeEach(() => {
    alerts = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: LIVE_REGION, useValue: new FakeLiveRegion() },
        {
          provide: TranslateService,
          useValue: createMockTranslateService({
            ERROR_ON_FILE_READING: 'Error while reading file data',
            TECHNICAL_DETAILS: 'Technical details:',
            OK: 'Ok',
          }),
        },
        { provide: ModalController, useValue: {} },
        {
          provide: AlertController,
          useValue: {
            // As ion-alert renders it once created: the message as text.
            create: (options: Record<string, any>) => {
              const element = document.createElement('div');
              const message = document.createElement('div');
              message.className = 'alert-message';
              message.textContent = options.message;
              element.append(message);
              alerts.push({ options, element });
              const dismissed = new Promise<void>((_resolve) => {
                dismiss = _resolve;
              });
              return Promise.resolve(
                Object.assign(element, {
                  present: () => Promise.resolve(),
                  onDidDismiss: () => dismissed,
                }),
              );
            },
          },
        },
      ],
    });
    uiAlert = TestBed.inject(UIAlert);
  });

  /** The texts of the message, in reading order, one per element. */
  function texts(): string[] {
    const message = alerts[0].element.querySelector('.alert-message');
    return [
      message.firstChild.textContent,
      ...Array.from(message.querySelectorAll('p'), (_p) => _p.textContent),
    ];
  }

  it('shows the message first and the technical cause apart below it', fakeAsync(() => {
    void uiAlert.showMessageWithDetails(
      'ERROR_ON_FILE_READING',
      new TypeError('x is null'),
    );
    flushMicrotasks();

    expect(alerts.length).toBe(1);
    expect(alerts[0].options.message).toBe('Error while reading file data');
    expect(alerts[0].options.header).toBeUndefined();
    expect(alerts[0].options.buttons).toEqual([{ text: 'Ok' }]);
    expect(texts()).toEqual([
      'Error while reading file data',
      'Technical details:',
      'TypeError: x is null',
    ]);
    const details = alerts[0].element.querySelector('.alert-details');
    expect(details.querySelector('.alert-details-label').textContent).toBe(
      'Technical details:',
    );
  }));

  it('shows a cause that is no error as its content, and markup as text', fakeAsync(() => {
    void uiAlert.showMessageWithDetails('ERROR_ON_FILE_READING', {
      code: 'OS-PLUG-FILE-0008',
      message: '<b>gone</b>',
    });
    flushMicrotasks();

    expect(texts()[2]).toBe(
      '{"code":"OS-PLUG-FILE-0008","message":"<b>gone</b>"}',
    );
    expect(alerts[0].element.querySelector('b')).toBeNull();
  }));

  it('shows the kind of a cause that refers to itself', fakeAsync(() => {
    const cause: Record<string, unknown> = {};
    cause['self'] = cause;
    void uiAlert.showMessageWithDetails('ERROR_ON_FILE_READING', cause);
    flushMicrotasks();

    expect(texts()[2]).toBe('object');
  }));

  it('shows only the message without details', fakeAsync(() => {
    void uiAlert.showMessageWithDetails('ERROR_ON_FILE_READING', undefined);
    flushMicrotasks();

    expect(texts()).toEqual(['Error while reading file data']);
    expect(alerts[0].element.querySelector('.alert-details')).toBeNull();
  }));

  it('resolves once the alert was closed', fakeAsync(() => {
    let resolved = false;
    void uiAlert
      .showMessageWithDetails('ERROR_ON_FILE_READING', 'not a zip')
      .then(() => (resolved = true));
    flushMicrotasks();
    expect(texts()[2]).toBe('not a zip');
    expect(resolved).toBeFalse();

    dismiss();
    flushMicrotasks();

    expect(resolved).toBeTrue();
  }));

  it('shows a list below the message, which a screen reader reads as one, its items as text', fakeAsync(() => {
    let resolved = false;
    void uiAlert
      .showMessageWithList('DONE', 'TITLE', 'NOT_TAKEN_OVER', [
        'Row 3: no name',
        '<b>Row 4</b>',
      ])
      .then(() => (resolved = true));
    flushMicrotasks();

    expect(alerts[0].options.header).toBe('TITLE');
    expect(alerts[0].options.message).toBe('DONE');
    expect(alerts[0].options.buttons).toEqual([{ text: 'Ok' }]);
    expect(texts()).toEqual(['DONE', 'NOT_TAKEN_OVER']);
    const items = alerts[0].element.querySelectorAll(
      '.alert-details > ul > li',
    );
    expect(Array.from(items, (_item) => _item.textContent)).toEqual([
      'Row 3: no name',
      '<b>Row 4</b>',
    ]);
    expect(alerts[0].element.querySelector('b')).toBeNull();
    expect(resolved).toBeFalse();

    dismiss();
    flushMicrotasks();

    expect(resolved).toBeTrue();
  }));
});
