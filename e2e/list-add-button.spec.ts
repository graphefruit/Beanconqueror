import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { openFromProfile } from './support/profile';
import { seedDatabase } from './support/seed';
import { generateDataSet } from './support/synthetic-data';
import { mainTabName } from './support/texts';
import { isUncovered, scrollToEnd, VIRTUAL_LIST } from './support/virtual-list';

/**
 * Every list adds its entries from a floating button at the bottom right, as
 * the Brews tab does (brew-add-button.spec.ts). Its names in English and
 * German and the import of beans in the header are checked in
 * src/app/__tests__/list-buttons.spec.ts.
 */

interface List {
  name: string;
  open: (page: Page) => Promise<void>;
  add: string;
  card: string;
  /** The button of a card that opens its actions. */
  options: RegExp;
  /** The button that collapses the cards, if the list has one. */
  collapse?: string;
  /** A field of the form the button opens. */
  opens: (page: Page) => Locator;
}

const LISTS: List[] = [
  {
    name: 'beans',
    open: async (page) => {
      await page.getByRole('tab', { name: mainTabName('Beans') }).click();
      await expect(page).toHaveURL(/\/home\/beans$/);
    },
    add: 'Add bean',
    card: 'beans bean-information',
    options: /^Options for /,
    collapse: 'Collapse bean list items',
    opens: (page) => page.getByRole('textbox', { name: /^Name/ }),
  },
  {
    name: 'grinders',
    open: (page) => openFromProfile(page, 'Grinders'),
    add: 'Add grinder',
    card: 'mill mill-information-card',
    options: /^Options for /,
    opens: (page) => page.getByRole('textbox', { name: /^Name/ }),
  },
  {
    name: 'preparation methods',
    open: (page) => openFromProfile(page, 'Preparation methods'),
    add: 'Add preparation method',
    card: 'preparation preparation-information-card',
    options: /^Options for /,
    opens: (page) =>
      page.locator('ion-modal').getByText('V60', { exact: true }),
  },
  {
    name: 'water',
    open: (page) => openFromProfile(page, 'Water'),
    add: 'Add water recipe',
    card: 'app-water water-information-card',
    options: /^Options for /,
    opens: (page) =>
      page.locator('ion-modal').getByText('Pure Coffee Water', { exact: true }),
  },
];

async function startWithData(page: Page): Promise<void> {
  const data = generateDataSet({
    brews: 30,
    // Enough available beans that the collapsed list scrolls, too.
    beans: 60,
    endDate: new Date('2026-11-01T18:00:00Z'),
  });
  data.SETTINGS[0].show_water_section = true;
  await seedDatabase(page, data);
  await page.goto('/');
}

function tabBar(page: Page) {
  return page.getByRole('tablist').filter({
    has: page.getByRole('tab', { name: 'Home', exact: true }),
  });
}

/** The list renders only the cards in view. */
function listOf(page: Page, list: List): Locator {
  return page.locator(list.card.split(' ')[0]).locator(VIRTUAL_LIST).first();
}

function addButton(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true }).filter({
    visible: true,
  });
}

for (const list of LISTS) {
  test(`${list.name}: the add button floats at the bottom right`, async ({
    page,
  }) => {
    await startWithData(page);
    await list.open(page);

    await expect(addButton(page, list.add)).toHaveCount(1);
    const viewport = page.viewportSize()!;
    // Measured again until the page has finished sliding in.
    await expect(async () => {
      const button = (await addButton(page, list.add).boundingBox())!;
      const bar = (await tabBar(page).boundingBox())!;
      expect(button.width).toBeGreaterThanOrEqual(44);
      expect(button.height).toBeGreaterThanOrEqual(44);
      expect(button.y + button.height).toBeLessThanOrEqual(bar.y);
      expect(button.x).toBeGreaterThan(viewport.width / 2);
      expect(button.x + button.width).toBeLessThanOrEqual(viewport.width);
    }).toPass();

    await addButton(page, list.add).click();
    await expect(list.opens(page)).toBeVisible();
  });

  test(`${list.name}: the last entry scrolls clear of the add button`, async ({
    page,
  }) => {
    await startWithData(page);
    await list.open(page);
    const cards = page.locator(list.card);
    await expect(cards.first()).toBeVisible();

    await scrollToEnd(listOf(page, list));
    // Measured again until the page has finished sliding in.
    await expect(async () => {
      const button = (await addButton(page, list.add).boundingBox())!;
      const last = (await cards.last().boundingBox())!;
      expect(last.y + last.height).toBeLessThanOrEqual(button.y);
    }).toPass();
  });

  // Collapsed cards are short, so their options sit closest to the bottom.
  test(`${list.name}: the options of the last entry can be tapped past the add button`, async ({
    page,
  }) => {
    await startWithData(page);
    await list.open(page);
    const cards = page.locator(list.card);
    await expect(cards.first()).toBeVisible();
    if (list.collapse) {
      await page
        .getByRole('button', { name: list.collapse })
        .filter({ visible: true })
        .click();
    }

    const options = cards
      .last()
      .getByRole('button', { name: list.options, exact: true });
    await scrollToEnd(listOf(page, list));
    await expect(options).toBeInViewport();
    await expect.poll(() => isUncovered(options)).toBe(true);
  });
}
