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
      const device = createDeviceDatabase(data);
      const { service, brewStorage, failWritesOf, writesReachDevice } =
        await startApp(device);
      failWritesOf('BREWS');

      expect(await service.removeForeignTools()).toBeFalse();

      expect(device.data.get('BREWS')).toEqual(data.BREWS);
      expect(brewStorage.getRawEntries()).toEqual(data.BREWS);

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
});
