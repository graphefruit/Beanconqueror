import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { createBackupZip } from './support/backup-file';
import { startWithFirstBrew } from './support/first-brew';
import { readStoredValue } from './support/stored-values';

/**
 * An import replaces all data. It asks first and says what happens to the
 * current data. In the app that data is saved into a backup file first; the
 * browser has no file system, so no file is written there and the import
 * still runs.
 */

interface StoredEntry {
  name?: string;
  config: Record<string, unknown>;
}

interface StoredRestoreNote {
  last_restore_at: number;
  source: string;
  record_count: number;
  file_name?: string;
}

const IMPORTED_BEAN_NAME = 'Kenya Gatomboya AA';

/** Collections of entries that the first run filled. */
const ENTRY_COLLECTIONS = ['BEANS', 'PREPARATION', 'MILL', 'BREWS'];

/**
 * A backup of the data the first run stored, with the bean renamed, and the
 * number of entries in it. The settings hold no analytics choice, so the app
 * asks for it after the import, as for a backup of an older version.
 * `_change` changes the data further.
 */
async function backupOfStoredData(
  page: Page,
  _change: (data: Record<string, unknown[]>) => void = () => undefined,
): Promise<{ zip: Buffer; entryCount: number }> {
  const data: Record<string, unknown[]> = {};
  for (const key of ['SETTINGS', 'VERSION', ...ENTRY_COLLECTIONS]) {
    data[key] = (await readStoredValue<unknown[]>(page, key)) ?? [];
  }
  const [settings] = data.SETTINGS as { matomo_analytics?: boolean }[];
  delete settings.matomo_analytics;
  const [bean] = data.BEANS as StoredEntry[];
  bean.name = IMPORTED_BEAN_NAME;
  const entryCount = ENTRY_COLLECTIONS.reduce(
    (_count, _key) => _count + data[_key].length,
    0,
  );
  _change(data);
  return { zip: createBackupZip(data), entryCount };
}

/** Opens the settings from the profile and picks `zip` for the import. */
async function chooseFileToImport(page: Page, zip: Buffer): Promise<void> {
  await page
    .getByRole('tablist')
    .filter({ has: page.getByRole('tab', { name: 'Home', exact: true }) })
    .getByRole('tab', { name: 'Profile' })
    .click();
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);

  const fileChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await (
    await fileChooser
  ).setFiles({
    name: 'Beanconqueror.zip',
    mimeType: 'application/zip',
    buffer: zip,
  });
}

function importQuestion(page: Page) {
  return page.getByRole('alertdialog', {
    name: 'Replace all data with the import?',
  });
}

/** Confirms the import and closes the messages that follow it. */
async function confirmImport(page: Page): Promise<void> {
  await importQuestion(page).getByRole('button', { name: 'Yes' }).click();
  await page
    .getByRole('alertdialog')
    .filter({ hasText: 'Import successful' })
    .getByRole('button', { name: 'Ok' })
    .click();
  await page.getByRole('button', { name: "Don't activate" }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await startWithFirstBrew(page);
});

test('an import asks first and says that the browser saves no backup', async ({
  page,
}) => {
  const { zip } = await backupOfStoredData(page);
  const beansBefore = await readStoredValue<StoredEntry[]>(page, 'BEANS');

  await chooseFileToImport(page, zip);

  const question = importQuestion(page);
  await expect(question).toBeVisible();
  await expect(question).toContainText(
    'In the browser, no backup of your current data is saved first.',
  );
  await question.getByRole('button', { name: 'No' }).click();
  await expect(question).toBeHidden();

  // Declined: nothing was imported.
  expect(await readStoredValue(page, 'BEANS')).toEqual(beansBefore);
  expect(await readStoredValue(page, 'LAST_RESTORE')).toBeNull();
});

test('in the browser the import runs without a backup file', async ({
  page,
  native,
}) => {
  const { zip, entryCount } = await backupOfStoredData(page);
  const [beanBefore] =
    (await readStoredValue<StoredEntry[]>(page, 'BEANS')) ?? [];

  await chooseFileToImport(page, zip);
  const started = Date.now();
  await confirmImport(page);

  const [bean] = (await readStoredValue<StoredEntry[]>(page, 'BEANS')) ?? [];
  expect(bean.name).toBe(IMPORTED_BEAN_NAME);
  // Imported entries keep the change info they came with.
  expect(bean.config).toEqual(beanBefore.config);
  const note = await readStoredValue<StoredRestoreNote>(page, 'LAST_RESTORE');
  expect(note).toEqual({
    last_restore_at: expect.any(Number),
    source: 'import',
    record_count: entryCount,
    file_name: 'Beanconqueror.zip',
  });
  expect(note!.last_restore_at).toBeGreaterThanOrEqual(started);
  // No file was written. Console errors fail the test (see fixtures.ts).
  const fileCalls = (await native.calls()).filter(
    (_call) => _call.plugin === 'Filesystem',
  );
  expect(fileCalls).toEqual([]);
});

