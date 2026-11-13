import { readFile } from 'node:fs/promises';

import type { Page } from '@playwright/test';
import { BlobReader, configure, TextWriter, ZipReader } from '@zip.js/zip.js';

import { expect, test } from '../fixtures';
import { buildBackupZip } from '../support/backup-zip';
import { completeFirstRun } from '../support/first-run';
import {
  generateDataSet,
  isOpenBrew,
  NOTE_SEARCH_TERM,
  type SyntheticDataSet,
} from '../support/synthetic-data';
import { BUDGETS, type Budget, type PerfTier } from './budgets';
import {
  CPU_THROTTLING,
  installPerfObserver,
  report,
  scrollListToEnd,
  seedDatabase,
  throttleCpu,
  waitUntilSettled,
} from './perf';

/**
 * How the app copes with the data of long-time users: start, lists, search, statistics, export
 * and import with 7,000 and 15,000 brews under CPU throttling. Every value is checked against
 * the budgets in `budgets.ts`; a test fails only after all of its values are reported.
 */

const TIERS: PerfTier[] = [7_000, 15_000];

// The last brew is from the start of today, so "time since the last brew" and the analytics
// reminder behave like for an active user. Within one day the data is the same on every run.
const END_DATE = new Date(new Date().setUTCHours(0, 0, 0, 0));

const dataSets = new Map<PerfTier, { data: SyntheticDataSet; json: string }>();
function dataSet(tier: PerfTier) {
  let entry = dataSets.get(tier);
  if (!entry) {
    const data = generateDataSet({ brews: tier, endDate: END_DATE });
    entry = { data, json: JSON.stringify(data) };
    dataSets.set(tier, entry);
  }
  return entry;
}

function tabBar(page: Page) {
  return page.getByRole('tablist').filter({
    has: page.getByRole('tab', { name: 'Home', exact: true }),
  });
}

/** Seeds the database, throttles the CPU and starts the app until the home screen is interactive. */
async function startWithData(page: Page, tier: PerfTier) {
  const { data, json } = dataSet(tier);
  await installPerfObserver(page);
  await seedDatabase(page, data, json);
  await throttleCpu(page);
  await page.goto('/');
  const start = await waitUntilSettled(
    page,
    { selector: 'ion-card-title', text: String(tier) },
    'navigation',
  );
  return { data, start };
}

function checkBudget(name: keyof Budget, value: number, budget: Budget) {
  expect
    .soft(value, `${name} (budget ${budget[name]} ms)`)
    .toBeLessThanOrEqual(budget[name]);
}

