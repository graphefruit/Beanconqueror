import { TestBed } from '@angular/core/testing';

import { Platform } from '@ionic/angular';

import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';

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
import { AndroidPlatformService } from './android-platform.service';

describe('AndroidPlatformService', () => {
  it('lets a run of the automatic backups only end once the files are written', async () => {
    let finishWriting!: () => void;
    const saveAutomaticBackups = jasmine
      .createSpy('saveAutomaticBackups')
      .and.returnValue(
        new Promise<void>((_resolve) => (finishWriting = _resolve)),
      );
    const start = jasmine.createSpy('start');
    const startWidgetSnapshot = jasmine.createSpy('startWidgetSnapshot');
    TestBed.configureTestingModule({
      providers: [
        AndroidPlatformService,
        { provide: UIStorage, useValue: {} },
        { provide: UILog, useValue: {} },
        {
          provide: UIFileHelper,
          useValue: { deleteOldAutomaticBackups: () => Promise.resolve() },
        },
        { provide: AutomaticBackupService, useValue: { start } },
        {
          provide: Platform,
          useValue: {
            is: (_name: string) => _name === 'capacitor' || _name === 'android',
          },
        },
        {
          provide: UIHelper,
          useValue: { isBeanconqurorAppReady: () => Promise.resolve() },
        },
        { provide: AndroidPermissions, useValue: {} },
        { provide: UIAlert, useValue: {} },
        { provide: UISettingsStorage, useValue: {} },
        { provide: UIBrewStorage, useValue: {} },
        { provide: UIExportImportHelper, useValue: { saveAutomaticBackups } },
        {
          provide: WidgetSnapshotService,
          useValue: { start: startWidgetSnapshot },
        },
      ],
    });
    TestBed.inject(AndroidPlatformService);

    expect(start).toHaveBeenCalledOnceWith(
      'android-Platform',
      jasmine.any(Function),
    );
    expect(startWidgetSnapshot).toHaveBeenCalledTimes(1);
    let done = false;
    void (start.calls.mostRecent().args[1]() as Promise<unknown>).then(
      () => (done = true),
    );

    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
    expect(saveAutomaticBackups).toHaveBeenCalledTimes(1);
    expect(done).toBeFalse();

    finishWriting();
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
    expect(done).toBeTrue();
  });
});
