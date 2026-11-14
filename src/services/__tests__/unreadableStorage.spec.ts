import { TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular/standalone';
import { Storage } from '@ionic/storage';

import { StorageClass } from '../../classes/storageClass';
import { SettingsChooseAutomaticBackupToImportComponent } from '../../popover/settings-choose-automatic-backup-to-import/settings-choose-automatic-backup-to-import.component';
import { createLegacyData } from '../../test-utils/legacy-data-fixture';
import { EventQueueService } from '../queueService/queue-service.service';
import { UIAlert } from '../uiAlert';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIExportImportHelper } from '../uiExportImportHelper';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';
import { UiVersionStorage } from '../uiVersionStorage';

/**
 * A database as the app sees it. `readable: false` is a database that
 * cannot be read: every read rejects, as when IndexedDB lost its connection.
 */
function createDeviceDatabase(
  _initial: Record<string, unknown>,
  _state: { readable: boolean },
) {
  const data = new Map<string, unknown>(
    Object.entries(structuredClone(_initial)),
  );
  const unreadable = () => Promise.reject(new Error('database not readable'));
  return {
    data,
    set: (key: string, value: unknown) => {
      data.set(key, structuredClone(value));
      return Promise.resolve();
    },
    get: (key: string) =>
      _state.readable
        ? Promise.resolve(data.has(key) ? structuredClone(data.get(key)) : null)
        : unreadable(),
    forEach: (cb: (value: unknown, key: string, i: number) => void) => {
      if (!_state.readable) {
        return unreadable();
      }
      let i = 0;
      for (const [key, value] of data) {
        cb(structuredClone(value), key, i++);
      }
      return Promise.resolve();
    },
  };
}

/**
 * UIStorage waits 100 ms before it reads again, up to 20 times; the tests
 * do not wait.
 */
function withoutRetryDelay() {
  const original = window.setTimeout;
  spyOn(window, 'setTimeout').and.callFake(((
    _handler: () => void,
    _ms?: number,
  ) => {
    if (_ms === 100) {
      _handler();
      return 0;
    }
    return original.call(window, _handler, _ms) as number;
  }) as typeof window.setTimeout);
}

/** Waits until `_condition` holds, as the start runs on by itself. */
async function waitUntil(_condition: () => boolean): Promise<void> {
  for (let i = 0; i < 100 && !_condition(); i++) {
    await new Promise((_resolve) => setTimeout(_resolve, 5));
  }
  expect(_condition()).withContext('condition reached').toBeTrue();
}

function createLog() {
  const lines: string[] = [];
  const add = (_message: string) => lines.push(_message);
  return { lines, log: add, info: add, error: add, debug: add };
}

