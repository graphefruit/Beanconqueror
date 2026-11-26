import { TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular';

import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { TranslateService } from '@ngx-translate/core';

import { Bean } from '../../classes/bean/bean';
import { Brew } from '../../classes/brew/brew';
import { FAILED_DATA_UPDATE_STORAGE_KEY } from '../../classes/changeTracking/localStorageKeys';
import { Mill } from '../../classes/mill/mill';
import { Preparation } from '../../classes/preparation/preparation';
import { Settings } from '../../classes/settings/settings';
import { Version } from '../../classes/version/iVersion';
import { MemoryDatabase } from '../../test-utils/memory-database';
import { BrewReferencesService } from '../brewReferences/brew-references.service';
import { ChangeTrackingMigrationService } from '../changeTracking/change-tracking-migration.service';
import { DuplicateEntriesMigrationService } from '../changeTracking/duplicate-entries-migration.service';
import { ShareService } from '../shareService/share-service.service';
import { UIAlert } from '../uiAlert';
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIExportImportHelper } from '../uiExportImportHelper';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UIMillStorage } from '../uiMillStorage';
import { UIPreparationStorage } from '../uiPreparationStorage';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';
import { UIUpdate } from '../uiUpdate';
import { UiVersionStorage } from '../uiVersionStorage';

interface RecordedUpdate {
  version: string;
  storage: string;
  options: unknown;
}

const ATTACHMENT_NAME = 'migration-spec-attachment.jpg';

/** Runs one data update, as the start-up check does. */
function runUpdate(_uiUpdate: UIUpdate, _version: string): Promise<boolean> {
  return (
    _uiUpdate as unknown as {
      __updateDataVersion(_version: string): Promise<boolean>;
    }
  ).__updateDataVersion(_version);
}

function collectionStorage(
  name: string,
  entries: unknown[],
  recorded: RecordedUpdate[],
  currentVersion: () => string,
  stored: () => boolean,
) {
  return {
    getAllEntries: () => entries,
    getRawEntries: () => entries,
    isRead: () => true,
    backfillWithoutTouch: jasmine
      .createSpy(`${name}.backfillWithoutTouch`)
      .and.callFake(async (fill: (entries: unknown[]) => number) => {
        fill(entries);
        // Keeps the change info, as update() with { touch: false }.
        recorded.push({
          version: currentVersion(),
          storage: name,
          options: { touch: false },
        });
        return stored();
      }),
    addAndConfirm: jasmine
      .createSpy(`${name}.addAndConfirm`)
      .and.callFake(async (entry: unknown) => ({
        entry: structuredClone(entry),
        saved: stored(),
      })),
    update: jasmine
      .createSpy(`${name}.update`)
      .and.callFake(async (_entry: unknown, options?: unknown) => {
        recorded.push({ version: currentVersion(), storage: name, options });
        return stored();
      }),
  };
}

/**
 * Entries shaped so that every data migration that rewrites stored entries
 * reaches its update call at least once.
 */
function createFixtures() {
  const bean = new Bean();
  bean.config.uuid = 'bean-1';
  (bean as any).filePath = '';
  bean.cost = '4' as unknown as number;
  bean.bean_roast_information.first_crack_minute = 1.5;
  bean.attachments = [ATTACHMENT_NAME];

  const preparation = new Preparation();
  preparation.config.uuid = 'preparation-1';
  preparation.attachments = [];

  const brew = new Brew();
  brew.config.uuid = 'brew-1';
  brew.method_of_preparation = preparation.config.uuid;
  brew.brew_quantity = '18' as unknown as number;
  brew.brew_beverage_quantity = 0;
  brew.attachments = [];

  return { beans: [bean], brews: [brew], preparations: [preparation] };
}

