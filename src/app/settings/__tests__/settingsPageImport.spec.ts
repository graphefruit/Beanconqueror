import { TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';

import de from '../../../assets/i18n/de.json';
import en from '../../../assets/i18n/en.json';
import { Settings } from '../../../classes/settings/settings';
import { StorageClass } from '../../../classes/storageClass';
import { Version } from '../../../classes/version/iVersion';
import { BrewReferencesService } from '../../../services/brewReferences/brew-references.service';
import { ChangeTrackingMigrationService } from '../../../services/changeTracking/change-tracking-migration.service';
import { DuplicateEntriesMigrationService } from '../../../services/changeTracking/duplicate-entries-migration.service';
import { PreImportBackupError } from '../../../services/preImportBackup/pre-import-backup.service';
import { UIAlert } from '../../../services/uiAlert';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import {
  ImportNotRolledBackError,
  UIExportImportHelper,
} from '../../../services/uiExportImportHelper';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIHelper } from '../../../services/uiHelper';
import { UILog } from '../../../services/uiLog';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIStorage } from '../../../services/uiStorage';
import { UIUpdate } from '../../../services/uiUpdate';
import { UiVersionStorage } from '../../../services/uiVersionStorage';
import { FakeStoreSource } from '../../../stores/core/__tests__/fake-store-source';
import { CollectionStore } from '../../../stores/core/collection-store';
import { StoreHub } from '../../../stores/core/store-hub';
import { createLegacyData } from '../../../test-utils/legacy-data-fixture';
import { SettingsPage } from '../settings.page';

describe('SettingsPage standard mill after an import', () => {
  function pageWith(_done: boolean) {
    const brewReferences = {
      addStandardMill: jasmine
        .createSpy('addStandardMill')
        .and.resolveTo(_done),
    };
    const uiLog = jasmine.createSpyObj('UILog', ['error']);
    // Only the service is needed; the page itself is not rendered.
    const page = Object.create(SettingsPage.prototype);
    page.brewReferences = brewReferences;
    page.uiLog = uiLog;
    return { page, brewReferences, uiLog };
  }

  it('points imported brews at the standard mill', async () => {
    const { page, brewReferences, uiLog } = pageWith(true);

    await page.__addStandardMillAfterImport();

    expect(brewReferences.addStandardMill).toHaveBeenCalledTimes(1);
    expect(uiLog.error).not.toHaveBeenCalled();
  });

  it('logs when the brews or the mill were not stored', async () => {
    const { page, uiLog } = pageWith(false);

    await page.__addStandardMillAfterImport();

    expect(uiLog.error).toHaveBeenCalledOnceWith(
      'Import - brews not pointed at the standard mill',
    );
  });
});

function pageWith(_options: {
  savesBackup: boolean;
  choice: 'YES' | 'NO';
  importBackup?: jasmine.Spy;
  reinitializeStorage?: (_path: string) => Promise<void>;
  storeHub?: StoreHub;
}) {
  const storage = (_path: string) => ({
    getDBPath: () => _path,
    reinitializeStorage: () =>
      _options.reinitializeStorage?.(_path) ?? Promise.resolve(),
    storageReady: () => Promise.resolve(),
    getAllEntries: () => [],
  });
  const uiAlert = jasmine.createSpyObj('UIAlert', {
    showLoadingSpinner: Promise.resolve(),
    hideLoadingSpinner: Promise.resolve(),
    showMessage: Promise.resolve(),
    showMessageWithDetails: Promise.resolve(),
    showConfirm: Promise.resolve(_options.choice),
  });
  const uiExportImportHelper = {
    savesBackupBeforeImport: () => _options.savesBackup,
    // A rolled back import ends the import without reloading the storages.
    importBackup:
      _options.importBackup ??
      jasmine.createSpy('importBackup').and.resolveTo({ BACKUP: true }),
  };
  // Only what the import of a parsed file uses; the page is not rendered.
  const page = Object.create(SettingsPage.prototype);
  Object.assign(page, {
    uiAlert,
    uiExportImportHelper,
    storeHub: _options.storeHub ?? new StoreHub(),
    uiLog: { log: () => undefined, error: () => undefined },
    platform: { is: () => false },
    translate: { instant: (_key: string) => _key },
    uiHelper: { copyData: <T>(_value: T): T => structuredClone(_value) },
    settings: new Settings(),
    uiPreparationStorage: storage('PREPARATION'),
    uiBeanStorage: storage('BEANS'),
    uiBrewStorage: storage('BREWS'),
    uiSettingsStorage: storage('SETTINGS'),
    uiRoastingMachineStorage: storage('ROASTING_MACHINES'),
    uiGreenBeanStorage: storage('GREEN_BEANS'),
    uiWaterStorage: storage('WATER'),
    uiVersionStorage: storage('VERSION'),
    uiGraphStorage: storage('GRAPH'),
    uiMillStorage: storage('MILL'),
    uiBaristamodeBrewStorage: storage('BARISTAMODE_BREWS'),
    uiUpdate: { checkUpdate: () => Promise.resolve() },
  });
  return { page, uiAlert, importBackup: uiExportImportHelper.importBackup };
}

