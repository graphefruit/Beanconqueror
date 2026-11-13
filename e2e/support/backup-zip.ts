import { BlobWriter, configure, TextReader, ZipWriter } from '@zip.js/zip.js';

import type { SyntheticDataSet } from './synthetic-data.ts';

/**
 * Same layout as `UIExportImportHelper.buildExportZIP()` (src/services/uiExportImportHelper.ts):
 * the first chunk of each large collection stays in Beanconqueror.json, the rest goes into
 * numbered files. The app's import reads both layouts, but a backup from the app looks like this.
 */
const MAIN_FILE = 'Beanconqueror.json';
const CHUNKS = [
  { key: 'BREWS', fileName: 'Brews', size: 500 },
  { key: 'BEANS', fileName: 'Beans', size: 500 },
  { key: 'BARISTAMODE_BREWS', fileName: 'Baristamode', size: 250 },
] as const;

/** Builds a backup ZIP that the app imports under Settings > Import. */
export async function buildBackupZip(data: SyntheticDataSet): Promise<Buffer> {
  // Node has no web workers; compression runs on the calling thread.
  configure({ useWebWorkers: false });

  const main: Record<string, unknown> = { ...data };
  const chunkFiles: { name: string; content: unknown[] }[] = [];
  for (const chunk of CHUNKS) {
    const entries: unknown[] = data[chunk.key];
    main[chunk.key] = entries.slice(0, chunk.size);
    for (let i = chunk.size, n = 1; i < entries.length; i += chunk.size, n++) {
      chunkFiles.push({
        name: `Beanconqueror_${chunk.fileName}_${n}.json`,
        content: entries.slice(i, i + chunk.size),
      });
    }
  }

  const writer = new ZipWriter(new BlobWriter('application/zip'));
  await writer.add(MAIN_FILE, new TextReader(JSON.stringify(main)));
  for (const file of chunkFiles) {
    await writer.add(file.name, new TextReader(JSON.stringify(file.content)));
  }
  const blob = await writer.close();
  return Buffer.from(await blob.arrayBuffer());
}