describe('Checking the internal backup at start-up with a database that cannot be read', () => {
  const INTERNAL_BACKUP_URI = 'file:///data/Beanconqueror.zip';

  beforeEach(() => withoutRetryDelay());

  /**
   * The app on a device storing `_stored`, with `_backupFile` as its
   * internal backup file. `_chosenFiles` are the files the user chooses,
   * one each time the database dialog is answered with "Choose backup" (''
   * closes the list without one). Once none is left, the user closes and
   * starts the app again, so the dialog stays open.
   */
  async function startApp(
    _stored: Record<string, unknown>,
    _state: { readable: boolean },
    _backupFile?: Uint8Array,
    _chosenFiles: string[] = [],
  ) {
    const log = createLog();
    const chosenFiles = [..._chosenFiles];
    const writeInternalFileFromBlob = jasmine
      .createSpy('writeInternalFileFromBlob')
      .and.resolveTo(undefined);
    const writeFileFromBlob = jasmine
      .createSpy('writeFileFromBlob')
      .and.resolveTo(undefined);
    const readFileAsUint8Array = jasmine
      .createSpy('readFileAsUint8Array')
      .and.callFake(() => Promise.resolve(_backupFile));
    const showIOSIndexedDBIssues = jasmine
      .createSpy('showIOSIndexedDBIssues')
      .and.callFake(() =>
        chosenFiles.length > 0
          ? Promise.resolve()
          : new Promise<void>(() => undefined),
      );
    const showMessage = jasmine.createSpy('showMessage').and.resolveTo();
    const createModal = jasmine.createSpy('create').and.callFake(() =>
      Promise.resolve({
        present: () => Promise.resolve(),
        onWillDismiss: () =>
          Promise.resolve({ data: { choosenURI: chosenFiles.shift() } }),
      }),
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        UIExportImportHelper,
        UIStorage,
        {
          provide: Storage,
          useValue: {
            create: () =>
              Promise.resolve(createDeviceDatabase(_stored, _state)),
          },
        },
        { provide: EventQueueService, useValue: { dispatch: () => undefined } },
        {
          provide: UIHelper,
          useValue: { cloneData: <T>(v: T): T => structuredClone(v) },
        },
        // The internal backup is only checked in the app.
        {
          provide: Platform,
          useValue: { is: (_platform: string) => _platform === 'capacitor' },
        },
        { provide: UILog, useValue: log },
        {
          provide: UIFileHelper,
          useValue: {
            readInternalFileAsUint8Array: () => Promise.resolve(_backupFile),
            readFileAsUint8Array,
            writeInternalFileFromBlob,
            writeFileFromBlob,
          },
        },
        {
          provide: UISettingsStorage,
          useValue: {
            getSettings: () => ({
              welcome_page_showed: true,
              show_backup_issues: true,
            }),
          },
        },
        {
          provide: UIAlert,
          useValue: {
            showLoadingSpinner: () => Promise.resolve(),
            hideLoadingSpinner: () => Promise.resolve(),
            showMessage,
            showIOSIndexedDBIssues,
          },
        },
        {
          provide: UIBrewStorage,
          useValue: { getAllEntries: () => [{}] },
        },
        { provide: ModalController, useValue: { create: createModal } },
      ],
    });
    await TestBed.inject(UIStorage).init();
    const helper = TestBed.inject(UIExportImportHelper);
    const popover = spyOn(helper, 'showDataCorruptionPopover').and.resolveTo(
      false,
    );
    const importBackup = spyOn(helper, 'importBackup').and.resolveTo({
      BACKUP: false,
    });
    return {
      helper,
      popover,
      importBackup,
      log,
      writeInternalFileFromBlob,
      writeFileFromBlob,
      readFileAsUint8Array,
      showIOSIndexedDBIssues,
      showMessage,
      createModal,
    };
  }

  /** The backup file a device storing `_data` writes. */
  async function writeBackupFile(
    _data: Record<string, unknown>,
  ): Promise<Uint8Array> {
    const { helper } = await startApp(_data, { readable: true });
    return new Uint8Array(await (await helper.buildExportZIP()).arrayBuffer());
  }

  /** Writes the automatic backups as the app does after a change. */
  async function saveAutomaticBackups(
    _helper: UIExportImportHelper,
  ): Promise<void> {
    await _helper.saveAutomaticBackups();
    await new Promise((_resolve) => setTimeout(_resolve, 200));
  }

  it('does not go on with the start, but asks to start the app again or to choose a backup', async () => {
    const data = createLegacyData({ brews: 20, beans: 4 });
    const backupFile = await writeBackupFile(data);
    const { helper, importBackup, popover, showIOSIndexedDBIssues } =
      await startApp(data, { readable: false }, backupFile);

    let started = false;
    void helper.checkBackup().then(() => (started = true));
    await waitUntil(() => showIOSIndexedDBIssues.calls.count() > 0);
    await new Promise((_resolve) => setTimeout(_resolve, 20));

    expect(showIOSIndexedDBIssues).toHaveBeenCalledOnceWith(
      'DATABASE_NOT_READ_DESCRIPTION',
      'IOS_DATABASE_ISSUE_TITLE',
      true,
      'CHOOSE_BACKUP',
    );
    expect(started).toBeFalse();
    // Nothing is imported by itself.
    expect(importBackup).not.toHaveBeenCalled();
    expect(popover).not.toHaveBeenCalled();
  });

  it('logs that the internal backup was not imported by itself', async () => {
    const data = createLegacyData({ brews: 20, beans: 4 });
    const backupFile = await writeBackupFile(data);
    const { helper, log } = await startApp(
      data,
      { readable: false },
      backupFile,
      [INTERNAL_BACKUP_URI],
    );

    await helper.checkBackup();

    expect(
      log.lines.some((_line) =>
        _line.includes('could not be read, the internal backup is not'),
      ),
    ).toBeTrue();
  });

  it('imports the backup chosen in the list of backups, without a backup of the data that cannot be read', async () => {
    const data = createLegacyData({ brews: 20, beans: 4 });
    const backupFile = await writeBackupFile(data);
    const { helper, importBackup, readFileAsUint8Array, createModal } =
      await startApp(data, { readable: false }, backupFile, [
        INTERNAL_BACKUP_URI,
      ]);

    await helper.checkBackup();

    expect(createModal).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({
        component: SettingsChooseAutomaticBackupToImportComponent,
      }),
    );
    expect(readFileAsUint8Array).toHaveBeenCalledOnceWith(INTERNAL_BACKUP_URI);
    expect(importBackup).toHaveBeenCalledTimes(1);
    const [imported, source, fileName, currentDataUnreadable] =
      importBackup.calls.mostRecent().args;
    expect((imported as any).BREWS).toEqual(data.BREWS);
    expect(source).toBe('import');
    expect(fileName).toBe('Beanconqueror.zip');
    expect(currentDataUnreadable).toBeTrue();
  });

  it('asks again when the list of backups was closed without one', async () => {
    const data = createLegacyData({ brews: 20, beans: 4 });
    const backupFile = await writeBackupFile(data);
    const { helper, importBackup, showIOSIndexedDBIssues } = await startApp(
      data,
      { readable: false },
      backupFile,
      ['', INTERNAL_BACKUP_URI],
    );

    await helper.checkBackup();

    expect(showIOSIndexedDBIssues).toHaveBeenCalledTimes(2);
    expect(importBackup).toHaveBeenCalledTimes(1);
  });

  for (const [failure, message] of [
    ['was rolled back', 'IMPORT_UNSUCCESSFULLY_DATA_NOT_CHANGED'],
    ['failed and could not be rolled back', 'IMPORT_UNSUCCESSFULLY'],
  ]) {
    it(`says so and asks again when the import ${failure}`, async () => {
      const data = createLegacyData({ brews: 20, beans: 4 });
      const backupFile = await writeBackupFile(data);
      const { helper, importBackup, showIOSIndexedDBIssues, showMessage } =
        await startApp(data, { readable: false }, backupFile, [
          INTERNAL_BACKUP_URI,
          INTERNAL_BACKUP_URI,
        ]);
      const failed =
        message === 'IMPORT_UNSUCCESSFULLY'
          ? Promise.reject(new Error('could not be rolled back'))
          : Promise.resolve({ BACKUP: true });
      failed.catch(() => undefined);
      importBackup.and.returnValues(failed, Promise.resolve({ BACKUP: false }));

      await helper.checkBackup();

      expect(showMessage).toHaveBeenCalledOnceWith(
        message,
        undefined,
        undefined,
        true,
      );
      expect(showIOSIndexedDBIssues).toHaveBeenCalledTimes(2);
      expect(importBackup).toHaveBeenCalledTimes(2);
    });
  }

  it('keeps the internal backup file until every collection was read', async () => {
    const data = createLegacyData({ brews: 20, beans: 4 });
    const backupFile = await writeBackupFile(data);
    const state = { readable: false };
    const { helper, writeInternalFileFromBlob, writeFileFromBlob } =
      await startApp(data, state, backupFile, [INTERNAL_BACKUP_URI]);
    await helper.checkBackup();

    // The database can be read again, and a change triggers the backups.
    state.readable = true;
    await saveAutomaticBackups(helper);

    expect(writeInternalFileFromBlob).not.toHaveBeenCalled();
    // The backup of the day is still written.
    expect(writeFileFromBlob).toHaveBeenCalledTimes(1);

    helper.allCollectionsRead();
    await saveAutomaticBackups(helper);

    expect(writeInternalFileFromBlob).toHaveBeenCalledTimes(1);
  });

  it('still imports the internal backup without asking when the database is empty', async () => {
    const data = createLegacyData({ brews: 20, beans: 4 });
    const backupFile = await writeBackupFile(data);
    const { helper, importBackup, popover, showIOSIndexedDBIssues } =
      await startApp({}, { readable: true }, backupFile);

    await helper.checkBackup();

    expect(importBackup).toHaveBeenCalledTimes(1);
    expect(importBackup.calls.mostRecent().args[1]).toBe('internal_backup');
    expect(importBackup.calls.mostRecent().args[3]).toBeUndefined();
    expect(popover).not.toHaveBeenCalled();
    expect(showIOSIndexedDBIssues).not.toHaveBeenCalled();
  });

  it('still starts with the stored data without asking when it can be read', async () => {
    const data = createLegacyData({ brews: 20, beans: 4 });
    const backupFile = await writeBackupFile(data);
    const { helper, importBackup, popover, showIOSIndexedDBIssues } =
      await startApp(data, { readable: true }, backupFile);

    await helper.checkBackup();

    expect(importBackup).not.toHaveBeenCalled();
    expect(popover).not.toHaveBeenCalled();
    expect(showIOSIndexedDBIssues).not.toHaveBeenCalled();
  });

  it('writes no automatic backup while the database cannot be read', async () => {
    const data = createLegacyData({ brews: 20, beans: 4 });
    const state = { readable: true };
    const { helper, writeInternalFileFromBlob, writeFileFromBlob } =
      await startApp(data, state);
    spyOn(helper, 'buildExportZIP').and.resolveTo(new Blob(['zip']));
    state.readable = false;

    await saveAutomaticBackups(helper);

    expect(writeInternalFileFromBlob).not.toHaveBeenCalled();
    expect(writeFileFromBlob).not.toHaveBeenCalled();
  });
});