interface StoredSettings {
  bluetooth_ignore_anomaly_values: boolean;
  bluetooth_ignore_negative_values: boolean;
}

test('an import runs the data updates that a backup of an older version has not done', async ({
  page,
}) => {
  const updates = (_count: number) =>
    Array.from({ length: _count }, (_, i) => `UPDATE_${i + 1}`);
  // Before UPDATE_12, which turns these filters of the scale off.
  const { zip } = await backupOfStoredData(page, (_data) => {
    const [settings] = _data.SETTINGS as StoredSettings[];
    settings.bluetooth_ignore_anomaly_values = true;
    settings.bluetooth_ignore_negative_values = true;
    const [version] = _data.VERSION as { updatedDataVersions: string[] }[];
    version.updatedDataVersions = updates(11);
  });

  await chooseFileToImport(page, zip);
  await confirmImport(page);

  const [settings] =
    (await readStoredValue<StoredSettings[]>(page, 'SETTINGS')) ?? [];
  expect(settings.bluetooth_ignore_anomaly_values).toBe(false);
  expect(settings.bluetooth_ignore_negative_values).toBe(false);
  const [version] =
    (await readStoredValue<{ updatedDataVersions: string[] }[]>(
      page,
      'VERSION',
    )) ?? [];
  expect(version.updatedDataVersions).toEqual(
    expect.arrayContaining(updates(19)),
  );
});

test.describe('a file that cannot be read', () => {
  // The cause is logged as well.
  test.use({ allowedConsoleErrors: [/^Error while importing ZIP on web:/] });

  test('is reported with its cause set apart below', async ({ page }) => {
    const beansBefore = await readStoredValue<StoredEntry[]>(page, 'BEANS');

    await chooseFileToImport(page, Buffer.from('no zip'));

    const alert = page
      .getByRole('alertdialog')
      .filter({ hasText: 'Error while reading file data' });
    await expect(alert).toBeVisible();
    const details = alert.locator('.alert-details');
    await expect(details.locator('p')).toHaveText(['Technical details:', /\S/]);
    // Screen readers hear the message first, then the details.
    await expect(alert).toHaveAccessibleDescription(
      /^Error while reading file data\s*Technical details:\s*\S/,
    );
    // Set apart: below the message, with a line above it.
    const message = await alert.locator('.alert-message').boundingBox();
    const section = await details.boundingBox();
    expect(section!.y).toBeGreaterThan(message!.y);
    await expect(details).not.toHaveCSS('border-top-style', 'none');

    await alert.getByRole('button', { name: 'Ok' }).click();
    await expect(alert).toBeHidden();
    expect(await readStoredValue(page, 'BEANS')).toEqual(beansBefore);
  });
});

test.describe('a file that is no backup', () => {
  test.use({ allowedConsoleErrors: [/^Import - refused:/] });

  test('is refused before the question, with the reason set apart below', async ({
    page,
  }) => {
    const beansBefore = await readStoredValue<StoredEntry[]>(page, 'BEANS');

    await chooseFileToImport(
      page,
      createBackupZip({ recipes: [{ name: 'V60' }], version: 3 }),
    );

    const alert = page
      .getByRole('alertdialog')
      .filter({ hasText: 'This file is not a BeanConqueror backup.' });
    await expect(alert).toBeVisible();
    await expect(alert).toHaveAccessibleDescription(
      /^This file is not a BeanConqueror backup\. Nothing was imported, your data is unchanged\..*Technical details:\s*The file holds no list SETTINGS, BEANS, BREWS$/,
    );
    await expect(importQuestion(page)).toHaveCount(0);

    await alert.getByRole('button', { name: 'Ok' }).click();
    await expect(alert).toBeHidden();
    expect(await readStoredValue(page, 'BEANS')).toEqual(beansBefore);
    expect(await readStoredValue(page, 'LAST_RESTORE')).toBeNull();
  });
});
