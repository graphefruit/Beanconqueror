import { TestBed } from '@angular/core/testing';

import { Storage } from '@ionic/storage';

import { TranslateService } from '@ngx-translate/core';

import { CHANGE_TRACKED_COLLECTIONS } from '../../classes/changeTracking/changeTracking';
import { Settings } from '../../classes/settings/settings';
import { StorageClass } from '../../classes/storageClass';
import {
  createLegacyData,
  LEGACY_DUPLICATE_BREW_UUID,
} from '../../test-utils/legacy-data-fixture';
import { createMockTranslateService } from '../../test-utils/mock-services';
import { DeletionJournalService } from '../deletionJournal/deletion-journal.service';
import { DeviceIdentityService } from '../deviceIdentity/device-identity.service';
import { EventQueueService } from '../queueService/queue-service.service';
import { UIBaristamodeBrewStorage } from '../uiBaristamodeBrewStorage';
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIGraphStorage } from '../uiGraphStorage.service';
import { UIGreenBeanStorage } from '../uiGreenBeanStorage';
import { UILog } from '../uiLog';
import { UIMillStorage } from '../uiMillStorage';
import { UIPreparationStorage } from '../uiPreparationStorage';
import { UIRoastingMachineStorage } from '../uiRoastingMachineStorage';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';
import { UIWaterStorage } from '../uiWaterStorage';
import { DuplicateEntriesMigrationService } from './duplicate-entries-migration.service';

/** Behaves like IndexedDB: values are copied when written and read. */
function createDeviceDatabase(initial: Record<string, unknown>) {
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
      // Like localforage, a missing value is read as null.
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

type Device = ReturnType<typeof createDeviceDatabase>;
type StoredEntry = Record<string, any>;

/** In the order the migration cleans them. */
const TRACKED_STORAGES = [
  UIBeanStorage,
  UIBrewStorage,
  UIMillStorage,
  UIPreparationStorage,
  UIWaterStorage,
  UIGreenBeanStorage,
  UIRoastingMachineStorage,
  UIGraphStorage,
  UIBaristamodeBrewStorage,
];

const CHANGE_INFO = {
  created_at: 1_600_000_000_000,
  updated_at: 0,
  rev: 0,
  updated_by: '',
};

/**
 * Data of an older installation with entries sharing a uuid in several
 * collections, one case of each kind:
 *
 * - BEANS: an identical copy of bean-1 and a differing copy of bean-2, which
 *   the brews refer to.
 * - BREWS: the identical pair of the legacy data.
 * - MILL: a differing copy of mill-1, which nothing refers to.
 * - WATER: a differing copy of water-1, which only the brew filter of the
 *   settings refers to.
 * - GRAPH: an identical copy, with different change info.
 * - BARISTAMODE_BREWS: a differing copy of barista-0 with its flow profile.
 */
function createDuplicatedData(): Record<string, any> {
  const data = createLegacyData({ brews: 12, beans: 4 });
  const differing = (_entry: StoredEntry): StoredEntry => ({
    ...structuredClone(_entry),
    note: 'differing copy',
  });
  data.BEANS.push(structuredClone(data.BEANS[1]), differing(data.BEANS[2]));
  data.MILL.push(differing(data.MILL[1]));
  data.WATER.push(differing(data.WATER[1]));
  data.SETTINGS[0].brew_filter.OPEN.water = ['water-1'];
  const graphCopy = structuredClone(data.GRAPH[0]);
  graphCopy.config = { ...graphCopy.config, ...CHANGE_INFO, rev: 2 };
  data.GRAPH.push(graphCopy);
  data.BARISTAMODE_BREWS.push(differing(data.BARISTAMODE_BREWS[0]));
  return data;
}

/** Starts the storages of the app on the given device, like an app start. */
async function startApp(_device: Device) {
  const info = jasmine.createSpy('info');
  const record = jasmine.createSpy('record').and.resolveTo();
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
        useValue: {
          record,
          forgetExistingEntries: () => Promise.resolve(),
        },
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
  const storages: StorageClass[] = TRACKED_STORAGES.map((_type) =>
    TestBed.inject<StorageClass>(_type),
  );
  for (const storage of storages) {
    await storage.initializeStorage();
  }
  const settingsStorage = TestBed.inject(UISettingsStorage);
  await settingsStorage.initializeStorage();
  await settingsStorage.storageReady();

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
    failWritesOf,
    set,
    info,
    record,
    brewStorage: TestBed.inject(UIBrewStorage),
    migration: TestBed.inject(DuplicateEntriesMigrationService),
  };
}

