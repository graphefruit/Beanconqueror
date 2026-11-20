import { TestBed } from '@angular/core/testing';

import { Platform } from '@ionic/angular';

import { AutomaticBackupService } from '../automaticBackup/automatic-backup.service';
import { UIAlert } from '../uiAlert';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIExportImportHelper } from '../uiExportImportHelper';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';
import { WidgetSnapshotService } from '../widgetSnapshot/widget-snapshot.service';
import { IosPlatformService } from './ios-platform.service';

describe('IosPlatformService', () => {
  let finishWriting: () => void;
  let saveAutomaticBackups: jasmine.Spy;
  let readMills: jasmine.Spy;
  let start: jasmine.Spy;
  let startWidgetSnapshot: jasmine.Spy;

  /** What the service hands to the automatic backups to write them. */
  function save(): Promise<unknown> {
    return (start.calls.mostRecent().args[1] as () => Promise<unknown>)();
  }

  /** Lets what is waiting for an answer go on. */
  async function settle(): Promise<void> {
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  }

  beforeEach(() => {
    saveAutomaticBackups = jasmine
      .createSpy('saveAutomaticBackups')
      .and.returnValue(
        new Promise<void>((_resolve) => (finishWriting = _resolve)),
      );
    readMills = jasmine.createSpy('get').and.resolveTo([]);
    start = jasmine.createSpy('start');
    startWidgetSnapshot = jasmine.createSpy('startWidgetSnapshot');
    TestBed.configureTestingModule({
      providers: [
        IosPlatformService,
        { provide: UIStorage, useValue: { get: readMills } },
        { provide: UILog, useValue: {} },
        {
          provide: UIFileHelper,
          useValue: { deleteOldAutomaticBackups: () => Promise.resolve() },
        },
        { provide: AutomaticBackupService, useValue: { start } },
        {
          provide: Platform,
          useValue: {
            is: (_name: string) => _name === 'capacitor' || _name === 'ios',
          },
        },
        {
          provide: UIHelper,
          useValue: { isBeanconqurorAppReady: () => Promise.resolve() },
        },
        { provide: UISettingsStorage, useValue: {} },
        { provide: UIBrewStorage, useValue: {} },
        { provide: UIAlert, useValue: {} },
        { provide: UIExportImportHelper, useValue: { saveAutomaticBackups } },
        {
          provide: WidgetSnapshotService,
          useValue: { start: startWidgetSnapshot },
        },
      ],
    });
    TestBed.inject(IosPlatformService);
  });

  it('lets a run of the automatic backups only end once the files are written', async () => {
    expect(start).toHaveBeenCalledOnceWith(
      'iOS-Platform',
      jasmine.any(Function),
    );
    let done = false;
    void save().then(() => (done = true));

    await settle();
    expect(saveAutomaticBackups).toHaveBeenCalledTimes(1);
    expect(done).toBeFalse();

    finishWriting();
    await settle();
    expect(done).toBeTrue();
  });

  it('starts the widget snapshot', () => {
    expect(startWidgetSnapshot).toHaveBeenCalledTimes(1);
  });

  it('writes nothing and ends the run when the database cannot be read', async () => {
    readMills.and.rejectWith(new Error('read failed'));

    await expectAsync(save()).toBeResolved();

    expect(saveAutomaticBackups).not.toHaveBeenCalled();
  });
});
