import { TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular/standalone';
import { Storage } from '@ionic/storage';

import { LAST_RESTORE_STORAGE_KEY } from '../../classes/changeTracking/localStorageKeys';
import { IRestoreNote } from '../../interfaces/changeTracking/iRestoreNote';
import { EventQueueService } from '../queueService/queue-service.service';
import { UIAlert } from '../uiAlert';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIExportImportHelper } from '../uiExportImportHelper';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';

function entries(prefix: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    config: {
      uuid: `${prefix}-${i}`,
      unix_timestamp: 1600000000 + i,
      created_at: 1600000000000 + i * 1000,
      updated_at: 0,
      rev: 0,
      updated_by: '',
    },
    note: `${prefix} ${i}`,
  }));
}

/** Behaves like IndexedDB: values are copied when written and read. */
function createDeviceDatabase(_initial: Record<string, unknown>) {
  const data = new Map<string, unknown>(
    Object.entries(structuredClone(_initial)),
  );
  const failingWrites = new Set<string>();
  return {
    data,
    failingWrites,
    database: {
      set: (key: string, value: unknown) => {
        if (failingWrites.delete(key)) {
          return Promise.reject(new Error('write failed'));
        }
        data.set(key, structuredClone(value));
        return Promise.resolve();
      },
      get: (key: string) =>
        Promise.resolve(data.has(key) ? structuredClone(data.get(key)) : null),
      forEach: (cb: (value: unknown, key: string, i: number) => void) => {
        let i = 0;
        for (const [key, value] of data) {
          cb(structuredClone(value), key, i++);
        }
        return Promise.resolve();
      },
    },
  };
}

/**
 * The app on a device storing `_stored`. `_internalBackup` is its internal
 * backup file, which the check at start-up reads.
 */
async function startDevice(
  _stored: Record<string, unknown>,
  _internalBackup?: Uint8Array,
) {
  const device = createDeviceDatabase(_stored);
  const uiLog = {
    log: () => undefined,
    info: () => undefined,
    error: jasmine.createSpy('error'),
    debug: () => undefined,
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      UIStorage,
      UIExportImportHelper,
      {
        provide: Storage,
        useValue: { create: () => Promise.resolve(device.database) },
      },
      { provide: EventQueueService, useValue: { dispatch: () => undefined } },
      { provide: UILog, useValue: uiLog },
      {
        provide: UIHelper,
        useValue: { cloneData: <T>(v: T): T => structuredClone(v) },
      },
      // The internal backup is only checked in the app.
      {
        provide: Platform,
        useValue: { is: (_platform: string) => _platform === 'capacitor' },
      },
      {
        provide: UIFileHelper,
        useValue: {
          readInternalFileAsUint8Array: () => Promise.resolve(_internalBackup),
        },
      },
      {
        provide: UIAlert,
        useValue: {
          showLoadingSpinner: () => Promise.resolve(),
          hideLoadingSpinner: () => Promise.resolve(),
        },
      },
      { provide: UISettingsStorage, useValue: {} },
      { provide: UIBrewStorage, useValue: {} },
      { provide: ModalController, useValue: {} },
    ],
  });
  const uiStorage = TestBed.inject(UIStorage);
  await uiStorage.init();
  return {
    ...device,
    uiLog,
    uiStorage,
    helper: TestBed.inject(UIExportImportHelper),
  };
}

const PREVIOUS_NOTE: IRestoreNote = {
  last_restore_at: 5,
  source: 'import',
  record_count: 9,
};

