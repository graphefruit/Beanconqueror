import { TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular';

import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { TranslateService } from '@ngx-translate/core';

import { Bean } from '../../classes/bean/bean';
import { Brew } from '../../classes/brew/brew';
import { Preparation } from '../../classes/preparation/preparation';
import { Settings } from '../../classes/settings/settings';
import { Version } from '../../classes/version/iVersion';
import { BrewReferencesService } from '../brewReferences/brew-references.service';
import { ChangeTrackingMigrationService } from '../changeTracking/change-tracking-migration.service';
import { DuplicateEntriesMigrationService } from '../changeTracking/duplicate-entries-migration.service';
import { UIAlert } from '../uiAlert';
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewStorage } from '../uiBrewStorage';
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

function collectionStorage(
  name: string,
  entries: unknown[],
  recorded: RecordedUpdate[],
  currentVersion: () => string,
) {
  return {
    getAllEntries: () => entries,
    add: jasmine
      .createSpy(`${name}.add`)
      .and.callFake(async (entry: unknown) => structuredClone(entry)),
    update: jasmine
      .createSpy(`${name}.update`)
      .and.callFake(async (_entry: unknown, options?: unknown) => {
        recorded.push({ version: currentVersion(), storage: name, options });
        return true;
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

  beforeEach(async () => {
    recorded = [];
    version = '';
    const current = () => version;
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
          ),
        },
        {
          provide: UIBeanStorage,
          useValue: collectionStorage(
            'BEANS',
            fixtures.beans,
            recorded,
            current,
          ),
        },
        {
          provide: UIPreparationStorage,
          useValue: collectionStorage(
            'PREPARATION',
            fixtures.preparations,
            recorded,
            current,
          ),
        },
        {
          provide: UIMillStorage,
          useValue: collectionStorage('MILL', [], recorded, current),
        },
        {
          provide: UISettingsStorage,
          useValue: {
            getSettings: () => settings,
            saveSettings: async () => true,
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
      const done = await (uiUpdate as any).__updateDataVersion(version);
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
