import { expect, test, type Page } from '@playwright/test';

import { readStoredValue } from '../support/stored-values';
import {
  asEightEightData,
  generateDataSet,
  UPDATES_SINCE_8_8,
  type SyntheticDataSet,
} from '../support/synthetic-data';
import {
  APKS,
  closeApp,
  coldStart,
  installApp,
  instrument,
  seedRunningApp,
  uninstallApp,
  waitForStart,
} from './device';

/**
 * Update over the installed previous release, as from the store: the debug build of the last
 * release tag gets data as 8.8 stores it, then the new debug build is installed over it with
 * `adb install -r`. Afterwards every entry is still there and the WebView keeps its origin, else
 * the app would not find its database. Both builds must carry the same signature (the debug key).
 *
 *   DEVICE_APK_PREVIOUS=/path/to/app-debug.apk pnpm e2e:device update
 */

const PREVIOUS = process.env.DEVICE_APK_PREVIOUS;
const COLLECTIONS = ['BEANS', 'BREWS', 'MILL', 'PREPARATION', 'WATER'] as const;

type Inventory = Record<(typeof COLLECTIONS)[number], string[]>;

/** The uuids of each collection, sorted; 8.8 may store an entry twice. */
async function inventory(page: Page): Promise<Inventory> {
  const result = {} as Inventory;
  for (const key of COLLECTIONS) {
    const entries =
      (await readStoredValue<{ config: { uuid: string } }[]>(page, key)) ?? [];
    result[key] = [
      ...new Set(entries.map((entry) => entry.config.uuid)),
    ].sort();
  }
  return result;
}

test('an update over the previous release keeps the data and the origin', async () => {
  test.skip(
    PREVIOUS === undefined,
    'DEVICE_APK_PREVIOUS names no APK of the previous release',
  );
  test.setTimeout(15 * 60_000);
  const data: SyntheticDataSet = generateDataSet({
    brews: 300,
    beans: 40,
    endDate: new Date('2026-11-01T18:00:00Z'),
  });

  // A downgrade with `install -r` would fail; the previous release starts on fresh data.
  await uninstallApp();
  await installApp(PREVIOUS!);
  let app = await coldStart();
  await seedRunningApp(app.page, asEightEightData(data));
  await closeApp(app);

  app = await coldStart();
  const before = await inventory(app.page);
  // The home screen of the previous release counts the brews as stored.
  const stored = (await readStoredValue<unknown[]>(app.page, 'BREWS')) ?? [];
  await expect(
    app.page.locator('ion-card-title').getByText(String(stored.length), {
      exact: true,
    }),
  ).toBeVisible({ timeout: 120_000 });
  const origin = await app.page.evaluate(() => location.origin);
  await closeApp(app);
  expect(before.BREWS).toHaveLength(data.BREWS.length);
  expect(before.BEANS).toHaveLength(data.BEANS.length);

  await installApp(APKS.debug);
  app = await coldStart();
  await instrument(app.page);
  await waitForStart(app.page, String(data.BREWS.length), app.launchedAt);
  expect(await app.page.evaluate(() => location.origin)).toBe(origin);
  await expect
    .poll(
      async () =>
        (
          await readStoredValue<{ updatedDataVersions: string[] }[]>(
            app.page,
            'VERSION',
          )
        )?.[0]?.updatedDataVersions,
      { timeout: 120_000 },
    )
    .toEqual(expect.arrayContaining(UPDATES_SINCE_8_8));
  expect(await inventory(app.page)).toEqual(before);
  await closeApp(app);
});
