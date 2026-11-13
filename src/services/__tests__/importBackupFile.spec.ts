import { TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular/standalone';
import { Storage } from '@ionic/storage';

import { FileInfo } from '@capacitor/filesystem';

import { fillMissingChangeInfo } from '../../classes/changeTracking/changeTracking';
import {
  DELETION_JOURNAL_STORAGE_KEY,
  DEVICE_STORAGE_KEY,
  LAST_RESTORE_STORAGE_KEY,
  LOCAL_ONLY_STORAGE_KEYS,
} from '../../classes/changeTracking/localStorageKeys';
import { withoutSettingsSecrets } from '../../classes/settings/settingsSecrets';
import {
  IRestoreNote,
  RESTORE_SOURCE,
} from '../../interfaces/changeTracking/iRestoreNote';
import {
  PRE_IMPORT_BACKUP_FILES,
  PreImportBackupFiles,
} from '../preImportBackup/pre-import-backup-files';
import {
  PRE_IMPORT_BACKUP_FOLDER,
  PreImportBackupError,
} from '../preImportBackup/pre-import-backup.service';
import { EventQueueService } from '../queueService/queue-service.service';
import { UIAlert } from '../uiAlert';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIExportImportHelper } from '../uiExportImportHelper';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';

const BACKUP_FILE_PATTERN =
  /^pre-import\/Beanconqueror_pre_import_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}(_imported)?\.zip$/;

/** Ends the name of a backup of data an import had stored, unchanged since. */
const UNCHANGED_IMPORT_ENDING = '_imported.zip';

function entries(prefix: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    config: { uuid: `${prefix}-${i}`, unix_timestamp: 1600000000 + i },
    note: `${prefix} ${i}`,
  }));
}

/** Entries as an import stores them: missing change info is filled in. */
function imported<T>(_entries: T[]): T[] {
  const copy = structuredClone(_entries);
  fillMissingChangeInfo(copy);
  return copy;
}

/** Data of an installation that has started before; VERSION lists its updates. */
function storedData(
  prefix: string,
  extra: Record<string, unknown> = {},
): Record<string, any> {
  return {
    SETTINGS: [{ language: 'de' }],
    VERSION: [{ updatedDataVersions: ['UPDATE_1'] }],
    BREWS: imported(entries(`${prefix}-brew`, 2)),
    BEANS: imported(entries(`${prefix}-bean`, 1)),
    ...extra,
  };
}

function backupPath(_time: string): string {
  return `${PRE_IMPORT_BACKUP_FOLDER}/Beanconqueror_pre_import_${_time}.zip`;
}

const OLDER_BACKUPS = [
  backupPath('2026-11-01_10-00-00-000'),
  backupPath('2026-11-02_10-00-00-000'),
  backupPath('2026-11-03_10-00-00-000'),
];

/** Behaves like IndexedDB: values are copied when written and read. */
function createDeviceDatabase(
  _initial: Record<string, unknown>,
  _writes: string[],
) {
  const data = new Map<string, unknown>(
    Object.entries(structuredClone(_initial)),
  );
  const failingWrites = new Set<string>();
  /** Number of the next reads of all values that fail. */
  const failingReads = { count: 0 };
  return {
    data,
    failingWrites,
    failingReads,
    database: {
      set: (key: string, value: unknown) => {
        _writes.push(`database ${key}`);
        if (failingWrites.delete(key)) {
          return Promise.reject(new Error('write failed'));
        }
        data.set(key, structuredClone(value));
        return Promise.resolve();
      },
      get: (key: string) =>
        Promise.resolve(data.has(key) ? structuredClone(data.get(key)) : null),
      forEach: (cb: (value: unknown, key: string, i: number) => void) => {
        if (failingReads.count > 0) {
          failingReads.count--;
          return Promise.reject(new Error('read failed'));
        }
        let i = 0;
        for (const [key, value] of data) {
          cb(structuredClone(value), key, i++);
        }
        return Promise.resolve();
      },
    },
  };
}