describe('UIUpdate data migrations and change info', () => {
  let recorded: RecordedUpdate[];
  let version: string;
  let uiUpdate: UIUpdate;
  /** What every write of the updates resolves. */
  let stored: boolean;
  /** Writes of entries and of the settings, in the order they were made. */
  let writes: string[];
  let logError: jasmine.Spy;

  beforeEach(async () => {
    recorded = [];
    version = '';
    stored = true;
    writes = [];
    logError = jasmine.createSpy('error');
    const current = () => version;
    const isStored = () => {
      writes.push(version);
      return stored;
    };
    const fixtures = createFixtures();

    const settings = new Settings();
    delete (settings.brew_order.before as any).water;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        UIUpdate,
        {
          provide: UIBrewStorage,
          useValue: collectionStorage(
            'BREWS',
            fixtures.brews,
            recorded,
            current,
            isStored,
          ),
        },
        {
          provide: UIBeanStorage,
          useValue: collectionStorage(
            'BEANS',
            fixtures.beans,
            recorded,
            current,
            isStored,
          ),
        },
        {
          provide: UIPreparationStorage,
          useValue: collectionStorage(
            'PREPARATION',
            fixtures.preparations,
            recorded,
            current,
            isStored,
          ),
        },
        {
          provide: UIMillStorage,
          useValue: collectionStorage('MILL', [], recorded, current, isStored),
        },
        {
          provide: UISettingsStorage,
          useValue: {
            getSettings: () => settings,
            saveSettings: async () => isStored(),
          },
        },
        {
          provide: UILog,
          useValue: {
            log: () => undefined,
            info: () => undefined,
            error: logError,
          },
        },
        { provide: UiVersionStorage, useValue: {} },
        {
          provide: ChangeTrackingMigrationService,
          useValue: { run: async () => true },
        },
        {
          provide: DuplicateEntriesMigrationService,
          useValue: { run: () => Promise.resolve(true) },
        },
        { provide: Platform, useValue: { is: () => true } },
        { provide: ModalController, useValue: {} },
        { provide: UIFileHelper, useValue: {} },
        {
          provide: UIAlert,
          useValue: { setLoadingSpinnerMessage: () => undefined },
        },
        { provide: TranslateService, useValue: { instant: (k: string) => k } },
        { provide: UIStorage, useValue: {} },
        {
          provide: UIHelper,
          useValue: { cloneData: (v: unknown) => structuredClone(v) },
        },
      ],
    });
    uiUpdate = TestBed.inject(UIUpdate);

    // UPDATE_4 moves attachments between directories before it updates.
    await Filesystem.writeFile({
      path: ATTACHMENT_NAME,
      data: 'x',
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
  });

  afterEach(async () => {
    for (const directory of [Directory.Data, Directory.Documents]) {
      try {
        await Filesystem.deleteFile({ path: ATTACHMENT_NAME, directory });
      } catch {
        // Already moved or never written.
      }
    }
  });

  it('rewrites entries only through the system write path', async () => {
    for (let i = 1; i <= 15; i++) {
      version = `UPDATE_${i}`;
      const done = await runUpdate(uiUpdate, version);
      expect(done).withContext(version).toBeTrue();
    }

    const reached = recorded.map((r) => `${r.version}:${r.storage}`);
    // Every update site in the migrations, in the order they run.
    expect(reached).toEqual([
      'UPDATE_1:BREWS', // brews pointed at the standard mill
      'UPDATE_1:BEANS', // bean photo and information moved
      'UPDATE_1:BREWS', // espresso beverage quantity
      'UPDATE_1:PREPARATION', // preparation style type
      'UPDATE_1:BREWS', // brew data types
      'UPDATE_4:BEANS', // attachment moved to the documents directory
      'UPDATE_5:PREPARATION',
      'UPDATE_6:BEANS',
      'UPDATE_6:PREPARATION',
      'UPDATE_9:PREPARATION',
      'UPDATE_15:BEANS',
    ]);
    for (const call of recorded) {
      expect(call.options)
        .withContext(`${call.version}:${call.storage}`)
        .toEqual({ touch: false });
    }
  });

  // These come to the same result when they run again on data they changed
  // in part, so a write that was not stored leaves them open.
  for (const i of [1, 2, 3, 6, 7, 8, 9, 10, 11, 12, 13, 14]) {
    it(`leaves UPDATE_${i} open and writes nothing more when a write was not stored`, async () => {
      version = `UPDATE_${i}`;
      stored = false;

      const done = await runUpdate(uiUpdate, version);

      expect(done).toBeFalse();
      expect(writes).toEqual([version]);
    });
  }

  // These would change entries a second time when they ran again.
  for (const [i, notStored] of [
    [4, 1],
    [5, 2],
    [15, 1],
  ]) {
    it(`records UPDATE_${i} as done and logs the writes that were not stored`, async () => {
      version = `UPDATE_${i}`;
      stored = false;

      const done = await runUpdate(uiUpdate, version);

      expect(done).toBeTrue();
      expect(writes.length).toBe(notStored);
      expect(logError).toHaveBeenCalledOnceWith(
        `${version} - ${notStored} writes not stored, not run again`,
      );
    });
  }
});

