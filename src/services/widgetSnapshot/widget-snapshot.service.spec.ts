import { TestBed } from '@angular/core/testing';

import { App } from '@capacitor/app';

import { AppEvent } from '../../classes/appEvent/appEvent';
import { AppEventType } from '../../enums/appEvent/appEvent';
import type { WidgetSnapshot } from '../../stores/brews/widget-snapshot';
import { EventQueueService } from '../queueService/queue-service.service';
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewStorage } from '../uiBrewStorage';
import { UILog } from '../uiLog';
import { WidgetSnapshotService } from './widget-snapshot.service';

describe('WidgetSnapshotService', () => {
  let eventQueue: EventQueueService;
  let brews: unknown[];
  let brewsReady: () => Promise<unknown>;
  let widget: {
    setSnapshot: jasmine.Spy<(options: { snapshot: string }) => Promise<void>>;
    reload: jasmine.Spy<() => Promise<void>>;
  };
  let uiLog: jasmine.SpyObj<UILog>;

  function changeStorage(): void {
    eventQueue.dispatch(new AppEvent(AppEventType.STORAGE_CHANGED, undefined));
  }

  async function settle(): Promise<void> {
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  }

  function written(): WidgetSnapshot[] {
    return widget.setSnapshot.calls
      .allArgs()
      .map(([options]) => JSON.parse(options.snapshot) as WidgetSnapshot);
  }

  beforeEach(async () => {
    brews = [];
    brewsReady = () => Promise.resolve();
    uiLog = jasmine.createSpyObj<UILog>('UILog', ['log', 'error']);
    TestBed.configureTestingModule({
      providers: [
        { provide: UILog, useValue: uiLog },
        {
          provide: UIBrewStorage,
          useValue: {
            storageReady: () => brewsReady(),
            getRawEntries: () => brews,
          },
        },
        {
          provide: UIBeanStorage,
          useValue: {
            storageReady: () => Promise.resolve(),
            getRawEntries: () => [{ finished: false }],
          },
        },
      ],
    });
    eventQueue = TestBed.inject(EventQueueService);
    widget = {
      setSnapshot: jasmine.createSpy('setSnapshot').and.resolveTo(),
      reload: jasmine.createSpy('reload').and.resolveTo(),
    };
    const service = TestBed.inject(WidgetSnapshotService);
    // The plugin of Capacitor cannot be spied on.
    Object.assign(service, { widget });
    await App.addListener('pause', () => undefined);
    service.start();
    await App.addListener('pause', () => undefined);
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 10, 18, 10, 30));
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('writes nothing before the data was saved', async () => {
    jasmine.clock().tick(10000);
    await settle();

    expect(widget.setSnapshot).not.toHaveBeenCalled();
  });

  it('writes once, 3 seconds after the last of several saves, and redraws', async () => {
    changeStorage();
    jasmine.clock().tick(2999);
    changeStorage();
    jasmine.clock().tick(2999);
    await settle();
    expect(widget.setSnapshot).not.toHaveBeenCalled();

    brews.push({ config: { unix_timestamp: Date.now() / 1000 } });
    jasmine.clock().tick(1);
    await settle();

    expect(written()).toEqual([
      jasmine.objectContaining({ brewsToday: 1, openBeans: 1 }),
    ]);
    expect(widget.reload).toHaveBeenCalledTimes(1);
  });

  it('does not write the same snapshot again', async () => {
    changeStorage();
    jasmine.clock().tick(3000);
    await settle();
    changeStorage();
    jasmine.clock().tick(3000);
    await settle();

    expect(widget.setSnapshot).toHaveBeenCalledTimes(1);
  });

  it('writes after the brews were read again, from the brews read then', async () => {
    let finishRead: () => void = () => undefined;
    brewsReady = () =>
      new Promise<void>((_resolve) => {
        finishRead = _resolve;
      });
    changeStorage();
    jasmine.clock().tick(3000);
    await settle();
    expect(widget.setSnapshot).not.toHaveBeenCalled();

    brews.push({ config: { unix_timestamp: Date.now() / 1000 } });
    finishRead();
    await settle();

    expect(written()).toEqual([jasmine.objectContaining({ brewsToday: 1 })]);
  });

  it('keeps the last snapshot when the brews could not be read', async () => {
    brewsReady = () => Promise.reject(new Error('not read'));
    changeStorage();
    jasmine.clock().tick(3000);
    await settle();

    expect(widget.setSnapshot).not.toHaveBeenCalled();
  });

  it('writes at once when the app goes to the background', async () => {
    changeStorage();
    jasmine.clock().tick(1000);
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });
    try {
      document.dispatchEvent(new Event('visibilitychange'));
    } finally {
      delete (document as unknown as { hidden?: boolean }).hidden;
    }
    await settle();

    expect(widget.setSnapshot).toHaveBeenCalledTimes(1);
  });

  it('lets the app go on when the widget cannot be written', async () => {
    widget.setSnapshot.and.rejectWith(new Error('no app group'));
    changeStorage();
    jasmine.clock().tick(3000);
    await settle();
    widget.setSnapshot.and.resolveTo();
    changeStorage();
    jasmine.clock().tick(3000);
    await settle();

    expect(uiLog.error.calls.allArgs()).toEqual([
      ['Widget snapshot not written', 'no app group'],
    ]);
    // Not taken as written, so the next save tries again.
    expect(widget.setSnapshot).toHaveBeenCalledTimes(2);
  });
});
