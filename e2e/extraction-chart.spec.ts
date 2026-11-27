import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { axe } from './support/axe';
import { brewList } from './support/brew-form';
import { seedDatabase } from './support/seed';
import { generateDataSet } from './support/synthetic-data';

interface Entry {
  name: string;
  config: { uuid: string };
}

const CHARTS = [
  {
    style: 'filter',
    preparation: 'V60',
    brew: { tds: 1.35, grind_weight: 15, brew_beverage_quantity: 250 },
    name: 'Extraction chart: TDS 1.35 %, extraction yield 22.5 %',
  },
  {
    style: 'espresso',
    preparation: 'Espresso machine',
    brew: { tds: 9, grind_weight: 18, brew_beverage_quantity: 40 },
    name: 'Extraction chart: TDS 9 %, extraction yield 20 %',
  },
] as const;

/** Opens the extraction chart of the newest brew from its detail page. */
async function openExtractionChart(
  page: Page,
  preparation: string,
  brew: object,
): Promise<void> {
  const data = generateDataSet({
    brews: 5,
    beans: 2,
    archivedBeanShare: 0,
    seed: 3,
  });
  const preparations: Entry[] = data.PREPARATION;
  const uuid = preparations.find((p) => p.name === preparation)?.config.uuid;
  Object.assign(data.BREWS[data.BREWS.length - 1], brew, {
    method_of_preparation: uuid,
  });
  // The extraction yield is shown with the TDS, which is off by default.
  Object.assign(data.SETTINGS[0], { manage_parameters: { tds: true } });
  await seedDatabase(page, data);

  await page.goto('/');
  await page.getByRole('tab', { name: 'Brews', exact: true }).click();
  await brewList(page)
    .getByRole('button', { name: /^Options for the brew of / })
    .first()
    .click();
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await page.getByRole('button', { name: 'Show extraction chart' }).click();
}

for (const { style, preparation, brew, name } of CHARTS) {
  test(`the ${style} extraction chart is an image named after the brew's values`, async ({
    page,
  }) => {
    await openExtractionChart(page, preparation, brew);

    await expect(page.getByRole('img', { name, exact: true })).toBeVisible();
    const results = await axe(page)
      .include('app-brew-popover-extraction')
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