describe('UIUpdate running a data update again at the next start', () => {
  let database: MemoryDatabase;
  let beans: UIBeanStorage;
  let uiUpdate: UIUpdate;

  /** A bean as it was stored before UPDATE_1: one photo and its origin on the bean. */
  function beanBeforeUpdate1(_uuid: string, _filePath: string) {
    return {
      ...(JSON.parse(JSON.stringify(new Bean())) as object),
      config: { uuid: _uuid, unix_timestamp: 1 },
      filePath: _filePath,
      country: 'Kenya',
      bean_information: [],
    };
  }

  beforeEach(() => {
    database = new MemoryDatabase();
    const settings = new Settings();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ...database.providers(),
        UIUpdate,
        { provide: UIBrewStorage, useValue: { getAllEntries: () => [] } },
        { provide: UIMillStorage, useValue: { getAllEntries: () => [] } },
        {
          provide: UIPreparationStorage,
          useValue: { getAllEntries: () => [] },
        },
        {
          provide: UISettingsStorage,
          useValue: {
            getSettings: () => settings,
            saveSettings: () => Promise.resolve(true),
          },
        },
        { provide: UiVersionStorage, useValue: {} },
        { provide: ChangeTrackingMigrationService, useValue: {} },
        { provide: DuplicateEntriesMigrationService, useValue: {} },
        {
          provide: BrewReferencesService,
          useValue: { addStandardMill: () => Promise.resolve(true) },
        },
        { provide: Platform, useValue: { is: () => false } },
        { provide: ModalController, useValue: {} },
        { provide: UIFileHelper, useValue: {} },
        { provide: UIAlert, useValue: {} },
        { provide: UIHelper, useValue: {} },
      ],
    });
    beans = TestBed.inject(UIBeanStorage);
    uiUpdate = TestBed.inject(UIUpdate);
  });

  /** Stores the beans and reads them as a start does. */
  async function start(_stored: unknown[]): Promise<void> {
    database.values.set('BEANS', structuredClone(_stored));
    await beans.initializeStorage();
  }

  it('UPDATE_1 stores the same beans after a write that was not stored as in one go', async () => {
    const before = [
      beanBeforeUpdate1('a', 'a.jpg'),
      beanBeforeUpdate1('b', 'b.jpg'),
      beanBeforeUpdate1('c', ''),
    ];
    await start(before);
    expect(await runUpdate(uiUpdate, 'UPDATE_1')).toBeTrue();
    const inOneGo = database.values.get('BEANS');

    await start(before);
    let beanWrites = 0;
    database.set.and.callFake((_key: string, _value: unknown) => {
      if (_key === 'BEANS' && ++beanWrites === 2) {
        return Promise.reject(new Error('write failed'));
      }
      database.values.set(_key, structuredClone(_value));
      return Promise.resolve(true);
    });
    expect(await runUpdate(uiUpdate, 'UPDATE_1')).toBeFalse();
    // The first bean is stored changed, the others as they were.
    expect(
      (database.values.get('BEANS') as { filePath?: string }[]).map(
        (_bean) => _bean.filePath,
      ),
    ).toEqual([undefined, 'b.jpg', '']);

    await start(database.values.get('BEANS') as unknown[]);
    expect(await runUpdate(uiUpdate, 'UPDATE_1')).toBeTrue();

    expect(database.values.get('BEANS')).toEqual(inOneGo);
  });
});

describe('UIUpdate change info migration', () => {
  let run: jasmine.Spy;
  let version: Version;
  let saveVersion: jasmine.Spy;
  let hasData: boolean;
  let uiUpdate: UIUpdate;

  beforeEach(() => {
    run = jasmine.createSpy('run');
    hasData = true;
    version = new Version();
    saveVersion = jasmine.createSpy('saveVersion').and.resolveTo();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        UIUpdate,
        { provide: ChangeTrackingMigrationService, useValue: { run } },
        {
          provide: BrewReferencesService,
          useValue: { removeForeignTools: () => Promise.resolve(true) },
        },
        {
          provide: DuplicateEntriesMigrationService,
          useValue: { run: () => Promise.resolve(true) },
        },
        {
          provide: UiVersionStorage,
          useValue: { getVersion: () => version, saveVersion },
        },
        {
          provide: UILog,
          useValue: {
            log: () => undefined,
            info: () => undefined,
            error: () => undefined,
          },
        },
        { provide: UIBrewStorage, useValue: {} },
        { provide: UIBeanStorage, useValue: {} },
        { provide: UIPreparationStorage, useValue: {} },
        { provide: UIMillStorage, useValue: {} },
        { provide: UISettingsStorage, useValue: {} },
        { provide: Platform, useValue: { is: () => true } },
        { provide: ModalController, useValue: {} },
        { provide: UIFileHelper, useValue: {} },
        {
          provide: UIAlert,
          useValue: {
            showLoadingSpinner: async () => undefined,
            hideLoadingSpinner: async () => undefined,
            isLoadingSpinnerShown: () => false,
          },
        },
        { provide: TranslateService, useValue: {} },
        {
          provide: UIStorage,
          useValue: {
            getDataState: () => Promise.resolve(hasData ? 'data' : 'empty'),
          },
        },
        { provide: UIHelper, useValue: {} },
        {
          provide: UIExportImportHelper,
          useValue: { writeBackupBeforeMigration: () => Promise.resolve(true) },
        },
      ],
    });
    uiUpdate = TestBed.inject(UIUpdate);
  });

  function markEarlierMigrationsDone() {
    for (let i = 1; i <= 15; i++) {
      version.pushUpdatedDataVersion(`UPDATE_${i}`);
    }
  }

  it('runs during the start-up update check for existing data', async () => {
    markEarlierMigrationsDone();
    run.and.resolveTo(true);

    await uiUpdate.checkUpdate();

    expect(run).toHaveBeenCalledTimes(1);
    expect(version.checkIfDataVersionWasUpdated('UPDATE_16')).toBeTrue();
    expect(saveVersion).toHaveBeenCalledWith(version);
  });

  it('runs during the start-up update check on a new install', async () => {
    markEarlierMigrationsDone();
    hasData = false;
    run.and.resolveTo(true);

    await uiUpdate.checkUpdate();

    expect(run).toHaveBeenCalledTimes(1);
    expect(version.checkIfDataVersionWasUpdated('UPDATE_16')).toBeTrue();
  });

  it('is marked as done when everything was stored', async () => {
    run.and.resolveTo(true);

    await (uiUpdate as any).__checkUpdateForDataVersion('UPDATE_16', false);

    expect(run).toHaveBeenCalledTimes(1);
    expect(version.checkIfDataVersionWasUpdated('UPDATE_16')).toBeTrue();
    expect(saveVersion).toHaveBeenCalledWith(version);
  });

  it('stays open when something could not be stored', async () => {
    run.and.resolveTo(false);

    await (uiUpdate as any).__checkUpdateForDataVersion('UPDATE_16', false);

    expect(version.checkIfDataVersionWasUpdated('UPDATE_16')).toBeFalse();
    expect(saveVersion).not.toHaveBeenCalled();
  });

  it('does not run again once it is done', async () => {
    version.pushUpdatedDataVersion('UPDATE_16');

    await (uiUpdate as any).__checkUpdateForDataVersion('UPDATE_16', false);

    expect(run).not.toHaveBeenCalled();
  });
});

