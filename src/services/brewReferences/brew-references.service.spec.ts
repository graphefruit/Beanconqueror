import { TestBed } from '@angular/core/testing';

import { Storage } from '@ionic/storage';

import { TranslateService } from '@ngx-translate/core';

import { Bean } from '../../classes/bean/bean';
import { Brew } from '../../classes/brew/brew';
import { Mill } from '../../classes/mill/mill';
import { Preparation } from '../../classes/preparation/preparation';
import { PreparationTool } from '../../classes/preparation/preparationTool';
import { Settings } from '../../classes/settings/settings';
import { StorageClass } from '../../classes/storageClass';
import { createMockTranslateService } from '../../test-utils/mock-services';
import { DeletionJournalService } from '../deletionJournal/deletion-journal.service';
import { DeviceIdentityService } from '../deviceIdentity/device-identity.service';
import { EventQueueService } from '../queueService/queue-service.service';
import { UIAlert } from '../uiAlert';
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIExportImportHelper } from '../uiExportImportHelper';
import { UILog } from '../uiLog';
import { UIMillStorage } from '../uiMillStorage';
import { UIPreparationStorage } from '../uiPreparationStorage';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';
import { BrewReferencesService } from './brew-references.service';

type StoredEntry = Record<string, any>;
type StoredData = Record<string, StoredEntry[]>;

/** Behaves like IndexedDB: values are copied when written and read. */
function createDeviceDatabase(initial: StoredData) {
  const data = new Map<string, unknown>(
    Object.entries(structuredClone(initial)),
  );
  return {
    data,
    database: {
      set: (key: string, value: unknown) => {
        data.set(key, structuredClone(value));
        return Promise.resolve();
      },
      get: (key: string) =>
        Promise.resolve(data.has(key) ? structuredClone(data.get(key)) : null),
    },
  };
}

type Device = ReturnType<typeof createDeviceDatabase>;

const CHANGE_INFO = {
  created_at: 1_600_000_000_000,
  updated_at: 1_600_000_000_000,
  rev: 3,
  updated_by: 'device-b',
};

function stored(_entry: object, _uuid: string): StoredEntry {
  const entry: StoredEntry = JSON.parse(JSON.stringify(_entry));
  entry.config = { uuid: _uuid, unix_timestamp: 1_600_000_000, ...CHANGE_INFO };
  return entry;
}

function preparation(_uuid: string, _tools: StoredEntry[]): StoredEntry {
  return { ...stored(new Preparation(), _uuid), tools: _tools };
}

function tool(_uuid: string, _archived = false): StoredEntry {
  const entry = stored(new PreparationTool(), _uuid);
  entry.archived = _archived;
  // Preparation tools carry no change info.
  entry.config = { uuid: _uuid, unix_timestamp: 1_600_000_000 };
  return entry;
}

function brew(
  _uuid: string,
  _preparation: string,
  _tools: string[],
): StoredEntry {
  return {
    ...stored(new Brew(), _uuid),
    bean: 'bean-1',
    mill: 'mill-1',
    method_of_preparation: _preparation,
    method_of_preparation_tools: _tools,
  };
}

/**
 * Two preparations with tools of their own and one brew for each rule:
 *
 * - brew-own: only tools of its preparation, one of them archived.
 * - brew-foreign: a tool of its preparation and one of the other one.
 * - brew-gone: a tool that no preparation has.
 * - brew-lost: its preparation is not stored.
 * - brew-none: no tools.
 */
function createData(): StoredData {
  return {
    SETTINGS: [JSON.parse(JSON.stringify(new Settings()))],
    BEANS: [stored(new Bean(), 'bean-1')],
    MILL: [stored(new Mill(), 'mill-1')],
    PREPARATION: [
      preparation('espresso', [tool('basket'), tool('screen', true)]),
      preparation('v60', [tool('paper')]),
    ],
    BREWS: [
      brew('brew-own', 'espresso', ['basket', 'screen']),
      brew('brew-foreign', 'espresso', ['paper', 'basket']),
      brew('brew-gone', 'v60', ['deleted-tool']),
      brew('brew-lost', 'deleted-preparation', ['basket', 'deleted-tool']),
      brew('brew-none', 'v60', []),
    ],
  };
}

const ALL = [
  UIBrewStorage,
  UIPreparationStorage,
  UIBeanStorage,
  UIMillStorage,
  UISettingsStorage,
];

