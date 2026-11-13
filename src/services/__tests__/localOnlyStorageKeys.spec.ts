import { fakeAsync, flush, TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular/standalone';
import { Storage } from '@ionic/storage';

import {
  ATTACHMENT_MANIFEST_STORAGE_KEY,
  DELETION_JOURNAL_STORAGE_KEY,
  DEVICE_STORAGE_KEY,
  LOCAL_ONLY_STORAGE_KEYS,
} from '../../classes/changeTracking/localStorageKeys';
import { Settings } from '../../classes/settings/settings';
import { AppEventType } from '../../enums/appEvent/appEvent';
import { EXPERIENCE_MODE_ENUM } from '../../enums/settings/experienceMode';
import { EventQueueService } from '../queueService/queue-service.service';
import { UIAlert } from '../uiAlert';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIExportImportHelper } from '../uiExportImportHelper';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';

function entries(prefix: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    config: { uuid: `${prefix}-${i}`, unix_timestamp: 1600000000 + i },
    note: `${prefix} ${i}`,
  }));
}

function localValues(prefix: string) {
  return {
    [DEVICE_STORAGE_KEY]: { device_id: `${prefix}-device-id`, created_at: 1 },
    [DELETION_JOURNAL_STORAGE_KEY]: [
      {
        collection: 'BREWS',
        uuid: `${prefix}-deleted-brew`,
        deleted_at: 2,
        device_id: `${prefix}-device-id`,
        rev: 0,
      },
    ],
    [ATTACHMENT_MANIFEST_STORAGE_KEY]: {
      version: 1,
      completed_at: 3,
      entries: [{ path: `${prefix}-photo.jpg` }],
    },
  };
}

function userProfile() {
  return {
    experience_mode: EXPERIENCE_MODE_ENUM.BEGINNER,
    nickname: 'Kim',
    whats_new_seen: '9.0.0',
  };
}

/** Behaves like IndexedDB: values are copied when written and read. */
function createDeviceDatabase(initial: Record<string, unknown>) {
  const data = new Map<string, unknown>(
    Object.entries(structuredClone(initial)),
  );
  const failingWrites = new Set<string>();
  return {
    data,
    failingWrites,
    database: {
      set: (key: string, value: unknown) => {
        if (failingWrites.delete(key)) {
          return Promise.reject(new Error('write failed'));
        }
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

function configure(storage: object, dispatch = () => undefined) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      UIExportImportHelper,
      UIStorage,
      {
        provide: Storage,
        useValue: { create: () => Promise.resolve(storage) },
      },
      { provide: EventQueueService, useValue: { dispatch } },
      {
        provide: UIHelper,
        useValue: { cloneData: <T>(v: T): T => structuredClone(v) },
      },
      { provide: Platform, useValue: { is: () => false } },
      {
        provide: UILog,
        useValue: {
          log: () => undefined,
          info: () => undefined,
          error: () => undefined,
          debug: () => undefined,
        },
      },
      { provide: UISettingsStorage, useValue: {} },
      { provide: UIFileHelper, useValue: {} },
      { provide: UIAlert, useValue: {} },
      { provide: UIBrewStorage, useValue: {} },
      { provide: ModalController, useValue: {} },
    ],
  });
}

async function startDevice(initial: Record<string, unknown>) {
  const device = createDeviceDatabase(initial);
  configure(device.database);
  const uiStorage = TestBed.inject(UIStorage);
  await uiStorage.init();
  return {
    ...device,
    uiStorage,
    helper: TestBed.inject(UIExportImportHelper),
  };
}

async function readBackup(
  helper: UIExportImportHelper,
  zip: Blob,
): Promise<any> {
  return await helper.getJSONFromZIPArrayBufferContent(await zip.arrayBuffer());
}