describe('UIUpdate duplicate entries migration', () => {
  let run: jasmine.Spy;
  let version: Version;
  let saveVersion: jasmine.Spy;
  let hasData: boolean;
  let uiUpdate: UIUpdate;

  beforeEach(() => {
    run = jasmine.createSpy('run');
    hasData = true;
    version = new Version();
    saveVersion = jasmine.createSpy('saveVersion').and.resolveTo();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        UIUpdate,
        {
          provide: ChangeTrackingMigrationService,
          useValue: { run: () => Promise.resolve(true) },
        },
        { provide: DuplicateEntriesMigrationService, useValue: { run } },
        {
          provide: BrewReferencesService,
          useValue: { removeForeignTools: () => Promise.resolve(true) },
        },
        {
          provide: UiVersionStorage,
          useValue: { getVersion: () => version, saveVersion },
        },
        {
          provide: UILog,
          useValue: {
            log: () => undefined,
            info: () => undefined,
            error: () => undefined,
          },
        },
        { provide: UIBrewStorage, useValue: {} },
        { provide: UIBeanStorage, useValue: {} },
        { provide: UIPreparationStorage, useValue: {} },
        { provide: UIMillStorage, useValue: {} },
        { provide: UISettingsStorage, useValue: {} },
        { provide: Platform, useValue: { is: () => true } },
        { provide: ModalController, useValue: {} },
        { provide: UIFileHelper, useValue: {} },
        {
          provide: UIAlert,
          useValue: {
            showLoadingSpinner: () => Promise.resolve(),
            hideLoadingSpinner: () => Promise.resolve(),
            isLoadingSpinnerShown: () => false,
          },
        },
        { provide: TranslateService, useValue: {} },
        {
          provide: UIStorage,
          useValue: {
            getDataState: () => Promise.resolve(hasData ? 'data' : 'empty'),
          },
        },
        { provide: UIHelper, useValue: {} },
        {
          provide: UIExportImportHelper,
          useValue: { writeBackupBeforeMigration: () => Promise.resolve(true) },
        },
      ],
    });
    uiUpdate = TestBed.inject(UIUpdate);
  });

  function markEarlierMigrationsDone() {
    for (let i = 1; i <= 16; i++) {
      version.pushUpdatedDataVersion(`UPDATE_${i}`);
    }
  }

  it('runs during the start-up update check for existing data', async () => {
    markEarlierMigrationsDone();
    run.and.resolveTo(true);

    await uiUpdate.checkUpdate();

    expect(run).toHaveBeenCalledTimes(1);
    expect(version.checkIfDataVersionWasUpdated('UPDATE_17')).toBeTrue();
    expect(saveVersion).toHaveBeenCalledWith(version);
  });

  it('runs during the start-up update check on a new install', async () => {
    markEarlierMigrationsDone();
    hasData = false;
    run.and.resolveTo(true);

    await uiUpdate.checkUpdate();

    expect(run).toHaveBeenCalledTimes(1);
    expect(version.checkIfDataVersionWasUpdated('UPDATE_17')).toBeTrue();
  });

  it('runs after the change info migration', async () => {
    for (let i = 1; i <= 15; i++) {
      version.pushUpdatedDataVersion(`UPDATE_${i}`);
    }
    const order: string[] = [];
    const changeInfo = TestBed.inject(ChangeTrackingMigrationService);
    spyOn(changeInfo, 'run').and.callFake(() => {
      order.push('UPDATE_16');
      return Promise.resolve(true);
    });
    run.and.callFake(() => {
      order.push('UPDATE_17');
      return Promise.resolve(true);
    });

    await uiUpdate.checkUpdate();

    expect(order).toEqual(['UPDATE_16', 'UPDATE_17']);
  });

  it('does not run while the change info migration is not done', async () => {
    for (let i = 1; i <= 15; i++) {
      version.pushUpdatedDataVersion(`UPDATE_${i}`);
    }
    spyOn(TestBed.inject(ChangeTrackingMigrationService), 'run').and.resolveTo(
      false,
    );

    await uiUpdate.checkUpdate();

    expect(run).not.toHaveBeenCalled();
    expect(version.checkIfDataVersionWasUpdated('UPDATE_16')).toBeFalse();
    expect(version.checkIfDataVersionWasUpdated('UPDATE_17')).toBeFalse();
    expect(saveVersion).not.toHaveBeenCalled();
  });

  it('stays open when something could not be stored', async () => {
    run.and.resolveTo(false);

    await (uiUpdate as any).__checkUpdateForDataVersion('UPDATE_17', false);

    expect(version.checkIfDataVersionWasUpdated('UPDATE_17')).toBeFalse();
    expect(saveVersion).not.toHaveBeenCalled();
  });

  it('does not run again once it is done', async () => {
    version.pushUpdatedDataVersion('UPDATE_17');

    await (uiUpdate as any).__checkUpdateForDataVersion('UPDATE_17', false);

    expect(run).not.toHaveBeenCalled();
  });
});