function parsedBackup() {
  return {
    SETTINGS: [{ brew_view: 0, brew_order: { before: {} } }],
    BREWS: [],
  };
}

describe('SettingsPage importing a backup file', () => {
  it('asks before the import and says where the current data is saved', async () => {
    const { page, uiAlert, importBackup } = pageWith({
      savesBackup: true,
      choice: 'YES',
    });
    const backup = parsedBackup();

    await page.__importJSON(backup, '', 'Beanconqueror 2.zip');

    expect(uiAlert.showConfirm).toHaveBeenCalledOnceWith(
      'PRE_IMPORT_BACKUP_HINT',
      'IMPORT_REPLACE_ALL_DATA_QUESTION',
      true,
    );
    // No spinner while the question is open, the import starts after it.
    expect(
      uiAlert.hideLoadingSpinner.calls.first().invocationOrder,
    ).toBeLessThan(uiAlert.showConfirm.calls.first().invocationOrder);
    expect(uiAlert.showConfirm).toHaveBeenCalledBefore(importBackup);
    expect(importBackup).toHaveBeenCalledOnceWith(
      backup,
      'import',
      'Beanconqueror 2.zip',
    );
  });

  it('says that no backup file is written in the browser', async () => {
    const { page, uiAlert, importBackup } = pageWith({
      savesBackup: false,
      choice: 'YES',
    });

    await page.__importJSON(parsedBackup(), '');

    expect(uiAlert.showConfirm).toHaveBeenCalledOnceWith(
      'PRE_IMPORT_BACKUP_HINT_BROWSER',
      'IMPORT_REPLACE_ALL_DATA_QUESTION',
      true,
    );
    expect(importBackup).toHaveBeenCalledTimes(1);
  });

  it('imports nothing when the question is declined', async () => {
    const { page, uiAlert, importBackup } = pageWith({
      savesBackup: true,
      choice: 'NO',
    });

    await page.__importJSON(parsedBackup(), '');

    expect(importBackup).not.toHaveBeenCalled();
    expect(uiAlert.showLoadingSpinner).not.toHaveBeenCalled();
    expect(uiAlert.showMessage).not.toHaveBeenCalled();
    expect(uiAlert.showMessageWithDetails).not.toHaveBeenCalled();
  });

  it('says that nothing was imported when the current data could not be saved, with the reason', async () => {
    const reason = new Error('disk full');
    const { page, uiAlert } = pageWith({
      savesBackup: true,
      choice: 'YES',
      importBackup: jasmine
        .createSpy('importBackup')
        .and.rejectWith(new PreImportBackupError(reason)),
    });

    await page.__importJSON(parsedBackup(), '');

    expect(uiAlert.hideLoadingSpinner).toHaveBeenCalled();
    expect(uiAlert.showMessageWithDetails).toHaveBeenCalledOnceWith(
      'PRE_IMPORT_BACKUP_FAILED',
      reason,
    );
  });

  it('says that no data was changed when the import was rolled back, with the error of the import', async () => {
    const cause = new TypeError('x is null');
    const { page, uiAlert } = pageWith({
      savesBackup: true,
      choice: 'YES',
      importBackup: jasmine
        .createSpy('importBackup')
        .and.resolveTo({ BACKUP: true, cause }),
    });

    await page.__importJSON(parsedBackup(), '');

    expect(uiAlert.hideLoadingSpinner).toHaveBeenCalled();
    expect(uiAlert.showMessageWithDetails).toHaveBeenCalledOnceWith(
      'IMPORT_UNSUCCESSFULLY_DATA_NOT_CHANGED',
      cause,
    );
    expect(uiAlert.showMessage).not.toHaveBeenCalled();
  });

  for (const [backup, written, message] of [
    ['names the backup from before', true, 'IMPORT_NOT_ROLLED_BACK'],
    [
      'names no backup when none was written',
      false,
      'IMPORT_NOT_ROLLED_BACK_NO_BACKUP',
    ],
  ] as const) {
    it(`says that the data can be incomplete and ${backup} when the import could not be rolled back, with the error of the import`, async () => {
      const cause = new Error('quota exceeded');
      const { page, uiAlert } = pageWith({
        savesBackup: written,
        choice: 'YES',
        importBackup: jasmine
          .createSpy('importBackup')
          .and.rejectWith(new ImportNotRolledBackError(written, cause)),
      });

      await page.__importJSON(parsedBackup(), '');

      expect(uiAlert.hideLoadingSpinner).toHaveBeenCalled();
      expect(uiAlert.showMessageWithDetails).toHaveBeenCalledOnceWith(
        message,
        cause,
      );
    });
  }

  it('says in English and German where the backup from before the import is found', () => {
    for (const texts of [en, de]) {
      expect(texts.IMPORT_NOT_ROLLED_BACK).toContain('pre-import');
      expect(texts.IMPORT_NOT_ROLLED_BACK).toContain(
        texts.FIND_AUTOMATIC_BACKUP_FILES,
      );
      expect(texts.IMPORT_NOT_ROLLED_BACK_NO_BACKUP).not.toContain(
        'pre-import',
      );
    }
  });

  it('says that the import was stored when loading the data again fails, with the error', async () => {
    const error = new Error('BEANS could not be read');
    const { page, uiAlert } = pageWith({
      savesBackup: true,
      choice: 'YES',
      importBackup: jasmine
        .createSpy('importBackup')
        .and.resolveTo({ BACKUP: false }),
    });
    spyOn(page, '__reinitializeStorages').and.rejectWith(error);

    await page.__importJSON(parsedBackup(), '');

    // Not "no data changed": the user would import the file again.
    expect(uiAlert.hideLoadingSpinner).toHaveBeenCalled();
    expect(uiAlert.showMessageWithDetails).toHaveBeenCalledOnceWith(
      'IMPORT_STORED_RELOAD_FAILED',
      error,
    );
    expect(uiAlert.showMessage).not.toHaveBeenCalled();
  });

  it('does not report a failed reload when a step after the success message fails', async () => {
    const { page, uiAlert } = pageWith({
      savesBackup: true,
      choice: 'YES',
      importBackup: jasmine
        .createSpy('importBackup')
        .and.resolveTo({ BACKUP: false }),
    });
    spyOn(page, '__reinitializeStorages').and.resolveTo();
    spyOn(page, '__initializeSettings');
    spyOn(page, '__addStandardMillAfterImport').and.resolveTo();
    spyOn(page, 'setLanguage');
    spyOn(page, '__reportFilesNotCopied').and.rejectWith(
      new Error('alert not shown'),
    );
    Object.assign(page, {
      uiAnalytics: { disableTracking: () => undefined },
      themeService: { adjustTheme: () => Promise.resolve() },
    });
    page.uiSettingsStorage.saveSettings = () => Promise.resolve();

    await page.__importJSON(parsedBackup(), '');

    expect(uiAlert.showMessage).toHaveBeenCalledOnceWith('IMPORT_SUCCESSFULLY');
    expect(uiAlert.showMessageWithDetails).not.toHaveBeenCalled();
  });

  it('says in English and German that the import was stored and to start the app again', () => {
    expect(en.IMPORT_STORED_RELOAD_FAILED).toContain('Import saved');
    expect(en.IMPORT_STORED_RELOAD_FAILED).toContain('start it again');
    expect(de.IMPORT_STORED_RELOAD_FAILED).toContain('Import gespeichert');
    expect(de.IMPORT_STORED_RELOAD_FAILED).toContain('starte sie neu');
  });

  it('keeps the message for other failures of the import, with their error', async () => {
    const error = new Error('current data not readable');
    const { page, uiAlert } = pageWith({
      savesBackup: true,
      choice: 'YES',
      importBackup: jasmine.createSpy('importBackup').and.rejectWith(error),
    });

    await page.__importJSON(parsedBackup(), '');

    expect(uiAlert.showMessageWithDetails).toHaveBeenCalledOnceWith(
      'IMPORT_UNSUCCESSFULLY_DATA_NOT_CHANGED',
      error,
    );
  });
});

