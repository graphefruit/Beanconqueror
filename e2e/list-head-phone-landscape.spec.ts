import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { startWithBeans } from './support/beans';
import { seedDatabase } from './support/seed';
import { generateDataSet } from './support/synthetic-data';
import { isUncovered, VIRTUAL_LIST } from './support/virtual-list';

/**
 * A phone in landscape (pixel-7-landscape-chromium project) leaves little room below the tabs
 * and the search of a list. They stay outside the part that scrolls, so the element a screen
 * reader or the keyboard moves to is scrolled into that part and never lies under them.
 */

function list(page: Page): Locator {
  return page.locator(VIRTUAL_LIST).filter({ visible: true });
}

/**
 * Scrolls the list until the top of `target` lies `offset` px below the top of the page's
 * content (negative: above it, cut off).
 */
async function placeBelowContentTop(
  target: Locator,
  offset: number,
): Promise<void> {
  await target.evaluate((element, below) => {
    const content = element.closest('ion-content')!;
    const scroller =
      content.shadowRoot!.querySelector<HTMLElement>('.inner-scroll')!;
    const top = content.getBoundingClientRect().top;
    scroller.scrollTop += element.getBoundingClientRect().top - top - below;
  }, offset);
}

/**
 * TalkBack scrolls the element it moves to into the scrolling box, as `scrollIntoView` does,
 * without regard to anything that lies over that box. The heading of a card lies on its left,
 * clear of the add button.
 */
async function expectShownWhenReached(target: Locator): Promise<void> {
  for (const offset of [-10, 10]) {
    await placeBelowContentTop(target, offset);
    await target.evaluate((element) =>
      element.scrollIntoView({ block: 'nearest' }),
    );
    await expect.poll(() => isUncovered(target)).toBe(true);
  }
}

test('a brew reached by a screen reader is not hidden under the tabs and search', async ({
  page,
}) => {
  await seedDatabase(
    page,
    generateDataSet({
      brews: 60,
      beans: 10,
      endDate: new Date('2026-11-01T18:00:00Z'),
    }),
  );
  await page.goto('/');
  await page.getByRole('tab', { name: 'Brews', exact: true }).click();
  const cards = list(page).locator('brew-information');
  await expect(cards.first()).toBeVisible();
  const search = page.getByRole('searchbox').filter({ visible: true });
  await expect(search).toBeVisible();

  await expectShownWhenReached(
    cards.nth(1).getByRole('heading', { level: 2 }).first(),
  );

  // The tabs and the search stay in place above the list.
  const tab = page.getByRole('tab', { name: /^Current,/ });
  await expect.poll(() => isUncovered(tab)).toBe(true);
  await expect.poll(() => isUncovered(search)).toBe(true);
});

test('a bean reached by a screen reader is not hidden under the tabs and search', async ({
  page,
}) => {
  await startWithBeans(page, { extraBeans: 20 });
  const heading = list(page)
    .locator('bean-information')
    .nth(1)
    .getByRole('heading', { level: 2 })
    .first();
  await expect(heading).toBeAttached();

  await expectShownWhenReached(heading);
});
