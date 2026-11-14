import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRunWithBrew } from './support/first-brew';
import { seedDatabase } from './support/seed';
import { generateDataSet } from './support/synthetic-data';

/**
 * On the Brews tab a new brew starts from a floating button at the bottom
 * right, above the tab bar. Home keeps its add button in the header.
 */

function tabBar(page: Page) {
  return page.getByRole('tablist').filter({
    has: page.getByRole('tab', { name: 'Home', exact: true }),
  });
}

async function showBrews(page: Page) {
  const brews = tabBar(page).getByRole('tab', { name: 'Brews' });
  await brews.click();
  await expect(brews).toHaveAttribute('aria-selected', 'true');
}

function addBrew(page: Page) {
  return page.getByRole('button', { name: 'Add brew' }).filter({
    visible: true,
  });
}

test('the add button floats at the bottom right above the tab bar', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRunWithBrew(page);
  await showBrews(page);

  await expect(addBrew(page)).toHaveCount(1);
  await expect(
    page.getByRole('banner').getByRole('button', { name: 'Add brew' }),
  ).toHaveCount(0);
  const button = (await addBrew(page).boundingBox())!;
  const bar = (await tabBar(page).boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(button.width).toBeGreaterThanOrEqual(44);
  expect(button.height).toBeGreaterThanOrEqual(44);
  expect(button.y + button.height).toBeLessThanOrEqual(bar.y);
  expect(button.x).toBeGreaterThan(viewport.width / 2);
  expect(button.x + button.width).toBeLessThanOrEqual(viewport.width);

  await addBrew(page).click();
  await expect(
    page.getByRole('textbox', { name: 'Ground Coffee (gr)' }),
  ).toBeVisible();
});

test('a long press on the add button offers the last brew as preset', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRunWithBrew(page);
  await showBrews(page);

  // Held down: the finger is lifted only after the sheet has opened.
  await addBrew(page).dispatchEvent('touchstart');
  await expect(page.getByText('Use last brew as preset')).toBeVisible();
});

test('the last brew of a long list scrolls clear of the add button', async ({
  page,
}) => {
  await seedDatabase(
    page,
    generateDataSet({
      brews: 30,
      beans: 10,
      endDate: new Date('2026-11-01T18:00:00Z'),
    }),
  );
  await page.goto('/');
  await showBrews(page);
  const cards = page.locator('brew brew-information');
  await expect(cards.first()).toBeVisible();

  // The list scrolls itself and renders only the cards in view.
  const list = page.locator('brew ag-virtual-scroll').first();
  await expect(async () => {
    await list.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      element.dispatchEvent(new Event('scroll'));
    });
    expect(
      await list.evaluate(
        (element) =>
          element.scrollTop + element.clientHeight >= element.scrollHeight - 1,
      ),
    ).toBe(true);
  }).toPass();

  const button = (await addBrew(page).boundingBox())!;
  await expect(async () => {
    const last = (await cards.last().boundingBox())!;
    expect(last.y + last.height).toBeLessThanOrEqual(button.y);
  }).toPass();
});