describe('SettingsPage keeping the stores while it imports', () => {
  interface Entry {
    config: { uuid: string };
  }
  let hub: StoreHub;
  let beans: FakeStoreSource;
  let store: CollectionStore<Entry>;
  /** What the stored beans were read as when the import ran. */
  let seenDuring: string[];

  const stored = (uuid: string): Entry => ({ config: { uuid } });
  const shown = () => store.entries().map((e) => e.config.uuid);

  beforeEach(async () => {
    hub = new StoreHub();
    beans = new FakeStoreSource();
    await beans.load([stored('old')]);
    store = new CollectionStore<Entry>(
      beans,
      (json) => JSON.parse(json) as Entry,
      { error: () => undefined },
      (e) => e,
      hub,
    );
    expect(shown()).toEqual(['old']);
    seenDuring = [];
  });

  function importing(
    _result: { BACKUP: boolean } | Error,
    _reread?: () => void,
  ) {
    const importBackup = jasmine.createSpy('importBackup').and.callFake(() => {
      seenDuring.push(hub.loadState(), ...shown());
      return _result instanceof Error
        ? Promise.reject(_result)
        : Promise.resolve(_result);
    });
    return pageWith({
      savesBackup: true,
      choice: 'YES',
      importBackup,
      storeHub: hub,
      reinitializeStorage: (_path) => {
        if (_path === 'BEANS') {
          _reread?.();
          seenDuring.push(...shown());
          return beans.isRead()
            ? Promise.resolve()
            : Promise.reject(new Error('BEANS not read'));
        }
        return Promise.resolve();
      },
    });
  }

  it('shows the beans from before while the import runs, and the imported ones after it', async () => {
    const { page } = importing({ BACKUP: false }, () =>
      beans.reread([stored('imported')]),
    );
    // What follows the reload has tests of its own.
    spyOn(page, '__initializeSettings');
    spyOn(page, '__addStandardMillAfterImport').and.resolveTo();
    spyOn(page, 'setLanguage');
    spyOn(page, '__reportFilesNotCopied').and.resolveTo();
    spyOn(page, 'showAnalyticsInformation').and.resolveTo();
    Object.assign(page, {
      uiAnalytics: { disableTracking: () => undefined },
      themeService: { adjustTheme: () => Promise.resolve() },
      uiExportImportHelper: {
        ...page.uiExportImportHelper,
        allCollectionsRead: () => undefined,
      },
    });
    page.uiSettingsStorage.saveSettings = () => Promise.resolve();

    await page.__importJSON(parsedBackup(), '');

    expect(seenDuring).toEqual(['reloading', 'old', 'old']);
    expect(hub.loadState()).toBe('ready');
    expect(shown()).toEqual(['imported']);
  });

  it('keeps showing the beans when they cannot be read after the import', async () => {
    const { page, uiAlert } = importing({ BACKUP: false }, () =>
      beans.reread('unreadable'),
    );

    await page.__importJSON(parsedBackup(), '');

    expect(uiAlert.showMessageWithDetails).toHaveBeenCalledWith(
      'IMPORT_STORED_RELOAD_FAILED',
      jasmine.any(Error),
    );
    expect(hub.loadState()).toBe('ready');
    expect(shown()).toEqual(['old']);
  });

  it('keeps showing the beans when the import was rolled back', async () => {
    const { page } = importing({ BACKUP: true });

    await page.__importJSON(parsedBackup(), '');

    expect(seenDuring).toEqual(['reloading', 'old']);
    expect(hub.loadState()).toBe('ready');
    expect(shown()).toEqual(['old']);
  });

  it('ends the reload when the import fails', async () => {
    const { page } = importing(new Error('current data not readable'));

    await page.__importJSON(parsedBackup(), '');

    expect(hub.loadState()).toBe('ready');
    expect(shown()).toEqual(['old']);
  });
});