describe('The note about the last import', () => {
  it('records when, from where and how many entries were stored', async () => {
    const device = await startDevice({
      SETTINGS: [{ language: 'de' }],
      BREWS: entries('own-brew', 2),
      [LAST_RESTORE_STORAGE_KEY]: PREVIOUS_NOTE,
    });
    const brews = entries('brew', 3);
    const started = Date.now();

    await device.uiStorage.import(
      {
        SETTINGS: [{ language: 'en' }],
        // The identical copy of a brew is not stored, so it is not counted.
        BREWS: [...brews, structuredClone(brews[0])],
        BEANS: entries('bean', 2),
        MILL: entries('mill', 1),
      },
      'internal_backup',
    );

    const note = device.data.get(LAST_RESTORE_STORAGE_KEY) as IRestoreNote;
    expect(note).toEqual({
      last_restore_at: jasmine.any(Number),
      source: 'internal_backup',
      record_count: 6,
    });
    expect(note.last_restore_at).toBeGreaterThanOrEqual(started);
    expect(note.last_restore_at).toBeLessThanOrEqual(Date.now());
  });

  it('takes an import without a source for a file chosen in the settings', async () => {
    const device = await startDevice({ SETTINGS: [{ language: 'de' }] });

    await device.uiStorage.import({
      SETTINGS: [{ language: 'en' }],
      BREWS: entries('brew', 2),
    });

    expect(device.data.get(LAST_RESTORE_STORAGE_KEY)).toEqual({
      last_restore_at: jasmine.any(Number),
      source: 'import',
      record_count: 2,
    });
  });

  it('keeps the name of the file chosen in the settings', async () => {
    const device = await startDevice({ SETTINGS: [{ language: 'de' }] });

    await device.uiStorage.import(
      { SETTINGS: [{ language: 'en' }], BREWS: entries('brew', 2) },
      'import',
      'Beanconqueror 2.zip',
    );

    expect(device.data.get(LAST_RESTORE_STORAGE_KEY)).toEqual({
      last_restore_at: jasmine.any(Number),
      source: 'import',
      record_count: 2,
      file_name: 'Beanconqueror 2.zip',
    });
  });

  it('is the only mark: imported entries keep the change info they came with', async () => {
    const device = await startDevice({ SETTINGS: [{ language: 'de' }] });
    const brew = {
      config: {
        uuid: 'brew-from-elsewhere',
        unix_timestamp: 1600000000,
        created_at: 1600000000000,
        updated_at: 1700000000000,
        rev: 7,
        updated_by: 'other-device',
      },
    };

    await device.uiStorage.import({ SETTINGS: [{}], BREWS: [brew] });

    expect(device.data.get('BREWS')).toEqual([brew]);
  });

  it('stays as it was when the import was rolled back', async () => {
    const device = await startDevice({
      SETTINGS: [{ language: 'de' }],
      BREWS: entries('own-brew', 2),
      [LAST_RESTORE_STORAGE_KEY]: PREVIOUS_NOTE,
    });
    device.failingWrites.add('BREWS');

    const result = await device.uiStorage.import({
      SETTINGS: [{ language: 'en' }],
      BREWS: entries('brew', 1),
    });

    expect(result).toEqual({ BACKUP: true });
    expect(device.data.get(LAST_RESTORE_STORAGE_KEY)).toEqual(PREVIOUS_NOTE);
  });

  it('does not undo the import when the note cannot be stored', async () => {
    const device = await startDevice({
      SETTINGS: [{ language: 'de' }],
      BREWS: entries('own-brew', 2),
      [LAST_RESTORE_STORAGE_KEY]: PREVIOUS_NOTE,
    });
    device.failingWrites.add(LAST_RESTORE_STORAGE_KEY);

    const result = await device.uiStorage.import({
      SETTINGS: [{ language: 'en' }],
      BREWS: entries('brew', 1),
    });

    expect(result).toEqual({ BACKUP: false });
    expect(device.data.get('BREWS')).toEqual(entries('brew', 1));
    expect(device.data.get(LAST_RESTORE_STORAGE_KEY)).toEqual(PREVIOUS_NOTE);
    expect(device.uiLog.error).toHaveBeenCalledOnceWith(
      'UIStorage - Import - Restore note not stored',
      jasmine.any(Error),
    );
  });
});

describe('The note about restoring the internal backup at start-up', () => {
  it('names the internal backup as the source', async () => {
    const backup = {
      SETTINGS: [{ language: 'de' }],
      VERSION: [{ updatedDataVersions: ['UPDATE_1'] }],
      BREWS: entries('brew', 3),
    };
    const { helper: backupDevice } = await startDevice(backup);
    const internalBackup = new Uint8Array(
      await (await backupDevice.buildExportZIP()).arrayBuffer(),
    );
    // A device that lost all its data gets the internal backup without being asked.
    const device = await startDevice({}, internalBackup);

    await device.helper.checkBackup();

    expect(device.data.get('BREWS')).toEqual(backup.BREWS);
    expect(device.data.get(LAST_RESTORE_STORAGE_KEY)).toEqual({
      last_restore_at: jasmine.any(Number),
      source: 'internal_backup',
      record_count: 3,
    });
  });
});