describe('A collection that could not be read', () => {
  class TestStorage extends StorageClass {
    public constructor() {
      super('BEANS');
    }
  }

  const stored = () => [
    { config: { uuid: 'stored-1', unix_timestamp: 1 }, name: 'Stored 1' },
    { config: { uuid: 'stored-2', unix_timestamp: 2 }, name: 'Stored 2' },
  ];

  let database: Record<string, unknown>;
  let readable: boolean;
  let uiStorage: { getOrFail: jasmine.Spy; set: jasmine.Spy };
  let log: ReturnType<typeof createLog>;
  let showMessage: jasmine.Spy;
  let storage: TestStorage;

  beforeEach(() => {
    database = { BEANS: stored() };
    readable = false;
    log = createLog();
    showMessage = jasmine.createSpy('showMessage').and.resolveTo();
    uiStorage = {
      getOrFail: jasmine.createSpy('getOrFail'),
      set: jasmine.createSpy('set'),
    };
    // What UIStorage does once its attempts to read are used up.
    uiStorage.getOrFail.and.callFake((_key: string) =>
      readable
        ? Promise.resolve(structuredClone(database[_key] ?? null))
        : Promise.reject(
            new Error(`UIStorage - Get Key - ${_key} could not be read`),
          ),
    );
    uiStorage.set.and.callFake((_key: string, _value: unknown) => {
      database[_key] = structuredClone(_value);
      return Promise.resolve(true);
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: UIStorage, useValue: uiStorage },
        { provide: UILog, useValue: log },
      ],
    });
    spyOn(UIAlert, 'getInstance').and.returnValue({ showMessage } as any);
    storage = TestBed.runInInjectionContext(() => new TestStorage());
  });

  it('is reported as not initialized', async () => {
    await expectAsync(storage.initializeStorage()).toBeRejected();
    await expectAsync(storage.storageReady()).toBeRejected();
  });

  it('does not replace the stored entries when an entry is added', async () => {
    await storage.initializeStorage().catch(() => undefined);

    const result = await storage.addAndConfirm({ config: {}, name: 'New' });

    expect(result.saved).toBeFalse();
    expect(uiStorage.set).not.toHaveBeenCalled();
    expect(database.BEANS).toEqual(stored());
    expect(storage.getAllEntries()).toEqual([]);
  });

  it('does not replace the stored entries when an entry is updated, removed or filled in', async () => {
    await storage.initializeStorage().catch(() => undefined);

    expect(await storage.update(stored()[0])).toBeFalse();
    expect(await storage.removeByUUID('stored-1')).toBeFalse();
    expect(await storage.removeByObject(stored()[1])).toBeFalse();
    expect(await storage.backfillWithoutTouch(() => 1)).toBeFalse();

    expect(uiStorage.set).not.toHaveBeenCalled();
    expect(database.BEANS).toEqual(stored());
  });

  it('logs and reports a write it did not make', async () => {
    await storage.initializeStorage().catch(() => undefined);

    await storage.add({ config: {}, name: 'New' });

    expect(
      log.lines.some((_line) =>
        _line.includes('Storage - Add - Unsuccessfully - BEANS'),
      ),
    ).toBeTrue();
    // In words of the user, translated; the details are only logged.
    expect(showMessage).toHaveBeenCalledOnceWith(
      'STORAGE_NOT_READ_NOTHING_SAVED',
      undefined,
      undefined,
      true,
    );
  });

  it('names each write it did not make and does not look for the entry', async () => {
    await storage.initializeStorage().catch(() => undefined);
    const reason = 'BEANS - the stored entries could not be read';

    await storage.update(stored()[0]);
    await storage.removeByUUID('stored-1');
    await storage.backfillWithoutTouch(() => 1);

    for (const action of ['Update', 'Delete', 'Backfill']) {
      expect(log.lines)
        .withContext(action)
        .toContain(
          `Storage - ${action} - Unsuccessfully - ${reason}, nothing was saved`,
        );
    }
    expect(log.lines.some((_line) => _line.includes('not found'))).toBeFalse();
    expect(log.lines).not.toContain('Storage - Delete - Unsuccessfully');
    expect(showMessage).toHaveBeenCalledTimes(3);
  });

  it('does not replace the stored entries when it was never read', async () => {
    readable = true;

    const result = await storage.addAndConfirm({ config: {}, name: 'New' });
    expect(await storage.update(stored()[0])).toBeFalse();
    expect(await storage.removeByUUID('stored-1')).toBeFalse();
    expect(await storage.backfillWithoutTouch(() => 1)).toBeFalse();

    expect(result.saved).toBeFalse();
    expect(uiStorage.set).not.toHaveBeenCalled();
    expect(database.BEANS).toEqual(stored());
    expect(log.lines).toContain(
      'Storage - Add - Unsuccessfully - BEANS - the stored entries were not read yet, nothing was saved',
    );
  });

  it('sends no event for a write it did not make', async () => {
    await storage.initializeStorage().catch(() => undefined);
    const events: unknown[] = [];
    storage.attachOnEvent().subscribe((_event) => events.push(_event));
    storage.attachOnRemove().subscribe((_event) => events.push(_event));

    await storage.add({ config: {}, name: 'New' });
    await storage.removeByUUID('stored-1');

    expect(events).toEqual([]);
  });

  it('can be written again once it was read', async () => {
    await storage.initializeStorage().catch(() => undefined);
    readable = true;

    await storage.reinitializeStorage();
    const result = await storage.addAndConfirm({ config: {}, name: 'New' });

    expect(result.saved).toBeTrue();
    expect((database.BEANS as unknown[]).length).toBe(3);
  });

  it('stays unwritten when reading it again fails after an import', async () => {
    readable = true;
    await storage.initializeStorage();
    readable = false;
    const events: any[] = [];
    storage.attachOnEvent().subscribe((_event) => events.push(_event));

    await expectAsync(storage.reinitializeStorage()).toBeRejected();
    const result = await storage.addAndConfirm({ config: {}, name: 'New' });

    expect(result.saved).toBeFalse();
    expect(database.BEANS).toEqual(stored());
    // Lets the typed storages drop the objects of the entries read before.
    expect(events).toEqual([{ type: 'REINITIALIZE' }]);
  });

  it('is not written while it is being read', async () => {
    let finishRead: (value: unknown) => void;
    uiStorage.getOrFail.and.returnValue(
      new Promise((_resolve) => {
        finishRead = _resolve;
      }),
    );
    const initialized = storage.initializeStorage();

    const result = await storage.addAndConfirm({ config: {}, name: 'New' });
    finishRead(stored());
    await initialized;

    expect(result.saved).toBeFalse();
    expect(uiStorage.set).not.toHaveBeenCalled();
    expect(storage.getAllEntries()).toEqual(stored());
  });
});