describe('SettingsPage loading the collections again after an import', () => {
  class TestStorage extends StorageClass {
    public constructor(_path: string) {
      super(_path);
    }
  }

  const entry = (_uuid: string) => ({
    config: { uuid: _uuid, unix_timestamp: 1 },
  });

  const FIELDS: Record<string, string> = {
    uiBeanStorage: 'BEANS',
    uiPreparationStorage: 'PREPARATION',
    uiSettingsStorage: 'SETTINGS',
    uiBrewStorage: 'BREWS',
    uiMillStorage: 'MILL',
    uiVersionStorage: 'VERSION',
    uiGreenBeanStorage: 'GREEN_BEANS',
    uiRoastingMachineStorage: 'ROASTING_MACHINES',
    uiWaterStorage: 'WATER',
    uiGraphStorage: 'GRAPH',
    uiBaristamodeBrewStorage: 'BARISTAMODE_BREWS',
  };

  /**
   * The page with real collections over one database. Every collection was
   * read with an entry from before the import; `unreadable` lists the keys
   * that cannot be read from then on.
   */
  async function pageAfterStart() {
    const database: Record<string, unknown> = {};
    for (const path of Object.values(FIELDS)) {
      database[path] = [entry(`old-${path}`)];
    }
    const unreadable = new Set<string>();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UIStorage,
          useValue: {
            getOrFail: (_key: string) =>
              unreadable.has(_key)
                ? Promise.reject(new Error(`${_key} could not be read`))
                : Promise.resolve(structuredClone(database[_key] ?? null)),
            set: (_key: string, _value: unknown) => {
              database[_key] = structuredClone(_value);
              return Promise.resolve(true);
            },
          },
        },
        {
          provide: UILog,
          useValue: {
            log: () => undefined,
            info: () => undefined,
            debug: () => undefined,
            error: () => undefined,
          },
        },
      ],
    });
    spyOn(UIAlert, 'getInstance').and.returnValue({
      showMessage: () => Promise.resolve(),
    } as any);
    const checkUpdate = jasmine.createSpy('checkUpdate').and.resolveTo();
    const allCollectionsRead = jasmine.createSpy('allCollectionsRead');
    const page = Object.create(SettingsPage.prototype);
    page.uiUpdate = { checkUpdate };
    page.uiExportImportHelper = { allCollectionsRead };
    page.uiLog = TestBed.inject(UILog);
    const storages: Record<string, TestStorage> = {};
    for (const [field, path] of Object.entries(FIELDS)) {
      const storage = TestBed.runInInjectionContext(
        () => new TestStorage(path),
      );
      await storage.initializeStorage();
      storages[path] = storage;
      page[field] = storage;
    }
    const importData = () => {
      for (const path of Object.values(FIELDS)) {
        database[path] = [entry(`imported-${path}`)];
      }
    };
    return {
      page,
      database,
      unreadable,
      storages,
      importData,
      checkUpdate,
      allCollectionsRead,
    };
  }

  const uuids = (_entries: unknown): string[] =>
    (_entries as { config: { uuid: string } }[]).map(
      (_entry) => _entry.config.uuid,
    );

  it('reads every collection and runs the update check', async () => {
    const { page, storages, importData, checkUpdate, allCollectionsRead } =
      await pageAfterStart();
    importData();

    await page.__reinitializeStorages();

    for (const [path, storage] of Object.entries(storages)) {
      expect(uuids(storage.getAllEntries())).toEqual([`imported-${path}`]);
    }
    // As after an import: updates of imported data run also when the
    // backup lists them as done.
    expect(checkUpdate).toHaveBeenCalledOnceWith(true);
    // The internal backup may be written again.
    expect(allCollectionsRead).toHaveBeenCalledTimes(1);
  });

  it('reads the other collections also when one cannot be read', async () => {
    const {
      page,
      database,
      unreadable,
      storages,
      importData,
      checkUpdate,
      allCollectionsRead,
    } = await pageAfterStart();
    importData();
    unreadable.add('BEANS');

    await expectAsync(page.__reinitializeStorages()).toBeRejected();
    expect(allCollectionsRead).not.toHaveBeenCalled();

    for (const [path, storage] of Object.entries(storages)) {
      expect(uuids(storage.getAllEntries()))
        .withContext(path)
        .toEqual(path === 'BEANS' ? [] : [`imported-${path}`]);
    }
    // A collection left with the entries from before the import would store
    // them over the imported ones with its next write.
    const result = await storages.BREWS.addAndConfirm({ config: {} });
    expect(result.saved).toBeTrue();
    expect(uuids(database.BREWS)).toEqual([
      'imported-BREWS',
      result.entry.config.uuid,
    ]);
    expect(checkUpdate).not.toHaveBeenCalled();
  });

  it('keeps the collection that cannot be read unwritten and names it', async () => {
    const { page, database, unreadable, storages, importData } =
      await pageAfterStart();
    importData();
    unreadable.add('BEANS');
    unreadable.add('WATER');

    await expectAsync(page.__reinitializeStorages()).toBeRejectedWithError(
      /BEANS, WATER/,
    );
    expect((await storages.BEANS.addAndConfirm({ config: {} })).saved).toBe(
      false,
    );
    expect(uuids(database.BEANS)).toEqual(['imported-BEANS']);
  });
});

