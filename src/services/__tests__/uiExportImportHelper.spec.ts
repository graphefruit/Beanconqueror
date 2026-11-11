import { TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular/standalone';

import { BlobReader, ZipReader } from '@zip.js/zip.js';

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

describe('UIExportImportHelper backup round trip', () => {
  let helper: UIExportImportHelper;
  let storedData: Record<string, unknown>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UIExportImportHelper,
        {
          provide: UIStorage,
          useValue: { export: () => Promise.resolve(storedData) },
        },
        {
          provide: UIHelper,
          useValue: { cloneData: <T>(v: T): T => structuredClone(v) },
        },
        { provide: Platform, useValue: { is: () => false } },
        {
          provide: UILog,
          useValue: { log: () => undefined, error: () => undefined },
        },
        { provide: UISettingsStorage, useValue: {} },
        { provide: UIFileHelper, useValue: {} },
        { provide: UIAlert, useValue: {} },
        { provide: UIBrewStorage, useValue: {} },
        { provide: ModalController, useValue: {} },
      ],
    });
    helper = TestBed.inject(UIExportImportHelper);
  });

  async function exportAndImport() {
    const zipBlob = await helper.buildExportZIP();
    const restored = await helper.getJSONFromZIPArrayBufferContent(
      await zipBlob.arrayBuffer(),
    );
    const reader = new ZipReader(new BlobReader(zipBlob));
    const fileNames = (await reader.getEntries()).map((e) => e.filename);
    await reader.close();
    return { restored, fileNames };
  }

  it('restores every brew, bean and barista brew of a large backup in the original order', async () => {
    storedData = {
      BREWS: entries('brew', 1203),
      BEANS: entries('bean', 501),
      BARISTAMODE_BREWS: entries('barista', 251),
      MILL: entries('mill', 3),
      SETTINGS: [{ language: 'en' }],
    };

    const { restored, fileNames } = await exportAndImport();

    expect(restored).toEqual(storedData);
    // Large collections are split across several files; a backup with only the main file would lose data.
    expect(fileNames.length).toBeGreaterThan(1);
  });

  it('keeps a small backup in a single file', async () => {
    storedData = {
      BREWS: entries('brew', 500),
      BEANS: entries('bean', 20),
      SETTINGS: [{ language: 'en' }],
    };

    const { restored, fileNames } = await exportAndImport();

    expect(restored).toEqual(storedData);
    expect(fileNames).toEqual(['Beanconqueror.json']);
  });
});
