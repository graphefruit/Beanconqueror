import { TestBed } from '@angular/core/testing';

import { Storage } from '@ionic/storage';

import { Settings } from '../../classes/settings/settings';
import { EXPERIENCE_MODE_ENUM } from '../../enums/settings/experienceMode';
import { IUserProfile } from '../../interfaces/settings/iUserProfile';
import { createLegacyData } from '../../test-utils/legacy-data-fixture';
import { EventQueueService } from '../queueService/queue-service.service';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';

/** Behaves like IndexedDB: values are copied when written and read. */
function createDeviceDatabase(initial: Record<string, unknown> = {}) {
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

async function startApp(_device: Device) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      {
        provide: Storage,
        useValue: { create: () => Promise.resolve(_device.database) },
      },
      { provide: EventQueueService, useValue: { dispatch: () => undefined } },
      {
        provide: UILog,
        useValue: {
          log: () => undefined,
          info: () => undefined,
          error: () => undefined,
          debug: () => undefined,
        },
      },
    ],
  });
  const uiStorage = TestBed.inject(UIStorage);
  await uiStorage.init();
  const settingsStorage = TestBed.inject(UISettingsStorage);
  await settingsStorage.initializeStorage();
  await settingsStorage.storageReady();
  return { uiStorage, settingsStorage };
}

/** Imports the backup and reads the settings again, as the app does. */
async function importBackup(
  _app: Awaited<ReturnType<typeof startApp>>,
  _backup: Record<string, unknown>,
): Promise<void> {
  expect(await _app.uiStorage.import(_backup)).toEqual({ BACKUP: false });
  await _app.settingsStorage.reinitializeStorage();
}

function storedUser(_device: Device): IUserProfile {
  return (_device.data.get('SETTINGS') as { user: IUserProfile }[])[0].user;
}

/** Settings of a backup made by an app version with the user profile. */
function settingsWithUser(_user: IUserProfile): Record<string, unknown> {
  const settings = JSON.parse(JSON.stringify(new Settings())) as Record<
    string,
    unknown
  >;
  settings.user = _user;
  return settings;
}

describe('Experience mode after restoring a backup', () => {
  afterEach(() => {
    UISettingsStorage.instance = undefined;
  });

  it('starts a new installation without import in the beginner mode and without the note', async () => {
    const device = createDeviceDatabase();

    const app = await startApp(device);

    expect(app.settingsStorage.getSettings().user.experience_mode).toBe(
      EXPERIENCE_MODE_ENUM.BEGINNER,
    );
    expect(app.settingsStorage.isModeHintPending()).toBeFalse();
    expect(storedUser(device).mode_hint_pending).toBeFalse();
  });

  it('gives a backup without a user profile the advanced mode with the note pending', async () => {
    const device = createDeviceDatabase();
    const app = await startApp(device);

    await importBackup(app, createLegacyData({ brews: 3, beans: 2 }));

    expect(app.settingsStorage.getSettings().user.experience_mode).toBe(
      EXPERIENCE_MODE_ENUM.ADVANCED,
    );
    expect(app.settingsStorage.isModeHintPending()).toBeTrue();
    // Written into the stored settings, not only derived when reading them.
    expect(storedUser(device).experience_mode).toBe(
      EXPERIENCE_MODE_ENUM.ADVANCED,
    );
    expect(storedUser(device).mode_hint_pending).toBeTrue();
  });

  it('keeps the beginner mode a backup brings along', async () => {
    const device = createDeviceDatabase();
    const app = await startApp(device);
    const user: IUserProfile = {
      experience_mode: EXPERIENCE_MODE_ENUM.BEGINNER,
      nickname: 'Kim',
      whats_new_seen: '9.0.0',
      mode_hint_pending: false,
    };

    await importBackup(app, { SETTINGS: [settingsWithUser(user)] });

    expect(app.settingsStorage.getSettings().user).toEqual(user);
    expect(storedUser(device)).toEqual(user);
  });

  it('keeps the note shown when the backup was made after it', async () => {
    const device = createDeviceDatabase();
    const app = await startApp(device);
    const user: IUserProfile = {
      experience_mode: EXPERIENCE_MODE_ENUM.ADVANCED,
      nickname: '',
      whats_new_seen: '',
      mode_hint_pending: false,
    };

    await importBackup(app, { SETTINGS: [settingsWithUser(user)] });

    expect(app.settingsStorage.getSettings().user).toEqual(user);
    expect(app.settingsStorage.isModeHintPending()).toBeFalse();
  });

  it('gives a backup with data but without settings the advanced mode with the note pending', async () => {
    const device = createDeviceDatabase();
    const app = await startApp(device);
    const legacy = createLegacyData({ brews: 3, beans: 2 });

    await importBackup(app, { SETTINGS: [], BREWS: legacy.BREWS });

    expect(app.settingsStorage.getSettings().user.experience_mode).toBe(
      EXPERIENCE_MODE_ENUM.ADVANCED,
    );
    expect(storedUser(device).mode_hint_pending).toBeTrue();
  });

  it('does not show the note again once it was shown', async () => {
    const device = createDeviceDatabase();
    const app = await startApp(device);
    await importBackup(app, createLegacyData({ brews: 3, beans: 2 }));

    expect(await app.settingsStorage.markModeHintShown()).toBeTrue();

    expect(app.settingsStorage.isModeHintPending()).toBeFalse();
    expect(storedUser(device).mode_hint_pending).toBeFalse();
    expect(storedUser(device).experience_mode).toBe(
      EXPERIENCE_MODE_ENUM.ADVANCED,
    );
    const restarted = await startApp(device);
    expect(restarted.settingsStorage.isModeHintPending()).toBeFalse();
  });

  it('keeps the note pending when it cannot be stored as shown', async () => {
    const device = createDeviceDatabase();
    const app = await startApp(device);
    await importBackup(app, createLegacyData({ brews: 3, beans: 2 }));
    spyOn(app.settingsStorage, 'saveSettings').and.resolveTo(false);

    expect(await app.settingsStorage.markModeHintShown()).toBeFalse();

    expect(app.settingsStorage.isModeHintPending()).toBeTrue();
    expect(storedUser(device).mode_hint_pending).toBeTrue();
  });
});