function writtenKeys(_set: jasmine.Spy): string[] {
  return _set.calls.allArgs().map((_args) => _args[0] as string);
}

function stored(_device: Device, _collection: string): StoredEntry[] {
  return _device.data.get(_collection) as StoredEntry[];
}

function uuids(_entries: StoredEntry[]): string[] {
  return _entries.map((_entry) => _entry.config.uuid as string);
}

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Checks the cleaned collections of `createDuplicatedData` on the device. */
function expectCleaned(_device: Device, _legacy: Record<string, any>): void {
  // Identical copies are gone, everything else stays in its order.
  expect(stored(_device, 'BEANS')).toEqual(
    _legacy.BEANS.slice(0, -2).concat(_legacy.BEANS.slice(-1)),
  );
  const copy = uuids(_legacy.BREWS).lastIndexOf(LEGACY_DUPLICATE_BREW_UUID);
  expect(stored(_device, 'BREWS')).toEqual(
    _legacy.BREWS.filter((_brew: StoredEntry, i: number) => i !== copy),
  );
  expect(stored(_device, 'GRAPH')).toEqual(_legacy.GRAPH.slice(0, 1));

  // Nothing refers to mill-1: its differing copy is an entry of its own now.
  const mills = stored(_device, 'MILL');
  expect(mills.slice(0, 2)).toEqual(_legacy.MILL.slice(0, 2));
  expect(mills[2].config.uuid).toMatch(UUID_V4);
  expect({
    ...mills[2],
    config: { ...mills[2].config, uuid: 'mill-1' },
  }).toEqual(_legacy.MILL[2]);

  // Brews, the brew filter and the flow profile depend on the uuid.
  expect(
    uuids(stored(_device, 'BEANS')).filter((_u) => _u === 'bean-2'),
  ).toEqual(['bean-2', 'bean-2']);
  expect(stored(_device, 'WATER')).toEqual(_legacy.WATER);
  expect(stored(_device, 'BARISTAMODE_BREWS')).toEqual(
    _legacy.BARISTAMODE_BREWS,
  );
}