/** The app data directory, kept in memory. */
function createDataDirectory(
  _writes: string[],
  _paths: string[],
  _available: boolean,
) {
  const stored = new Map<string, Blob>(
    _paths.map((_path) => [_path, new Blob([_path])]),
  );
  const failing = { write: false };
  const files: PreImportBackupFiles = {
    isAvailable: () => _available,
    write: (_path, _data) => {
      _writes.push(`file ${_path}`);
      if (failing.write) {
        return Promise.reject(new Error('disk full'));
      }
      stored.set(_path, _data);
      return Promise.resolve();
    },
    list: (_folder) =>
      Promise.resolve(
        [...stored]
          .filter(([_path]) => _path.startsWith(_folder + '/'))
          .map(
            ([_path, _data]): FileInfo => ({
              name: _path.substring(_folder.length + 1),
              type: 'file',
              size: _data.size,
              mtime: 0,
              uri: `file:///data/${_path}`,
            }),
          ),
      ),
    remove: (_path) => {
      stored.delete(_path);
      return Promise.resolve();
    },
  };
  spyOn(files, 'write').and.callThrough();
  return { stored, failing, files };
}

interface DeviceOptions {
  /** Files already in the app data directory. */
  files?: string[];
  /** False for the browser. */
  fileSystem?: boolean;
  /** The internal backup file the start-up check reads. */
  internalBackup?: Uint8Array;
}

