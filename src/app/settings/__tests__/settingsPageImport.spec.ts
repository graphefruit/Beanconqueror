import { TestBed } from '@angular/core/testing';

import de from '../../../assets/i18n/de.json';
import en from '../../../assets/i18n/en.json';
import { Settings } from '../../../classes/settings/settings';
import { StorageClass } from '../../../classes/storageClass';
import { PreImportBackupError } from '../../../services/preImportBackup/pre-import-backup.service';
import { UIAlert } from '../../../services/uiAlert';
import { ImportNotRolledBackError } from '../../../services/uiExportImportHelper';
import { UILog } from '../../../services/uiLog';
import { UIStorage } from '../../../services/uiStorage';
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

describe('SettingsPage importing a backup file', () => {
  function pageWith(_options: {
    savesBackup: boolean;
    choice: 'YES' | 'NO';
    importBackup?: jasmine.Spy;
    reinitializeStorage?: (_path: string) => Promise<void>;
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
