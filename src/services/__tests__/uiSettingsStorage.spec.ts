import { TestBed } from '@angular/core/testing';

import { EXPERIENCE_MODE_ENUM } from '../../enums/settings/experienceMode';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';

function entries(prefix: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    config: { uuid: `${prefix}-${i}`, unix_timestamp: 1600000000 + i },
    note: `${prefix} ${i}`,
  }));
}

/** Stands in for UIStorage; values are copied like IndexedDB does. */
function createStorage(initial: Record<string, unknown> = {}) {
  const data = new Map<string, unknown>(
    Object.entries(structuredClone(initial)),
  );
  const storage = {
    data,
    failingReads: new Set<string>(),
    get: (key: string) =>
      Promise.resolve(data.has(key) ? structuredClone(data.get(key)) : null),
    getOrFail: (key: string) =>
      storage.failingReads.has(key)
        ? Promise.reject(new Error('read failed'))
        : Promise.resolve(
            data.has(key) ? structuredClone(data.get(key)) : null,
          ),
    set: (key: string, value: unknown) => {
      data.set(key, structuredClone(value));
      return Promise.resolve(true);
    },
  };
  return storage;
}

async function startSettingsStorage(
  storage: ReturnType<typeof createStorage>,
): Promise<UISettingsStorage> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      UISettingsStorage,
      { provide: UIStorage, useValue: storage },
      {
        provide: UILog,
        useValue: {
          log: () => undefined,
          info: () => undefined,
          error: () => undefined,
        },
      },
    ],
  });
  const settingsStorage = TestBed.inject(UISettingsStorage);
  await settingsStorage.initializeStorage();
  await settingsStorage.storageReady();
  return settingsStorage;
}

function storedExperienceMode(
  storage: ReturnType<typeof createStorage>,
): string {
  const stored = storage.data.get('SETTINGS') as {
    user: { experience_mode: string };
  }[];
  return stored[0].user.experience_mode;
}

describe('UISettingsStorage experience mode for created settings', () => {
  afterEach(() => {
    UISettingsStorage.instance = undefined;
  });

  it('stores the beginner mode on a new installation', async () => {
    const storage = createStorage({
      VERSION: [{ updatedDataVersions: [] }],
    });

    const settingsStorage = await startSettingsStorage(storage);

    expect(settingsStorage.getSettings().user.experience_mode).toBe(
      EXPERIENCE_MODE_ENUM.BEGINNER,
    );
    expect(storedExperienceMode(storage)).toBe(EXPERIENCE_MODE_ENUM.BEGINNER);
  });

  it('keeps the advanced mode when only the settings are missing', async () => {
    const storage = createStorage({
      BREWS: entries('brew', 1203),
      BEANS: entries('bean', 40),
    });

    const settingsStorage = await startSettingsStorage(storage);

    expect(settingsStorage.getSettings().user.experience_mode).toBe(
      EXPERIENCE_MODE_ENUM.ADVANCED,
    );
    expect(storedExperienceMode(storage)).toBe(EXPERIENCE_MODE_ENUM.ADVANCED);
  });

  it('keeps the advanced mode when data updates already ran', async () => {
    const storage = createStorage({
      VERSION: [{ updatedDataVersions: ['UPDATE_1', 'UPDATE_2'] }],
    });

    const settingsStorage = await startSettingsStorage(storage);

    expect(settingsStorage.getSettings().user.experience_mode).toBe(
      EXPERIENCE_MODE_ENUM.ADVANCED,
    );
  });

  it('keeps the advanced mode when existing data cannot be read', async () => {
    const storage = createStorage();
    storage.failingReads.add('BREWS');

    const settingsStorage = await startSettingsStorage(storage);

    expect(settingsStorage.getSettings().user.experience_mode).toBe(
      EXPERIENCE_MODE_ENUM.ADVANCED,
    );
  });

  it('does the same when the storage is initialized again', async () => {
    const storage = createStorage();
    const settingsStorage = await startSettingsStorage(storage);
    storage.data.delete('SETTINGS');
    storage.data.set('BREWS', entries('brew', 3));

    await settingsStorage.reinitializeStorage();

    expect(settingsStorage.getSettings().user.experience_mode).toBe(
      EXPERIENCE_MODE_ENUM.ADVANCED,
    );
    expect(storedExperienceMode(storage)).toBe(EXPERIENCE_MODE_ENUM.ADVANCED);
  });

  it('leaves stored settings with a profile as they are', async () => {
    const storage = createStorage({
      SETTINGS: [
        {
          user: {
            experience_mode: EXPERIENCE_MODE_ENUM.BEGINNER,
            nickname: '',
            whats_new_seen: '',
          },
        },
      ],
      BREWS: entries('brew', 3),
    });

    const settingsStorage = await startSettingsStorage(storage);

    expect(settingsStorage.getSettings().user.experience_mode).toBe(
      EXPERIENCE_MODE_ENUM.BEGINNER,
    );
  });
});
