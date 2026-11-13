import { devices, type Page } from '@playwright/test';

import { expect, test } from './fixtures';
import {
  brewField,
  fillBrewField,
  openAddBrew,
  saveBrew,
} from './support/brew-form';
import { completeFirstRunWithBrew } from './support/first-brew';

/**
 * The home screen quick actions of the app icon exist on iOS only. The app
 * registers their handler when the user agent is an iPhone, and the native
 * side calls it when the app is opened through a quick action, also in the
 * middle of a brew. The test presents itself as an iPhone and calls the
 * handler the same way.
 */
test.use({ userAgent: devices['iPhone 15'].userAgent });

async function runQuickAction(page: Page, type: string): Promise<void> {
  await page.evaluate((quickAction) => {
    (
      window as unknown as { handleQuickAction(type: string): void }
    ).handleQuickAction(quickAction);
  }, type);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await completeFirstRunWithBrew(page);
});

test('the Brew quick action during a brew keeps the open brew form', async ({
  page,
}) => {
  await openAddBrew(page);
  await fillBrewField(page, 'Ground Coffee (gr)', '17');

  await runQuickAction(page, 'Brew');

  // The hint shows that the quick action has been handled.
  await expect(page.getByText('A brew is already open')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(brewField(page, 'Ground Coffee (gr)')).toHaveValue('17');

  await saveBrew(page);
  await expect(page.getByRole('tab', { name: 'Current ( 2 )' })).toBeVisible();
});

test('the Brew quick action opens the brew form again after one was cancelled', async ({
  page,
}) => {
  await openAddBrew(page);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await runQuickAction(page, 'Brew');

  await expect(brewField(page, 'Creation Date')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
});
