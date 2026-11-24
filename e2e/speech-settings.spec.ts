import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { BREW_TEST_START, openAddBrew } from './support/brew-form';
import { completeFirstRunWithBrew } from './support/first-brew';
import { openFromProfile } from './support/profile';
import { mainTabName } from './support/texts';

/**
 * The spoken brew values in the settings. The browser speaks through
 * speechSynthesis, which records here what it is asked to say; the native
 * voice is not covered.
 */

interface Spoken {
  spoken: string[];
}

function recordSpeech(): void {
  const recorder = window as unknown as Spoken;
  recorder.spoken = [];
  window.speechSynthesis.speak = (utterance) => {
    recorder.spoken.push(utterance.text);
  };
}

/** Ionic reports the new state after the click; check() would not wait for it. */
async function switchOn(checkbox: Locator): Promise<void> {
  await checkbox.click();
  await expect(checkbox).toBeChecked();
}

async function openSpeechSettings(page: Page): Promise<void> {
  await openFromProfile(page, 'Settings');
  await switchOn(
    page.getByRole('checkbox', { name: 'Activate Text to speech' }),
  );
}

const weight = (page: Page) =>
  page.getByRole('checkbox', { name: 'Announce weight' });
const wholeGrams = (page: Page) =>
  page.getByRole('checkbox', { name: /^Speak whole grams/ });
const weightInterval = (page: Page) =>
  page.getByText('Speak every selected millisecond');
const brewTime = (page: Page) =>
  page.getByRole('checkbox', { name: 'Announce brew time' });
const brewTimeEvery = (page: Page) =>
  page.getByRole('slider', { name: 'Brew time every' });
const startAndEnd = (page: Page) =>
  page.getByRole('checkbox', { name: 'Announce brew start and brew end' });
const androidHint = (page: Page) =>
  page.getByText(/^On Android, each announcement takes about one second/);

/** Ionic reports the new state after the click; uncheck() would not wait for it. */
async function switchOff(checkbox: Locator): Promise<void> {
  await checkbox.click();
  await expect(checkbox).not.toBeChecked();
}

test.describe('on Android', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await completeFirstRunWithBrew(page);
  });

  test('offers a switch for each brew value, with a hint on the rate', async ({
    page,
  }) => {
    await openSpeechSettings(page);

    // The spoken values of the versions before: weight, time every 5 s, start and end.
    await expect(weight(page)).toBeChecked();
    await expect(wholeGrams(page)).not.toBeChecked();
    await expect(weightInterval(page)).toBeVisible();
    await expect(brewTime(page)).toBeChecked();
    await expect(brewTimeEvery(page)).toHaveAttribute('aria-valuetext', '5 s');
    await expect(page.getByText('5 s', { exact: true })).toBeVisible();
    await expect(startAndEnd(page)).toBeChecked();
    await expect(androidHint(page)).toBeVisible();

    // The slider shows the chosen interval, also when the timer shows whole seconds.
    await brewTimeEvery(page).focus();
    for (let i = 0; i < 19; i++) {
      await page.keyboard.press('ArrowLeft');
    }
    await expect(brewTimeEvery(page)).toHaveAttribute('aria-valuenow', '0.25');
    await expect(brewTimeEvery(page)).toHaveAttribute(
      'aria-valuetext',
      '0.25 s',
    );
    await expect(page.getByText('0.25 s', { exact: true })).toBeVisible();

    // Whole grams belong to the weight and stay with it, whatever the time does.
    await switchOff(brewTime(page));
    await expect(brewTimeEvery(page)).toBeHidden();
    await expect(wholeGrams(page)).toBeVisible();
    await switchOff(weight(page));
    await expect(wholeGrams(page)).toBeHidden();
    await expect(weightInterval(page)).toBeHidden();
    await expect(androidHint(page)).toBeVisible();

    // The pace of the voice matters as long as anything is said.
    await switchOff(startAndEnd(page));
    await expect(androidHint(page)).toBeHidden();
    await switchOn(brewTime(page));
    await expect(brewTimeEvery(page)).toBeVisible();
    await expect(androidHint(page)).toBeVisible();
  });
});

test.describe('on iOS', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  });

  test('shows no hint on the Android rate', async ({ page }) => {
    await page.goto('/');
    await completeFirstRunWithBrew(page);
    await openSpeechSettings(page);

    await expect(wholeGrams(page)).toBeVisible();
    await expect(androidHint(page)).toHaveCount(0);
  });
});

test('says the brew start, the brew time the timer shows and the brew end', async ({
  page,
}) => {
  await page.addInitScript(recordSpeech);
  await page.clock.install({ time: BREW_TEST_START });
  await page.goto('/');
  await completeFirstRunWithBrew(page);
  await openSpeechSettings(page);
  // The web build feeds simulated scale weights; without them the time is heard alone.
  await switchOff(weight(page));

  await page.getByRole('tab', { name: mainTabName('Brews') }).click();
  await openAddBrew(page);
  // The graph sets up its traces one second after the form opens.
  const opened = await page.evaluate(() => Date.now());
  await expect
    .poll(() => page.evaluate(() => Date.now()), { timeout: 10_000 })
    .toBeGreaterThan(opened + 1500);
  await page.getByRole('button', { name: 'Start timer' }).click();
  await expect(page.getByRole('button', { name: 'Pause timer' })).toBeVisible();
  const spoken = () =>
    page.evaluate(() => (window as unknown as Spoken).spoken);
  // Every tick of the timer runs, as on a device.
  await page.clock.runFor(10_500);
  await expect.poll(spoken).toEqual(['Brew started', 'Time 5', 'Time 10']);
  await page.getByRole('button', { name: 'Pause timer' }).click();
  await expect
    .poll(spoken)
    .toEqual(['Brew started', 'Time 5', 'Time 10', 'Brew end']);
});