describe('Values local to one installation', () => {
  it('are not written into the backup, while the user profile is', async () => {
    const deviceA = await startDevice({
      ...localValues('a'),
      SETTINGS: [{ language: 'de', user: userProfile() }],
      BREWS: entries('brew', 3),
      BEANS: entries('bean', 2),
    });

    const backup = await readBackup(
      deviceA.helper,
      await deviceA.helper.buildExportZIP(),
    );

    for (const key of LOCAL_ONLY_STORAGE_KEYS) {
      expect(Object.keys(backup)).not.toContain(key);
    }
    expect(JSON.stringify(backup)).not.toContain('a-device-id');
    expect(backup.SETTINGS[0].user).toEqual(userProfile());
    expect(backup.BREWS).toEqual(entries('brew', 3));
    expect(backup.BEANS).toEqual(entries('bean', 2));
    // The device itself keeps its values.
    expect(deviceA.data.get(DEVICE_STORAGE_KEY)).toEqual(
      localValues('a')[DEVICE_STORAGE_KEY],
    );
  });

  it('are kept on the device that imports a backup', async () => {
    const deviceA = await startDevice({
      ...localValues('a'),
      SETTINGS: [{ language: 'de', user: userProfile() }],
      BREWS: entries('brew', 3),
    });
    const zip = await deviceA.helper.buildExportZIP();

    const deviceB = await startDevice({
      ...localValues('b'),
      SETTINGS: [{ language: 'en' }],
    });
    const result = await deviceB.uiStorage.import(
      await readBackup(deviceB.helper, zip),
    );

    expect(result).toEqual({ BACKUP: false });
    for (const key of LOCAL_ONLY_STORAGE_KEYS) {
      expect(deviceB.data.get(key)).toEqual(localValues('b')[key]);
    }
    expect(deviceB.data.get('BREWS')).toEqual(entries('brew', 3));
    expect((deviceB.data.get('SETTINGS') as any[])[0].user).toEqual(
      userProfile(),
    );
  });

  it('are never overwritten by a backup file that contains them', async () => {
    const deviceB = await startDevice({
      ...localValues('b'),
      SETTINGS: [{ language: 'en' }],
    });

    await deviceB.uiStorage.import({
      ...localValues('manipulated'),
      SETTINGS: [{ language: 'de' }],
      BREWS: entries('brew', 2),
    });

    for (const key of LOCAL_ONLY_STORAGE_KEYS) {
      expect(deviceB.data.get(key)).toEqual(localValues('b')[key]);
    }
    expect(deviceB.data.get('BREWS')).toEqual(entries('brew', 2));
    expect((deviceB.data.get('SETTINGS') as any[])[0].language).toBe('de');
  });

  it('are not touched when a failed import writes the safety backup back', async () => {
    const deviceB = await startDevice({
      ...localValues('b'),
      SETTINGS: [{ language: 'en' }],
      BREWS: entries('own-brew', 2),
    });
    deviceB.failingWrites.add('BREWS');

    const result = await deviceB.uiStorage.import({
      SETTINGS: [{ language: 'de' }],
      BREWS: entries('brew', 2),
    });

    expect(result).toEqual({ BACKUP: true });
    expect(deviceB.data.get('BREWS')).toEqual(entries('own-brew', 2));
    expect((deviceB.data.get('SETTINGS') as any[])[0].language).toBe('en');
    for (const key of LOCAL_ONLY_STORAGE_KEYS) {
      expect(deviceB.data.get(key)).toEqual(localValues('b')[key]);
    }
  });

  it('gives settings imported from a backup without a user profile the advanced mode', async () => {
    const legacySettings = JSON.parse(JSON.stringify(new Settings()));
    Reflect.deleteProperty(legacySettings, 'user');
    const deviceB = await startDevice({ ...localValues('b') });

    await deviceB.uiStorage.import({
      SETTINGS: [legacySettings],
      BREWS: entries('brew', 2),
    });
    const settings = new Settings();
    settings.initializeByObject(
      (deviceB.data.get('SETTINGS') as any[])[0] as Settings,
    );

    expect(settings.user.experience_mode).toBe(EXPERIENCE_MODE_ENUM.ADVANCED);
  });

  it('do not trigger the automatic backup when they are written', async () => {
    const device = createDeviceDatabase({});
    const dispatch = jasmine.createSpy('dispatch');
    configure(device.database, dispatch);
    const uiStorage = TestBed.inject(UIStorage);
    await uiStorage.init();

    for (const key of LOCAL_ONLY_STORAGE_KEYS) {
      await uiStorage.set(key, { written: key });
    }
    expect(dispatch).not.toHaveBeenCalled();
    expect(device.data.get(DEVICE_STORAGE_KEY)).toEqual({
      written: DEVICE_STORAGE_KEY,
    });

    await uiStorage.set('BREWS', []);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.calls.mostRecent().args[0].type).toBe(
      AppEventType.STORAGE_CHANGED,
    );
  });
});

describe('UIStorage reading a value', () => {
  function brokenDatabase() {
    return {
      get: jasmine
        .createSpy('get')
        .and.callFake(() => Promise.reject(new Error('database broken'))),
    };
  }

  async function startWith(database: object): Promise<UIStorage> {
    configure(database);
    const uiStorage = TestBed.inject(UIStorage);
    // The alert itself is not part of these tests.
    spyOn(uiStorage as any, 'displayIOSIndexedDBIssue').and.resolveTo();
    await uiStorage.init();
    return uiStorage;
  }

  it('resolves get() with null but rejects getOrFail() when reading fails', fakeAsync(() => {
    const database = brokenDatabase();
    let uiStorage: UIStorage;
    startWith(database).then((_storage) => (uiStorage = _storage));
    flush();

    let viaGet: unknown = 'pending';
    uiStorage.get(DEVICE_STORAGE_KEY).then((_value: unknown) => {
      viaGet = _value;
    });
    flush();
    let viaGetOrFail: unknown = 'pending';
    uiStorage.getOrFail(DEVICE_STORAGE_KEY).then(
      () => (viaGetOrFail = 'resolved'),
      () => (viaGetOrFail = 'rejected'),
    );
    flush();

    expect(viaGet).toBeNull();
    expect(viaGetOrFail).toBe('rejected');
    expect(database.get).toHaveBeenCalledTimes(40);
  }));

  it('resolves getOrFail() with null when the value is missing', async () => {
    const device = createDeviceDatabase({});
    const uiStorage = await startWith(device.database);

    expect(await uiStorage.getOrFail(DEVICE_STORAGE_KEY)).toBeNull();
  });
});
