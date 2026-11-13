import { TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular/standalone';
import { Storage } from '@ionic/storage';

import { BlobReader, ZipReader } from '@zip.js/zip.js';

import { CHANGE_TRACKED_COLLECTIONS } from '../../classes/changeTracking/changeTracking';
import { createLegacyData } from '../../test-utils/legacy-data-fixture';
import { EventQueueService } from '../queueService/queue-service.service';
import { UIAlert } from '../uiAlert';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIExportImportHelper } from '../uiExportImportHelper';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';

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
  const uiStorage = TestBed.inject(UIStorage);
  await uiStorage.init();
  return {
    ...device,
    uiStorage,
    helper: TestBed.inject(UIExportImportHelper),
  };
}

async function exportBackup(_data: Record<string, unknown>) {
  const source = await startDevice(_data);
  const zip = await source.helper.buildExportZIP();
  const reader = new ZipReader(new BlobReader(zip));
  const fileCount = (await reader.getEntries()).length;
  await reader.close();
  const backup = await source.helper.getJSONFromZIPArrayBufferContent(
    await zip.arrayBuffer(),
  );
  return { backup, fileCount };
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

describe('Importing a backup fills in missing change info', () => {
  it('fills in all entries of a backup made without change info', async () => {
    const legacy = createLegacyData();
    const { backup, fileCount } = await exportBackup(legacy);
    // Large collections are split across several files.
    expect(fileCount).toBeGreaterThan(1);

    const target = await startDevice({});
    expect(await target.uiStorage.import(backup)).toEqual({ BACKUP: false });

    for (const collection of CHANGE_TRACKED_COLLECTIONS) {
      const stored = target.data.get(collection) as any[];
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
      expect(withoutChangeInfo(stored))
        .withContext(collection)
        .toEqual(legacy[collection]);
    }
    // The version state comes from the backup as before.
    expect(target.data.get('VERSION')).toEqual(legacy.VERSION);
    expect(target.data.get('SETTINGS')).toEqual(legacy.SETTINGS);
  });

  it('keeps the change info a backup brings along', async () => {
    const data = createLegacyData({ brews: 600 });
    data.BREWS.forEach((_brew: any, i: number) => {
      _brew.config.created_at = 1_000 + i;
      _brew.config.updated_at = 2_000 + i;
      _brew.config.rev = 3 + i;
      _brew.config.updated_by = 'device-a';
    });
    // Added by an app version that did not know the change info yet.
    const untracked = data.BREWS[0];
    for (const field of CHANGE_INFO_FIELDS) {
      delete untracked.config[field];
    }
    const { backup } = await exportBackup(data);

    const target = await startDevice({});
    await target.uiStorage.import(backup);

    const stored = target.data.get('BREWS') as any[];
    stored.slice(1).forEach((_brew, i) => {
      expect(_brew.config).toEqual(data.BREWS[i + 1].config);
    });
    expect(stored[0].config).toEqual({
      ...untracked.config,
      created_at: untracked.config.unix_timestamp * 1000,
      updated_at: 0,
      rev: 0,
      updated_by: '',
    });
  });
});