for (const tier of TIERS) {
  test.describe(`${tier} brews`, () => {
    const budget = BUDGETS[tier];
    // The budgets are set for 4x throttling; other values only produce measurements.
    const checkBudgets = CPU_THROTTLING === 4;

    test('start until the home screen is interactive', async ({
      page,
    }, testInfo) => {
      const { start } = await startWithData(page, tier);
      report(testInfo, tier, 'start', { ...start });
      if (checkBudgets) {
        checkBudget('startVisible', start.visible, budget);
        checkBudget('startInteractive', start.settled, budget);
      }
    });

    test('brew list opens and scrolls to the end', async ({
      page,
    }, testInfo) => {
      const { data } = await startWithData(page, tier);
      const open = data.BREWS.filter((b) => isOpenBrew(data, b));
      const newest = open[open.length - 1];
      const oldest = open[0];

      await tabBar(page).getByRole('tab', { name: 'Brews' }).click();
      const list = await waitUntilSettled(
        page,
        { selector: `ag-virtual-scroll [id="brew-${newest.config.uuid}"]` },
        'input',
      );
      await expect(
        page.getByRole('tab', { name: `Current ( ${open.length} )` }),
      ).toBeVisible();
      const scroll = await scrollListToEnd(
        page,
        `brew-${newest.config.uuid}`,
        `brew-${oldest.config.uuid}`,
      );
      report(testInfo, tier, 'brew list', {
        open: list.settled,
        openLongestTask: list.longestTask,
        ...Object.fromEntries(
          Object.entries(scroll).map(([key, value]) => [
            `scroll${key[0].toUpperCase()}${key.slice(1)}`,
            value,
          ]),
        ),
      });
      if (checkBudgets) {
        checkBudget('brewListOpen', list.settled, budget);
        checkBudget('brewListScroll', scroll.duration, budget);
        checkBudget('brewListScrollLongestFrame', scroll.longestFrame, budget);
      }
    });

    test('search in the brew list', async ({ page }, testInfo) => {
      const { data } = await startWithData(page, tier);
      const open = data.BREWS.filter((b) => isOpenBrew(data, b));
      const matches = open.filter((b) =>
        b.note.toLowerCase().includes(NOTE_SEARCH_TERM),
      );

      await tabBar(page).getByRole('tab', { name: 'Brews' }).click();
      await expect(
        page.getByRole('tab', { name: `Current ( ${open.length} )` }),
      ).toBeVisible();
      await page
        .getByRole('searchbox', { name: 'Search' })
        .fill(NOTE_SEARCH_TERM);
      // Includes the search field's 750 ms debounce.
      const search = await waitUntilSettled(
        page,
        {
          selector: 'ion-segment-button',
          text: `${matches.length} / ${open.length}`,
        },
        'input',
      );
      report(testInfo, tier, 'search', { ...search });
      if (checkBudgets) {
        checkBudget('search', search.settled, budget);
      }
    });

    test('bean list opens', async ({ page }, testInfo) => {
      const { data } = await startWithData(page, tier);
      const available = data.BEANS.filter((b) => !b.finished).length;

      await tabBar(page).getByRole('tab', { name: 'Beans' }).click();
      const beans = await waitUntilSettled(
        page,
        { selector: 'ag-virtual-scroll bean-information' },
        'input',
      );
      await expect(
        page.getByRole('tab', { name: new RegExp(`\\( ${available} \\)`) }),
      ).toBeVisible();
      report(testInfo, tier, 'bean list', { ...beans });
      if (checkBudgets) {
        checkBudget('beanListOpen', beans.settled, budget);
      }
    });

    test('statistics open and draw the brew charts', async ({
      page,
    }, testInfo) => {
      await startWithData(page, tier);

      await tabBar(page).getByRole('tab', { name: 'Profile' }).click();
      await page.getByRole('link', { name: /^Statistics/ }).click();
      const general = await waitUntilSettled(
        page,
        { selector: 'ion-card-header', text: tier.toLocaleString('en-US') },
        'input',
      );
      // The statistics segment; the hidden tab bar has a "Brews" tab as well, and a role
      // query scoped to the segment's tablist never resolved here.
      await page.locator('ion-segment-button[value="BREWS"]').click();
      const charts = await waitUntilSettled(
        page,
        { selector: 'canvas' },
        'input',
      );
      report(testInfo, tier, 'statistics', {
        open: general.settled,
        openLongestTask: general.longestTask,
        brewCharts: charts.settled,
        brewChartsLongestTask: charts.longestTask,
      });
      if (checkBudgets) {
        checkBudget('statisticsOpen', general.settled, budget);
        checkBudget('statisticsBrewCharts', charts.settled, budget);
      }
    });

    test('export builds the backup ZIP', async ({ page }, testInfo) => {
      await startWithData(page, tier);
      await tabBar(page).getByRole('tab', { name: 'Profile' }).click();
      await page.getByRole('link', { name: /^Settings/ }).click();

      const exportItem = page.getByRole('button', {
        name: /^Export Export just/,
      });
      const started = performance.now();
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 300_000 }),
        exportItem.click(),
      ]);
      const duration = Math.round(performance.now() - started);
      const path = await download.path();
      report(testInfo, tier, 'export', { duration });
      if (checkBudgets) {
        checkBudget('export', duration, budget);
      }

      // The ZIP holds every brew: the first chunk in the main file, the rest in chunk files.
      configure({ useWebWorkers: false });
      const reader = new ZipReader(
        new BlobReader(new Blob([await readFile(path)])),
      );
      let brews = 0;
      for (const entry of await reader.getEntries()) {
        if (entry.directory) {
          continue;
        }
        if (entry.filename === 'Beanconqueror.json') {
          brews += JSON.parse(await entry.getData(new TextWriter())).BREWS
            .length;
        } else if (/^Beanconqueror_Brews_\d+\.json$/.test(entry.filename)) {
          brews += JSON.parse(await entry.getData(new TextWriter())).length;
        }
      }
      await reader.close();
      expect(brews).toBe(tier);
    });

    test('import of a backup ZIP', async ({ page }, testInfo) => {
      const zip = await buildBackupZip(dataSet(tier).data, END_DATE);
      await installPerfObserver(page);
      await page.goto('/');
      await completeFirstRun(page);
      await throttleCpu(page);
      await tabBar(page).getByRole('tab', { name: 'Profile' }).click();
      await page.getByRole('link', { name: /^Settings/ }).click();

      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: 'Import', exact: true }).click(),
      ]);
      const started = performance.now();
      await chooser.setFiles({
        name: 'Beanconqueror.zip',
        mimeType: 'application/zip',
        buffer: zip,
      });
      await expect(page.getByText('Import successful')).toBeVisible({
        timeout: 300_000,
      });
      const duration = Math.round(performance.now() - started);
      report(testInfo, tier, 'import', {
        duration,
        zipKiB: Math.round(zip.length / 1024),
      });
      if (checkBudgets) {
        checkBudget('import', duration, budget);
      }

      await page.getByRole('button', { name: 'Ok' }).click();
      // The imported brews are there after a restart.
      await page.goto('/');
      await expect(
        page.locator('ion-card-title', { hasText: String(tier) }),
      ).toBeVisible({ timeout: 120_000 });
    });
  });
}