/** An installation storing `_stored`, with the services of the import. */
async function startDevice(
  _stored: Record<string, unknown>,
  _options: DeviceOptions = {},
) {
  const writes: string[] = [];
  const device = createDeviceDatabase(_stored, writes);
  const directory = createDataDirectory(
    writes,
    _options.files ?? [],
    _options.fileSystem ?? true,
  );
  const uiLog = {
    log: jasmine.createSpy('log'),
    info: jasmine.createSpy('info'),
    error: jasmine.createSpy('error'),
    debug: () => undefined,
  };
  const uiAlert = {
    showLoadingSpinner: jasmine.createSpy('showLoadingSpinner'),
    hideLoadingSpinner: jasmine.createSpy('hideLoadingSpinner'),
    showMessage: jasmine.createSpy('showMessage'),
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      UIExportImportHelper,
      UIStorage,
      {
        provide: Storage,
        useValue: { create: () => Promise.resolve(device.database) },
      },
      { provide: EventQueueService, useValue: { dispatch: () => undefined } },
      {
        provide: UIHelper,
        useValue: { cloneData: <T>(v: T): T => structuredClone(v) },
      },
      // The internal backup is only checked in the app.
      {
        provide: Platform,
        useValue: {
          is: (_platform: string) =>
            _platform === 'capacitor' && _options.internalBackup !== undefined,
        },
      },
      { provide: UILog, useValue: uiLog },
      { provide: UIAlert, useValue: uiAlert },
      { provide: PRE_IMPORT_BACKUP_FILES, useValue: directory.files },
      {
        provide: UIFileHelper,
        useValue: {
          readInternalFileAsUint8Array: () =>
            Promise.resolve(_options.internalBackup),
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
    directory,
    writes,
    uiLog,
    uiAlert,
    helper: TestBed.inject(UIExportImportHelper),
  };
}

type Device = Awaited<ReturnType<typeof startDevice>>;

/** Paths of the backup files written before an import. */
function writtenBackups(_device: Device): string[] {
  return [..._device.directory.stored.keys()].filter((_path) =>
    BACKUP_FILE_PATTERN.test(_path),
  );
}

async function readBackupFile(_device: Device, _path: string): Promise<any> {
  const file = _device.directory.stored.get(_path);
  if (!file) {
    throw new Error(`No file ${_path}`);
  }
  return await _device.helper.getJSONFromZIPArrayBufferContent(
    await file.arrayBuffer(),
  );
}

/** The backup file an installation storing `_stored` writes. */
async function backupFileOf(
  _stored: Record<string, unknown>,
): Promise<Uint8Array> {
  const { helper } = await startDevice(_stored);
  return new Uint8Array(await (await helper.buildExportZIP()).arrayBuffer());
}

describe('Importing a backup', () => {
  it('writes the current data into a backup file before anything is replaced', async () => {
    const before = storedData('own');
    const device = await startDevice(before);

    const result = await device.helper.importBackup(
      { SETTINGS: [{ language: 'en' }], BREWS: entries('brew', 3) },
      'import',
    );

    expect(result).toEqual({ BACKUP: false });
    const [file] = writtenBackups(device);
    expect(file).toMatch(BACKUP_FILE_PATTERN);
    expect(file).not.toContain(UNCHANGED_IMPORT_ENDING);
    expect(device.writes[0]).toBe(`file ${file}`);
    expect(device.writes.slice(1)).toEqual([
      'database SETTINGS',
      'database BREWS',
      `database ${LAST_RESTORE_STORAGE_KEY}`,
    ]);
    const saved = await readBackupFile(device, file);
    expect(saved.SETTINGS).toEqual(before.SETTINGS);
    expect(saved.VERSION).toEqual(before.VERSION);
    expect(saved.BREWS).toEqual(before.BREWS);
    expect(saved.BEANS).toEqual(before.BEANS);
    expect(device.data.get('BREWS')).toEqual(imported(entries('brew', 3)));
  });

  it('imports nothing when the backup file cannot be written', async () => {
    const previous: IRestoreNote = {
      last_restore_at: 5,
      source: 'import',
      record_count: 9,
    };
    const before = storedData('own', { [LAST_RESTORE_STORAGE_KEY]: previous });
    const device = await startDevice(before);
    device.directory.failing.write = true;

    await expectAsync(
      device.helper.importBackup(
        { SETTINGS: [{ language: 'en' }], BREWS: entries('brew', 3) },
        'import',
      ),
    ).toBeRejectedWith(jasmine.any(PreImportBackupError));

    expect(device.writes).toEqual([jasmine.stringMatching(/^file /)]);
    expect(Object.fromEntries(device.data)).toEqual(before);
    expect(writtenBackups(device)).toEqual([]);
  });

  it('keeps the three newest backups once the import is done', async () => {
    const otherFile = `${PRE_IMPORT_BACKUP_FOLDER}/notes.txt`;
    const device = await startDevice(storedData('own'), {
      files: [...OLDER_BACKUPS, otherFile],
    });

    await device.helper.importBackup(
      { SETTINGS: [{}], BREWS: entries('brew', 1) },
      'import',
    );

    const added = writtenBackups(device).filter(
      (_path) => !OLDER_BACKUPS.includes(_path),
    );
    expect(added.length).toBe(1);
    expect([...device.directory.stored.keys()].sort()).toEqual(
      [OLDER_BACKUPS[1], OLDER_BACKUPS[2], added[0], otherFile].sort(),
    );
  });

  it('keeps the data from before the first of several imports in a row', async () => {
    const before = storedData('own');
    const device = await startDevice(before);
    const tried = ['a', 'b', 'c', 'd'].map((_name) =>
      entries(`tried-${_name}`, 3),
    );

    for (const brews of tried) {
      const result = await device.helper.importBackup(
        { SETTINGS: [{ language: 'en' }], BREWS: brews },
        'import',
      );
      expect(result).toEqual({ BACKUP: false });
      // A new millisecond, so the next backup gets a name of its own.
      await new Promise((_resolve) => setTimeout(_resolve, 2));
    }

    const kept = writtenBackups(device);
    const keptBrews: unknown[] = [];
    for (const path of kept) {
      keptBrews.push((await readBackupFile(device, path)).BREWS);
    }
    // Kept: the data from before the first import, which the automatic
    // backups no longer hold once it is done, and the two newest. The data
    // of a is gone, its file can be imported again.
    expect(keptBrews).toEqual(
      jasmine.arrayWithExactContents([
        before.BREWS,
        imported(tried[1]),
        imported(tried[2]),
      ]),
    );
    expect(
      kept.filter((_path) => _path.endsWith(UNCHANGED_IMPORT_ENDING)).length,
    ).toBe(2);
  });

  it('removes no backup when the import fails, so the file it came from stays', async () => {
    const before = storedData('own');
    const device = await startDevice(before, { files: OLDER_BACKUPS });
    device.failingWrites.add('BREWS');

    const result = await device.helper.importBackup(
      { SETTINGS: [{}], BREWS: entries('brew', 1) },
      'import',
    );

    expect(result).toEqual({ BACKUP: true });
    expect(writtenBackups(device).length).toBe(OLDER_BACKUPS.length + 1);
    expect(device.data.get('BREWS')).toEqual(before.BREWS);
  });

  it('writes no credentials and no values of this installation into the backup file', async () => {
    const before = storedData('own', {
      SETTINGS: [
        {
          language: 'de',
          visualizer_username: 'secret-visualizer-user',
          visualizer_password: 'secret-visualizer-password',
          cloud_ai_api_key: 'secret-ai-key',
          brew_by_weight_webhook: {
            url: 'https://webhook.example.com/stop',
            bearerToken: 'secret-bearer',
            basicUsername: 'secret-basic-user',
            basicPassword: 'secret-basic-password',
            customHeaderValue: 'secret-header-value',
          },
        },
      ],
      [DEVICE_STORAGE_KEY]: { device_id: 'device-id-a', created_at: 1 },
      [DELETION_JOURNAL_STORAGE_KEY]: [
        {
          collection: 'BREWS',
          uuid: 'deleted-brew',
          deleted_at: 2,
          device_id: 'device-id-a',
          rev: 1,
        },
      ],
      [LAST_RESTORE_STORAGE_KEY]: {
        last_restore_at: 3,
        source: 'import',
        record_count: 4,
      },
    });
    const device = await startDevice(before);

    await device.helper.importBackup(
      {
        SETTINGS: [
          { ...withoutSettingsSecrets(before.SETTINGS[0]), language: 'en' },
        ],
        BREWS: [],
      },
      'import',
    );

    const saved = await readBackupFile(device, writtenBackups(device)[0]);
    for (const key of LOCAL_ONLY_STORAGE_KEYS) {
      expect(Object.keys(saved)).not.toContain(key);
    }
    const content = JSON.stringify(saved);
    expect(content).not.toContain('secret-');
    expect(content).not.toContain('device-id-a');
    expect(content).not.toContain('deleted-brew');
    expect(saved.SETTINGS[0].brew_by_weight_webhook.url).toBe(
      'https://webhook.example.com/stop',
    );
    expect(saved.BREWS).toEqual(before.BREWS);
    // The credentials stay on the device.
    expect(device.data.get('SETTINGS')).toEqual([
      { ...before.SETTINGS[0], language: 'en' },
    ]);
  });

  it('brings the data from before back when its backup file is imported', async () => {
    const before = storedData('own');
    const device = await startDevice(before);
    await device.helper.importBackup(
      { SETTINGS: [{ language: 'en' }], BREWS: entries('brew', 3), BEANS: [] },
      'import',
    );
    const [file] = writtenBackups(device);

    const result = await device.helper.importBackup(
      await readBackupFile(device, file),
      'import',
    );

    expect(result).toEqual({ BACKUP: false });
    for (const key of Object.keys(before)) {
      expect(device.data.get(key)).withContext(key).toEqual(before[key]);
    }
  });

  it('imports in the browser without a backup file and without an error', async () => {
    const device = await startDevice(storedData('own'), { fileSystem: false });

    const result = await device.helper.importBackup(
      { SETTINGS: [{}], BREWS: entries('brew', 2) },
      'import',
    );

    expect(result).toEqual({ BACKUP: false });
    expect(device.helper.savesBackupBeforeImport()).toBeFalse();
    expect(device.directory.files.write).not.toHaveBeenCalled();
    expect(device.uiLog.error).not.toHaveBeenCalled();
    expect(device.data.get('BREWS')).toEqual(imported(entries('brew', 2)));
    expect(device.data.get(LAST_RESTORE_STORAGE_KEY)).toEqual(
      jasmine.objectContaining({ source: 'import', record_count: 2 }),
    );
  });

  it('writes no backup file while the device stores neither settings nor entries', async () => {
    const device = await startDevice({
      VERSION: [{ updatedDataVersions: ['UPDATE_1'] }],
    });

    const result = await device.helper.importBackup(
      { SETTINGS: [{}], BREWS: entries('brew', 2) },
      'import',
    );

    expect(result).toEqual({ BACKUP: false });
    expect(device.directory.files.write).not.toHaveBeenCalled();
    expect(device.data.get('BREWS')).toEqual(imported(entries('brew', 2)));
  });

  it('saves stored entries also when the list of data updates is lost', async () => {
    const before = { BREWS: imported(entries('own-brew', 2)) };
    const device = await startDevice(before);

    await device.helper.importBackup(
      { SETTINGS: [{}], BREWS: entries('brew', 1) },
      'import',
    );

    const [file] = writtenBackups(device);
    expect((await readBackupFile(device, file)).BREWS).toEqual(before.BREWS);
  });

  it('imports nothing when the current data cannot be read', async () => {
    const before = storedData('own');
    const device = await startDevice(before);
    device.failingReads.count = 1;

    await expectAsync(
      device.helper.importBackup(
        { SETTINGS: [{}], BREWS: entries('brew', 1) },
        'import',
      ),
    ).toBeRejectedWith(jasmine.any(PreImportBackupError));

    expect(device.writes).toEqual([]);
    expect(Object.fromEntries(device.data)).toEqual(before);
  });
});

describe('The backup before an import of data that was just imported', () => {
  const RESTORED_AT = 1763000000000;

  /** The data a completed import from `_source` stored, unchanged so far. */
  function afterImport(
    _source: RESTORE_SOURCE,
    _extra: Record<string, unknown> = {},
  ): Record<string, any> {
    const stored = storedData('imported', {
      [LAST_RESTORE_STORAGE_KEY]: {
        last_restore_at: RESTORED_AT,
        source: _source,
        record_count: 3,
      },
      ..._extra,
    });
    // Changed on another device, before the import.
    stored.BREWS[0].config.updated_at = RESTORED_AT - 1;
    return stored;
  }

  /** Path of the backup the next import writes on a device storing `_stored`. */
  async function backupBeforeNextImport(
    _stored: Record<string, unknown>,
  ): Promise<string> {
    const device = await startDevice(_stored);
    await device.helper.importBackup(
      { SETTINGS: [{}], BREWS: entries('next', 1) },
      'import',
    );
    const [file] = writtenBackups(device);
    return file;
  }

  it('is marked while no entry was changed since', async () => {
    expect(await backupBeforeNextImport(afterImport('import'))).toContain(
      UNCHANGED_IMPORT_ENDING,
    );
  });

  it('is not marked once an entry was added or changed since', async () => {
    const stored = afterImport('import');
    stored.BREWS[1].config.updated_at = RESTORED_AT + 1;

    expect(await backupBeforeNextImport(stored)).not.toContain(
      UNCHANGED_IMPORT_ENDING,
    );
  });

  it('is not marked once an entry was deleted since', async () => {
    const stored = afterImport('import', {
      [DELETION_JOURNAL_STORAGE_KEY]: [
        {
          collection: 'BREWS',
          uuid: 'deleted-brew',
          deleted_at: RESTORED_AT + 1,
          device_id: 'device',
          rev: 1,
        },
      ],
    });

    expect(await backupBeforeNextImport(stored)).not.toContain(
      UNCHANGED_IMPORT_ENDING,
    );
  });

  it('is not marked after the internal backup was restored, as that file is replaced', async () => {
    expect(
      await backupBeforeNextImport(afterImport('internal_backup')),
    ).not.toContain(UNCHANGED_IMPORT_ENDING);
  });
});

describe('Restoring the internal backup at start-up', () => {
  /** An internal backup with more brews than the device, which looks like lost data. */
  async function internalBackupWithMoreBrews(): Promise<Uint8Array> {
    return await backupFileOf(
      storedData('backup', { BREWS: imported(entries('backup-brew', 5)) }),
    );
  }

  it('saves the current data before the internal backup replaces it', async () => {
    const internalBackup = await internalBackupWithMoreBrews();
    const before = storedData('own');
    const device = await startDevice(before, { internalBackup });
    spyOn(device.helper, 'showDataCorruptionPopover').and.resolveTo(true);

    await device.helper.checkBackup();

    const [file] = writtenBackups(device);
    expect(device.writes[0]).toBe(`file ${file}`);
    expect((await readBackupFile(device, file)).BREWS).toEqual(before.BREWS);
    expect(device.data.get('BREWS')).toEqual(
      imported(entries('backup-brew', 5)),
    );
    expect(device.data.get(LAST_RESTORE_STORAGE_KEY)).toEqual(
      jasmine.objectContaining({ source: 'internal_backup', record_count: 6 }),
    );
  });

  it('starts with the stored data when it cannot be saved first', async () => {
    const internalBackup = await internalBackupWithMoreBrews();
    const before = storedData('own');
    const device = await startDevice(before, { internalBackup });
    device.directory.failing.write = true;
    spyOn(device.helper, 'showDataCorruptionPopover').and.resolveTo(true);

    await device.helper.checkBackup();

    expect(device.uiAlert.showMessage).toHaveBeenCalledOnceWith(
      'PRE_IMPORT_BACKUP_FAILED',
      undefined,
      undefined,
      true,
    );
    expect(Object.fromEntries(device.data)).toEqual(before);
  });

  it('writes no backup file when the device lost all its data', async () => {
    const internalBackup = await internalBackupWithMoreBrews();
    const device = await startDevice({}, { internalBackup });

    await device.helper.checkBackup();

    expect(device.directory.files.write).not.toHaveBeenCalled();
    expect(device.data.get('BREWS')).toEqual(
      imported(entries('backup-brew', 5)),
    );
  });
});