describe('UIUpdate foreign brew tools update', () => {
  let removeForeignTools: jasmine.Spy;
  let version: Version;
  let saveVersion: jasmine.Spy;
  /** The data versions of each saved VERSION entry. */
  let savedVersions: string[][];
  let hasData: boolean;
  let uiUpdate: UIUpdate;

  beforeEach(() => {
    removeForeignTools = jasmine.createSpy('removeForeignTools');
    hasData = true;
    version = new Version();
    savedVersions = [];
    saveVersion = jasmine
      .createSpy('saveVersion')
      .and.callFake((_version: Version) => {
        savedVersions.push([..._version.updatedDataVersions]);
        return Promise.resolve();
      });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        UIUpdate,
        {
          provide: ChangeTrackingMigrationService,
          useValue: { run: () => Promise.resolve(true) },
        },
        {
          provide: DuplicateEntriesMigrationService,
          useValue: { run: () => Promise.resolve(true) },
        },
        { provide: BrewReferencesService, useValue: { removeForeignTools } },
        {
          provide: UiVersionStorage,
          useValue: { getVersion: () => version, saveVersion },
        },
        {
          provide: UILog,
          useValue: {
            log: () => undefined,
            info: () => undefined,
            error: () => undefined,
          },
        },
        { provide: UIBrewStorage, useValue: {} },
        { provide: UIBeanStorage, useValue: {} },
        { provide: UIPreparationStorage, useValue: {} },
        { provide: UIMillStorage, useValue: {} },
        { provide: UISettingsStorage, useValue: {} },
        { provide: Platform, useValue: { is: () => true } },
        { provide: ModalController, useValue: {} },
        { provide: UIFileHelper, useValue: {} },
        {
          provide: UIAlert,
          useValue: {
            showLoadingSpinner: () => Promise.resolve(),
            hideLoadingSpinner: () => Promise.resolve(),
            isLoadingSpinnerShown: () => false,
          },
        },
        { provide: TranslateService, useValue: {} },
        {
          provide: UIStorage,
          useValue: {
            getDataState: () => Promise.resolve(hasData ? 'data' : 'empty'),
          },
        },
        { provide: UIHelper, useValue: {} },
        {
          provide: UIExportImportHelper,
          useValue: { writeBackupBeforeMigration: () => Promise.resolve(true) },
        },
      ],
    });
    uiUpdate = TestBed.inject(UIUpdate);
  });

  function markDone(_upTo: number) {
    for (let i = 1; i <= _upTo; i++) {
      version.pushUpdatedDataVersion(`UPDATE_${i}`);
    }
  }

  it('runs during the start-up update check and is marked as done', async () => {
    markDone(17);
    removeForeignTools.and.resolveTo(true);

    await uiUpdate.checkUpdate();

    expect(removeForeignTools).toHaveBeenCalledTimes(1);
    expect(version.checkIfDataVersionWasUpdated('UPDATE_18')).toBeTrue();
    expect(saveVersion).toHaveBeenCalledWith(version);
  });

  it('runs during the start-up update check on a new install', async () => {
    markDone(17);
    hasData = false;
    removeForeignTools.and.resolveTo(true);

    await uiUpdate.checkUpdate();

    expect(removeForeignTools).toHaveBeenCalledTimes(1);
    expect(version.checkIfDataVersionWasUpdated('UPDATE_18')).toBeTrue();
  });

  it('stays open and runs again at the next start when it could not finish', async () => {
    markDone(17);
    removeForeignTools.and.resolveTo(false);

    await uiUpdate.checkUpdate();

    expect(version.checkIfDataVersionWasUpdated('UPDATE_18')).toBeFalse();
    expect(saveVersion).not.toHaveBeenCalled();

    removeForeignTools.and.resolveTo(true);
    await uiUpdate.checkUpdate();

    expect(removeForeignTools).toHaveBeenCalledTimes(2);
    expect(version.checkIfDataVersionWasUpdated('UPDATE_18')).toBeTrue();
  });

  it('does not run again at a start once it is done', async () => {
    markDone(18);

    await uiUpdate.checkUpdate();

    expect(removeForeignTools).not.toHaveBeenCalled();
    expect(saveVersion).not.toHaveBeenCalled();
  });

  it('runs again after an import, also when the backup lists it as done', async () => {
    markDone(18);
    removeForeignTools.and.resolveTo(true);

    await uiUpdate.checkUpdate(true);

    expect(removeForeignTools).toHaveBeenCalledTimes(1);
    expect(version.checkIfDataVersionWasUpdated('UPDATE_18')).toBeTrue();
    expect(
      version.updatedDataVersions.filter((_v) => _v === 'UPDATE_18').length,
    ).toBe(1);
    // Stored as open before it runs and as done afterwards.
    expect(savedVersions.map((_v) => _v.includes('UPDATE_18'))).toEqual([
      false,
      true,
    ]);
  });

  it('is stored as open when it could not finish after an import', async () => {
    markDone(18);
    removeForeignTools.and.resolveTo(false);

    await uiUpdate.checkUpdate(true);

    expect(version.checkIfDataVersionWasUpdated('UPDATE_18')).toBeFalse();
    expect(savedVersions.map((_v) => _v.includes('UPDATE_18'))).toEqual([
      false,
    ]);
    // The other updates the backup lists stay done.
    expect(savedVersions[0].length).toBe(17);
  });

  it('runs once after an import of a backup that does not list it', async () => {
    markDone(17);
    removeForeignTools.and.resolveTo(true);

    await uiUpdate.checkUpdate(true);

    expect(removeForeignTools).toHaveBeenCalledTimes(1);
    expect(savedVersions.map((_v) => _v.includes('UPDATE_18'))).toEqual([true]);
  });
});

