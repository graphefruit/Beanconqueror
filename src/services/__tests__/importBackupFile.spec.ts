import { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular';
import { Storage } from '@ionic/storage';

import { Directory, FileInfo } from '@capacitor/filesystem';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';

import {
  CHANGE_TRACKED_COLLECTIONS,
  fillMissingChangeInfo,
} from '../../classes/changeTracking/changeTracking';
import {
  DELETION_JOURNAL_STORAGE_KEY,
  DEVICE_STORAGE_KEY,
  LAST_RESTORE_STORAGE_KEY,
} from '../../classes/changeTracking/localStorageKeys';
import { withoutSettingsSecrets } from '../../classes/settings/settingsSecrets';
import { EXPERIENCE_MODE_ENUM } from '../../enums/settings/experienceMode';
import {
  IRestoreNote,
  RESTORE_SOURCE,
} from '../../interfaces/changeTracking/iRestoreNote';
import { createMockTranslateService } from '../../test-utils';
import { DeletionJournalService } from '../deletionJournal/deletion-journal.service';
import { DeviceIdentityService } from '../deviceIdentity/device-identity.service';
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
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewStorage } from '../uiBrewStorage';
import {
  ImportNotRolledBackError,
  UIExportImportHelper,
} from '../uiExportImportHelper';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UIMillStorage } from '../uiMillStorage';
import { UIPreparationStorage } from '../uiPreparationStorage';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';

const BACKUP_FILE_PATTERN =
  /^pre-import\/Beanconqueror_pre_import_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}Z(_imported)?\.zip$/;

const MIGRATION_BACKUP_FILE_PATTERN =
  /^pre-import\/Beanconqueror_pre_migration_UPDATE_16_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}Z\.zip$/;

function migrationBackups(_device: Device): string[] {
  return [..._device.directory.stored.keys()].filter((_path) =>
    _path.startsWith('pre-import/Beanconqueror_pre_migration_'),
  );
}

/** Ends the name of a backup of data an import had stored, unchanged since. */
const UNCHANGED_IMPORT_ENDING = '_imported.zip';

/**
 * A backup file the app neither replaces nor deletes, like an export saved
 * elsewhere under another name, so it can always be imported again.
 */
const KEPT_FILE_NAME = 'Beanconqueror 2.zip';

/** Name of the automatic backup of the day of `_time`. */
function automaticBackupName(_time: number): string {
  return `Beanconqueror_automatic_export_${moment(_time).format('DD_MM_YYYY')}.zip`;
}

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
/** User profile as this app version stores it in the settings. */
function userProfile() {
  return {
    experience_mode: EXPERIENCE_MODE_ENUM.ADVANCED,
    nickname: '',
    whats_new_seen: '',
    mode_hint_pending: false,
  };
}

function storedData(
  prefix: string,
  extra: Record<string, unknown> = {},
): Record<string, any> {
  return {
    SETTINGS: [{ language: 'de', user: userProfile() }],
    VERSION: [{ updatedDataVersions: ['UPDATE_1'] }],
    BREWS: imported(entries(`${prefix}-brew`, 2)),
    BEANS: imported(entries(`${prefix}-bean`, 1)),
    ...extra,
  };
}

