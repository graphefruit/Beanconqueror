import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import {
  addPreparationMethod,
  BREW_TEST_START,
  brewAction,
  brewField,
  openAddBrew,
  saveBrew,
  topDialog,
} from './support/brew-form';
import {
  BREW_FORM_REFRACTOMETER_ERROR,
  completeFirstRunWithBrew,
} from './support/first-brew';

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

test.use({ allowedConsoleErrors: [BREW_FORM_REFRACTOMETER_ERROR] });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: BREW_TEST_START });
  await page.goto('/');
  await completeFirstRunWithBrew(page);
});

async function tick(page: Page, seconds: number): Promise<void> {
  await page.clock.fastForward(seconds * 1000);
}

/** Expects mm:ss of at least `seconds` and at most two seconds of drift more. */
async function expectAbout(field: Locator, seconds: number): Promise<string> {
  const allowed = [seconds, seconds + 1, seconds + 2].map(
    (s) =>
      `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`,
  );
  await expect(field).toHaveValue(new RegExp(`^(${allowed.join('|')})$`));
  return field.inputValue();
}

function seconds(mmss: string): number {
  const [m, s] = mmss.split(':').map(Number);
  return m * 60 + s;
}

const timeField = (page: Page) => brewField(page, 'Time');

/** Starts the timer and waits until it runs before time is moved. */
async function startTimer(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Start timer' }).click();
  await expect(page.getByRole('button', { name: 'Pause timer' })).toBeVisible();
}

/**
 * Opens the brew form and waits like a user would before starting the timer.
 * The graph sets up its traces one second after the form opens; a timer
 * started earlier makes the simulated sensor readings hit missing traces (a
 * TypeError in brew-brewing-graph `__setPressureFlow`). Jumping the clock
 * forward at this point hangs the form, so the page's own clock is polled.
 */
async function openBrewFormAndSettle(page: Page): Promise<void> {
  await openAddBrew(page);
  const opened = await page.evaluate(() => Date.now());
  await expect
    .poll(() => page.evaluate(() => Date.now()), { timeout: 10_000 })
    .toBeGreaterThan(opened + 1500);
}

test('the timer runs, marks the bloom time, pauses, resumes and is saved with the brew', async ({
  page,
}) => {
  await openBrewFormAndSettle(page);
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
    - heading "Time:" [level=2]
    - heading "00:${total}" [level=3]
    - heading "Bloom Time / Pre-infusion:" [level=2]
    - heading "${bloom}" [level=3]
  `);
});

test('resetting the timer clears the time and allows a new start', async ({
  page,
}) => {
  await openBrewFormAndSettle(page);
  await startTimer(page);
  await tick(page, 12);
  await page.getByRole('button', { name: 'Pause timer' }).click();
  await expectAbout(timeField(page), 12);

  await page.getByRole('button', { name: 'Reset timer' }).click();
  await expect(timeField(page)).toHaveValue('00:00');
  await expect(page.getByRole('button', { name: 'Start timer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume timer' })).toHaveCount(
    0,
  );
});

test('an espresso method marks the first drip and shows the brew time after it', async ({
  page,
}) => {
  // "Espresso Machine" sorts before "V60", so a new brew starts with it.
  await addPreparationMethod(page, 'Espresso Machine');
  await openBrewFormAndSettle(page);
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