/** Starts the storages on the device; those in `_notRead` are left unread. */
async function startApp(_device: Device, _notRead: unknown[] = []) {
  const info = jasmine.createSpy('info');
  const backup = jasmine
    .createSpy('writeBackupBeforeMigration')
    .and.resolveTo(true);
  // No alert of a running app for the collections to report a failed save.
  spyOn(UIAlert, 'getInstance').and.returnValue(undefined);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      {
        provide: Storage,
        useValue: { create: () => Promise.resolve(_device.database) },
      },
      { provide: EventQueueService, useValue: { dispatch: () => undefined } },
      { provide: TranslateService, useValue: createMockTranslateService() },
      {
        provide: DeviceIdentityService,
        useValue: { getDeviceId: () => 'device-a' },
      },
      {
        provide: DeletionJournalService,
        useValue: { forgetExistingEntries: () => Promise.resolve() },
      },
      {
        provide: UIExportImportHelper,
        useValue: { writeBackupBeforeMigration: backup },
      },
      {
        provide: UILog,
        useValue: {
          log: () => undefined,
          info,
          error: () => undefined,
          debug: () => undefined,
        },
      },
    ],
  });
  const uiStorage = TestBed.inject(UIStorage);
  await uiStorage.init();
  for (const type of ALL) {
    if (!_notRead.includes(type)) {
      await TestBed.inject<StorageClass>(type).initializeStorage();
    }
  }
  // The settings object is filled from the stored one a moment later.
  await TestBed.inject(UISettingsStorage).storageReady();

  const writeToDevice = uiStorage.set.bind(uiStorage) as UIStorage['set'];
  const set = spyOn(uiStorage, 'set').and.callThrough();
  /** Lets writes of one key fail, all others reach the device. */
  const failWritesOf = (_failingKey: string) =>
    set.and.callFake((_key: string, _value: unknown) =>
      _key === _failingKey
        ? Promise.reject(new Error('write failed'))
        : writeToDevice(_key, _value),
    );
  return {
    set,
    failWritesOf,
    writesReachDevice: () => set.and.callThrough(),
    info,
    backup,
    brewStorage: TestBed.inject(UIBrewStorage),
    settingsStorage: TestBed.inject(UISettingsStorage),
    service: TestBed.inject(BrewReferencesService),
  };
}

function writtenKeys(_set: jasmine.Spy): string[] {
  return _set.calls.allArgs().map((_args) => _args[0] as string);
}

function storedBrews(_device: Device): Record<string, StoredEntry> {
  const brews: Record<string, StoredEntry> = {};
  for (const entry of _device.data.get('BREWS') as StoredEntry[]) {
    brews[entry.config.uuid] = entry;
  }
  return brews;
}

function toolsOf(_device: Device): Record<string, string[]> {
  const tools: Record<string, string[]> = {};
  for (const [uuid, entry] of Object.entries(storedBrews(_device))) {
    tools[uuid] = entry.method_of_preparation_tools;
  }
  return tools;
}

