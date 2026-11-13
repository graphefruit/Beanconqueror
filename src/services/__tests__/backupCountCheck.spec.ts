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
  };
}

/**
 * The app on a device storing `_stored`. `_backupFile` is its internal
 * backup file, which the check reads.
 */
async function startApp(
  _stored: Record<string, unknown>,
  _backupFile?: Uint8Array,
) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      UIExportImportHelper,
      UIStorage,
      {
        provide: Storage,
        useValue: {
          create: () => Promise.resolve(createDeviceDatabase(_stored)),
        },
      },
      { provide: EventQueueService, useValue: { dispatch: () => undefined } },
      {
        provide: UIHelper,
        useValue: { cloneData: <T>(v: T): T => structuredClone(v) },
      },
      // The internal backup is only checked in the app.
      {
        provide: Platform,
        useValue: { is: (_platform: string) => _platform === 'capacitor' },
      },
      {
        provide: UILog,
        useValue: {
          log: () => undefined,
          info: () => undefined,
          error: () => undefined,
          debug: () => undefined,
        },
      },
      {
        provide: UIFileHelper,
        useValue: {
          readInternalFileAsUint8Array: () => Promise.resolve(_backupFile),
        },
      },
      { provide: UISettingsStorage, useValue: {} },
      { provide: UIAlert, useValue: {} },
      { provide: UIBrewStorage, useValue: {} },
      { provide: ModalController, useValue: {} },
    ],
  });
  await TestBed.inject(UIStorage).init();
  const helper = TestBed.inject(UIExportImportHelper);
  const popover = spyOn(helper, 'showDataCorruptionPopover').and.resolveTo(
    false,
  );
  return { helper, popover };
}

/** The backup file a device storing `_data` writes. */
async function writeBackupFile(
  _data: Record<string, unknown>,
): Promise<Uint8Array> {
  const { helper } = await startApp(_data);
  return new Uint8Array(await (await helper.buildExportZIP()).arrayBuffer());
}

/** The legacy data with only the first of its two identical brews. */
function withoutDuplicateBrew(_data: Record<string, any>): Record<string, any> {
  const data = structuredClone(_data);
  const copy = (data.BREWS as StoredEntry[])
    .map((_brew) => _brew.config.uuid as string)
    .lastIndexOf(LEGACY_DUPLICATE_BREW_UUID);
  data.BREWS.splice(copy, 1);
  return data;
}

describe('Checking the internal backup at start-up', () => {
  it('does not take identical copies the device cleaned up for lost entries', async () => {
    const backup = createLegacyData({ brews: 600, beans: 4 });
    const backupFile = await writeBackupFile(backup);
    const { helper, popover } = await startApp(
      withoutDuplicateBrew(backup),
      backupFile,
    );

    await helper.checkBackup();

    expect(popover).not.toHaveBeenCalled();
  });

  it('still reports a backup with more entries than the device', async () => {
    const backup = createLegacyData({ brews: 600, beans: 4 });
    const backupFile = await writeBackupFile(backup);
    const stored = withoutDuplicateBrew(backup);
    stored.BREWS.pop();
    const { helper, popover } = await startApp(stored, backupFile);

    await helper.checkBackup();

    expect(popover).toHaveBeenCalledTimes(1);
    const [deviceCounts, backupData] = popover.calls.mostRecent().args;
    // The backup is counted as an import would store it.
    expect(backupData.BREWS.length).toBe(stored.BREWS.length + 1);
    expect(deviceCounts.BREWS).toBe(stored.BREWS.length);
  });
});
