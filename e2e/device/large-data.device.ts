import { writeFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

import {
  downloadAfterInput,
  waitUntilSettled,
  type PerfWindow,
} from '../perf/perf';
import { buildBackupZip } from '../support/backup-zip';
import {
  generateDataSet,
  isOpenBrew,
  type SyntheticDataSet,
} from '../support/synthetic-data';
import {
  APKS,
  brewSaved,
  clearAppData,
  closeApp,
  coldStart,
  installApp,
  instrument,
  leaveTextField,
  memory,
  pushImportFile,
  report,
  seedRunningApp,
  storageKiB,
  thermal,
  waitForStart,
  type Build,
  type RunningApp,
  type Series,
} from './device';

/**
 * The flows of e2e/perf/large-data.perf.ts on a real phone: start, brew list, saving a brew, bean
 * list, export and import, plus memory and database size, with 0, 7,000 and 15,000 synthetic
 * brews (1,000 beans each). Every run starts the app cold (stopped, caches kept). Measures only:
 * the values are printed as `DEVICE {…}` lines, no budget is checked.
 *
 * With several builds the runs alternate (debug, release, debug, release, …); each build gets a
 * warm-up run (run 0) first, whose values are marked and left out of the evaluation.
 *
 *   DEVICE_TIERS=7000 DEVICE_RUNS=3 pnpm e2e:device
 *   DEVICE_BUILDS=debug,release pnpm e2e:device
 */

const TIERS = (process.env.DEVICE_TIERS ?? '0,7000,15000')
  .split(',')
  .map(Number);
const RUNS = Number(process.env.DEVICE_RUNS ?? 5);
const BUILDS = (process.env.DEVICE_BUILDS ?? 'debug').split(',').map((name) => {
  if (name !== 'debug' && name !== 'release') {
    throw new Error(`DEVICE_BUILDS: unknown build ${name}`);
  }
  return name;
});

// As in the browser measurements: the data ends at the start of today (UTC).
const END_DATE = new Date(new Date().setUTCHours(0, 0, 0, 0));

test.describe.configure({ mode: 'serial' });

/** The build on the phone; `install -r` keeps the app's data when it changes. */
let installed: Build | undefined;

async function install(build: Build): Promise<void> {
  if (installed !== build) {
    await installApp(APKS[build]);
    installed = build;
  }
}

/** The tab bar's buttons; their labels are part of the app's language. */
function tab(page: Page, name: 'brews' | 'beans' | 'profile') {
  return page.locator(`ion-tab-button[tab="${name}"]`);
}

/** Cold start until the home screen shows `brews` and the main thread is quiet. */
async function start(
  series: Series,
  brews = series.brews,
): Promise<RunningApp> {
  const app = await coldStart();
  await instrument(app.page);
  const timing = await waitForStart(app.page, String(brews), app.launchedAt);
  report(series, 'start', {
    ...timing,
    activityTotalTime: await app.activityTotalTime,
  });
  return app;
}

/** One run: two cold starts with the flows below. Ends with the data set as it was. */
async function measure(series: Series, data: SyntheticDataSet): Promise<void> {
  const tier = series.brews;
  const open = data.BREWS.filter((b) => isOpenBrew(data, b));
  const available = data.BEANS.filter((b) => !b.finished).length;
  report(series, 'thermal before', { ...(await thermal()) });

  // Start, brew list and saving a new brew.
  let app = await start(series);
  report(series, 'memory after start', {
    ...(await memory(app)),
    ...(await storageKiB(app.page)),
  });
  await tab(app.page, 'brews').click();
  const list = await waitUntilSettled(
    app.page,
    open.length > 0
      ? {
          selector: `ag-virtual-scroll [id="brew-${open[open.length - 1].config.uuid}"]`,
        }
      : { selector: 'ion-segment-button', text: '( 0 )' },
    'input',
  );
  report(series, 'brew list', { ...list });
  report(series, 'memory after brew list', { ...(await memory(app)) });

  await app.page
    .getByRole('button', { name: 'Add brew' })
    .filter({ visible: true })
    .click();
  await app.page
    .getByRole('textbox', { name: 'Ground Coffee (gr)' })
    .fill('18');
  await leaveTextField(app.page);
  await app.page.getByRole('button', { name: 'Save' }).click();
  report(series, 'save brew', { ...(await brewSaved(app.page)) });
  await closeApp(app);

  // Bean list, export and import, after another cold start. The import brings the data back to
  // the data set, without the brew saved above.
  app = await start(series, tier + 1);
  const page = app.page;
  await tab(page, 'beans').click();
  const beans = await waitUntilSettled(
    page,
    { selector: 'ag-virtual-scroll bean-information' },
    'input',
  );
  await expect(
    page.getByRole('tab', { name: new RegExp(`\\( ${available} \\)`) }),
  ).toBeVisible();
  report(series, 'bean list', { ...beans });

  await tab(page, 'profile').click();
  await page.getByRole('link', { name: /^Settings/ }).click();
  await page.getByRole('button', { name: /^Export Export just/ }).click();
  await expect
    .poll(
      () =>
        page.evaluate(
          () => (window as unknown as PerfWindow).__perf.downloads.length,
        ),
      { timeout: 300_000 },
    )
    .toBeGreaterThan(0);
  report(series, 'export', { duration: await downloadAfterInput(page) });
  await expect(page.locator('ion-loading')).toHaveCount(0, {
    timeout: 60_000,
  });

  // The file picker is answered with the generated backup (see `instrument`); the time of the
  // person answering the question is left out, as in the browser.
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  const read = await waitUntilSettled(
    page,
    { selector: 'ion-alert', text: 'Replace all data with the import?' },
    { mark: 'import' },
  );
  await page
    .getByRole('alertdialog', { name: 'Replace all data with the import?' })
    .getByRole('button', { name: 'Yes' })
    .click();
  const written = await waitUntilSettled(
    page,
    { selector: 'ion-alert', text: 'Import successful' },
    'input',
  );
  report(series, 'import', {
    visible: read.visible + written.visible,
    settled: read.visible + written.settled,
    read: read.visible,
    longestTask: Math.max(read.longestTask, written.longestTask),
  });
  await page.getByRole('button', { name: 'Ok' }).click();
  report(series, 'memory after import', {
    ...(await memory(app)),
    ...(await storageKiB(page)),
  });
  await closeApp(app);
  report(series, 'thermal after', { ...(await thermal()) });
}

for (const tier of TIERS) {
  test(`${tier} brews`, async () => {
    const testInfo = test.info();
    test.setTimeout(
      (10 + (RUNS + 1) * BUILDS.length * (tier / 1_000 + 4)) * 60_000,
    );
    const data = generateDataSet({ brews: tier, endDate: END_DATE });

    // Fresh data, then the data set written while the app runs; it is read on the next start.
    await install(BUILDS[0]);
    await clearAppData();
    const first = await coldStart();
    await seedRunningApp(first.page, data);
    await closeApp(first);
    const zipPath = testInfo.outputPath('Beanconqueror.zip');
    await writeFile(zipPath, await buildBackupZip(data, END_DATE));
    await pushImportFile(zipPath);

    // Interleaved: run 0 of every build, run 1 of every build, … Run 0 is the warm-up.
    for (let run = 0; run <= RUNS; run++) {
      for (const build of BUILDS) {
        await install(build);
        await measure({ build, brews: tier, run }, data);
      }
    }
  });
}
