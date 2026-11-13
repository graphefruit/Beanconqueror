import { TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular/standalone';
import { Storage } from '@ionic/storage';

import {
  createLegacyData,
  LEGACY_DUPLICATE_BREW_UUID,
} from '../../test-utils/legacy-data-fixture';
import { EventQueueService } from '../queueService/queue-service.service';
import { UIAlert } from '../uiAlert';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIExportImportHelper } from '../uiExportImportHelper';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';

type StoredEntry = Record<string, any>;

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

async function startDevice(initial: Record<string, unknown>) {
  const device = createDeviceDatabase(initial);
  const log = jasmine.createSpy('log');
  const error = jasmine.createSpy('error');
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      UIExportImportHelper,
      UIStorage,
      {
        provide: Storage,
        useValue: { create: () => Promise.resolve(device.database) },
      },
      { provide: EventQueueService, useValue: { dispatch: () => undefined } },
      {
        provide: UIHelper,
        useValue: { cloneData: <T>(v: T): T => structuredClone(v) },
      },
      { provide: Platform, useValue: { is: () => false } },
      {
        provide: UILog,
        useValue: {
          log,
          info: () => undefined,
          error,
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
  const uiStorage = TestBed.inject(UIStorage);
  await uiStorage.init();
  return {
    ...device,
    log,
    error,
    uiStorage,
    helper: TestBed.inject(UIExportImportHelper),
  };
}

/** Writes the data into a backup file and reads it back, like an import. */
async function exportBackup(
  _data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const source = await startDevice(_data);
  const zip = await source.helper.buildExportZIP();
  const backup: Record<string, unknown> =
    await source.helper.getJSONFromZIPArrayBufferContent(
      await zip.arrayBuffer(),
    );
  return backup;
}

function uuids(_entries: StoredEntry[]): string[] {
  return _entries.map((_entry) => _entry.config.uuid as string);
}

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * A backup of an older app version: the identical brews of the legacy data
 * (spread over several backup files), a differing copy of bean-1, which the
 * brews refer to, and a differing copy of mill-1, which nothing refers to.
 */
function createBackupData(): Record<string, any> {
  const data = createLegacyData({ brews: 600, beans: 4 });
  data.BEANS.push({ ...structuredClone(data.BEANS[1]), note: 'differing' });
  data.MILL.push({ ...structuredClone(data.MILL[1]), note: 'differing' });
  return data;
}

describe('Importing a backup cleans up entries that share a uuid', () => {
  it('removes identical copies and keeps or renames differing ones', async () => {
    const data = createBackupData();
    const backup = await exportBackup(data);

    const target = await startDevice({});
    expect(await target.uiStorage.import(backup)).toEqual({ BACKUP: false });

    const brews = target.data.get('BREWS') as StoredEntry[];
    const copy = uuids(data.BREWS).lastIndexOf(LEGACY_DUPLICATE_BREW_UUID);
    expect(uuids(brews)).toEqual(
      uuids(data.BREWS.filter((_brew: StoredEntry, i: number) => i !== copy)),
    );
    // Brews refer to bean-1, so its copies stay as they are.
    expect(uuids(target.data.get('BEANS') as StoredEntry[])).toEqual(
      uuids(data.BEANS),
    );
    const mills = target.data.get('MILL') as StoredEntry[];
    expect(uuids(mills.slice(0, 2))).toEqual(['mill-0', 'mill-1']);
    expect(mills[2].config.uuid).toMatch(UUID_V4);
    expect(mills[2].note).toBe('differing');
    // Not change tracked, so not cleaned.
    expect(target.data.get('SETTINGS')).toEqual(data.SETTINGS);
  });

  it('logs what it did', async () => {
    const backup = await exportBackup(createBackupData());
    const target = await startDevice({});

    await target.uiStorage.import(backup);

    const messages = target.log.calls
      .allArgs()
      .map((_args) => _args[0] as string);
    expect(messages).toContain(
      'UIStorage - Backup - Duplicate entries in BREWS - shared uuids: 1, identical copies removed: 1, new uuids: 0, kept: 0',
    );
    expect(messages).toContain(
      'UIStorage - Backup - Duplicate entries in BEANS - bean-1 - differing copies kept, the uuid is referenced',
    );
    expect(
      messages.some((_message) =>
        _message.startsWith(
          'UIStorage - Backup - Duplicate entries in MILL - mill-1 - differing copy got the uuid ',
        ),
      ),
    ).toBeTrue();
  });

  it('imports a backup without copies unchanged', async () => {
    const data = createLegacyData({ brews: 20, beans: 4 });
    data.BREWS = data.BREWS.filter(
      (_brew: StoredEntry, i: number) =>
        i !== uuids(data.BREWS).lastIndexOf(LEGACY_DUPLICATE_BREW_UUID),
    );
    const backup = await exportBackup(data);
    const target = await startDevice({});

    await target.uiStorage.import(backup);

    for (const collection of ['BEANS', 'BREWS', 'MILL']) {
      expect(uuids(target.data.get(collection) as StoredEntry[]))
        .withContext(collection)
        .toEqual(uuids(data[collection]));
    }
  });

  it('goes on with the import when the cleanup fails', async () => {
    const data = createBackupData();
    const backup = await exportBackup(data);
    const target = await startDevice({});
    // The copy of mill-1 cannot get a new uuid.
    spyOn(crypto, 'randomUUID').and.throwError('no uuid');

    expect(await target.uiStorage.import(backup)).toEqual({ BACKUP: false });

    // Collections cleaned before the failure stay cleaned, the failed one
    // is imported as it is.
    expect((target.data.get('BREWS') as StoredEntry[]).length).toBe(
      data.BREWS.length - 1,
    );
    expect(uuids(target.data.get('MILL') as StoredEntry[])).toEqual([
      'mill-0',
      'mill-1',
      'mill-1',
    ]);
    expect(target.error).toHaveBeenCalledWith(
      'UIStorage - Backup - Duplicate entries not cleaned',
      jasmine.any(Error),
    );
  });
});
