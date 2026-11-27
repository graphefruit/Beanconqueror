import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { beanCards, dialogsClosed, openBeansTab } from './support/beans';
import {
  brewAction,
  openAddBrew,
  saveBrew,
  showBrewsTab,
} from './support/brew-form';
import { seedDatabase } from './support/seed';
import { readStoredValue } from './support/stored-values';
import {
  asEightEightData,
  generateDataSet,
  isOpenBrew,
  UPDATES_SINCE_8_8,
  withBrewsLeftWithoutStandardMill,
  type SyntheticDataSet,
} from './support/synthetic-data';

/**
 * An installation of 8.8 updated to the relaunch: its first start runs the
 * updates UPDATE_16 to UPDATE_19 on the data as 8.8 left it.
 */

interface StoredEntry {
  config: { uuid: string; created_at?: number; rev?: number };
}

const UNTOUCHED = ['MILL', 'PREPARATION', 'WATER', 'BEANS'] as const;

function generated(): SyntheticDataSet {
  return generateDataSet({
    brews: 40,
    beans: 6,
    endDate: new Date('2026-11-01T18:00:00Z'),
  });
}

/** The data once the updates have run: the copies are gone, the brews point at "Standard". */
function migrated(data: SyntheticDataSet): SyntheticDataSet {
  const left = withBrewsLeftWithoutStandardMill(data);
  const standard = left.MILL[0].config.uuid;
  return {
    ...left,
    BREWS: left.BREWS.map((brew) => ({ ...brew, mill: standard })),
  };
}

async function openUpdates(page: Page): Promise<string[]> {
  const [version] =
    (await readStoredValue<SyntheticDataSet['VERSION']>(page, 'VERSION')) ?? [];
  return UPDATES_SINCE_8_8.filter(
    (update) => !version?.updatedDataVersions.includes(update),
  );
}

/** Waits until all updates are done and compares the stored collections with `expected`. */
async function expectMigrated(
  page: Page,
  expected: SyntheticDataSet,
  addedBrews = 0,
): Promise<void> {
  await expect.poll(() => openUpdates(page)).toEqual([]);
  for (const key of UNTOUCHED) {
    expect(await readStoredValue(page, key), key).toEqual(expected[key]);
  }
  const brews = (await readStoredValue<StoredEntry[]>(page, 'BREWS')) ?? [];
  expect(brews).toHaveLength(expected.BREWS.length + addedBrews);
  expect(brews.slice(0, expected.BREWS.length)).toEqual(expected.BREWS);
  for (const brew of brews) {
    expect(brew.config.created_at).toBeGreaterThan(0);
  }
  const [settings] =
    (await readStoredValue<{ user?: object }[]>(page, 'SETTINGS')) ?? [];
  expect(settings?.user).toBeDefined();
}

test('the first start after 8.8 runs all updates and keeps every entry', async ({
  page,
}) => {
  const data = generated();
  const expected = migrated(data);
  await seedDatabase(page, asEightEightData(data));

  await page.goto('/');
  await expectMigrated(page, expected);

  await showBrewsTab(page);
  const current = expected.BREWS.filter((brew) =>
    isOpenBrew(expected, brew),
  ).length;
  await expect(
    page.getByRole('tab', { name: `Current, ${current} in total` }),
  ).toBeVisible();
});

test.describe('when UPDATE_16 fails at the first start', () => {
  /** Set in the app's localStorage, it makes filling in the change info throw. */
  const FAULT = 'e2e-fail-change-info';

  test.use({
    allowedConsoleErrors: [/^Storage - Backfill - Unsuccessfully - BEANS/],
  });

  test('the app stays usable and the next start runs all updates', async ({
    page,
  }) => {
    const data = generated();
    const eight = asEightEightData(data);
    await seedDatabase(page, eight);
    await page.evaluate((key) => localStorage.setItem(key, '1'), FAULT);
    // UPDATE_16 sets `created_at` on each entry that has none; while the
    // flag is set that throws, as a damaged entry would.
    await page.addInitScript((key) => {
      Object.defineProperty(Object.prototype, 'created_at', {
        configurable: true,
        get: () => undefined,
        set(this: object, value: unknown) {
          if (localStorage.getItem(key) === '1') {
            throw new Error('Forced failure of the change info update');
          }
          Object.defineProperty(this, 'created_at', {
            value,
            writable: true,
            enumerable: true,
            configurable: true,
          });
        },
      });
    }, FAULT);

    const failed = page.waitForEvent('console', (message) =>
      message.text().startsWith('Change info migration - not finished'),
    );
    await page.goto('/');
    await failed;
    await page.evaluate((key) => localStorage.removeItem(key), FAULT);

    // Nothing of the update was stored, and the updates after it wait.
    expect(await openUpdates(page)).toEqual(UPDATES_SINCE_8_8);
    expect(await readStoredValue(page, 'BEANS')).toEqual(eight.BEANS);

    await showBrewsTab(page);
    await expect(
      page.locator('brew brew-information').filter({ visible: true }).first(),
    ).toBeVisible();
    await brewAction(page, 'Details');
    await expect(page.getByRole('button', { name: 'Edit brew' })).toBeVisible();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await dialogsClosed(page);

    await openBeansTab(page);
    await beanCards(page).first().locator('.ion-title').click();
    await expect(
      page.getByRole('dialog', { name: 'Bean details' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await dialogsClosed(page);

    await showBrewsTab(page);
    await openAddBrew(page);
    await saveBrew(page);
    await expect
      .poll(
        async () =>
          (await readStoredValue<StoredEntry[]>(page, 'BREWS'))?.length,
      )
      .toBe(eight.BREWS.length + 1);

    await page.reload();
    await expectMigrated(page, migrated(data), 1);
  });
});
