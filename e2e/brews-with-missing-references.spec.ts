import { expect, test } from './fixtures';
import { seedDatabase } from './support/seed';
import { generateDataSet } from './support/synthetic-data';

/**
 * Data can hold brews whose bean, grinder or preparation method is gone, as
 * after an import of data that was damaged. Such brews are still listed and
 * can be opened; the pages around them keep working.
 */

interface Entry {
  config: { uuid: string };
}

const MISSING = [
  { what: 'bean', reference: 'bean', collection: 'BEANS' },
  { what: 'grinder', reference: 'mill', collection: 'MILL' },
  {
    what: 'preparation method',
    reference: 'method_of_preparation',
    collection: 'PREPARATION',
  },
] as const;

for (const { what, reference, collection } of MISSING) {
  test(`brews are listed and open when the ${what} of the newest one is gone`, async ({
    page,
  }) => {
    const data = generateDataSet({ brews: 40, beans: 6, seed: 3 });
    // Brews are stored oldest first; the newest is the first card.
    const gone = data.BREWS[data.BREWS.length - 1][reference];
    const entries: Entry[] = data[collection];
    Object.assign(data, {
      [collection]: entries.filter((entry) => entry.config.uuid !== gone),
    });
    await seedDatabase(page, data);

    await page.goto('/');
    await page.getByRole('tab', { name: 'Brews', exact: true }).click();

    await expect(
      page.getByRole('tab', { name: /^Current \( [1-9]\d* \)$/ }),
    ).toBeVisible();
    const newest = page.locator('brew-information:visible').first();
    await expect(newest).toBeVisible();
    await newest.locator('ion-card').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
}
