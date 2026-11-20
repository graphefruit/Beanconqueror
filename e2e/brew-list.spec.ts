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

test('the list announces how many brews it holds', async ({ page }) => {
  await showBrews(page);
  const brews = list(page).getByRole('list');
  const total = /\( (\d+) \)/.exec(
    (await segment(page, 'Current').textContent()) ?? '',
  )?.[1];

  await expect(brews.getByRole('listitem').first()).toHaveAttribute(
    'aria-posinset',
    '1',
  );
  await expect(brews.getByRole('listitem').first()).toHaveAttribute(
    'aria-setsize',
    total!,
  );
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
