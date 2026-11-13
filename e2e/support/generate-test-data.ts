/**
 * Writes a synthetic backup ZIP for manual tests and device measurements.
 *
 *   node e2e/support/generate-test-data.ts --brews 15000 [--seed 1] [--end-date 2026-11-01]
 *        [--beans 1000] [--file-references] [--out dist/test-data/<name>.zip]
 *
 * Without --end-date the data ends at the current full hour, so it looks current after an import.
 * The same options (including the end date) always produce the same data, and on the same machine
 * the same file: the ZIP entries are dated at the end date.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';

import { buildBackupZip } from './backup-zip.ts';
import { generateDataSet } from './synthetic-data.ts';

const { values } = parseArgs({
  options: {
    brews: { type: 'string', default: '15000' },
    beans: { type: 'string', default: '1000' },
    seed: { type: 'string', default: '1' },
    'end-date': { type: 'string' },
    'file-references': { type: 'boolean', default: false },
    out: { type: 'string' },
  },
});

function toInteger(name: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`--${name} must be a non-negative integer, got "${value}"`);
  }
  return parsed;
}

const brews = toInteger('brews', values.brews);
const seed = toInteger('seed', values.seed);
const endDate = values['end-date']
  ? new Date(values['end-date'])
  : new Date(new Date().setMinutes(0, 0, 0));
if (Number.isNaN(endDate.getTime())) {
  throw new Error(`--end-date is not a date: "${values['end-date']}"`);
}

const data = generateDataSet({
  brews,
  beans: toInteger('beans', values.beans),
  seed,
  endDate,
  fileReferences: values['file-references'],
});
const zip = await buildBackupZip(data, endDate);
const out =
  values.out ?? `dist/test-data/Beanconqueror-${brews}-brews-seed-${seed}.zip`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, zip);

// Brews are stored oldest first.
const lastBrew = data.BREWS.at(-1);
console.log(
  `${out}: ${data.BREWS.length} brews, ${data.BEANS.length} beans ` +
    `(${data.BEANS.filter((b) => b.finished).length} archived), ` +
    (lastBrew
      ? `last brew ${new Date(lastBrew.config.unix_timestamp * 1000).toISOString()}, `
      : '') +
    `${(zip.length / 1024 / 1024).toFixed(1)} MB`,
);
