import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRunWithBrew } from './support/first-brew';
import { seedDatabase } from './support/seed';
import { generateDataSet } from './support/synthetic-data';
import { isUncovered, scrollToEnd, VIRTUAL_LIST } from './support/virtual-list';

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

async function showLongBrewList(page: Page) {
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
  await expect(page.locator('brew brew-information').first()).toBeVisible();
}

/** The list renders only the cards in view. */
function brewList(page: Page) {
  return page.locator(`brew ${VIRTUAL_LIST}`).first();
}

test('the last brew of a long list scrolls clear of the add button', async ({
  page,
}) => {
  await showLongBrewList(page);
  const cards = page.locator('brew brew-information');
  await scrollToEnd(brewList(page));

  const button = (await addBrew(page).boundingBox())!;
  await expect(async () => {
    const last = (await cards.last().boundingBox())!;
    expect(last.y + last.height).toBeLessThanOrEqual(button.y);
  }).toPass();
});

// Collapsed cards are short, so their options sit closest to the bottom.
test('the options of the last brew can be tapped past the add button', async ({
  page,
}) => {
  await showLongBrewList(page);
  await page
    .getByRole('button', { name: 'Collapse brew list items' })
    .filter({ visible: true })
    .click();

  const options = page
    .locator('brew brew-information')
    .last()
    .getByRole('button', { name: /^Options for the brew of / });
  await scrollToEnd(brewList(page));
  await expect(options).toBeInViewport();
  await expect.poll(() => isUncovered(options)).toBe(true);
});