describe('DuplicateEntriesMigrationService', () => {
  beforeEach(() => {
    // Failed writes show an alert; that is not part of these tests.
    spyOn(StorageClass.prototype as any, 'showAlertSafely').and.resolveTo();
  });

  it('cleans up entries sharing a uuid in all collections', async () => {
    const legacy = createDuplicatedData();
    const device = createDeviceDatabase(legacy);
    const app = await startApp(device);

    expect(await app.migration.run()).toBeTrue();

    expectCleaned(device, legacy);
    for (const collection of ['PREPARATION', 'GREEN_BEANS']) {
      expect(stored(device, collection))
        .withContext(collection)
        .toEqual(legacy[collection]);
    }
    // The settings are only read.
    expect(device.data.get('SETTINGS')).toEqual(legacy.SETTINGS);
  });

  it('keeps the change info and writes no deletion notes', async () => {
    const legacy = createDuplicatedData();
    for (const collection of CHANGE_TRACKED_COLLECTIONS) {
      for (const entry of legacy[collection] as StoredEntry[]) {
        entry.config = { ...CHANGE_INFO, ...entry.config };
      }
    }
    const device = createDeviceDatabase(legacy);
    const app = await startApp(device);

    expect(await app.migration.run()).toBeTrue();

    expect(stored(device, 'GRAPH')).toEqual([legacy.GRAPH[0]]);
    expect(stored(device, 'MILL')[2].config).toEqual({
      ...legacy.MILL[2].config,
      uuid: jasmine.stringMatching(UUID_V4),
    });
    expect(app.record).not.toHaveBeenCalled();
    expect(writtenKeys(app.set)).not.toContain('DELETION_JOURNAL');
  });

  it('writes each changed collection once and nothing on a second run', async () => {
    const device = createDeviceDatabase(createDuplicatedData());
    const app = await startApp(device);

    expect(await app.migration.run()).toBeTrue();
    // WATER and BARISTAMODE_BREWS only contain copies that are kept.
    expect(writtenKeys(app.set)).toEqual(['BEANS', 'BREWS', 'MILL', 'GRAPH']);
    const afterFirstRun = new Map(device.data);

    app.set.calls.reset();
    expect(await app.migration.run()).toBeTrue();
    expect(app.set).not.toHaveBeenCalled();

    // Also not after a new start.
    const restarted = await startApp(device);
    expect(await restarted.migration.run()).toBeTrue();
    expect(restarted.set).not.toHaveBeenCalled();
    expect(new Map(device.data)).toEqual(afterFirstRun);
  });

  it('leaves complete collections when it is stopped and continues on the next start', async () => {
    const legacy = createDuplicatedData();
    const device = createDeviceDatabase(legacy);
    const app = await startApp(device);
    app.failWritesOf('MILL');

    expect(await app.migration.run()).toBeFalse();

    // Collections before the failed one are done, the rest is untouched.
    expect(stored(device, 'BEANS').length).toBe(legacy.BEANS.length - 1);
    expect(stored(device, 'BREWS').length).toBe(legacy.BREWS.length - 1);
    for (const open of ['MILL', 'GRAPH']) {
      expect(stored(device, open)).withContext(open).toEqual(legacy[open]);
    }

    const restarted = await startApp(device);
    expect(await restarted.migration.run()).toBeTrue();

    expect(writtenKeys(restarted.set)).toEqual(['MILL', 'GRAPH']);
    expectCleaned(device, legacy);
  });

  it('writes nothing on a new installation', async () => {
    const settings = JSON.parse(JSON.stringify(new Settings()));
    const device = createDeviceDatabase({ SETTINGS: [settings] });
    const app = await startApp(device);

    expect(await app.migration.run()).toBeTrue();

    expect(app.set).not.toHaveBeenCalled();
  });

  it('lets the brew list show the cleaned brews', async () => {
    const legacy = createDuplicatedData();
    const device = createDeviceDatabase(legacy);
    const app = await startApp(device);
    expect(app.brewStorage.getAllEntries().length).toBe(legacy.BREWS.length);

    await app.migration.run();

    expect(app.brewStorage.getAllEntries().length).toBe(
      legacy.BREWS.length - 1,
    );
  });

  it('logs what it did, with each uuid whose copies are kept', async () => {
    const device = createDeviceDatabase(createDuplicatedData());
    const app = await startApp(device);

    await app.migration.run();

    const messages = app.info.calls
      .allArgs()
      .map((_args) => _args[0] as string);
    for (const kept of [
      'BEANS - bean-2',
      'WATER - water-1',
      'BARISTAMODE_BREWS - barista-0',
    ]) {
      expect(messages)
        .withContext(kept)
        .toContain(
          `Duplicate entries migration - ${kept} - differing copies kept, the uuid is referenced`,
        );
    }
    expect(
      messages.some((_message) =>
        _message.startsWith(
          'Duplicate entries migration - MILL - mill-1 - differing copy got the uuid ',
        ),
      ),
    ).toBeTrue();

    const [message, report] = app.info.calls.mostRecent().args;
    expect(message).toContain('Duplicate entries migration - done');
    expect(report.groups).toBe(7);
    expect(report.removed).toBe(3);
    expect(report.renamed).toBe(1);
    expect(report.kept).toBe(3);
    expect(report.collections.BREWS).toEqual(
      jasmine.objectContaining({ groups: 1, entries: 2, removed: 1 }),
    );
    expect(Object.keys(report.collections).sort()).toEqual(
      ['BARISTAMODE_BREWS', 'BEANS', 'BREWS', 'GRAPH', 'MILL', 'WATER'].sort(),
    );
  });

  it('handles a large number of brews', async () => {
    const legacy = createLegacyData({ brews: 10_000, beans: 600 });
    for (let i = 0; i < 100; i++) {
      legacy.BREWS.push(structuredClone(legacy.BREWS[i * 50]));
    }
    const device = createDeviceDatabase(legacy);
    const app = await startApp(device);

    expect(await app.migration.run()).toBeTrue();

    expect(stored(device, 'BREWS').length).toBe(10_004 - 1);
    const [, report] = app.info.calls.mostRecent().args;
    expect(report.collections.BREWS.removed).toBe(101);
    expect(report.total_ms).toBeGreaterThanOrEqual(0);
  });
});