interface StoredEntry {
  mill?: unknown;
  name?: unknown;
  config: Record<string, unknown>;
}

describe('UIUpdate standard grinder', () => {
  let database: MemoryDatabase;
  let uiUpdate: UIUpdate;

  /** A brew as it was stored before there were grinders. */
  function brewBefore(_uuid: string, _mill: string, _created: number) {
    return {
      ...(JSON.parse(JSON.stringify(new Brew())) as object),
      mill: _mill,
      config: {
        uuid: _uuid,
        unix_timestamp: _created,
        // Filled in from unix_timestamp when change tracking began.
        created_at: _created * 1000,
        updated_at: 1_600_000_000_000,
        rev: 2,
        updated_by: 'device-b',
      },
    };
  }

  beforeEach(() => {
    database = new MemoryDatabase();
    const settings = new Settings();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ...database.providers(),
        UIUpdate,
        {
          provide: UISettingsStorage,
          useValue: {
            getSettings: () => settings,
            saveSettings: () => Promise.resolve(true),
          },
        },
        { provide: UiVersionStorage, useValue: {} },
        { provide: ChangeTrackingMigrationService, useValue: {} },
        { provide: DuplicateEntriesMigrationService, useValue: {} },
        { provide: Platform, useValue: { is: () => false } },
        { provide: ModalController, useValue: {} },
        { provide: UIFileHelper, useValue: {} },
        { provide: UIAlert, useValue: {} },
        { provide: UIHelper, useValue: {} },
        {
          provide: UIExportImportHelper,
          useValue: { writeBackupBeforeMigration: () => Promise.resolve(true) },
        },
      ],
    });
    uiUpdate = TestBed.inject(UIUpdate);
  });

  /** Stores the entries and reads them as a start does. */
  async function start(_brews: unknown[], _mills: unknown[]): Promise<void> {
    database.values.set('BREWS', structuredClone(_brews));
    database.values.set('MILL', structuredClone(_mills));
    for (const storage of [
      UIBrewStorage,
      UIMillStorage,
      UIBeanStorage,
      UIPreparationStorage,
    ]) {
      await TestBed.inject<{ initializeStorage(): Promise<void> }>(
        storage,
      ).initializeStorage();
    }
  }

  function stored(_key: string): StoredEntry[] {
    return database.values.get(_key) as StoredEntry[];
  }

  it('UPDATE_1 points every brew at the grinder it adds and keeps their change info', async () => {
    const before = [brewBefore('a', '', 1), brewBefore('b', 'gone', 2)];
    await start(before, []);

    expect(await runUpdate(uiUpdate, 'UPDATE_1')).toBeTrue();

    const [mill] = stored('MILL');
    expect(stored('MILL').length).toBe(1);
    expect(mill.name).toBe('Standard');
    expect(mill.config.uuid).not.toBe('');
    expect(stored('BREWS').map((_brew) => _brew.mill)).toEqual([
      mill.config.uuid,
      mill.config.uuid,
    ]);
    for (const [i, brew] of stored('BREWS').entries()) {
      expect(brew.config).toEqual(before[i].config);
    }
  });

  it('UPDATE_1 runs again when the grinder was not stored and points the brews at the one stored then', async () => {
    await start([brewBefore('a', '', 1)], []);
    database.failingWrites.add('MILL');

    expect(await runUpdate(uiUpdate, 'UPDATE_1')).toBeFalse();
    expect(database.values.get('MILL')).toEqual([]);

    database.failingWrites.delete('MILL');
    await start(stored('BREWS'), []);
    expect(await runUpdate(uiUpdate, 'UPDATE_1')).toBeTrue();

    const [mill] = stored('MILL');
    expect(stored('BREWS')[0].mill).toBe(mill.config.uuid);
  });

  it('UPDATE_19 points the brews left with an empty grinder at the grinder Standard', async () => {
    const mill = {
      ...(JSON.parse(JSON.stringify(new Mill())) as object),
      name: 'Standard',
      config: { uuid: 'standard', unix_timestamp: 10 },
    };
    await start([brewBefore('old', '', 5), brewBefore('new', '', 20)], [mill]);

    expect(await runUpdate(uiUpdate, 'UPDATE_19')).toBeTrue();

    expect(stored('BREWS').map((_brew) => _brew.mill)).toEqual([
      'standard',
      '',
    ]);
  });

  it('UPDATE_19 stays open when the brews could not be stored', async () => {
    const mill = {
      ...(JSON.parse(JSON.stringify(new Mill())) as object),
      name: 'Standard',
      config: { uuid: 'standard', unix_timestamp: 10 },
    };
    await start([brewBefore('old', '', 5)], [mill]);
    database.failingWrites.add('BREWS');

    expect(await runUpdate(uiUpdate, 'UPDATE_19')).toBeFalse();
  });
});

