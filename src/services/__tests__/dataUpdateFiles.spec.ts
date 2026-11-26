import { TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular';
import { Storage } from '@ionic/storage';

import { FilesystemWeb } from '@capacitor/filesystem/dist/esm/web';
import { TranslateService } from '@ngx-translate/core';

import { StorageClass } from '../../classes/storageClass';
import { createLegacyData } from '../../test-utils/legacy-data-fixture';
import { createMockTranslateService } from '../../test-utils/mock-services';
import { DeletionJournalService } from '../deletionJournal/deletion-journal.service';
import { DeviceIdentityService } from '../deviceIdentity/device-identity.service';
import { EventQueueService } from '../queueService/queue-service.service';
import { ShareService } from '../shareService/share-service.service';
import { UIAlert } from '../uiAlert';
import { UIBaristamodeBrewStorage } from '../uiBaristamodeBrewStorage';
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIExportImportHelper } from '../uiExportImportHelper';
import { UIFileHelper } from '../uiFileHelper';
import { UIGraphStorage } from '../uiGraphStorage.service';
import { UIGreenBeanStorage } from '../uiGreenBeanStorage';
import { UILog } from '../uiLog';
import { UIMillStorage } from '../uiMillStorage';
import { UIPreparationStorage } from '../uiPreparationStorage';
import { UIRoastingMachineStorage } from '../uiRoastingMachineStorage';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';
import { UIUpdate } from '../uiUpdate';
import { UiVersionStorage } from '../uiVersionStorage';
import { UIWaterStorage } from '../uiWaterStorage';

/** The methods of UIFileHelper that change or remove files. */
const FILE_CHANGES = [
  'deleteFile',
  'deleteInternalFile',
  'deleteExternalSharedFile',
  'deleteOldAutomaticBackups',
  'renameInternalFile',
] as const;

/** The methods of the file system that change or remove files. */
const FILE_SYSTEM_CHANGES = ['deleteFile', 'rename', 'copy', 'rmdir'] as const;

/** Behaves like IndexedDB: values are copied when written and read. */
function createDeviceDatabase(_initial: Record<string, unknown>) {
  const data = new Map<string, unknown>(
    Object.entries(structuredClone(_initial)),
  );
  return {
    data,
    database: {
      set: (_key: string, _value: unknown) => {
        data.set(_key, structuredClone(_value));
        return Promise.resolve();
      },
      remove: (_key: string) => {
        data.delete(_key);
        return Promise.resolve();
      },
      get: (_key: string) =>
        Promise.resolve(
          data.has(_key) ? structuredClone(data.get(_key)) : null,
        ),
      forEach: (_cb: (value: unknown, key: string, i: number) => void) => {
        let i = 0;
        for (const [key, value] of data) {
          _cb(structuredClone(value), key, i++);
        }
        return Promise.resolve();
      },
    },
  };
}

const STORAGES = [
  UIBeanStorage,
  UIBrewStorage,
  UIMillStorage,
  UIPreparationStorage,
  UIWaterStorage,
  UIGreenBeanStorage,
  UIRoastingMachineStorage,
  UIGraphStorage,
  UIBaristamodeBrewStorage,
  UISettingsStorage,
  UiVersionStorage,
];

describe('The data updates of 9.0', () => {
  beforeEach(() => {
    // Failed writes show an alert; that is not part of these tests.
    spyOn(StorageClass.prototype as any, 'showAlertSafely').and.resolveTo();
  });

  it('change no files: no file is deleted, renamed, moved or copied while they run', async () => {
    // Data of 8.8 with every update up to UPDATE_15 done; the updates of
    // 9.0 have something to do in each collection they touch.
    const legacy = createLegacyData({ brews: 20, beans: 4 });
    legacy.BEANS.push(structuredClone(legacy.BEANS[1]));
    legacy.MILL.push(structuredClone(legacy.MILL[0]));
    const device = createDeviceDatabase(legacy);
    const fileHelper: Record<string, jasmine.Spy> = Object.fromEntries(
      FILE_CHANGES.map((_method) => [_method, jasmine.createSpy(_method)]),
    );
    const fileSystem = FILE_SYSTEM_CHANGES.map((_method) =>
      spyOn(FilesystemWeb.prototype, _method).and.rejectWith(
        new Error(`${_method} called`),
      ),
    );
    const writeBackupBeforeMigration = jasmine
      .createSpy('writeBackupBeforeMigration')
      .and.resolveTo(true);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Storage,
          useValue: { create: () => Promise.resolve(device.database) },
        },
        { provide: EventQueueService, useValue: { dispatch: () => undefined } },
        { provide: TranslateService, useValue: createMockTranslateService() },
        {
          provide: DeviceIdentityService,
          useValue: { getDeviceId: () => 'device-a' },
        },
        {
          provide: DeletionJournalService,
          useValue: {
            record: () => Promise.resolve(),
            forgetExistingEntries: () => Promise.resolve(),
          },
        },
        {
          provide: UILog,
          useValue: {
            log: () => undefined,
            info: () => undefined,
            error: () => undefined,
            debug: () => undefined,
          },
        },
        { provide: UIFileHelper, useValue: fileHelper },
        {
          provide: UIExportImportHelper,
          useValue: { writeBackupBeforeMigration },
        },
        { provide: Platform, useValue: { is: () => true } },
        { provide: ModalController, useValue: {} },
        {
          provide: UIAlert,
          useValue: {
            isLoadingSpinnerShown: () => false,
            showConfirmWithYesNoTranslation: () => Promise.resolve('NO'),
          },
        },
        { provide: ShareService, useValue: {} },
      ],
    });
    await TestBed.inject(UIStorage).init();
    for (const type of STORAGES) {
      const storage = TestBed.inject<StorageClass>(type);
      await storage.initializeStorage();
    }

    await TestBed.inject(UIUpdate).checkUpdate();

    expect(writeBackupBeforeMigration).toHaveBeenCalledOnceWith('UPDATE_16');
    const done = (
      device.data.get('VERSION') as { updatedDataVersions: string[] }[]
    )[0].updatedDataVersions;
    expect(done).toEqual(
      jasmine.arrayContaining([
        'UPDATE_16',
        'UPDATE_17',
        'UPDATE_18',
        'UPDATE_19',
      ]),
    );
    for (const method of FILE_CHANGES) {
      expect(fileHelper[method]).withContext(method).not.toHaveBeenCalled();
    }
    for (const [i, spy] of fileSystem.entries()) {
      expect(spy).withContext(FILE_SYSTEM_CHANGES[i]).not.toHaveBeenCalled();
    }
  });
});
