import { TestBed } from '@angular/core/testing';

import { App } from '@capacitor/app';
import { AppWeb } from '@capacitor/app/dist/esm/web';

import { AppEvent } from '../../classes/appEvent/appEvent';
import { AppEventType } from '../../enums/appEvent/appEvent';
import { EventQueueService } from '../queueService/queue-service.service';
import { UILog } from '../uiLog';
import { AutomaticBackupService } from './automatic-backup.service';

describe('AutomaticBackupService', () => {
  /** The runs started so far, each waiting to be finished or failed. */
  let runs: { finish: () => void; fail: () => void }[];
  let uiLog: jasmine.SpyObj<UILog>;
  let eventQueue: EventQueueService;

  function changeStorage(): void {
    eventQueue.dispatch(new AppEvent(AppEventType.STORAGE_CHANGED, undefined));
  }

  /** Lets what is waiting for the end of a run go on. */
  async function settle(): Promise<void> {
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  }

  /** Sends the app into the background as the browser tells it. */
  function pauseApp(): void {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });
    try {
      document.dispatchEvent(new Event('visibilitychange'));
    } finally {
      delete (document as any).hidden;
    }
  }

  beforeEach(async () => {
    runs = [];
    uiLog = jasmine.createSpyObj<UILog>('UILog', ['log', 'error']);
    TestBed.configureTestingModule({
      providers: [{ provide: UILog, useValue: uiLog }],
    });
    eventQueue = TestBed.inject(EventQueueService);
    // The first call loads the plugin; the listener of the service is only
    // attached before the one below once it is loaded.
    await App.addListener('pause', () => undefined);
    TestBed.inject(AutomaticBackupService).start(
      'test-Platform',
      () =>
        new Promise<void>((_resolve, _reject) =>
          runs.push({
            finish: _resolve,
            fail: () => _reject(new Error('not written')),
          }),
        ),
    );
    // Resolves after the listener of the service is attached.
    await App.addListener('pause', () => undefined);
    jasmine.clock().install();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('writes once, 3 seconds after the last of several changes', () => {
    changeStorage();
    jasmine.clock().tick(2999);
    changeStorage();
    jasmine.clock().tick(2999);
    expect(runs.length).toBe(0);

    jasmine.clock().tick(1);

    expect(runs.length).toBe(1);
    expect(uiLog.log.calls.allArgs()).toEqual([
      ['test-Platform - Start to export ZIP file'],
    ]);
  });

  it('writes exactly once more after a run during which two changes were due', async () => {
    changeStorage();
    jasmine.clock().tick(3000);
    changeStorage();
    jasmine.clock().tick(3000);
    changeStorage();
    jasmine.clock().tick(3000);
    await settle();
    expect(runs.length).toBe(1);

    runs[0].finish();
    await settle();
    expect(runs.length).toBe(2);

    runs[1].finish();
    await settle();
    jasmine.clock().tick(3000);
    expect(runs.length).toBe(2);
  });

  it('writes again after a change that follows a failed run', async () => {
    changeStorage();
    jasmine.clock().tick(3000);
    runs[0].fail();
    await settle();
    expect(uiLog.error.calls.count()).toBe(1);
    expect(runs.length).toBe(1);

    changeStorage();
    jasmine.clock().tick(3000);

    expect(runs.length).toBe(2);
  });

  it('writes once more after a failed run during which a change was due', async () => {
    changeStorage();
    jasmine.clock().tick(3000);
    changeStorage();
    jasmine.clock().tick(3000);

    runs[0].fail();
    await settle();

    expect(runs.length).toBe(2);
  });

  it('writes again after a change that follows a run that never ends', async () => {
    changeStorage();
    jasmine.clock().tick(3000);
    changeStorage();
    jasmine.clock().tick(3000);
    jasmine.clock().tick(5 * 60 * 1000 - 3001);
    await settle();
    expect(runs.length).toBe(1);
    expect(uiLog.error.calls.count()).toBe(0);

    jasmine.clock().tick(1);
    await settle();
    expect(uiLog.error.calls.count()).toBe(1);
    // The change that was due during the run.
    expect(runs.length).toBe(2);

    jasmine.clock().tick(5 * 60 * 1000);
    await settle();
    expect(runs.length).toBe(2);
    changeStorage();
    jasmine.clock().tick(3000);
    expect(runs.length).toBe(3);
  });

  it('writes at once when the app is paused while a change waits', () => {
    changeStorage();
    jasmine.clock().tick(1000);

    pauseApp();

    expect(runs.length).toBe(1);
    jasmine.clock().tick(3000);
    expect(runs.length).toBe(1);
  });

  it('writes at once when the app becomes inactive while a change waits, before it is paused', async () => {
    const addListener = spyOn(
      AppWeb.prototype,
      'addListener',
    ).and.callThrough();
    await App.addListener('resume', () => undefined);
    const plugin = addListener.calls.mostRecent().object as unknown as {
      notifyListeners(_event: string, _data: unknown): void;
    };
    changeStorage();
    jasmine.clock().tick(1000);

    plugin.notifyListeners('appStateChange', { isActive: true });
    expect(runs.length).toBe(0);
    plugin.notifyListeners('appStateChange', { isActive: false });

    expect(runs.length).toBe(1);
    jasmine.clock().tick(3000);
    expect(runs.length).toBe(1);
  });

  it('writes nothing when the app is paused without a change waiting', async () => {
    pauseApp();
    expect(runs.length).toBe(0);

    changeStorage();
    jasmine.clock().tick(3000);
    runs[0].finish();
    await settle();
    pauseApp();

    expect(runs.length).toBe(1);
  });

  it('does not start a second run when the app is paused during a run', async () => {
    changeStorage();
    jasmine.clock().tick(3000);

    pauseApp();
    await settle();
    expect(runs.length).toBe(1);

    runs[0].finish();
    await settle();
    expect(runs.length).toBe(1);
  });

  it('writes once more after the run when the app is paused during a run while a change waits', async () => {
    changeStorage();
    jasmine.clock().tick(3000);
    changeStorage();
    jasmine.clock().tick(1000);

    pauseApp();
    await settle();
    expect(runs.length).toBe(1);

    runs[0].finish();
    await settle();
    expect(runs.length).toBe(2);
    jasmine.clock().tick(3000);
    expect(runs.length).toBe(2);
  });
});