describe('UIUpdate backup before the data updates 16 to 19', () => {
  let version: Version;
  let dataState: 'data' | 'empty' | 'unknown';
  let saveVersion: jasmine.Spy;
  let uiUpdate: UIUpdate;
  /** The backup and the four updates, in the order they were called. */
  let calls: string[];
  let backedUp: boolean;
  let backup: jasmine.Spy;
  let update16Done: boolean;
  /** The values of UIStorage. */
  let stored: Map<string, unknown>;
  let confirm: jasmine.Spy;
  let shareLogs: jasmine.Spy;

  function step(_name: string, _result: () => boolean) {
    return jasmine.createSpy(_name).and.callFake(() => {
      calls.push(_name);
      return Promise.resolve(_result());
    });
  }

  beforeEach(() => {
    version = new Version();
    dataState = 'data';
    saveVersion = jasmine.createSpy('saveVersion').and.resolveTo();
    calls = [];
    backedUp = true;
    backup = step('backup', () => backedUp);
    update16Done = true;
    stored = new Map();
    confirm = jasmine.createSpy('confirm').and.resolveTo('NO');
    shareLogs = jasmine.createSpy('shareLogs').and.resolveTo();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        UIUpdate,
        {
          provide: UIExportImportHelper,
          useValue: {
            writeBackupBeforeMigration: backup,
          },
        },
        {
          provide: ChangeTrackingMigrationService,
          useValue: { run: step('UPDATE_16', () => update16Done) },
        },
        {
          provide: DuplicateEntriesMigrationService,
          useValue: { run: step('UPDATE_17', () => true) },
        },
        {
          provide: BrewReferencesService,
          useValue: {
            removeForeignTools: step('UPDATE_18', () => true),
            repairStandardMill: step('UPDATE_19', () => true),
          },
        },
        {
          provide: UiVersionStorage,
          useValue: {
            getVersion: () => version,
            saveVersion,
          },
        },
        {
          provide: UILog,
          useValue: {
            log: () => undefined,
            info: () => undefined,
            error: () => undefined,
          },
        },
        { provide: UIBrewStorage, useValue: {} },
        { provide: UIBeanStorage, useValue: {} },
        { provide: UIPreparationStorage, useValue: {} },
        { provide: UIMillStorage, useValue: {} },
        { provide: UISettingsStorage, useValue: {} },
        { provide: Platform, useValue: { is: () => true } },
        { provide: ModalController, useValue: {} },
        { provide: UIFileHelper, useValue: {} },
        {
          provide: UIAlert,
          useValue: {
            showLoadingSpinner: () => Promise.resolve(),
            hideLoadingSpinner: () => Promise.resolve(),
            isLoadingSpinnerShown: () => false,
            showConfirmWithYesNoTranslation: confirm,
          },
        },
        { provide: ShareService, useValue: { shareLogs } },
        { provide: TranslateService, useValue: {} },
        {
          provide: UIStorage,
          useValue: {
            getDataState: () => Promise.resolve(dataState),
            get: (_key: string) => Promise.resolve(stored.get(_key) ?? null),
            set: (_key: string, _value: unknown) => {
              stored.set(_key, structuredClone(_value));
              return Promise.resolve(true);
            },
            remove: (_key: string) => {
              stored.delete(_key);
              return Promise.resolve();
            },
          },
        },
        { provide: UIHelper, useValue: {} },
      ],
    });
    uiUpdate = TestBed.inject(UIUpdate);
  });

  function markDone(_upTo: number) {
    for (let i = 1; i <= _upTo; i++) {
      version.pushUpdatedDataVersion(`UPDATE_${i}`);
    }
  }

  it('writes one backup before the first of them changes entries', async () => {
    markDone(15);

    await uiUpdate.checkUpdate();

    expect(calls).toEqual([
      'backup',
      'UPDATE_16',
      'UPDATE_17',
      'UPDATE_18',
      'UPDATE_19',
    ]);
    expect(version.checkIfDataVersionWasUpdated('UPDATE_19')).toBeTrue();
  });

  it('writes the backup before the first one still open', async () => {
    markDone(18);

    await uiUpdate.checkUpdate();

    expect(calls).toEqual(['backup', 'UPDATE_19']);
    expect(backup).toHaveBeenCalledOnceWith('UPDATE_19');
  });

  it('runs none of them when the backup could not be written, and tries again at the next start', async () => {
    markDone(15);
    backedUp = false;

    await uiUpdate.checkUpdate();

    expect(calls).toEqual(['backup']);
    for (const update of UPDATES) {
      expect(version.checkIfDataVersionWasUpdated(update)).toBeFalse();
    }
    expect(saveVersion).not.toHaveBeenCalled();

    backedUp = true;
    calls = [];
    await uiUpdate.checkUpdate();

    expect(calls).toEqual(['backup', ...UPDATES]);
  });

  it('backs up and updates nothing when the data cannot be read, and tries again at the next start', async () => {
    markDone(15);
    dataState = 'unknown';

    await uiUpdate.checkUpdate();

    expect(calls).toEqual([]);
    expect(saveVersion).not.toHaveBeenCalled();

    dataState = 'data';
    await uiUpdate.checkUpdate();

    expect(calls).toEqual(['backup', ...UPDATES]);
  });

  it('writes no backup when they are all done', async () => {
    markDone(19);

    await uiUpdate.checkUpdate();

    expect(calls).toEqual([]);
  });

  it('writes no backup for an empty database', async () => {
    markDone(15);
    dataState = 'empty';

    await uiUpdate.checkUpdate();

    expect(calls).toEqual(UPDATES);
  });

  it('writes no backup for UPDATE_18 opened again by an import', async () => {
    markDone(19);

    await uiUpdate.checkUpdate(true);

    expect(calls).toEqual(['UPDATE_18']);
  });

  it('writes one backup after an import of data with updates still open', async () => {
    markDone(16);

    await uiUpdate.checkUpdate(true);

    expect(calls).toEqual(['backup', 'UPDATE_17', 'UPDATE_18', 'UPDATE_19']);
  });

  it('tells the user once when the same update stayed open at the second start in a row', async () => {
    markDone(15);
    update16Done = false;

    await uiUpdate.checkUpdate();
    expect(confirm).not.toHaveBeenCalled();
    expect(stored.get(FAILED_DATA_UPDATE_STORAGE_KEY)).toEqual({
      update: 'UPDATE_16',
      starts: 1,
    });

    await uiUpdate.checkUpdate();
    expect(confirm).toHaveBeenCalledOnceWith(
      'DATA_UPDATE_FAILED',
      'DATA_UPDATE_FAILED_TITLE',
      'SHARE_LOGS',
      'OK',
      true,
    );
    expect(shareLogs).not.toHaveBeenCalled();

    await uiUpdate.checkUpdate();
    expect(confirm).toHaveBeenCalledTimes(1);
    // One backup for all these starts: the first open update stayed the same.
    expect(backup).toHaveBeenCalledTimes(3);
    expect(backup.calls.allArgs()).toEqual([
      ['UPDATE_16'],
      ['UPDATE_16'],
      ['UPDATE_16'],
    ]);

    update16Done = true;
    await uiUpdate.checkUpdate();
    expect(stored.has(FAILED_DATA_UPDATE_STORAGE_KEY)).toBeFalse();
  });

  it('gives no hint for an update before UPDATE_16, no backup holds the data before it', async () => {
    markDone(14);
    spyOn(
      uiUpdate as unknown as {
        __checkUpdateForDataVersion: (_update: string) => Promise<boolean>;
      },
      '__checkUpdateForDataVersion',
    ).and.callFake((_update: string) =>
      Promise.resolve(_update !== 'UPDATE_15'),
    );

    await uiUpdate.checkUpdate();
    await uiUpdate.checkUpdate();

    expect(backup).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    expect(stored.has(FAILED_DATA_UPDATE_STORAGE_KEY)).toBeFalse();
  });

  it('shares the logs from the hint when the user wants to', async () => {
    markDone(15);
    update16Done = false;
    stored.set(FAILED_DATA_UPDATE_STORAGE_KEY, {
      update: 'UPDATE_16',
      starts: 1,
    });
    confirm.and.resolveTo('YES');

    await uiUpdate.checkUpdate();

    expect(shareLogs).toHaveBeenCalledTimes(1);
  });

  it('does not count a start at which the backup failed, the user was told then', async () => {
    markDone(15);
    backedUp = false;
    stored.set(FAILED_DATA_UPDATE_STORAGE_KEY, {
      update: 'UPDATE_16',
      starts: 1,
    });

    await uiUpdate.checkUpdate();

    expect(confirm).not.toHaveBeenCalled();
    expect(stored.get(FAILED_DATA_UPDATE_STORAGE_KEY)).toEqual({
      update: 'UPDATE_16',
      starts: 1,
    });
  });

  it('keeps the start going when the count cannot be stored', async () => {
    markDone(15);
    update16Done = false;
    stored.set(FAILED_DATA_UPDATE_STORAGE_KEY, {
      update: 'UPDATE_16',
      starts: 1,
    });
    spyOn(TestBed.inject(UIStorage), 'set').and.rejectWith(
      new Error('write failed'),
    );

    await expectAsync(uiUpdate.checkUpdate()).toBeResolved();

    expect(confirm).not.toHaveBeenCalled();
  });
});

const UPDATES = ['UPDATE_16', 'UPDATE_17', 'UPDATE_18', 'UPDATE_19'];
