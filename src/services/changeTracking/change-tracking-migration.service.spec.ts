import { TestBed } from '@angular/core/testing';

import { Storage } from '@ionic/storage';

import { TranslateService } from '@ngx-translate/core';

import { CHANGE_TRACKED_COLLECTIONS } from '../../classes/changeTracking/changeTracking';
import { Settings } from '../../classes/settings/settings';
import { StorageClass } from '../../classes/storageClass';
import { EXPERIENCE_MODE_ENUM } from '../../enums/settings/experienceMode';
import {
  createLegacyData,
  LEGACY_DUPLICATE_BREW_UUID,
  LEGACY_FIXTURE_START,
  LEGACY_MILLISECONDS_BREW_UUID,
  LEGACY_NO_TIMESTAMP_BREW_UUID,
} from '../../test-utils/legacy-data-fixture';
import { createMockTranslateService } from '../../test-utils/mock-services';
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
import { ChangeTrackingMigrationService } from './change-tracking-migration.service';

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

/** In the order the migration fills them. */
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

/** Starts the storages of the app on the given device, like an app start. */
async function startApp(_device: Device) {
  const info = jasmine.createSpy('info');
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
    storages,
    settingsStorage,
    set,
    info,
    migration: TestBed.inject(ChangeTrackingMigrationService),
  };
}

const CHANGE_INFO_FIELDS = ['created_at', 'updated_at', 'rev', 'updated_by'];

function withoutChangeInfo(
  _entries: Record<string, any>[],
): Record<string, any>[] {
  return structuredClone(_entries).map((_entry) => {
    for (const field of CHANGE_INFO_FIELDS) {
      delete _entry.config[field];
    }
    return _entry;
  });
}

function writtenKeys(_set: jasmine.Spy): string[] {
  return _set.calls.allArgs().map((_args) => _args[0] as string);
}

