import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';

/**
 * The gear at the top right of the Beans and Brews tabs opens the page that
 * chooses which fields a bean or a brew records, the same page the profile
 * lists. Back returns to the list.
 */

const LISTS = [
  {
    tab: 'Beans',
    list: /\/home\/beans$/,
    link: 'Bean parameters',
    page: /\/bean-parameter$/,
  },
  {
    tab: 'Brews',
    list: /\/home\/brews$/,
    link: 'Brewing Parameters',
    page: /\/brew-parameter$/,
  },
];

function tab(page: Page, name: string) {
  return page.getByRole('tab', { name, exact: true });
}

function gear(page: Page, name: string) {
  return page
    .getByRole('banner')
    .getByRole('link', { name, exact: true })
    .filter({ visible: true });
}

for (const list of LISTS) {
  test(`the gear on ${list.tab} opens the ${list.link} and leads back`, async ({
    page,
  }) => {
    await page.goto('/');
    await completeFirstRun(page);
    await tab(page, list.tab).click();
    await expect(page).toHaveURL(list.list);

    const box = (await gear(page, list.link).boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThan(page.viewportSize()!.width / 2);

    // Opened by keyboard, as screen reader users do.
    await gear(page, list.link).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(list.page);
    const banner = page.getByRole('banner').filter({ hasText: list.link });
    await expect(banner.getByText(list.link, { exact: true })).toBeVisible();

    await banner.getByRole('button', { name: 'back' }).click();
    await expect(page).toHaveURL(list.list);
    await expect(tab(page, list.tab)).toHaveAttribute('aria-selected', 'true');
  });
}

test('the gears are named in the app language', async ({ page }) => {
  await page.goto('/');
  await completeFirstRun(page);
  await tab(page, 'Profile').click();
  await page.getByRole('link', { name: /^Settings/ }).click();
  await page.getByRole('button', { name: /^Language Settings/ }).press('Enter');
  await page.getByRole('radio', { name: 'German' }).click();
  await page.getByRole('button', { name: 'Choose' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await page.goBack();

  await tab(page, 'Bohnen').click();
  await expect(gear(page, 'Bohnenparameter')).toHaveCount(1);
  await tab(page, 'Brühungen').click();
  await expect(gear(page, 'Bezugsparameter')).toHaveCount(1);
});