describe('SettingsPage importing a backup of an older version', () => {
  class TestStorage extends StorageClass {
    public constructor(_path: string) {
      super(_path);
    }
  }

  const COLLECTIONS: Record<string, string> = {
    uiBeanStorage: 'BEANS',
    uiPreparationStorage: 'PREPARATION',
    uiBrewStorage: 'BREWS',
    uiMillStorage: 'MILL',
    uiGreenBeanStorage: 'GREEN_BEANS',
    uiRoastingMachineStorage: 'ROASTING_MACHINES',
    uiWaterStorage: 'WATER',
    uiGraphStorage: 'GRAPH',
    uiBaristamodeBrewStorage: 'BARISTAMODE_BREWS',
  };

  let database: Record<string, unknown>;
  let instanceBefore: UISettingsStorage;

  beforeEach(() => {
    instanceBefore = UISettingsStorage.instance;
  });

  afterEach(() => {
    UISettingsStorage.instance = instanceBefore;
  });

  /**
   * The page after a start with current data, with real collections, real
   * settings, version and data updates over one database. The migrations
   * of UPDATE_16 to UPDATE_19 have their own tests and only report done.
   */
  async function pageAfterStart() {
    database = createLegacyData({ brews: 2, beans: 1, dataUpdatesDone: 19 });
    const storages: Record<string, StorageClass> = {};
    const uiExportImportHelper = {
      allCollectionsRead: () => undefined,
      writeBackupBeforeMigration: () => Promise.resolve(true),
    };
    const done = { run: () => Promise.resolve(true) };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        UIUpdate,
        UISettingsStorage,
        UiVersionStorage,
        {
          provide: UIStorage,
          useValue: {
            getDataState: () => Promise.resolve('data'),
            getOrFail: (_key: string) =>
              Promise.resolve(structuredClone(database[_key] ?? null)),
            set: (_key: string, _value: unknown) => {
              database[_key] = structuredClone(_value);
              return Promise.resolve(true);
            },
          },
        },
        {
          provide: UILog,
          useValue: jasmine.createSpyObj('UILog', [
            'log',
            'info',
            'debug',
            'error',
          ]),
        },
        ...[
          [UIBeanStorage, 'BEANS'],
          [UIPreparationStorage, 'PREPARATION'],
          [UIBrewStorage, 'BREWS'],
          [UIMillStorage, 'MILL'],
        ].map(([token, path]) => ({
          provide: token,
          useFactory: () => storages[path as string],
        })),
        { provide: ChangeTrackingMigrationService, useValue: done },
        { provide: DuplicateEntriesMigrationService, useValue: done },
        {
          provide: BrewReferencesService,
          useValue: {
            removeForeignTools: () => Promise.resolve(true),
            repairStandardMill: () => Promise.resolve(true),
          },
        },
        { provide: UIExportImportHelper, useValue: uiExportImportHelper },
        {
          provide: UIAlert,
          useValue: { isLoadingSpinnerShown: () => false },
        },
        { provide: Platform, useValue: {} },
        { provide: ModalController, useValue: {} },
        { provide: UIFileHelper, useValue: {} },
        { provide: TranslateService, useValue: {} },
        { provide: UIHelper, useValue: {} },
      ],
    });
    spyOn(UIAlert, 'getInstance').and.returnValue({
      showMessage: () => Promise.resolve(),
    } as any);
    const page = Object.create(SettingsPage.prototype);
    for (const [field, path] of Object.entries(COLLECTIONS)) {
      const storage = TestBed.runInInjectionContext(
        () => new TestStorage(path),
      );
      await storage.initializeStorage();
      storages[path] = storage;
      page[field] = storage;
    }
    page.uiSettingsStorage = TestBed.inject(UISettingsStorage);
    page.uiVersionStorage = TestBed.inject(UiVersionStorage);
    await page.uiSettingsStorage.initializeStorage();
    await page.uiVersionStorage.initializeStorage();
    page.uiUpdate = TestBed.inject(UIUpdate);
    page.uiExportImportHelper = uiExportImportHelper;
    page.uiLog = TestBed.inject(UILog);
    return page as { __reinitializeStorages(): Promise<void> };
  }

  it('runs the data updates the backup has not done', async () => {
    const page = await pageAfterStart();
    // A backup from before UPDATE_12, with the filters of the scale on.
    const backup = createLegacyData({
      brews: 2,
      beans: 1,
      dataUpdatesDone: 11,
    });
    const [settings] = backup.SETTINGS;
    settings.bluetooth_ignore_anomaly_values = true;
    settings.bluetooth_ignore_negative_values = true;
    Object.assign(database, structuredClone(backup));

    await page.__reinitializeStorages();

    const [storedSettings] = database.SETTINGS as Settings[];
    expect(storedSettings.bluetooth_ignore_anomaly_values).toBeFalse();
    expect(storedSettings.bluetooth_ignore_negative_values).toBeFalse();
    const [version] = database.VERSION as Version[];
    for (let i = 1; i <= 19; i++) {
      expect(version.updatedDataVersions)
        .withContext(`UPDATE_${i}`)
        .toContain(`UPDATE_${i}`);
    }
  });
});