describe('Settings and version that could not be read', () => {
  // Both create their entry when none is stored. That must not happen when
  // the stored one was only not read.
  const database = () => ({
    SETTINGS: [{ config: { uuid: 'settings', unix_timestamp: 1 } }],
    VERSION: [
      {
        config: { uuid: 'version', unix_timestamp: 1 },
        alreadyDisplayedVersions: [],
        updatedDataVersions: ['UPDATE_1'],
      },
    ],
  });

  function createUnreadableStorage() {
    const stored: Record<string, unknown> = database();
    const set = jasmine
      .createSpy('set')
      .and.callFake((_key: string, _value: unknown) => {
        stored[_key] = structuredClone(_value);
        return Promise.resolve(true);
      });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UIStorage,
          useValue: {
            getOrFail: () => Promise.reject(new Error('read failed')),
            set,
          },
        },
        { provide: UILog, useValue: createLog() },
      ],
    });
    spyOn(UIAlert, 'getInstance').and.returnValue({
      showMessage: () => Promise.resolve(),
    } as any);
    return { stored, set };
  }

  it('creates no new settings over the stored ones', async () => {
    const { stored, set } = createUnreadableStorage();
    const settingsStorage = TestBed.inject(UISettingsStorage);

    await settingsStorage.initializeStorage().catch(() => undefined);

    await expectAsync(settingsStorage.storageReady()).toBeRejected();
    expect(set).not.toHaveBeenCalled();
    expect(stored).toEqual(database());
  });

  it('creates no new version entry over the stored one and saves none', async () => {
    const { stored, set } = createUnreadableStorage();
    const versionStorage = TestBed.inject(UiVersionStorage);

    await versionStorage.initializeStorage().catch(() => undefined);

    await expectAsync(versionStorage.storageReady()).toBeRejected();
    const version = versionStorage.getVersion();
    version.pushUpdatedDataVersion('UPDATE_17');
    await versionStorage.saveVersion(version);
    expect(set).not.toHaveBeenCalled();
    expect(stored).toEqual(database());
  });
});

