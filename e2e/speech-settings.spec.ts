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

const timerOnly = (page: Page) =>
  page.getByRole('checkbox', { name: /^Speak the brew time only/ });
const wholeGrams = (page: Page) =>
  page.getByRole('checkbox', { name: /^Speak whole grams/ });
const interval = (page: Page) =>
  page.getByText('Speak every selected millisecond');
const androidHint = (page: Page) =>
  page.getByText(/^On Android, each announcement takes about one second/);

test.describe('on Android', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await completeFirstRunWithBrew(page);
  });

  test('offers whole grams and the brew time only, with a hint on the rate', async ({
    page,
  }) => {
    await openSpeechSettings(page);

    await expect(androidHint(page)).toBeVisible();
    await expect(timerOnly(page)).not.toBeChecked();
    await expect(wholeGrams(page)).not.toBeChecked();
    await expect(interval(page)).toBeVisible();

    // Only the time is said then: weights and their interval do not apply,
    // the pace of the voice still does.
    await switchOn(timerOnly(page));
    await expect(wholeGrams(page)).toBeHidden();
    await expect(interval(page)).toBeHidden();
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
    await switchOn(timerOnly(page));
    await expect(androidHint(page)).toHaveCount(0);
  });
});

test('says the brew start, the brew time and the brew end', async ({
  page,
}) => {
  await page.addInitScript(recordSpeech);
  await page.clock.install({ time: BREW_TEST_START });
  await page.goto('/');
  await completeFirstRunWithBrew(page);
  await openSpeechSettings(page);
  await switchOn(timerOnly(page));

  await page.getByRole('tab', { name: mainTabName('Brews') }).click();
  await openAddBrew(page);
  // The graph sets up its traces one second after the form opens.
  const opened = await page.evaluate(() => Date.now());
  await expect
    .poll(() => page.evaluate(() => Date.now()), { timeout: 10_000 })
    .toBeGreaterThan(opened + 1500);
  await page.getByRole('button', { name: 'Start timer' }).click();
  await expect(page.getByRole('button', { name: 'Pause timer' })).toBeVisible();
  // A jump fires a due timer once, so the clock moves on in two steps.
  const spoken = () =>
    page.evaluate(() => (window as unknown as Spoken).spoken);
  const time = expect.stringMatching(/^Time \d+$/);
  await page.clock.fastForward(5_500);
  await expect.poll(spoken).toEqual(['Brew started', time]);
  await page.clock.fastForward(5_500);
  // The web build feeds simulated scale weights, which stay unsaid.
  await expect.poll(spoken).toEqual(['Brew started', time, time]);
  await page.getByRole('button', { name: 'Pause timer' }).click();
  await expect.poll(spoken).toEqual(['Brew started', time, time, 'Brew end']);
});