describe('SettingsPage naming the file of an import', () => {
  // Whether the backup before the next import counts as one of an
  // unchanged import depends on the name (canBeImportedAgain).

  it('imports a chosen file under its name', async () => {
    const parsed = { SETTINGS: [{}], BREWS: [] };
    const page = Object.create(SettingsPage.prototype);
    Object.assign(page, {
      uiFileHelper: {
        readFileAsUint8Array: () => Promise.resolve(new Uint8Array([1])),
      },
      uiExportImportHelper: {
        getJSONFromZIPArrayBufferContent: () => Promise.resolve(parsed),
      },
    });
    const importJSON = spyOn(page, '__importJSON').and.resolveTo();

    await page.doImport(
      'zip',
      'file:///picked/Beanconqueror 2.zip',
      'file:///picked',
      'Beanconqueror 2.zip',
    );

    expect(importJSON).toHaveBeenCalledOnceWith(
      parsed,
      'file:///picked',
      'Beanconqueror 2.zip',
    );
  });

  it('imports a file found with the automatic backups under its name', async () => {
    const uri =
      'file:///data/Download/Beanconqueror_export/Beanconqueror_automatic_export_12_11_2026.zip';
    const page = Object.create(SettingsPage.prototype);
    Object.assign(page, {
      modalCtrl: {
        create: () =>
          Promise.resolve({
            present: () => Promise.resolve(),
            onWillDismiss: () => Promise.resolve({ data: { choosenURI: uri } }),
          }),
      },
      platform: { is: () => false },
    });
    const doImport = spyOn(page, 'doImport').and.resolveTo();

    await page.findAndImportAutomaticBackupFile();

    expect(doImport).toHaveBeenCalledOnceWith(
      'zip',
      uri,
      'file:///data/Download/Beanconqueror_export',
      'Beanconqueror_automatic_export_12_11_2026.zip',
    );
  });
});