describe('ChangeTrackingMigrationService', () => {
  beforeEach(() => {
    // Failed writes show an alert; that is not part of these tests.
    spyOn(StorageClass.prototype as any, 'showAlertSafely').and.resolveTo();
  });

  it('fills in the change info of all existing entries and keeps everything else', async () => {
    const legacy = createLegacyData();
    const device = createDeviceDatabase(legacy);
    const app = await startApp(device);

    expect(await app.migration.run()).toBeTrue();

    for (const collection of CHANGE_TRACKED_COLLECTIONS) {
      const stored = device.data.get(collection) as any[];
      expect(stored.length)
        .withContext(collection)
        .toBe(legacy[collection].length);
      for (const entry of stored) {
        expect(entry.config.updated_at).withContext(collection).toBe(0);
        expect(entry.config.rev).withContext(collection).toBe(0);
        expect(entry.config.updated_by).withContext(collection).toBe('');
        expect(typeof entry.config.created_at)
          .withContext(collection)
          .toBe('number');
      }
      // Nothing else changed, the unix timestamp included.
      expect(withoutChangeInfo(stored))
        .withContext(collection)
        .toEqual(legacy[collection]);
    }

    const brews = device.data.get('BREWS') as Record<string, any>[];
    const brew = (uuid: string) =>
      brews.find((_brew) => _brew.config.uuid === uuid);
    expect(brew('brew-0').config.created_at).toBe(LEGACY_FIXTURE_START * 1000);
    expect(brew(LEGACY_MILLISECONDS_BREW_UUID).config.created_at).toBe(
      (LEGACY_FIXTURE_START + 30) * 1000,
    );
    expect(brew(LEGACY_NO_TIMESTAMP_BREW_UUID).config.created_at).toBe(0);
    const duplicates = brews.filter(
      (_brew) => _brew.config.uuid === LEGACY_DUPLICATE_BREW_UUID,
    );
    expect(duplicates.length).toBe(2);
    expect(duplicates[0]).toEqual(duplicates[1]);
    // Tools of a preparation are part of it and carry no own change info.
    const preparation = (device.data.get('PREPARATION') as any[])[0];
    expect(preparation.tools).toEqual(legacy.PREPARATION[0].tools);
    expect(preparation.tools[0].config.rev).toBeUndefined();

    // Settings and version are not change tracked.
    const settings = (device.data.get('SETTINGS') as any[])[0];
    expect(settings.config).toEqual(legacy.SETTINGS[0].config);
    expect(device.data.get('VERSION')).toEqual(legacy.VERSION);
  });

  it('stores the advanced mode for existing users with the note about it pending', async () => {
    const device = createDeviceDatabase(createLegacyData({ brews: 3 }));
    const app = await startApp(device);
    expect((device.data.get('SETTINGS') as any[])[0].user).toBeUndefined();

    expect(await app.migration.run()).toBeTrue();

    const stored = (device.data.get('SETTINGS') as any[])[0];
    expect(stored.user).toEqual({
      experience_mode: EXPERIENCE_MODE_ENUM.ADVANCED,
      nickname: '',
      whats_new_seen: '',
      mode_hint_pending: true,
    });
    expect(app.settingsStorage.isModeHintPending()).toBeTrue();
  });

  it('writes each collection once and nothing on a second run', async () => {
    const device = createDeviceDatabase(createLegacyData({ brews: 10 }));
    const app = await startApp(device);

    expect(await app.migration.run()).toBeTrue();
    expect(writtenKeys(app.set).sort()).toEqual(
      [...CHANGE_TRACKED_COLLECTIONS, 'SETTINGS'].sort(),
    );
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
    const legacy = createLegacyData({ brews: 10 });
    const device = createDeviceDatabase(legacy);
    const app = await startApp(device);
    const failingCollection = CHANGE_TRACKED_COLLECTIONS[2];
    app.failWritesOf(failingCollection);

    expect(await app.migration.run()).toBeFalse();

    const [first, second, ...rest] = CHANGE_TRACKED_COLLECTIONS;
    for (const done of [first, second]) {
      for (const entry of device.data.get(done) as any[]) {
        expect(entry.config.rev).withContext(done).toBe(0);
      }
    }
    for (const open of rest) {
      expect(device.data.get(open)).withContext(open).toEqual(legacy[open]);
    }
    expect((device.data.get('SETTINGS') as any[])[0].user).toBeUndefined();
    // Only the copy in memory of the failed collection was filled in. That is
    // harmless: the values are the same the next run writes.
    const failedInMemory = StorageClass.prototype.getAllEntries.call(
      app.storages[2],
    );
    expect(failedInMemory[0].config.rev).toBe(0);

    // The next start runs the migration again.
    const restarted = await startApp(device);
    expect(await restarted.migration.run()).toBeTrue();

    expect(writtenKeys(restarted.set).sort()).toEqual(
      [...rest, 'SETTINGS'].sort(),
    );
    for (const collection of CHANGE_TRACKED_COLLECTIONS) {
      const stored = device.data.get(collection) as any[];
      for (const entry of stored) {
        expect(entry.config.rev).withContext(collection).toBe(0);
        expect(entry.config.updated_at).withContext(collection).toBe(0);
      }
      expect(withoutChangeInfo(stored))
        .withContext(collection)
        .toEqual(legacy[collection]);
    }
    expect((device.data.get('SETTINGS') as any[])[0].user.experience_mode).toBe(
      EXPERIENCE_MODE_ENUM.ADVANCED,
    );
  });

  it('is not finished when the settings cannot be stored', async () => {
    const device = createDeviceDatabase(createLegacyData({ brews: 3 }));
    const app = await startApp(device);
    app.failWritesOf('SETTINGS');

    expect(await app.migration.run()).toBeFalse();
  });

  it('writes nothing on a new installation and keeps the beginner mode without the note', async () => {
    const settings = JSON.parse(JSON.stringify(new Settings()));
    const device = createDeviceDatabase({ SETTINGS: [settings] });
    const app = await startApp(device);

    expect(await app.migration.run()).toBeTrue();

    expect(app.set).not.toHaveBeenCalled();
    expect((device.data.get('SETTINGS') as any[])[0].user.experience_mode).toBe(
      EXPERIENCE_MODE_ENUM.BEGINNER,
    );
    expect(app.settingsStorage.getSettings().user.experience_mode).toBe(
      EXPERIENCE_MODE_ENUM.BEGINNER,
    );
    expect(app.settingsStorage.isModeHintPending()).toBeFalse();
  });

  it('handles a large number of brews and reports what it did', async () => {
    const device = createDeviceDatabase(
      createLegacyData({ brews: 10_000, beans: 600 }),
    );
    const app = await startApp(device);

    expect(await app.migration.run()).toBeTrue();

    const brews = device.data.get('BREWS') as any[];
    expect(brews.length).toBe(10_004);
    expect(brews.every((_brew) => _brew.config.rev === 0)).toBeTrue();

    const [message, report] = app.info.calls.mostRecent().args;
    expect(message).toContain('Change info migration');
    expect(report.collections.BREWS.filled).toBe(10_004);
    expect(report.collections.BEANS.filled).toBe(600);
    expect(report.skipped).toBe(0);
    expect(report.settings_written).toBeTrue();
    expect(report.total_ms).toBeGreaterThanOrEqual(0);
  });
});
