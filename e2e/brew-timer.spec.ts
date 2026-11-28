import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import {
  addPreparationMethod,
  backToBrews,
  BREW_TEST_START,
  brewAction,
  brewField,
  chooseInBrewSelect,
  openAddBrew,
  openAddBrewWithoutTime,
  openBrewParameterPage,
  saveBrew,
  setParameter,
  showBrewsTab,
  timeParameterHint,
  topDialog,
} from './support/brew-form';
import { completeFirstRunWithBrew } from './support/first-brew';
import { openFromProfile } from './support/profile';
import { readStoredValue } from './support/stored-values';

/**
 * Characterization of the brew timer without a real Bluetooth device: start,
 * bloom and first-drip marks, pause, resume, reset, and the time landing in
 * the saved brew.
 *
 * Time is moved with `page.clock.fastForward`. The clock keeps running in
 * between, because pausing it (`pauseAt`) hangs the brew form, so a shown
 * time may be up to two seconds later than the jumps add up to. Wherever the
 * app derives one time from another (pause, saved brew, coffee brew time) the
 * tests compare exactly.
 *
 * Boundary: the web build pretends that a scale, pressure and temperature
 * sensor are connected and feeds random readings while the timer runs (see
 * brew-brewing-graph `!platform.is('capacitor')`). Those readings also land
 * in the weight fields, so these tests never assert them. Real devices are
 * not covered here.
 */

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: BREW_TEST_START });
  await page.goto('/');
  await completeFirstRunWithBrew(page);
});

async function tick(page: Page, seconds: number): Promise<void> {
  await page.clock.fastForward(seconds * 1000);
}

/** mm:ss of at least `seconds` and at most two seconds of drift more. */
function about(seconds: number): RegExp {
  const allowed = [seconds, seconds + 1, seconds + 2].map(
    (s) =>
      `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`,
  );
  return new RegExp(`^(${allowed.join('|')})$`);
}

async function expectAbout(field: Locator, seconds: number): Promise<string> {
  await expect(field).toHaveValue(about(seconds));
  return field.inputValue();
}

/** The same for the maximized graph's tiles, which show the time as text. */
async function expectAboutText(
  tile: Locator,
  seconds: number,
): Promise<string> {
  await expect(tile).toHaveText(about(seconds));
  return (await tile.textContent()) ?? '';
}

function seconds(mmss: string): number {
  const [m, s] = mmss.split(':').map(Number);
  return m * 60 + s;
}

const timeField = (page: Page) => brewField(page, 'Time');

interface StoredBrew {
  brew_time: number;
  brew_time_milliseconds: number;
  flow_profile: string;
}

/** The brews in the database, newest last. */
async function storedBrews(page: Page): Promise<StoredBrew[]> {
  return (await readStoredValue<StoredBrew[]>(page, 'BREWS')) ?? [];
}

/** The maximized flow graph and the value tiles above it. */
function maximizedGraph(page: Page) {
  const view = page.locator('brew-flow');
  // Each tile names its value with a visually hidden label.
  const tile = (label: string) =>
    view
      .locator('ion-card-header')
      .filter({ has: page.getByText(label, { exact: true }) });
  return {
    view,
    time: tile('Time').locator('.information-tile-no-overflow'),
    weight: tile('Weight').locator('div').first(),
    temperature: tile('Temperature').locator('div').first(),
  };
}

/** Starts the timer and waits until it runs before time is moved. */
async function startTimer(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Start timer' }).click();
  await expect(page.getByRole('button', { name: 'Pause timer' })).toBeVisible();
}