function backupPath(_time: string): string {
  return `${PRE_IMPORT_BACKUP_FOLDER}/Beanconqueror_pre_import_${_time}Z.zip`;
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
  /** Keys whose next write fails. */
  const failingWrites = new Set<string>();
  /** Keys whose writes all fail, so a rollback fails as well. */
  const brokenWrites = new Set<string>();
  /** Number of the next reads of all values that fail. */
  const failingReads = { count: 0 };
  return {
    data,
    failingWrites,
    brokenWrites,
    failingReads,
    database: {
      set: (key: string, value: unknown) => {
        _writes.push(`database ${key}`);
        if (failingWrites.delete(key) || brokenWrites.has(key)) {
          return Promise.reject(new Error('write failed'));
        }
        data.set(key, structuredClone(value));
        return Promise.resolve();
      },
      remove: (key: string) => {
        data.delete(key);
        return Promise.resolve();
      },
      clear: () => {
        data.clear();
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
      if (failing.write) {
        _writes.push(`file ${_path}`);
        // Like Android, where the file is created before its content is
        // written and stays when writing fails.
        stored.set(_path, new Blob([]));
        return Promise.reject(new Error('disk full'));
      }
      stored.set(_path, _data);
      return Promise.resolve();
    },
    rename: (_from, _to) => {
      const data = stored.get(_from);
      if (data === undefined) {
        return Promise.reject(new Error('no such file'));
      }
      // The backup is there once the file has its name.
      _writes.push(`file ${_to}`);
      stored.delete(_from);
      stored.set(_to, data);
      return Promise.resolve();
    },
    list: (_folder) =>
      Promise.resolve(
        [...stored]
          .filter(([_path]) => _path.startsWith(_folder + '/'))
          .map(([_path, _data]): FileInfo => ({
            name: _path.substring(_folder.length + 1),
            type: 'file',
            size: _data.size,
            mtime: 0,
            uri: `file:///data/${_path}`,
          })),
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
  /** Replace the services given in place of the real ones. */
  providers?: Provider[];
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
    showMessageWithDetails: jasmine.createSpy('showMessageWithDetails'),
  };
  const fileHelper = {
    // No unfinished file is left from a write before.
    statInternalFile: () => Promise.resolve(undefined),
    readInternalFileAsUint8Array: () =>
      Promise.resolve(_options.internalBackup),
    // Beanconqueror.zip, which the start-up check reads.
    replaceInternalFileFromBlob: jasmine
      .createSpy('replaceInternalFileFromBlob')
      .and.resolveTo(),
    // The automatic backup of the day.
    replaceFileFromBlob: jasmine
      .createSpy('replaceFileFromBlob')
      .and.resolveTo(),
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
      { provide: UIFileHelper, useValue: fileHelper },
      {
        provide: UISettingsStorage,
        useValue: {
          getSettings: () => ({
            welcome_page_showed: true,
            show_backup_issues: false,
          }),
        },
      },
      {
        provide: UIBrewStorage,
        useValue: { getAllEntries: () => device.data.get('BREWS') ?? [] },
      },
      { provide: ModalController, useValue: {} },
      ...(_options.providers ?? []),
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
    fileHelper,
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

  it('keeps the older backups when writing the backup file failed a few times before', async () => {
    // The storage is full: every failed write would leave an empty file.
    const device = await startDevice(storedData('own'), {
      files: OLDER_BACKUPS.slice(1),
    });
    const next = { SETTINGS: [{ language: 'en' }], BREWS: entries('brew', 3) };
    device.directory.failing.write = true;
    for (let i = 0; i < 2; i++) {
      await expectAsync(
        device.helper.importBackup(next, 'import'),
      ).toBeRejectedWith(jasmine.any(PreImportBackupError));
      await new Promise((_resolve) => setTimeout(_resolve, 2));
    }
    expect([...device.directory.stored.keys()]).toEqual(OLDER_BACKUPS.slice(1));

    // Space was made, the import is tried again.
    device.directory.failing.write = false;
    expect(await device.helper.importBackup(next, 'import')).toEqual({
      BACKUP: false,
    });

    const files = [...device.directory.stored];
    expect(files.map(([_path]) => _path)).toEqual(
      jasmine.arrayContaining(OLDER_BACKUPS.slice(1)),
    );
    expect(files.length).toBe(3);
    expect(files.every(([, _data]) => _data.size > 0)).toBeTrue();
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

    for (const [i, brews] of tried.entries()) {
      const result = await device.helper.importBackup(
        { SETTINGS: [{ language: 'en' }], BREWS: brews },
        'import',
        `Beanconqueror ${i + 2}.zip`,
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

  for (const first of [
    'Beanconqueror.zip',
    'the automatic backup of the day',
  ]) {
    it(`keeps the data from before several imports in a row that start with ${first}`, async () => {
      // The app replaces the first file itself, so the backup written
      // before the second import is not one of an unchanged import either.
      const before = storedData('own');
      const device = await startDevice(before);
      const firstData = imported(entries('first', 5));
      const series = [
        {
          BREWS: firstData,
          fileName:
            first === 'Beanconqueror.zip'
              ? first
              : automaticBackupName(Date.now()),
        },
        ...['b', 'c', 'd', 'e'].map((_name, i) => ({
          BREWS: entries(`tried-${_name}`, 3),
          fileName: `Beanconqueror ${i + 2}.zip`,
        })),
      ];

      for (const { BREWS, fileName } of series) {
        const result = await device.helper.importBackup(
          { SETTINGS: [{ language: 'en' }], BREWS },
          'import',
          fileName,
        );
        expect(result).toEqual({ BACKUP: false });
        await new Promise((_resolve) => setTimeout(_resolve, 2));
      }

      const keptBrews: unknown[] = [];
      for (const path of writtenBackups(device)) {
        keptBrews.push((await readBackupFile(device, path)).BREWS);
      }
      // Kept besides the newest: the data from before the series and the
      // data of the first file. The others can be imported again.
      expect(keptBrews).toEqual(
        jasmine.arrayWithExactContents([
          before.BREWS,
          firstData,
          imported(series[3].BREWS),
        ]),
      );
    });
  }

  it('keeps the data of the automatic backup of the day when several imports in a row start with it', async () => {
    // Fewer brews than in the automatic backup of the day: some were lost,
    // and nothing was saved since.
    const device = await startDevice(storedData('own'));
    const ofTheDay = imported(entries('day', 5));
    const series = [
      { BREWS: ofTheDay, fileName: automaticBackupName(Date.now()) },
      ...['b', 'c', 'd'].map((_name, i) => ({
        BREWS: entries(`tried-${_name}`, 3),
        fileName: `Beanconqueror ${i + 2}.zip`,
      })),
    ];

    for (const { BREWS, fileName } of series) {
      const result = await device.helper.importBackup(
        { SETTINGS: [{ language: 'en' }], BREWS },
        'import',
        fileName,
      );
      expect(result).toEqual({ BACKUP: false });
      await new Promise((_resolve) => setTimeout(_resolve, 2));
    }

    // Once the first import is done, the automatic backups replace that
    // file, so the backup written before the second import is the only
    // copy of its data left.
    const keptBrews: unknown[] = [];
    for (const path of writtenBackups(device)) {
      keptBrews.push((await readBackupFile(device, path)).BREWS);
    }
    expect(keptBrews).toContain(ofTheDay);
  });

  it('keeps the data brought back from a backup written before an import when more imports follow', async () => {
    const own = storedData('own');
    const device = await startDevice(own);
    const importFile = async (_data: unknown, _fileName: string) => {
      expect(
        await device.helper.importBackup(_data, 'import', _fileName),
      ).toEqual({ BACKUP: false });
      await new Promise((_resolve) => setTimeout(_resolve, 2));
    };
    const tried = (_name: string) => ({
      SETTINGS: [{ language: 'en' }],
      BREWS: entries(`tried-${_name}`, 3),
    });

    await importFile(tried('a'), 'Beanconqueror 2.zip');
    const [ownBackup] = writtenBackups(device);
    // A brew changed after that import: its backup is kept like own data.
    const note = device.data.get(LAST_RESTORE_STORAGE_KEY) as IRestoreNote;
    (device.data.get('BREWS') as any[])[0].config.updated_at =
      note.last_restore_at + 1;
    await importFile(tried('b'), 'Beanconqueror 3.zip');
    // Going back to the data from before the first import.
    await importFile(
      await readBackupFile(device, ownBackup),
      ownBackup.substring(ownBackup.lastIndexOf('/') + 1),
    );
    for (const [i, name] of ['c', 'd', 'e'].entries()) {
      await importFile(tried(name), `Beanconqueror ${i + 4}.zip`);
    }

    // The file it was brought back from is gone after the next import, so
    // the backup written before that import is the only copy left.
    const keptBrews: unknown[] = [];
    for (const path of writtenBackups(device)) {
      keptBrews.push((await readBackupFile(device, path)).BREWS);
    }
    expect(writtenBackups(device)).not.toContain(ownBackup);
    expect(keptBrews).toContain(own.BREWS);
  });

  it('removes no backup when the import fails, so the file it came from stays', async () => {
    const before = storedData('own');
    const device = await startDevice(before, { files: OLDER_BACKUPS });
    device.failingWrites.add('BREWS');

    const result = await device.helper.importBackup(
      { SETTINGS: [{}], BREWS: entries('brew', 1) },
      'import',
    );

    // The error of the import, for the technical details of the message.
    expect(result).toEqual({ BACKUP: true, cause: new Error('write failed') });
    expect(writtenBackups(device).length).toBe(OLDER_BACKUPS.length + 1);
    expect(device.data.get('BREWS')).toEqual(before.BREWS);
  });

  it('leaves the file with the data from before when the import failed and could not be rolled back', async () => {
    // The data is what an import stored, unchanged since.
    const before = storedData('own', {
      [LAST_RESTORE_STORAGE_KEY]: {
        last_restore_at: Date.now() - 60000,
        source: 'import',
        record_count: 3,
        file_name: KEPT_FILE_NAME,
      },
    });
    const device = await startDevice(before, { files: OLDER_BACKUPS });
    const next = { BREWS: entries('brew', 2), SETTINGS: [{ language: 'en' }] };
    // Storing the settings fails, and writing the values from before back
    // stops at the list of data updates, before the brews.
    device.failingWrites.add('SETTINGS');
    device.brokenWrites.add('VERSION');

    const failed = await device.helper
      .importBackup(next, 'import', 'Beanconqueror 3.zip')
      .then(fail, (_error: unknown) => _error);
    expect(failed).toBeInstanceOf(ImportNotRolledBackError);
    // The file below is the one the message names.
    expect((failed as ImportNotRolledBackError).messageKey).toBe(
      'IMPORT_NOT_ROLLED_BACK',
    );
    expect((failed as ImportNotRolledBackError).cause).toEqual(
      new Error('write failed'),
    );

    // The brews of the import are stored, its settings are not.
    expect(device.data.get('BREWS')).toEqual(imported(entries('brew', 2)));
    expect((device.data.get('SETTINGS') as any[])[0].language).toBe('de');
    const [file] = writtenBackups(device).filter(
      (_path) => !OLDER_BACKUPS.includes(_path),
    );
    const saved = await readBackupFile(device, file);
    expect(saved.SETTINGS).toEqual(before.SETTINGS);
    expect(saved.BREWS).toEqual(before.BREWS);
    expect(writtenBackups(device).length).toBe(OLDER_BACKUPS.length + 1);

    // The mix stored now is not what the import before had stored.
    device.brokenWrites.clear();
    await new Promise((_resolve) => setTimeout(_resolve, 2));
    expect(
      await device.helper.importBackup(next, 'import', 'Beanconqueror 3.zip'),
    ).toEqual({ BACKUP: false });
    const newest = writtenBackups(device).sort().pop();
    expect(newest).not.toBe(file);
    expect(newest).not.toContain(UNCHANGED_IMPORT_ENDING);
  });

  it('writes no credentials and no values of this installation into the backup file', async () => {
    const before = storedData('own', {
      SETTINGS: [
        {
          language: 'de',
          user: userProfile(),
          visualizer_username: 'secret-visualizer-user',
          visualizer_password: 'secret-visualizer-password',
          visualizer_url: 'https://secret-user:pw@visualizer.example.com/',
          cloud_ai_api_key: 'secret-ai-key',
          cloud_ai_base_url: 'https://llm.example.com/v1?key=secret-url-key',
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
    // The keys stored above and not LOCAL_ONLY_STORAGE_KEYS, so a key
    // dropped from that list fails here.
    for (const key of [
      DEVICE_STORAGE_KEY,
      DELETION_JOURNAL_STORAGE_KEY,
      LAST_RESTORE_STORAGE_KEY,
    ]) {
      expect(Object.keys(saved)).withContext(key).not.toContain(key);
    }
    const content = JSON.stringify(saved);
    expect(content).not.toContain('secret-');
    expect(content).not.toContain('device-id-a');
    expect(content).not.toContain('deleted-brew');
    expect(content).not.toContain('last_restore_at');
    expect(saved.SETTINGS[0].brew_by_weight_webhook.url).toBe('');
    expect(saved.SETTINGS[0].visualizer_url).toBe('');
    expect(saved.SETTINGS[0].cloud_ai_base_url).toBe('');
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
    // Two imported brews and the bean of the device, which stays.
    expect(device.data.get(LAST_RESTORE_STORAGE_KEY)).toEqual(
      jasmine.objectContaining({ source: 'import', record_count: 3 }),
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

  it('imports nothing in the browser when the copy to roll back to cannot be read', async () => {
    const before = storedData('own');
    const device = await startDevice(before, { fileSystem: false });
    device.failingReads.count = 1;

    const failed = await device.helper
      .importBackup(
        { SETTINGS: [{}], BREWS: entries('brew', 1) },
        'import',
        'x.zip',
      )
      .then(fail, (_error: unknown) => _error);

    // Nothing was replaced, so the data is not said to be incomplete.
    expect(failed).toEqual(new Error('read failed'));
    expect(failed).not.toBeInstanceOf(ImportNotRolledBackError);
    expect(Object.fromEntries(device.data)).toEqual(before);
  });

  describe('chosen at start-up because the database could not be read', () => {
    const next = () => ({ SETTINGS: [{}], BREWS: entries('brew', 1) });

    it('imports without a backup of the current data while it cannot be read', async () => {
      const device = await startDevice(storedData('own'));
      // The copy the import rolls back to.
      device.failingReads.count = 1;

      const result = await device.helper.importBackup(
        next(),
        'import',
        'Beanconqueror.zip',
        true,
      );

      expect(result).toEqual({ BACKUP: false });
      expect(writtenBackups(device)).toEqual([]);
      expect(device.data.get('BREWS')).toEqual(imported(entries('brew', 1)));
      expect(device.uiLog.error).toHaveBeenCalledWith(
        'Backup before import - skipped, the current data could not be read at start-up',
      );
    });

    it('fails as an import that could not be rolled back when storing it fails', async () => {
      const device = await startDevice(storedData('own'));
      device.failingReads.count = 1;
      device.failingWrites.add('BREWS');

      const failed = await device.helper
        .importBackup(next(), 'import', 'x.zip', true)
        .then(fail, (_error: unknown) => _error);

      // No file was written, so the message must not name one.
      expect(failed).toBeInstanceOf(ImportNotRolledBackError);
      expect((failed as ImportNotRolledBackError).messageKey).toBe(
        'IMPORT_NOT_ROLLED_BACK_NO_BACKUP',
      );
      expect(writtenBackups(device)).toEqual([]);
    });
  });
});

describe('The backup before an import of data that was just imported', () => {
  const RESTORED_AT = 1763000000000;
  const DAY = 24 * 60 * 60 * 1000;

  /**
   * The data a completed import from `_source` stored, unchanged so far.
   * `_note` changes the note about that import, which names a file that
   * can be imported again by default.
   */
  function afterImport(
    _source: RESTORE_SOURCE,
    _extra: Record<string, unknown> = {},
    _note: Partial<IRestoreNote> = { file_name: KEPT_FILE_NAME },
  ): Record<string, any> {
    const restoredAt = _note.last_restore_at ?? RESTORED_AT;
    const stored = storedData('imported', {
      [LAST_RESTORE_STORAGE_KEY]: {
        last_restore_at: restoredAt,
        source: _source,
        record_count: 3,
        ..._note,
      },
      ..._extra,
    });
    // Changed on another device, before the import.
    stored.BREWS[0].config.updated_at = restoredAt - 1;
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

  for (const collection of CHANGE_TRACKED_COLLECTIONS) {
    it(`is not marked once an entry was added to ${collection} since`, async () => {
      /** The imported data with an entry in `collection` changed at `_time`. */
      const withEntryChangedAt = (_time: number) => {
        const stored = afterImport(
          'import',
          {},
          { file_name: KEPT_FILE_NAME, record_count: 4 },
        );
        const [entry]: any[] = imported(entries(`added-${collection}`, 1));
        entry.config.updated_at = _time;
        stored[collection] = [...(stored[collection] ?? []), entry];
        return stored;
      };

      // Changed before the import, on another device: still marked.
      expect(
        await backupBeforeNextImport(withEntryChangedAt(RESTORED_AT - 1)),
      ).toContain(UNCHANGED_IMPORT_ENDING);
      expect(
        await backupBeforeNextImport(withEntryChangedAt(RESTORED_AT + 1)),
      ).not.toContain(UNCHANGED_IMPORT_ENDING);
    });
  }

  it('is not marked when the clock was set back behind the import', async () => {
    const stored = afterImport(
      'import',
      {},
      { file_name: KEPT_FILE_NAME, last_restore_at: Date.now() + 10 * 60000 },
    );
    // Changed after the import, by the clock before it.
    stored.BREWS[1].config.updated_at = Date.now();

    expect(await backupBeforeNextImport(stored)).not.toContain(
      UNCHANGED_IMPORT_ENDING,
    );
  });

  it('is not marked when the number of entries is not the one the import stored', async () => {
    // Added and deleted while the clock was set back: the times of the
    // entries and of the deletion journal are before the import.
    const added = afterImport('import');
    const [entry]: any[] = imported(entries('added', 1));
    entry.config.updated_at = RESTORED_AT - 1;
    added.BREWS.push(entry);
    const deleted = afterImport('import');
    deleted.BEANS = [];

    for (const stored of [added, deleted]) {
      expect(await backupBeforeNextImport(stored)).not.toContain(
        UNCHANGED_IMPORT_ENDING,
      );
    }
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

  it('is not marked when the file imported was Beanconqueror.zip, which the app replaces', async () => {
    expect(
      await backupBeforeNextImport(
        afterImport('import', {}, { file_name: 'Beanconqueror.zip' }),
      ),
    ).not.toContain(UNCHANGED_IMPORT_ENDING);
  });

  it('is not marked when the file imported was the automatic backup of that day, which the app replaces', async () => {
    expect(
      await backupBeforeNextImport(
        afterImport(
          'import',
          {},
          { file_name: automaticBackupName(RESTORED_AT) },
        ),
      ),
    ).not.toContain(UNCHANGED_IMPORT_ENDING);
  });

  it('is marked when the file imported was the automatic backup of an earlier day', async () => {
    const restoredAt = Date.now();

    expect(
      await backupBeforeNextImport(
        afterImport(
          'import',
          {},
          {
            last_restore_at: restoredAt,
            file_name: automaticBackupName(restoredAt - DAY),
          },
        ),
      ),
    ).toContain(UNCHANGED_IMPORT_ENDING);
  });

  it('is not marked when the automatic backup imported is deleted by now, a week after its day', async () => {
    const restoredAt = Date.now() - 8 * DAY;

    expect(
      await backupBeforeNextImport(
        afterImport(
          'import',
          {},
          {
            last_restore_at: restoredAt,
            file_name: automaticBackupName(restoredAt - DAY),
          },
        ),
      ),
    ).not.toContain(UNCHANGED_IMPORT_ENDING);
  });

  it('is not marked when the name of the file imported is not known', async () => {
    expect(
      await backupBeforeNextImport(afterImport('import', {}, {})),
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

  /**
   * Data with a mill and a preparation as well, which the automatic backups
   * do not take for corrupted.
   */
  function completeData(_prefix: string): Record<string, any> {
    return storedData(_prefix, {
      MILL: imported(entries(`${_prefix}-mill`, 1)),
      PREPARATION: imported(entries(`${_prefix}-preparation`, 1)),
    });
  }

  /**
   * Writes the automatic backups as the app does a few seconds after a
   * change. Resolves once the automatic backup of the day is written, which
   * comes right after Beanconqueror.zip.
   */
  async function writeAutomaticBackups(_device: Device): Promise<void> {
    const written = new Promise<void>((_resolve) => {
      _device.fileHelper.replaceFileFromBlob.and.callFake(() => {
        _resolve();
        return Promise.resolve();
      });
    });
    await _device.helper.saveAutomaticBackups();
    await written;
  }

  async function writtenInternalBackup(_device: Device): Promise<any> {
    expect(
      _device.fileHelper.replaceInternalFileFromBlob,
    ).toHaveBeenCalledTimes(1);
    const [blob, path] =
      _device.fileHelper.replaceInternalFileFromBlob.calls.mostRecent().args;
    expect(path).toBe('Beanconqueror.zip');
    return await _device.helper.getJSONFromZIPArrayBufferContent(
      await (blob as Blob).arrayBuffer(),
    );
  }

  it('keeps the internal backup for the next start when the current data could not be saved first', async () => {
    const internalBackup = await internalBackupWithMoreBrews();
    const device = await startDevice(completeData('own'), { internalBackup });
    device.directory.failing.write = true;
    spyOn(device.helper, 'showDataCorruptionPopover').and.resolveTo(true);
    await device.helper.checkBackup();

    // Written after every change, for the rest of the session.
    await writeAutomaticBackups(device);
    await writeAutomaticBackups(device);

    expect(
      device.fileHelper.replaceInternalFileFromBlob,
    ).not.toHaveBeenCalled();
    // The work of this session still goes into the automatic backup.
    expect(device.fileHelper.replaceFileFromBlob).toHaveBeenCalledTimes(2);
  });

  it('keeps the internal backup also when it was to be restored without asking', async () => {
    const internalBackup = await internalBackupWithMoreBrews();
    // The list of data updates is lost, so the app restores without asking.
    const stored = completeData('own');
    delete stored.VERSION;
    const device = await startDevice(stored, { internalBackup });
    device.directory.failing.write = true;
    await device.helper.checkBackup();
    expect(device.uiAlert.showMessageWithDetails).toHaveBeenCalledOnceWith(
      'PRE_IMPORT_BACKUP_FAILED',
      jasmine.anything(),
    );
    // The start writes the list of data updates again.
    device.data.set('VERSION', [{ updatedDataVersions: ['UPDATE_1'] }]);

    await writeAutomaticBackups(device);

    expect(
      device.fileHelper.replaceInternalFileFromBlob,
    ).not.toHaveBeenCalled();
  });

  it('keeps the internal backup when importing it was rolled back', async () => {
    const internalBackup = await internalBackupWithMoreBrews();
    const before = completeData('own');
    const device = await startDevice(before, { internalBackup });
    device.failingWrites.add('BREWS');
    spyOn(device.helper, 'showDataCorruptionPopover').and.resolveTo(true);
    await device.helper.checkBackup();
    expect(device.data.get('BREWS')).toEqual(before.BREWS);

    await writeAutomaticBackups(device);

    expect(
      device.fileHelper.replaceInternalFileFromBlob,
    ).not.toHaveBeenCalled();
  });

  it('keeps the internal backup after it was not restored also once every collection was read', async () => {
    const internalBackup = await internalBackupWithMoreBrews();
    const device = await startDevice(completeData('own'), { internalBackup });
    device.failingWrites.add('BREWS');
    spyOn(device.helper, 'showDataCorruptionPopover').and.resolveTo(true);
    await device.helper.checkBackup();

    device.helper.allCollectionsRead();
    await writeAutomaticBackups(device);

    expect(
      device.fileHelper.replaceInternalFileFromBlob,
    ).not.toHaveBeenCalled();
  });

  it('keeps the internal backup when importing it failed and could not be rolled back', async () => {
    const internalBackup = await internalBackupWithMoreBrews();
    const before = completeData('own');
    const device = await startDevice(before, { internalBackup });
    // Every write of the brews fails, also the one of the rollback, so
    // Beanconqueror.zip can be the only complete copy left.
    device.brokenWrites.add('BREWS');
    spyOn(device.helper, 'showDataCorruptionPopover').and.resolveTo(true);
    await device.helper.checkBackup();

    await writeAutomaticBackups(device);

    expect(
      device.fileHelper.replaceInternalFileFromBlob,
    ).not.toHaveBeenCalled();
  });

  const OUTCOMES: {
    outcome: string;
    choose: boolean;
    prepare?: (_device: Device) => void;
    failed: boolean;
  }[] = [
    { outcome: 'it was restored', choose: true, failed: false },
    { outcome: 'restoring it was declined', choose: false, failed: false },
    {
      outcome: 'the current data could not be saved first',
      choose: true,
      prepare: (_device) => (_device.directory.failing.write = true),
      failed: true,
    },
    {
      outcome: 'importing it was rolled back',
      choose: true,
      prepare: (_device) => _device.failingWrites.add('BREWS'),
      failed: true,
    },
    {
      outcome: 'importing it could not be rolled back',
      choose: true,
      prepare: (_device) => _device.brokenWrites.add('BREWS'),
      failed: true,
    },
  ];
  for (const { outcome, choose, prepare, failed } of OUTCOMES) {
    it(`tells ${failed ? 'that' : 'no'} restore failed at this start when ${outcome}`, async () => {
      const internalBackup = await internalBackupWithMoreBrews();
      const device = await startDevice(completeData('own'), {
        internalBackup,
      });
      prepare?.(device);
      spyOn(device.helper, 'showDataCorruptionPopover').and.resolveTo(choose);
      expect(device.helper.restoreAtStartFailed()).toBeFalse();

      await device.helper.checkBackup();

      expect(device.helper.restoreAtStartFailed()).toBe(failed);
      device.helper.allCollectionsRead();
      expect(device.helper.restoreAtStartFailed()).toBe(failed);
    });
  }

  const FAILURES = [
    {
      failure: 'was rolled back',
      breakImport: (_device: Device) => _device.failingWrites.add('BREWS'),
      message: 'IMPORT_UNSUCCESSFULLY_DATA_NOT_CHANGED',
    },
    {
      failure: 'could not be rolled back',
      breakImport: (_device: Device) => _device.brokenWrites.add('BREWS'),
      message: 'IMPORT_NOT_ROLLED_BACK',
    },
  ];

  for (const { failure, breakImport, message } of FAILURES) {
    it(`says that it was not restored when the import ${failure}`, async () => {
      const internalBackup = await internalBackupWithMoreBrews();
      const device = await startDevice(completeData('own'), {
        internalBackup,
      });
      breakImport(device);
      spyOn(device.helper, 'showDataCorruptionPopover').and.resolveTo(true);

      await device.helper.checkBackup();

      expect(device.uiAlert.showMessageWithDetails).toHaveBeenCalledOnceWith(
        message,
        jasmine.anything(),
      );
      expect(device.uiAlert.hideLoadingSpinner).toHaveBeenCalledBefore(
        device.uiAlert.showMessageWithDetails,
      );
    });
  }

  it('keeps the backup of the data from before when the restore offered at every start cannot be rolled back', async () => {
    const internalBackup = await internalBackupWithMoreBrews();
    const before = completeData('own');
    const device = await startDevice(before, {
      internalBackup,
      files: OLDER_BACKUPS,
    });
    const offered = spyOn(
      device.helper,
      'showDataCorruptionPopover',
    ).and.resolveTo(true);

    for (let start = 0; start < 5; start++) {
      device.brokenWrites.add('BREWS');
      await device.helper.checkBackup();
      // A new millisecond, so the next backup gets a name of its own.
      await new Promise((_resolve) => setTimeout(_resolve, 2));
    }

    expect(offered).toHaveBeenCalledTimes(5);
    // Those of the later starts hold the mix the first one left.
    const kept = writtenBackups(device).sort();
    expect(kept.length).toBe(OLDER_BACKUPS.length + 5);
    expect(kept.slice(0, OLDER_BACKUPS.length)).toEqual(OLDER_BACKUPS);
    const first = kept[OLDER_BACKUPS.length];
    expect((await readBackupFile(device, first)).BREWS).toEqual(before.BREWS);
  });

  it('removes the backup just written and no older one when the restore was rolled back', async () => {
    const internalBackup = await internalBackupWithMoreBrews();
    const before = completeData('own');
    const device = await startDevice(before, {
      internalBackup,
      files: OLDER_BACKUPS,
    });
    spyOn(device.helper, 'showDataCorruptionPopover').and.resolveTo(true);

    for (let start = 0; start < 3; start++) {
      device.failingWrites.add('BREWS');
      await device.helper.checkBackup();
      await new Promise((_resolve) => setTimeout(_resolve, 2));
    }

    // The backup was written before anything was replaced.
    expect(
      device.writes.filter((_write) => _write.startsWith('file ')).length,
    ).toBe(3);
    expect(writtenBackups(device).sort()).toEqual(OLDER_BACKUPS);
    expect(Object.fromEntries(device.data)).toEqual(before);
  });

  it('keeps the backup just written when the restore could not be rolled back', async () => {
    const internalBackup = await internalBackupWithMoreBrews();
    const before = completeData('own');
    const device = await startDevice(before, {
      internalBackup,
      files: OLDER_BACKUPS,
    });
    device.brokenWrites.add('BREWS');
    spyOn(device.helper, 'showDataCorruptionPopover').and.resolveTo(true);

    await device.helper.checkBackup();

    const kept = writtenBackups(device);
    const [file] = kept.filter((_path) => !OLDER_BACKUPS.includes(_path));
    expect(kept.length).toBe(OLDER_BACKUPS.length + 1);
    expect((await readBackupFile(device, file)).BREWS).toEqual(before.BREWS);
  });

  it('keeps the backup just written when a key the internal backup brought along cannot be removed again', async () => {
    const before = storedData('own');
    const device = await startDevice(before, { files: OLDER_BACKUPS });
    device.failingWrites.add('BREWS');
    spyOn(device.database, 'remove').and.rejectWith(new Error('remove failed'));

    const failed = await device.helper
      .importBackup(
        {
          SETTINGS: [{ language: 'en' }],
          WATER: entries('water', 1),
          BREWS: entries('brew', 3),
        },
        'internal_backup',
      )
      .then(fail, (_error: unknown) => _error);

    expect(failed).toBeInstanceOf(ImportNotRolledBackError);
    expect(device.data.has('WATER')).toBeTrue();
    const kept = writtenBackups(device);
    const [file] = kept.filter((_path) => !OLDER_BACKUPS.includes(_path));
    expect(kept.length).toBe(OLDER_BACKUPS.length + 1);
    expect((await readBackupFile(device, file)).BREWS).toEqual(before.BREWS);
  });

  it('keeps the backup just written when the data cannot be read after the restore was rolled back', async () => {
    const before = storedData('own');
    const device = await startDevice(before, { files: OLDER_BACKUPS });
    device.failingWrites.add('BREWS');
    spyOn(device.database, 'get').and.rejectWith(new Error('read failed'));

    const result = await device.helper.importBackup(
      { SETTINGS: [{ language: 'en' }], BREWS: entries('brew', 3) },
      'internal_backup',
    );

    expect(result).toEqual({ BACKUP: true, cause: jasmine.anything() });
    const kept = writtenBackups(device);
    const [file] = kept.filter((_path) => !OLDER_BACKUPS.includes(_path));
    expect(kept.length).toBe(OLDER_BACKUPS.length + 1);
    expect((await readBackupFile(device, file)).BREWS).toEqual(before.BREWS);
  });

  it('leaves the backup just written when it cannot be removed after the restore was rolled back', async () => {
    const before = storedData('own');
    const device = await startDevice(before, { files: OLDER_BACKUPS });
    device.failingWrites.add('BREWS');
    spyOn(device.directory.files, 'remove').and.rejectWith(
      new Error('not removable'),
    );

    const result = await device.helper.importBackup(
      { SETTINGS: [{ language: 'en' }], BREWS: entries('brew', 3) },
      'internal_backup',
    );

    expect(result).toEqual({ BACKUP: true, cause: jasmine.anything() });
    expect(writtenBackups(device).length).toBe(OLDER_BACKUPS.length + 1);
    expect(Object.fromEntries(device.data)).toEqual(before);
  });

  it('writes the internal backup again once it was restored', async () => {
    const internalBackup = await backupFileOf(completeData('backup'));
    const device = await startDevice(
      { ...completeData('own'), BREWS: [] },
      { internalBackup },
    );
    spyOn(device.helper, 'showDataCorruptionPopover').and.resolveTo(true);
    await device.helper.checkBackup();

    await writeAutomaticBackups(device);

    expect((await writtenInternalBackup(device)).BREWS).toEqual(
      completeData('backup').BREWS,
    );
  });

  it('writes the internal backup again when restoring it was declined', async () => {
    const internalBackup = await internalBackupWithMoreBrews();
    const before = completeData('own');
    const device = await startDevice(before, { internalBackup });
    spyOn(device.helper, 'showDataCorruptionPopover').and.resolveTo(false);
    await device.helper.checkBackup();

    await writeAutomaticBackups(device);

    expect((await writtenInternalBackup(device)).BREWS).toEqual(before.BREWS);
  });

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

    expect(device.uiAlert.showMessageWithDetails).toHaveBeenCalledOnceWith(
      'PRE_IMPORT_BACKUP_FAILED',
      jasmine.anything(),
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

describe('The automatic backups', () => {
  /** Data with a mill and a preparation, which is not taken for corrupted. */
  function completeData(): Record<string, any> {
    return storedData('own', {
      MILL: imported(entries('own-mill', 1)),
      PREPARATION: imported(entries('own-preparation', 1)),
    });
  }

  /** Writes the automatic backups as the app does after a change. */
  async function writeAutomaticBackups(_device: Device): Promise<void> {
    await _device.helper.saveAutomaticBackups();
  }

  /** Lets what is waiting for an answer go on. */
  async function settle(): Promise<void> {
    await new Promise((_resolve) => setTimeout(_resolve, 200));
  }

  it('read the stored values once and write them into both files', async () => {
    const stored = completeData();
    const device = await startDevice(stored);
    const readAll = spyOn(device.database, 'forEach').and.callThrough();

    await writeAutomaticBackups(device);

    expect(readAll).toHaveBeenCalledTimes(1);
    for (const write of [
      device.fileHelper.replaceInternalFileFromBlob,
      device.fileHelper.replaceFileFromBlob,
    ]) {
      expect(write).toHaveBeenCalledTimes(1);
      const blob = write.calls.mostRecent().args[0] as Blob;
      expect(
        await device.helper.getJSONFromZIPArrayBufferContent(
          await blob.arrayBuffer(),
        ),
      ).toEqual(stored);
    }
    // Each under another name until it is complete, never the final one.
    expect(
      device.fileHelper.replaceInternalFileFromBlob.calls
        .mostRecent()
        .args.slice(1),
    ).toEqual(['Beanconqueror.zip', 'Beanconqueror.zip.part']);
    const folder = 'Download/Beanconqueror_export/';
    expect(
      device.fileHelper.replaceFileFromBlob.calls.mostRecent().args.slice(1),
    ).toEqual([
      `${folder}Beanconqueror_automatic_export_${moment().format('DD_MM_YYYY')}.zip`,
      `${folder}Beanconqueror_automatic_export.zip.part`,
      Directory.External,
    ]);
  });

  it('are only done once both files are written', async () => {
    const device = await startDevice(completeData());
    let finishInternal!: () => void;
    let finishOfTheDay!: () => void;
    device.fileHelper.replaceInternalFileFromBlob.and.returnValue(
      new Promise<void>((_resolve) => (finishInternal = _resolve)),
    );
    device.fileHelper.replaceFileFromBlob.and.returnValue(
      new Promise<void>((_resolve) => (finishOfTheDay = _resolve)),
    );
    let done = false;
    void device.helper.saveAutomaticBackups().then(() => (done = true));

    await settle();
    expect(device.fileHelper.replaceInternalFileFromBlob).toHaveBeenCalled();
    expect(device.fileHelper.replaceFileFromBlob).toHaveBeenCalled();
    expect(done).toBeFalse();

    finishInternal();
    await settle();
    expect(done).toBeFalse();

    finishOfTheDay();
    await settle();
    expect(done).toBeTrue();
  });

  it('are done and still write the other file when one cannot be written', async () => {
    const device = await startDevice(completeData());
    device.fileHelper.replaceInternalFileFromBlob.and.rejectWith(
      new Error('disk full'),
    );

    await writeAutomaticBackups(device);

    expect(device.fileHelper.replaceFileFromBlob).toHaveBeenCalledTimes(1);
    expect(device.uiLog.error).toHaveBeenCalledOnceWith(
      'Could not to export normal ZIP file',
    );
  });

  it('write neither file when brews are stored without beans', async () => {
    const stored = completeData();
    delete stored.BEANS;
    const device = await startDevice(stored);

    await writeAutomaticBackups(device);

    expect(
      device.fileHelper.replaceInternalFileFromBlob,
    ).not.toHaveBeenCalled();
    expect(device.fileHelper.replaceFileFromBlob).not.toHaveBeenCalled();
    expect(device.uiLog.error).toHaveBeenCalledWith(
      'Data inside the database seems like corrupted / no data',
    );
  });

  it('write neither file when the stored values cannot be read', async () => {
    const device = await startDevice(completeData());
    device.failingReads.count = 1;

    await writeAutomaticBackups(device);

    expect(
      device.fileHelper.replaceInternalFileFromBlob,
    ).not.toHaveBeenCalled();
    expect(device.fileHelper.replaceFileFromBlob).not.toHaveBeenCalled();
    expect(device.uiLog.error).toHaveBeenCalledWith(
      'ZIP file could not be saved',
    );
  });
});

describe('The copy an import rolls back to', () => {
  it('is the data read for the backup file, without reading it again', async () => {
    const before = storedData('own');
    const device = await startDevice(before);
    const readAll = spyOn(device.database, 'forEach').and.callThrough();
    device.failingWrites.add('BREWS');

    const result = await device.helper.importBackup(
      { SETTINGS: [{ language: 'en' }], BREWS: entries('brew', 3) },
      'import',
    );

    expect(result).toEqual({ BACKUP: true, cause: jasmine.anything() });
    expect(readAll).toHaveBeenCalledTimes(1);
    expect(Object.fromEntries(device.data)).toEqual(before);
  });

  it('removes the keys only the backup file brought along again', async () => {
    const before = storedData('own');
    const device = await startDevice(before);
    device.failingWrites.add('BREWS');

    const result = await device.helper.importBackup(
      {
        SETTINGS: [{ language: 'en' }],
        WATER: entries('water', 1),
        GRAPH: [],
        BREWS: entries('brew', 3),
        // Never written, as the brews before it fail.
        MILL: entries('mill', 1),
      },
      'import',
    );

    expect(result).toEqual({ BACKUP: true, cause: jasmine.anything() });
    expect(device.writes).toContain('database WATER');
    expect(Object.fromEntries(device.data)).toEqual(before);
  });

  it('is not rolled back to when a key the backup file brought along cannot be removed', async () => {
    const before = storedData('own');
    const device = await startDevice(before, { fileSystem: false });
    device.failingWrites.add('BREWS');
    const remove = device.database.remove;
    spyOn(device.database, 'remove').and.callFake((_key: string) =>
      _key === 'WATER'
        ? Promise.reject(new Error('remove failed'))
        : remove(_key),
    );

    const failed = await device.helper
      .importBackup(
        {
          SETTINGS: [{ language: 'en' }],
          WATER: entries('water', 1),
          BREWS: entries('brew', 3),
        },
        'import',
      )
      .then(fail, (_error: unknown) => _error);

    expect(failed).toBeInstanceOf(ImportNotRolledBackError);
    // In the browser no file was written, so the message names none.
    expect((failed as ImportNotRolledBackError).messageKey).toBe(
      'IMPORT_NOT_ROLLED_BACK_NO_BACKUP',
    );
    expect(Object.fromEntries(device.data)).toEqual({
      ...before,
      WATER: imported(entries('water', 1)),
    });
  });

  it('is read again when something was stored after the backup file was read', async () => {
    const before = storedData('own');
    const device = await startDevice(before);
    const uiStorage = TestBed.inject(UIStorage);
    const changedBeans = imported(entries('changed-bean', 2));
    const write = device.directory.files.write;
    (write as jasmine.Spy).and.callFake(async (_path: string, _zip: Blob) => {
      await uiStorage.set('BEANS', changedBeans);
      device.directory.stored.set(_path, _zip);
    });
    const readAll = spyOn(device.database, 'forEach').and.callThrough();
    device.failingWrites.add('BREWS');

    const result = await device.helper.importBackup(
      { SETTINGS: [{ language: 'en' }], BREWS: entries('brew', 3) },
      'import',
    );

    expect(result).toEqual({ BACKUP: true, cause: jasmine.anything() });
    expect(readAll).toHaveBeenCalledTimes(2);
    expect(Object.fromEntries(device.data)).toEqual({
      ...before,
      BEANS: changedBeans,
    });
  });

  it('is read when no backup file is written, as in the browser', async () => {
    const before = storedData('own');
    const device = await startDevice(before, { fileSystem: false });
    const readAll = spyOn(device.database, 'forEach').and.callThrough();
    device.failingWrites.add('BREWS');

    const result = await device.helper.importBackup(
      { SETTINGS: [{ language: 'en' }], BREWS: entries('brew', 3) },
      'import',
    );

    expect(result).toEqual({ BACKUP: true, cause: jasmine.anything() });
    expect(readAll).toHaveBeenCalledTimes(1);
    expect(Object.fromEntries(device.data)).toEqual(before);
  });
});

describe('The collections counted by the check at start-up', () => {
  const COUNTED = ['BREWS', 'BEANS', 'MILL', 'PREPARATION'];

  function completeData(_prefix: string): Record<string, any> {
    return storedData(_prefix, {
      MILL: imported(entries(`${_prefix}-mill`, 1)),
      PREPARATION: imported(entries(`${_prefix}-preparation`, 1)),
    });
  }

  /** A device whose internal backup holds the data it stores. */
  async function startChecked(_stored: Record<string, any>) {
    const device = await startDevice(_stored, {
      internalBackup: await backupFileOf(_stored),
    });
    await device.helper.checkBackup();
    const reads = spyOn(device.database, 'get').and.callThrough();
    return { device, reads, uiStorage: TestBed.inject(UIStorage) };
  }

  it('are not read again by the first read of each', async () => {
    const stored = completeData('own');
    const { reads, uiStorage } = await startChecked(stored);

    for (const key of COUNTED) {
      expect(await uiStorage.getOrFail(key)).toEqual(stored[key]);
    }
    expect(await uiStorage.getOrFail('SETTINGS')).toEqual(stored.SETTINGS);

    expect(reads.calls.allArgs()).toEqual([['SETTINGS']]);
  });

  it('are read again by every further read', async () => {
    const stored = completeData('own');
    const { reads, uiStorage } = await startChecked(stored);
    await uiStorage.getOrFail('BREWS');

    expect(await uiStorage.getOrFail('BREWS')).toEqual(stored.BREWS);

    expect(reads.calls.allArgs()).toEqual([['BREWS']]);
  });

  it('is read again once it was written, the others are not', async () => {
    const stored = completeData('own');
    const { reads, uiStorage } = await startChecked(stored);
    const brews = imported(entries('new-brew', 3));

    await uiStorage.set('BREWS', brews);
    await uiStorage.remove('MILL');

    expect(await uiStorage.getOrFail('BREWS')).toEqual(brews);
    expect(await uiStorage.getOrFail('MILL')).toBeNull();
    expect(await uiStorage.getOrFail('BEANS')).toEqual(stored.BEANS);
    expect(reads.calls.allArgs()).toEqual([['BREWS'], ['MILL']]);
  });

  it('is read again when its write ended after it was counted', async () => {
    const stored = completeData('own');
    const device = await startDevice(stored, {
      internalBackup: await backupFileOf(stored),
    });
    const uiStorage = TestBed.inject(UIStorage);
    const brews = imported(entries('new-brew', 3));
    const set = device.database.set;
    let release: () => void;
    const released = new Promise<void>((_resolve) => (release = _resolve));
    spyOn(device.database, 'set').and.callFake(async (_key, _value) => {
      await released;
      return set(_key, _value);
    });
    const writing = uiStorage.set('BREWS', brews);
    await device.helper.checkBackup();
    release();
    await writing;

    expect(await uiStorage.getOrFail('BREWS')).toEqual(brews);
  });

  it('are not kept when something was written while they were counted', async () => {
    const stored = completeData('own');
    const device = await startDevice(stored, {
      internalBackup: await backupFileOf(stored),
    });
    const uiStorage = TestBed.inject(UIStorage);
    const brews = imported(entries('new-brew', 3));
    const forEach = device.database.forEach;
    let written = false;
    spyOn(device.database, 'forEach').and.callFake(async (_callback) => {
      const reading = forEach(_callback);
      if (!written) {
        written = true;
        // Written after the brews were read, before the reading ended.
        await uiStorage.set('BREWS', brews);
      }
      return reading;
    });
    await device.helper.checkBackup();

    expect(await uiStorage.getOrFail('BREWS')).toEqual(brews);
  });

  it('are read again once the database was cleared', async () => {
    const { reads, uiStorage } = await startChecked(completeData('own'));

    await uiStorage.clearStorage();

    expect(await uiStorage.getOrFail('BREWS')).toBeNull();
    expect(reads.calls.allArgs()).toEqual([['BREWS']]);
  });

  it('are read again while an import is writing', async () => {
    const stored = completeData('own');
    const { device, reads, uiStorage } = await startChecked(stored);
    const set = device.database.set;
    let writing: () => void;
    const written = new Promise<void>((_resolve) => (writing = _resolve));
    let release: () => void;
    const released = new Promise<void>((_resolve) => (release = _resolve));
    spyOn(device.database, 'set').and.callFake(async (_key, _value) => {
      writing();
      await released;
      return set(_key, _value);
    });

    const importing = uiStorage.import({
      SETTINGS: [{ language: 'en' }],
      BREWS: entries('brew', 3),
    });
    await written;

    expect(await uiStorage.getOrFail('BEANS')).toEqual(stored.BEANS);
    expect(reads.calls.allArgs()).toEqual([['BEANS']]);
    release();
    await importing;
  });

  it('are read again once the internal backup was restored', async () => {
    const backup = completeData('backup');
    backup.BREWS = imported(entries('backup-brew', 5));
    const device = await startDevice(completeData('own'), {
      internalBackup: await backupFileOf(backup),
    });
    spyOn(device.helper, 'showDataCorruptionPopover').and.resolveTo(true);
    await device.helper.checkBackup();

    expect(await TestBed.inject(UIStorage).getOrFail('BREWS')).toEqual(
      backup.BREWS,
    );
  });

  it('are not kept when the database cannot be read completely', async () => {
    const stored = completeData('own');
    const device = await startDevice(stored, {
      internalBackup: await backupFileOf(stored),
    });
    device.failingReads.count = 1;
    await device.helper.checkBackup();
    const reads = spyOn(device.database, 'get').and.callThrough();

    expect(await TestBed.inject(UIStorage).getOrFail('BREWS')).toEqual(
      stored.BREWS,
    );
    expect(reads).toHaveBeenCalledTimes(1);
  });

  it('are not kept when reading the database fails after some of them', async () => {
    const stored = completeData('own');
    const device = await startDevice(stored, {
      internalBackup: await backupFileOf(stored),
    });
    const forEach = device.database.forEach;
    let failed = false;
    spyOn(device.database, 'forEach').and.callFake((_callback) => {
      if (failed) {
        return forEach(_callback);
      }
      failed = true;
      _callback(structuredClone(stored.BREWS), 'BREWS', 0);
      _callback(structuredClone(stored.BEANS), 'BEANS', 1);
      return Promise.reject(new Error('read failed'));
    });
    await device.helper.checkBackup();
    const reads = spyOn(device.database, 'get').and.callThrough();
    const uiStorage = TestBed.inject(UIStorage);

    expect(await uiStorage.getOrFail('BREWS')).toEqual(stored.BREWS);
    expect(await uiStorage.getOrFail('BEANS')).toEqual(stored.BEANS);
    expect(reads.calls.allArgs()).toEqual([['BREWS'], ['BEANS']]);
  });
});

describe('The start of an installation with data', () => {
  it('reads the brews and the other counted collections once', async () => {
    const stored = storedData('own', {
      MILL: imported(entries('own-mill', 1)),
      PREPARATION: imported(entries('own-preparation', 1)),
    });
    // Created at start; it reads VERSION first, so it is written only after
    // the brews were taken. The journal is the write before them.
    delete stored.SETTINGS;
    const device = await startDevice(
      {
        ...stored,
        // A note about an existing bean, which the journal drops and
        // writes once the beans are read.
        [DELETION_JOURNAL_STORAGE_KEY]: [
          {
            collection: 'BEANS',
            uuid: stored.BEANS[0].config.uuid,
            deleted_at: 1,
            device_id: 'device-a',
            rev: 1,
          },
        ],
      },
      {
        internalBackup: await backupFileOf(stored),
        providers: [
          UISettingsStorage,
          UIBrewStorage,
          { provide: TranslateService, useValue: createMockTranslateService() },
        ],
      },
    );
    // Reads end in a later task, like those of IndexedDB.
    const get = device.database.get;
    const reads = spyOn(device.database, 'get').and.callFake(
      (_key: string) =>
        new Promise((_resolve) => setTimeout(() => _resolve(get(_key)))),
    );
    const readAll = spyOn(device.database, 'forEach').and.callThrough();
    const bean = TestBed.inject(UIBeanStorage);
    const preparation = TestBed.inject(UIPreparationStorage);
    const settings = TestBed.inject(UISettingsStorage);
    const brew = TestBed.inject(UIBrewStorage);
    const mill = TestBed.inject(UIMillStorage);
    const journal = TestBed.inject(DeletionJournalService);

    // In the order of AppComponent.
    await TestBed.inject(DeviceIdentityService).initialize();
    void journal.initialize();
    await device.helper.checkBackup();
    await bean.initializeStorage();
    await preparation.initializeStorage();
    await settings.initializeStorage();
    await brew.initializeStorage();
    await mill.initializeStorage();
    await Promise.all(
      [bean, preparation, settings, brew, mill].map((_storage) =>
        _storage.storageReady(),
      ),
    );
    await journal.forgetExistingEntries('BEANS', new Set());

    expect(device.data.get(DELETION_JOURNAL_STORAGE_KEY)).toEqual([]);
    expect(device.data.has('SETTINGS')).toBeTrue();
    expect(brew.getAllEntries().length).toBe(stored.BREWS.length);
    expect(readAll).toHaveBeenCalledTimes(1);
    const readAgain = reads.calls
      .allArgs()
      .map(([_key]) => _key)
      .filter((_key) =>
        ['BREWS', 'BEANS', 'MILL', 'PREPARATION'].includes(_key),
      );
    expect(readAgain).toEqual([]);
  });
});

describe('The check of the internal backup at start-up', () => {
  it('reads the internal backup while the database is counted', async () => {
    const stored = storedData('own', {
      MILL: imported(entries('own-mill', 1)),
      PREPARATION: imported(entries('own-preparation', 1)),
    });
    const device = await startDevice(stored, {
      internalBackup: await backupFileOf(stored),
    });
    const readFile = spyOn(
      device.fileHelper,
      'readInternalFileAsUint8Array',
    ).and.callThrough();
    const forEach = device.database.forEach;
    let fileReadBeforeCounting = false;
    spyOn(device.database, 'forEach').and.callFake((_callback) => {
      fileReadBeforeCounting = readFile.calls.count() === 1;
      return forEach(_callback);
    });
    const popover = spyOn(device.helper, 'showDataCorruptionPopover');

    await device.helper.checkBackup();

    expect(fileReadBeforeCounting).toBeTrue();
    expect(popover).not.toHaveBeenCalled();
  });
});

describe('The backup before a start migration', () => {
  it('writes the current data into a backup file', async () => {
    const before = storedData('own');
    const device = await startDevice(before);

    expect(
      await device.helper.writeBackupBeforeMigration('UPDATE_16'),
    ).toBeTrue();

    expect(writtenBackups(device)).toEqual([]);
    const [file] = migrationBackups(device);
    expect(file).toMatch(MIGRATION_BACKUP_FILE_PATTERN);
    const saved = await readBackupFile(device, file);
    expect(saved.BREWS).toEqual(before.BREWS);
    expect(saved.BEANS).toEqual(before.BEANS);
    expect(Object.fromEntries(device.data)).toEqual(before);
    expect(device.uiAlert.showMessageWithDetails).not.toHaveBeenCalled();
  });

  it('writes one backup for starts whose updates do not finish, and one more when another update is the first open one', async () => {
    const device = await startDevice(storedData('own'));

    for (let start = 0; start < 10; start++) {
      expect(
        await device.helper.writeBackupBeforeMigration('UPDATE_16'),
      ).toBeTrue();
    }
    expect(migrationBackups(device).length).toBe(1);

    expect(
      await device.helper.writeBackupBeforeMigration('UPDATE_17'),
    ).toBeTrue();
    expect(migrationBackups(device).length).toBe(2);
  });

  it('keeps the backup before the data updates through several imports', async () => {
    const before = storedData('own');
    const device = await startDevice(before);
    await device.helper.writeBackupBeforeMigration('UPDATE_16');
    const [file] = migrationBackups(device);

    for (const name of ['a', 'b', 'c', 'd']) {
      await device.helper.importBackup(
        { SETTINGS: [{ language: 'en' }], BREWS: entries(`tried-${name}`, 3) },
        'import',
      );
      // A new millisecond, so the next backup gets a name of its own.
      await new Promise((_resolve) => setTimeout(_resolve, 2));
    }

    expect(migrationBackups(device)).toEqual([file]);
    expect((await readBackupFile(device, file)).BREWS).toEqual(before.BREWS);
  });

  it('resolves false when the file cannot be written', async () => {
    const device = await startDevice(storedData('own'));
    device.directory.failing.write = true;

    expect(
      await device.helper.writeBackupBeforeMigration('UPDATE_16'),
    ).toBeFalse();

    expect([...device.directory.stored.keys()]).toEqual([]);
    expect(device.uiLog.error).toHaveBeenCalled();
    expect(device.uiAlert.showMessageWithDetails).toHaveBeenCalledOnceWith(
      'MIGRATION_BACKUP_FAILED',
      undefined,
    );
  });

  it('resolves false when the data cannot be read', async () => {
    const device = await startDevice(storedData('own'));
    device.failingReads.count = 1;

    expect(
      await device.helper.writeBackupBeforeMigration('UPDATE_16'),
    ).toBeFalse();

    expect(device.directory.files.write).not.toHaveBeenCalled();
    expect(device.uiAlert.showMessageWithDetails).toHaveBeenCalledOnceWith(
      'MIGRATION_BACKUP_FAILED',
      undefined,
    );
  });

  it('resolves false also when the message cannot be shown', async () => {
    const device = await startDevice(storedData('own'));
    device.directory.failing.write = true;
    device.uiAlert.showMessageWithDetails.and.rejectWith(new Error('no alert'));

    expect(
      await device.helper.writeBackupBeforeMigration('UPDATE_16'),
    ).toBeFalse();
  });

  it('writes no file in the browser and lets the migration run', async () => {
    const device = await startDevice(storedData('own'), { fileSystem: false });

    expect(
      await device.helper.writeBackupBeforeMigration('UPDATE_16'),
    ).toBeTrue();

    expect(device.directory.files.write).not.toHaveBeenCalled();
  });
});
