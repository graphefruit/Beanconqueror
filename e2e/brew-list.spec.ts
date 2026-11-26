import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { showTab } from './support/beans';
import { seedDatabase } from './support/seed';
import { readStoredValue } from './support/stored-values';
import { generateDataSet } from './support/synthetic-data';
import { isUncovered, scrollToEnd, VIRTUAL_LIST } from './support/virtual-list';

/**
 * The brew list renders only the cards near the screen. It stays with a
 * brew after an action on its card, starts from the top for a search, and
 * shows each segment where it was left.
 */

async function showBrews(page: Page): Promise<void> {
  await seedDatabase(
    page,
    generateDataSet({
      brews: 40,
      beans: 10,
      archivedBeanShare: 0.5,
      endDate: new Date('2026-11-01T18:00:00Z'),
    }),
  );
  await page.goto('/');
  await page.getByRole('tab', { name: 'Brews', exact: true }).click();
  await expect(cards(page).first()).toBeVisible();
}

function list(page: Page): Locator {
  return page.locator(`brew ${VIRTUAL_LIST}`).filter({ visible: true });
}

function cards(page: Page): Locator {
  return list(page).locator('brew-information');
}

function segment(page: Page, name: 'Current' | 'Archive'): Locator {
  return page.getByRole('tab', { name: new RegExp(`^${name},`) });
}

function scrollTop(page: Page): Promise<number> {
  return list(page).evaluate(
    (element) =>
      element.closest('ion-content')?.shadowRoot?.querySelector('.inner-scroll')
        ?.scrollTop ?? -1,
  );
}

test('the list stays with the brew after a card action and returns to the top for a search', async ({
  page,
}) => {
  await showBrews(page);
  const firstId = await cards(page).first().getAttribute('id');
  await scrollToEnd(list(page));
  const lastId = (await cards(page).last().getAttribute('id'))!;
  const last = page.locator(`[id="${lastId}"]`);
  await expect(last).toBeInViewport();

  await last.getByRole('button', { name: /^Options for the brew of / }).click();
  await page.getByRole('button', { name: 'Favourite' }).click();
  await expect
    .poll(async () => {
      const brews = await readStoredValue<
        { config: { uuid: string }; favourite: boolean }[]
      >(page, 'BREWS');
      return brews?.find((brew) => `brew-${brew.config.uuid}` === lastId)
        ?.favourite;
    })
    .toBe(true);

  await expect(last).toBeInViewport();
  await expect(page.locator(`[id="${firstId}"]`)).toHaveCount(0);
  const options = last.getByRole('button', {
    name: /^Options for the brew of /,
  });
  await expect.poll(() => isUncovered(options)).toBe(true);

  await page.getByRole('searchbox').fill('e');
  await expect.poll(() => scrollTop(page)).toBe(0);
  await expect(cards(page).first()).toBeInViewport();
});

test('a brew added on Home is on the screen when the list is shown again', async ({
  page,
}) => {
  await showBrews(page);
  await scrollToEnd(list(page));
  const before = await readStoredValue<{ config: { uuid: string } }[]>(
    page,
    'BREWS',
  );
  const known = new Set(before?.map((brew) => brew.config.uuid));

  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await expect(
    page.getByRole('tab', { name: 'Home', selected: true }),
  ).toBeVisible();
  await page
    .getByRole('banner')
    .getByRole('button', { name: 'Add brew' })
    .filter({ visible: true })
    .click();
  await page.getByRole('textbox', { name: 'Ground Coffee (gr)' }).fill('18');
  await page.getByRole('textbox', { name: /^Amount of water/ }).fill('300');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('tab', { name: 'Brews', selected: true }),
  ).toBeVisible();

  let added: string | undefined;
  await expect
    .poll(async () => {
      const brews = await readStoredValue<{ config: { uuid: string } }[]>(
        page,
        'BREWS',
      );
      added = brews?.find((brew) => !known.has(brew.config.uuid))?.config.uuid;
      return added;
    })
    .toBeDefined();
  await expect(page.locator(`[id="brew-${added}"]`)).toBeInViewport();
});

test('each segment is shown where it was left', async ({ page }) => {
  await showBrews(page);
  const firstId = await cards(page).first().getAttribute('id');
  await scrollToEnd(list(page));
  const last = page.locator(
    `[id="${await cards(page).last().getAttribute('id')}"]`,
  );
  await expect(last).toBeInViewport();

  await showTab(segment(page, 'Archive'));
  await expect(cards(page).first()).toBeInViewport();
  await showTab(segment(page, 'Current'));
  await expect(last).toBeInViewport();
  await expect(page.locator(`[id="${firstId}"]`)).toHaveCount(0);
});

/** The card that holds the focus, by its id. */
function focusedCard(page: Page): Promise<string | undefined> {
  return page.evaluate(
    () => document.activeElement?.closest('brew-information')?.id,
  );
}

async function deleteBrew(page: Page, id: string): Promise<void> {
  await page
    .locator(`[id="${id}"]`)
    .getByRole('button', { name: /^Options for the brew of / })
    .click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Yes' })
    .click();
  await expect(page.locator(`[id="${id}"]`)).toHaveCount(0);
}

test('a deleted brew passes the focus on to the brew at its place', async ({
  page,
}) => {
  await showBrews(page);
  const ids = await cards(page).evaluateAll((elements) =>
    elements.map((element) => element.id),
  );

  await deleteBrew(page, ids[1]);
  await expect.poll(() => focusedCard(page)).toBe(ids[2]);

  // The last brew passes it on to the one before.
  await scrollToEnd(list(page));
  const last = await cards(page).evaluateAll((elements) =>
    elements.slice(-2).map((element) => element.id),
  );
  await deleteBrew(page, last[1]);
  await expect.poll(() => focusedCard(page)).toBe(last[0]);
});