test('the timer runs, marks the bloom time, pauses, resumes and is saved with the brew', async ({
  page,
}) => {
  // The graph takes readings from the start, so the timer starts right away.
  await openAddBrew(page);
  // Empty when the form opens, filled with 00:00 shortly after.
  await expect(timeField(page)).toHaveValue(/^(00:00)?$/);

  await startTimer(page);
  await tick(page, 5);
  await expectAbout(timeField(page), 5);
  // A filter method offers a bloom mark, but no first-drip mark.
  await expect(
    page.getByRole('button', { name: 'Set first drip time' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Set bloom time' }).click();
  const bloom = await expectAbout(
    brewField(page, 'Bloom Time / Pre-infusion'),
    5,
  );

  await tick(page, 20);
  await page.getByRole('button', { name: 'Pause timer' }).click();
  await expect(
    page.getByRole('button', { name: 'Resume timer' }),
  ).toBeVisible();
  const paused = await expectAbout(timeField(page), 25);
  await expect(page.getByRole('button', { name: 'Start timer' })).toHaveCount(
    0,
  );

  // Time does not move while paused.
  await tick(page, 10);
  await expect(timeField(page)).toHaveValue(paused);

  await page.getByRole('button', { name: 'Resume timer' }).click();
  await tick(page, 5);
  await page.getByRole('button', { name: 'Pause timer' }).click();
  await expect(
    page.getByRole('button', { name: 'Resume timer' }),
  ).toBeVisible();
  const total = await expectAbout(timeField(page), seconds(paused) + 5);
  // The bloom mark keeps its value.
  await expect(brewField(page, 'Bloom Time / Pre-infusion')).toHaveValue(bloom);

  await saveBrew(page);
  await brewAction(page, 'Details');
  // Details show the brew time with hours.
  await expect(topDialog(page)).toMatchAriaSnapshot(`
    - heading "While brewing" [level=2]
    - text: "Time: 00:${total} Bloom Time / Pre-infusion: ${bloom}"
  `);
});

test('an espresso method marks the first drip and shows the brew time after it', async ({
  page,
}) => {
  // "Espresso Machine" sorts before "V60", so a new brew starts with it.
  await addPreparationMethod(page, 'Espresso Machine');
  await openAddBrew(page);
  await expect(
    page.getByRole('button', { name: 'Preparation method, Espresso Machine' }),
  ).toBeVisible();

  await startTimer(page);
  await tick(page, 8);
  await page.getByRole('button', { name: 'Set first drip time' }).click();
  const drip = await expectAbout(brewField(page, 'First drip time'), 8);
  await tick(page, 22);
  await page.getByRole('button', { name: 'Pause timer' }).click();
  await expect(
    page.getByRole('button', { name: 'Resume timer' }),
  ).toBeVisible();
  const total = await expectAbout(timeField(page), 30);

  // Coffee brew time = total time minus time to first drip, with hours.
  const brewTime = seconds(total) - seconds(drip);
  await expect(page.getByText(/Coffee Brew Time:/)).toHaveText(
    new RegExp(
      `Coffee Brew Time:\\s*00:00:${String(brewTime).padStart(2, '0')}$`,
    ),
  );
});

// The fixture fails the test on any page or console error, e.g. from the
// pressure line of a timer started before the graph is drawn.
test('switching to an espresso method in the open form and starting at once records without errors', async ({
  page,
}) => {
  await addPreparationMethod(page, 'Espresso Machine');
  await openAddBrew(page);
  await chooseInBrewSelect(page, 'Preparation method', 'V60');
  await chooseInBrewSelect(page, 'Preparation method', 'Espresso Machine');

  await startTimer(page);
  await tick(page, 3);
  await page.getByRole('button', { name: 'Pause timer' }).click();
  await expectAbout(timeField(page), 3);
});

test('editing a brew keeps its time and asks for a reset before the timer starts again', async ({
  page,
}) => {
  await openAddBrew(page);
  await startTimer(page);
  await tick(page, 25);
  await page.getByRole('button', { name: 'Pause timer' }).click();
  const saved = await expectAbout(timeField(page), 25);
  await saveBrew(page);
  await expect
    .poll(async () => (await storedBrews(page)).map((brew) => brew.brew_time))
    .toContain(seconds(saved));

  await brewAction(page, 'Edit');
  await expect(timeField(page)).toHaveValue(saved);
  // With a device connected (the browser build pretends one is), a stored
  // time is not continued: the timer has to start from zero.
  await page.getByRole('button', { name: 'Start timer' }).click();
  const question = page.getByRole('alertdialog', { name: 'Reset timer!' });
  await expect(question).toBeVisible();
  await question.getByRole('button', { name: 'Ok' }).click();
  await expect(question).toHaveCount(0);
  await expect(timeField(page)).toHaveValue(saved);

  await page.getByRole('button', { name: 'Reset timer' }).click();
  await expect(timeField(page)).toHaveValue('00:00');
  await startTimer(page);
  await tick(page, 5);
  await page.getByRole('button', { name: 'Pause timer' }).click();
  await expect(
    page.getByRole('button', { name: 'Resume timer' }),
  ).toBeVisible();
  const total = await expectAbout(timeField(page), 5);
  await saveBrew(page);

  await expect
    .poll(async () => (await storedBrews(page)).map((brew) => brew.brew_time))
    .toContain(seconds(total));
  expect((await storedBrews(page)).map((brew) => brew.brew_time)).not.toContain(
    seconds(saved),
  );
});

test('in millisecond mode the timer shows, saves and edits milliseconds', async ({
  page,
}) => {
  await openFromProfile(page, 'Settings');
  const milliseconds = page.getByRole('checkbox', { name: /^Milliseconds\?/ });
  await milliseconds.click();
  await expect(milliseconds).toBeChecked();
  await showBrewsTab(page);

  await openAddBrew(page);
  await startTimer(page);
  await tick(page, 5);
  // Three decimal places unless the settings ask for fewer.
  await expect(timeField(page)).toHaveValue(/^00:0[5-7]\.\d{3}$/);
  await page.getByRole('button', { name: 'Pause timer' }).click();
  await expect(
    page.getByRole('button', { name: 'Resume timer' }),
  ).toBeVisible();
  const shown = await timeField(page).inputValue();
  await tick(page, 2);
  await expect(timeField(page)).toHaveValue(shown);
  await saveBrew(page);

  const [, secondsShown, millisShown] = /^00:(\d\d)\.(\d{3})$/.exec(shown)!;
  await expect
    .poll(async () =>
      (await storedBrews(page)).map((brew) => [
        brew.brew_time,
        brew.brew_time_milliseconds,
      ]),
    )
    .toContainEqual([Number(secondsShown), Number(millisShown)]);

  await brewAction(page, 'Edit');
  await expect(timeField(page)).toHaveValue(shown);
});

test('the maximized graph starts and pauses the brew while its values run', async ({
  page,
}) => {
  await openAddBrew(page);
  await page.getByRole('button', { name: 'Maximize flow graph' }).click();
  const graph = maximizedGraph(page);
  await expect(
    page.getByRole('button', { name: 'Close flow graph' }),
  ).toBeVisible();
  await expect(graph.weight).toHaveText('? g');

  // The page behind the maximized graph is hidden, so these are its buttons.
  await startTimer(page);
  await tick(page, 5);
  await expectAboutText(graph.time, 5);
  // The browser build has no scale weight, but its simulated sensors send a
  // new temperature every 100 ms while the brew runs.
  await expect(graph.weight).toHaveText('0');
  await expect(graph.temperature).toHaveText(/^\d+$/);
  const running = await graph.temperature.textContent();
  await expect(graph.temperature).not.toHaveText(running!);

  await page.getByRole('button', { name: 'Pause timer' }).click();
  await expect(
    page.getByRole('button', { name: 'Resume timer' }),
  ).toBeVisible();
  const pausedTime = await expectAboutText(graph.time, 5);
  const pausedTemperature = await graph.temperature.textContent();
  await tick(page, 5);
  await expect(graph.time).toHaveText(pausedTime);
  await expect(graph.temperature).toHaveText(pausedTemperature!);

  await page.getByRole('button', { name: 'Close flow graph' }).click();
  await expect(graph.view).toHaveCount(0);
  // The form shows the time the maximized graph paused at.
  await expect(timeField(page)).toHaveValue(pausedTime);
});

test.describe('without the brew time parameter', () => {
  test.beforeEach(async ({ page }) => {
    await openBrewParameterPage(page, 'Manage parameters');
    await setParameter(page, 'Time', false);
    await backToBrews(page);
  });

  test('the scale tiles and the maximized graph render without the timer', async ({
    page,
  }) => {
    // The web build reports the scale as connected, which shows its tiles,
    // offers the maximized graph and asks to show the brew time.
    await openAddBrewWithoutTime(page, 'Not now');
    await expect(brewField(page, 'Time')).toHaveCount(0);
    const maximize = page.getByRole('button', { name: 'Maximize flow graph' });
    await expect(maximize).toBeVisible();

    await maximize.click();
    const close = page.getByRole('button', { name: 'Close flow graph' });
    await expect(close).toBeVisible();
    // Without a timer there is nothing to start.
    await expect(page.getByRole('button', { name: 'Start timer' })).toHaveCount(
      0,
    );
    await close.click();
    await expect(maximize).toBeVisible();
    // Asked once per brew.
    await expect(timeParameterHint(page)).toHaveCount(0);
  });

  // Whether a brew without the timer records against time 0 or throws was an
  // open question: nothing starts the recording without the timer.
  test('nothing is recorded and the brew is saved without time and flow', async ({
    page,
  }) => {
    await openAddBrewWithoutTime(page, 'Not now');
    await page.getByRole('button', { name: 'Maximize flow graph' }).click();
    const graph = maximizedGraph(page);
    await expect(graph.weight).toHaveText('? g');
    await expect(graph.temperature).toHaveText('? °C');
    await expect(
      page.getByRole('button', { name: 'Start listening to scale' }),
    ).toHaveCount(0);
    await tick(page, 10);
    await expect(graph.weight).toHaveText('? g');
    await expect(graph.temperature).toHaveText('? °C');
    await page.getByRole('button', { name: 'Close flow graph' }).click();
    await expect(graph.view).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Download flow profile' }),
    ).toHaveCount(0);

    await saveBrew(page);
    await expect.poll(async () => (await storedBrews(page)).length).toBe(2);
    const [, saved] = await storedBrews(page);
    expect(saved).toMatchObject({ brew_time: 0, flow_profile: '' });
  });

  test('a connected scale offers to show the brew time', async ({ page }) => {
    await page
      .getByRole('button', { name: 'Add brew' })
      .filter({ visible: true })
      .click();
    const hint = timeParameterHint(page);
    await expect(hint).toBeVisible();
    // Screen readers read the title and the message as the dialog's name.
    await expect(hint).toHaveAccessibleName(
      /^Show the brew time\? A device is connected, but the brew parameter "Time" is hidden\./,
    );

    await hint.getByRole('button', { name: 'Show time' }).click();
    await expect(hint).toHaveCount(0);
    await expect(timeField(page)).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Start timer' }),
    ).toBeVisible();
  });
});