describe('UIStorage', () => {
  beforeEach(() => withoutRetryDelay());

  async function createStorage(
    _stored: Record<string, unknown>,
    _state = { readable: true },
  ) {
    const log = createLog();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        UIStorage,
        {
          provide: Storage,
          useValue: {
            create: () =>
              Promise.resolve(createDeviceDatabase(_stored, _state)),
          },
        },
        { provide: EventQueueService, useValue: { dispatch: () => undefined } },
        { provide: UILog, useValue: log },
      ],
    });
    const uiStorage = TestBed.inject(UIStorage);
    await uiStorage.init();
    return { uiStorage, log };
  }

  describe('getDataState', () => {
    it('is "data" when a data update is noted as done', async () => {
      const { uiStorage } = await createStorage({
        VERSION: [{ updatedDataVersions: ['UPDATE_1'] }],
      });

      expect(await uiStorage.getDataState()).toBe('data');
    });

    it('is "empty" when nothing is stored', async () => {
      const { uiStorage } = await createStorage({});

      expect(await uiStorage.getDataState()).toBe('empty');
    });

    it('is "empty" when no data update is noted as done', async () => {
      const noUpdates = await createStorage({
        VERSION: [{ updatedDataVersions: [] }],
        SETTINGS: [{}],
      });
      const noList = await createStorage({ VERSION: [{}] });

      expect(await noUpdates.uiStorage.getDataState()).toBe('empty');
      expect(await noList.uiStorage.getDataState()).toBe('empty');
    });

    it('is "unknown" and not "empty" when the database cannot be read', async () => {
      const { uiStorage, log } = await createStorage(
        { VERSION: [{ updatedDataVersions: ['UPDATE_1'] }] },
        { readable: false },
      );
      const showIOSIndexedDBIssues = jasmine.createSpy(
        'showIOSIndexedDBIssues',
      );
      spyOn(UIAlert, 'getInstance').and.returnValue({
        showIOSIndexedDBIssues,
      } as any);

      expect(await uiStorage.getDataState()).toBe('unknown');
      expect(log.lines).toContain('UIStorage - Data state - could not be read');
      // The caller decides what to show.
      expect(showIOSIndexedDBIssues).not.toHaveBeenCalled();
    });

    it('reads again and reconnects to the database before it is "unknown"', async () => {
      const state = { readable: false };
      const { uiStorage } = await createStorage(
        { VERSION: [{ updatedDataVersions: ['UPDATE_1'] }] },
        state,
      );
      const storage = TestBed.inject(Storage);
      const connect: () => Promise<Storage> = storage.create.bind(storage);
      const create = spyOn(storage, 'create').and.callFake(() => {
        state.readable = true;
        return connect();
      });

      expect(await uiStorage.getDataState()).toBe('data');
      expect(create).toHaveBeenCalledTimes(1);
    });
  });
});