describe('BrewReferencesService', () => {
  describe('removeForeignTools', () => {
    it('keeps the tools of the own preparation, also an archived one', async () => {
      const device = createDeviceDatabase(createData());
      const { service } = await startApp(device);

      expect(await service.removeForeignTools()).toBeTrue();

      expect(toolsOf(device)['brew-own']).toEqual(['basket', 'screen']);
    });

    it('removes the tool of another preparation and keeps the own one', async () => {
      const device = createDeviceDatabase(createData());
      const { service } = await startApp(device);

      expect(await service.removeForeignTools()).toBeTrue();

      expect(toolsOf(device)['brew-foreign']).toEqual(['basket']);
    });

    it('removes a tool that no preparation has', async () => {
      const device = createDeviceDatabase(createData());
      const { service } = await startApp(device);

      expect(await service.removeForeignTools()).toBeTrue();

      expect(toolsOf(device)['brew-gone']).toEqual([]);
    });

    it('leaves a brew as it is when its preparation is not stored', async () => {
      const data = createData();
      const device = createDeviceDatabase(data);
      const { service } = await startApp(device);

      expect(await service.removeForeignTools()).toBeTrue();

      expect(storedBrews(device)['brew-lost']).toEqual(data.BREWS[3]);
    });

    it('counts the changed brews as changed by this device and touches no other', async () => {
      const data = createData();
      const device = createDeviceDatabase(data);
      const { service } = await startApp(device);
      const before = Date.now();

      await service.removeForeignTools();

      const brews = storedBrews(device);
      for (const uuid of ['brew-foreign', 'brew-gone']) {
        expect(brews[uuid].config.rev).withContext(uuid).toBe(4);
        expect(brews[uuid].config.updated_by).toBe('device-a');
        expect(brews[uuid].config.updated_at).toBeGreaterThanOrEqual(before);
        expect(brews[uuid].config.created_at).toBe(CHANGE_INFO.created_at);
      }
      expect(brews['brew-own']).toEqual(data.BREWS[0]);
      expect(brews['brew-lost']).toEqual(data.BREWS[3]);
      expect(brews['brew-none']).toEqual(data.BREWS[4]);
      expect(Object.keys(brews)).toEqual(
        data.BREWS.map((_brew) => _brew.config.uuid as string),
      );
    });

    it('changes nothing of a changed brew but its tools and change info', async () => {
      const data = createData();
      const device = createDeviceDatabase(data);
      const { service } = await startApp(device);

      await service.removeForeignTools();

      const restored: StoredEntry = {
        ...storedBrews(device)['brew-foreign'],
        method_of_preparation_tools: ['paper', 'basket'],
        config: data.BREWS[1].config,
      };
      expect(restored).toEqual(data.BREWS[1]);
    });

    it('leaves an old brew with missing fields and numbers kept as text as it is stored', async () => {
      const data = createData();
      const old = data.BREWS[1];
      for (const field of [
        'vessel_name',
        'customInformation',
        'preparationDeviceBrew',
        'reference_flow_profile',
        'best_brew',
      ]) {
        delete old[field];
      }
      old.grind_weight = '18.5';
      old.brew_temperature = '';
      old.brew_quantity = '12,5';
      old.brew_time = null;
      const device = createDeviceDatabase(data);
      const { service } = await startApp(device);

      expect(await service.removeForeignTools()).toBeTrue();

      const cleaned = storedBrews(device)['brew-foreign'];
      expect(cleaned.method_of_preparation_tools).toEqual(['basket']);
      expect(cleaned.config.rev).toBe(4);
      const restored: StoredEntry = {
        ...cleaned,
        method_of_preparation_tools: ['paper', 'basket'],
        config: old.config,
      };
      expect(restored).toEqual(old);
    });

    it('takes all tools out of the brews of a preparation stored without a tool list', async () => {
      const data = createData();
      delete data.PREPARATION[0].tools;
      const device = createDeviceDatabase(data);
      const { service } = await startApp(device);

      expect(await service.removeForeignTools()).toBeTrue();

      const tools = toolsOf(device);
      expect(tools['brew-own']).toEqual([]);
      expect(tools['brew-foreign']).toEqual([]);
      expect(tools['brew-lost']).toEqual(['basket', 'deleted-tool']);
    });

    it('stores all changed brews with one write and nothing else', async () => {
      const device = createDeviceDatabase(createData());
      const { service, set } = await startApp(device);

      await service.removeForeignTools();

      expect(writtenKeys(set)).toEqual(['BREWS']);
    });

    it('writes nothing when no brew has a foreign tool', async () => {
      const data = createData();
      data.BREWS = [data.BREWS[0], data.BREWS[3], data.BREWS[4]];
      const device = createDeviceDatabase(data);
      const { service, set } = await startApp(device);

      expect(await service.removeForeignTools()).toBeTrue();

      expect(set).not.toHaveBeenCalled();
      expect(device.data.get('BREWS')).toEqual(data.BREWS);
    });

    it('writes nothing when it runs a second time', async () => {
      const device = createDeviceDatabase(createData());
      const { service, set } = await startApp(device);
      await service.removeForeignTools();
      set.calls.reset();

      expect(await service.removeForeignTools()).toBeTrue();

      expect(set).not.toHaveBeenCalled();
    });

    for (const [name, notRead] of [
      ['preparations', UIPreparationStorage],
      ['brews', UIBrewStorage],
    ] as const) {
      it(`does nothing and stays open while the ${name} are not read`, async () => {
        const data = createData();
        const device = createDeviceDatabase(data);
        const { service, set } = await startApp(device, [notRead]);

        expect(await service.removeForeignTools()).toBeFalse();

        expect(set).not.toHaveBeenCalled();
        expect(device.data.get('BREWS')).toEqual(data.BREWS);
      });
    }

    it('keeps the brews as they were when they cannot be saved, and cleans them at the next run', async () => {
      const data = createData();
      data.SETTINGS[0].brew_filter.OPEN.method_of_preparation_tools = [
        'deleted-tool',
      ];
      const device = createDeviceDatabase(data);
      const { service, brewStorage, set, failWritesOf, writesReachDevice } =
        await startApp(device);
      failWritesOf('BREWS');

      expect(await service.removeForeignTools()).toBeFalse();

      expect(device.data.get('BREWS')).toEqual(data.BREWS);
      expect(brewStorage.getRawEntries()).toEqual(data.BREWS);
      // The filters wait for the brews: nothing else was tried.
      expect(writtenKeys(set)).toEqual(['BREWS']);

      writesReachDevice();
      expect(await service.removeForeignTools()).toBeTrue();
      expect(toolsOf(device)['brew-foreign']).toEqual(['basket']);
      expect(storedBrews(device)['brew-foreign'].config.rev).toBe(4);
    });

    it('leaves brews that share a uuid as they are', async () => {
      const data = createData();
      const copy = structuredClone(data.BREWS[1]);
      copy.note = 'differing copy';
      data.BREWS.push(copy);
      const device = createDeviceDatabase(data);
      const { service } = await startApp(device);

      expect(await service.removeForeignTools()).toBeTrue();

      const brews = device.data.get('BREWS') as StoredEntry[];
      expect(brews[1]).toEqual(data.BREWS[1]);
      expect(brews[5]).toEqual(copy);
      expect(brews[2].method_of_preparation_tools).toEqual([]);
    });

    it('logs numbers only', async () => {
      const device = createDeviceDatabase(createData());
      const { service, info } = await startApp(device);

      await service.removeForeignTools();

      expect(info).toHaveBeenCalledTimes(1);
      expect(info.calls.mostRecent().args[1]).toEqual({
        brews: 5,
        changed: 2,
        without_preparation: 1,
        left_sharing_a_uuid: 0,
        removed_from_filters: 0,
      });
    });

    describe('brew filters of the settings', () => {
      function withFilters(): StoredData {
        const data = createData();
        const filter = data.SETTINGS[0].brew_filter;
        filter.OPEN.method_of_preparation_tools = ['deleted-tool', 'paper'];
        filter.ARCHIVED.method_of_preparation_tools = ['screen', 'gone'];
        return data;
      }

      it('lose the tools that no preparation has, in one write of the settings', async () => {
        const device = createDeviceDatabase(withFilters());
        const { service, set, settingsStorage } = await startApp(device);

        expect(await service.removeForeignTools()).toBeTrue();

        const filter = (device.data.get('SETTINGS') as StoredEntry[])[0]
          .brew_filter;
        expect(filter.OPEN.method_of_preparation_tools).toEqual(['paper']);
        // Archived tools are still tools of their preparation.
        expect(filter.ARCHIVED.method_of_preparation_tools).toEqual(['screen']);
        expect(writtenKeys(set)).toEqual(['BREWS', 'SETTINGS']);
        expect(
          settingsStorage.getSettings().brew_filter.OPEN
            .method_of_preparation_tools,
        ).toEqual(['paper']);
      });

      it('are not written when they only name tools of preparations', async () => {
        const data = withFilters();
        data.SETTINGS[0].brew_filter.OPEN.method_of_preparation_tools = [
          'paper',
        ];
        data.SETTINGS[0].brew_filter.ARCHIVED.method_of_preparation_tools = [];
        const device = createDeviceDatabase(data);
        const { service, set } = await startApp(device);

        expect(await service.removeForeignTools()).toBeTrue();

        expect(writtenKeys(set)).toEqual(['BREWS']);
      });

      it('stay as they were and the update stays open when the settings cannot be saved', async () => {
        const data = withFilters();
        const device = createDeviceDatabase(data);
        const { service, failWritesOf, settingsStorage } =
          await startApp(device);
        failWritesOf('SETTINGS');

        expect(await service.removeForeignTools()).toBeFalse();

        expect(device.data.get('SETTINGS')).toEqual(data.SETTINGS);
        const filter = settingsStorage.getSettings().brew_filter;
        expect(filter.OPEN.method_of_preparation_tools).toEqual([
          'deleted-tool',
          'paper',
        ]);
        expect(filter.ARCHIVED.method_of_preparation_tools).toEqual([
          'screen',
          'gone',
        ]);
      });
    });
  });

  describe('addStandardMill', () => {
    function withoutMills(): StoredData {
      const data = createData();
      data.MILL = [];
      return data;
    }

    it('adds the grinder Standard and points every brew at it, keeping their change info', async () => {
      const data = withoutMills();
      const device = createDeviceDatabase(data);
      const { service } = await startApp(device);

      expect(await service.addStandardMill()).toBeTrue();

      const mills = device.data.get('MILL') as StoredEntry[];
      expect(mills.length).toBe(1);
      expect(mills[0].name).toBe('Standard');
      for (const [i, entry] of (
        device.data.get('BREWS') as StoredEntry[]
      ).entries()) {
        expect(entry).toEqual({ ...data.BREWS[i], mill: mills[0].config.uuid });
      }
    });

    for (const [name, data] of [
      ['there is a grinder', createData()],
      ['there is no brew', { ...withoutMills(), BREWS: [] }],
    ] as [string, StoredData][]) {
      it(`changes nothing when ${name}`, async () => {
        const device = createDeviceDatabase(data);
        const { service, set } = await startApp(device);

        expect(await service.addStandardMill()).toBeTrue();

        expect(set).not.toHaveBeenCalled();
      });
    }

    for (const notRead of [UIBrewStorage, UIMillStorage]) {
      it(`changes nothing while ${notRead.name} is not read`, async () => {
        const device = createDeviceDatabase(withoutMills());
        const { service, set } = await startApp(device, [notRead]);

        expect(await service.addStandardMill()).toBeFalse();

        expect(set).not.toHaveBeenCalled();
      });
    }

    it('adds no grinder when the brews could not be stored', async () => {
      const device = createDeviceDatabase(withoutMills());
      const { service, failWritesOf } = await startApp(device);
      failWritesOf('BREWS');

      expect(await service.addStandardMill()).toBeFalse();

      expect(device.data.get('MILL')).toEqual([]);
    });

    it('resolves false when the grinder could not be stored', async () => {
      const device = createDeviceDatabase(withoutMills());
      const { service, failWritesOf } = await startApp(device);
      failWritesOf('MILL');

      expect(await service.addStandardMill()).toBeFalse();
    });
  });

  describe('repairStandardMill', () => {
    /**
     * The grinder Standard added at 1_700_000_000 and brews as the update
     * left them: brew-own and brew-foreign with an empty grinder, brew-gone
     * handed over from another app, brew-lost created later, brew-none with
     * a grinder.
     */
    function leftByTheUpdate(): StoredData {
      const data = createData();
      data.MILL.push({
        ...stored(new Mill(), 'standard'),
        name: 'Standard',
      });
      data.MILL[1].config.unix_timestamp = 1_700_000_000;
      for (const entry of data.BREWS.slice(0, 4)) {
        entry.mill = '';
      }
      data.BREWS[2].customInformation = { imported: { source: 'other app' } };
      data.BREWS[3].config.unix_timestamp = 1_700_000_001;
      return data;
    }

    it('points the brews left with an empty grinder at the grinder Standard and touches nothing else', async () => {
      const data = leftByTheUpdate();
      const device = createDeviceDatabase(data);
      const { service, info, set } = await startApp(device);

      expect(await service.repairStandardMill()).toBeTrue();

      const brews = device.data.get('BREWS') as StoredEntry[];
      expect(brews[0]).toEqual({ ...data.BREWS[0], mill: 'standard' });
      expect(brews[1]).toEqual({ ...data.BREWS[1], mill: 'standard' });
      expect(brews.slice(2)).toEqual(data.BREWS.slice(2));
      expect(writtenKeys(set)).toEqual(['BREWS']);
      expect(info.calls.mostRecent().args[1]).toEqual({
        brews: 5,
        repaired: 2,
        standard_grinders: 1,
      });
      expect(JSON.stringify(info.calls.allArgs())).not.toContain('standard"');
    });

    it('writes the backup before it changes the brews', async () => {
      const data = leftByTheUpdate();
      const device = createDeviceDatabase(data);
      const { service, set, backup } = await startApp(device);
      backup.and.callFake(() => {
        expect(set).not.toHaveBeenCalled();
        expect(device.data.get('BREWS')).toEqual(data.BREWS);
        return Promise.resolve(true);
      });

      expect(await service.repairStandardMill()).toBeTrue();

      expect(backup).toHaveBeenCalledTimes(1);
      expect(writtenKeys(set)).toEqual(['BREWS']);
    });

    it('changes nothing when the backup could not be written', async () => {
      const data = leftByTheUpdate();
      const device = createDeviceDatabase(data);
      const { service, set, backup, info } = await startApp(device);
      backup.and.resolveTo(false);

      expect(await service.repairStandardMill()).toBeFalse();

      expect(set).not.toHaveBeenCalled();
      expect(device.data.get('BREWS')).toEqual(data.BREWS);
      expect(info.calls.mostRecent().args[0]).toContain('no backup');
      expect(info.calls.mostRecent().args[1].repaired).toBe(0);
    });

    it('writes nothing, also no backup, when it has run already', async () => {
      const device = createDeviceDatabase(leftByTheUpdate());
      const { service, set, backup } = await startApp(device);
      await service.repairStandardMill();
      set.calls.reset();

      expect(await service.repairStandardMill()).toBeTrue();

      expect(set).not.toHaveBeenCalled();
      expect(backup).toHaveBeenCalledTimes(1);
    });

    it('writes nothing when several grinders are named Standard', async () => {
      const data = leftByTheUpdate();
      data.MILL[0].name = 'Standard';
      const device = createDeviceDatabase(data);
      const { service, set, info, backup } = await startApp(device);

      expect(await service.repairStandardMill()).toBeTrue();

      expect(set).not.toHaveBeenCalled();
      expect(backup).not.toHaveBeenCalled();
      expect(info.calls.mostRecent().args[1]).toEqual({
        brews: 5,
        repaired: 0,
        standard_grinders: 2,
      });
    });

    for (const notRead of [UIBrewStorage, UIMillStorage]) {
      it(`changes nothing while ${notRead.name} is not read`, async () => {
        const device = createDeviceDatabase(leftByTheUpdate());
        const { service, set } = await startApp(device, [notRead]);

        expect(await service.repairStandardMill()).toBeFalse();

        expect(set).not.toHaveBeenCalled();
      });
    }

    it('resolves false when the brews could not be stored', async () => {
      const data = leftByTheUpdate();
      const device = createDeviceDatabase(data);
      const { service, failWritesOf, info } = await startApp(device);
      failWritesOf('BREWS');

      expect(await service.repairStandardMill()).toBeFalse();

      expect(device.data.get('BREWS')).toEqual(data.BREWS);
      expect(info.calls.mostRecent().args[1].repaired).toBe(0);
    });
  });

  describe('logMissingReferences', () => {
    function withMissingReferences(): StoredData {
      const data = createData();
      data.BREWS[0].bean = 'deleted-bean';
      data.BREWS[1].bean = 'deleted-bean';
      data.BREWS[2].mill = 'deleted-mill';
      // No grinder chosen: refers to nothing.
      data.BREWS[4].mill = '';
      return data;
    }

    it('logs how many brews refer to a missing bean, grinder and preparation, and changes nothing', async () => {
      const data = withMissingReferences();
      const device = createDeviceDatabase(data);
      const { service, info, set } = await startApp(device);

      service.logMissingReferences();

      expect(info).toHaveBeenCalledTimes(1);
      expect(info.calls.mostRecent().args[1]).toEqual({
        brews: 5,
        missing_bean: 2,
        missing_mill: 1,
        missing_preparation: 1,
      });
      expect(JSON.stringify(info.calls.allArgs())).not.toContain('deleted-');
      expect(set).not.toHaveBeenCalled();
      expect(device.data.get('BREWS')).toEqual(data.BREWS);
    });

    for (const notRead of [
      UIBrewStorage,
      UIBeanStorage,
      UIMillStorage,
      UIPreparationStorage,
    ]) {
      it(`counts nothing while ${notRead.name} is not read`, async () => {
        const device = createDeviceDatabase(withMissingReferences());
        const { service, info } = await startApp(device, [notRead]);

        service.logMissingReferences();

        expect(info).toHaveBeenCalledTimes(1);
        expect(info.calls.mostRecent().args.length).toBe(1);
      });
    }
  });
});
