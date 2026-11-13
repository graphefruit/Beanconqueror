import {
  fakeAsync,
  flushMicrotasks,
  TestBed,
  tick,
} from '@angular/core/testing';

import { Platform } from '@ionic/angular/standalone';

import { Subject } from 'rxjs';

import { AppEventType } from '../../enums/appEvent/appEvent';
import { EventQueueService } from '../queueService/queue-service.service';
import { UIAlert } from '../uiAlert';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIExportImportHelper } from '../uiExportImportHelper';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';
import { IosPlatformService } from './ios-platform.service';

describe('IosPlatformService', () => {
  function startService(_platforms: string[], _readable: boolean) {
    const storageChanged = new Subject<unknown>();
    const on = jasmine.createSpy('on').and.returnValue(storageChanged);
    const saveAutomaticBackups = jasmine.createSpy('saveAutomaticBackups');
    // What UIStorage does with a database that cannot be read: get() gives
    // up with null, as for a missing value, and only getOrFail() rejects.
    const uiStorage = {
      get: jasmine.createSpy('get').and.resolveTo(null),
      getOrFail: jasmine
        .createSpy('getOrFail')
        .and.callFake(() =>
          _readable
            ? Promise.resolve([])
            : Promise.reject(new Error('could not be read')),
        ),
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        IosPlatformService,
        { provide: UIStorage, useValue: uiStorage },
        { provide: UILog, useValue: { log: () => undefined } },
        {
          provide: UIFileHelper,
          useValue: {
            deleteZIPBackupsOlderThanSevenDays: () => Promise.resolve(),
          },
        },
        { provide: EventQueueService, useValue: { on } },
        {
          provide: Platform,
          useValue: { is: (_name: string) => _platforms.includes(_name) },
        },
        {
          provide: UIHelper,
          useValue: { isBeanconqurorAppReady: () => Promise.resolve() },
        },
        { provide: UISettingsStorage, useValue: {} },
        { provide: UIBrewStorage, useValue: {} },
        { provide: UIAlert, useValue: {} },
        { provide: UIExportImportHelper, useValue: { saveAutomaticBackups } },
      ],
    });
    TestBed.inject(IosPlatformService);
    return { storageChanged, on, saveAutomaticBackups, uiStorage };
  }

  it('writes the automatic backups three seconds after the last change', fakeAsync(() => {
    const { storageChanged, on, saveAutomaticBackups } = startService(
      ['capacitor', 'ios'],
      true,
    );

    storageChanged.next(undefined);
    tick(2000);
    storageChanged.next(undefined);
    tick(2999);
    flushMicrotasks();
    expect(saveAutomaticBackups).not.toHaveBeenCalled();
    tick(1);
    flushMicrotasks();

    expect(on).toHaveBeenCalledOnceWith(AppEventType.STORAGE_CHANGED);
    expect(saveAutomaticBackups).toHaveBeenCalledTimes(1);
  }));

  it('writes no automatic backup while the database cannot be read', fakeAsync(() => {
    const { storageChanged, saveAutomaticBackups, uiStorage } = startService(
      ['capacitor', 'ios'],
      false,
    );

    storageChanged.next(undefined);
    tick(3000);
    flushMicrotasks();

    expect(uiStorage.getOrFail).toHaveBeenCalledOnceWith('MILL');
    expect(saveAutomaticBackups).not.toHaveBeenCalled();
  }));

  it('does nothing on other platforms', fakeAsync(() => {
    const { on } = startService(['capacitor', 'android'], true);

    tick(3000);

    expect(on).not.toHaveBeenCalled();
  }));
});
