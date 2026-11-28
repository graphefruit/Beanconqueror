import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ROASTER_NORTH } from './support/bean-data';
import { openAddBean, startWithBeans, suggestionField } from './support/beans';
import { brewField, openAddBrew } from './support/brew-form';
import { contrast, firstColour } from './support/colour';
import { seedDatabase } from './support/seed';
import { generateDataSet } from './support/synthetic-data';

/**
 * The suggestions below a field of the bean form and the active one stand out
 * from the list in light and dark. The free text fields of the brew form
 * suggest what earlier brews hold, by keyboard and with the number of
 * suggestions announced.
 */

function suggestions(page: Page): Locator {
  return page.getByRole('listbox', { name: 'Suggestions' });
}

for (const dark of [false, true]) {
  const theme = dark ? 'dark' : 'light';
  test(`the suggestions and the active one are readable (${theme})`, async ({
    page,
  }) => {
    await startWithBeans(page);
    await openAddBean(page);
    await page.evaluate(
      (on) => document.documentElement.classList.toggle('ion-palette-dark', on),
      dark,
    );

    const roaster = suggestionField(page, 'Roaster');
    await roaster.pressSequentially('rös');
    await roaster.press('ArrowDown');
    const active = suggestions(page).getByRole('option', {
      name: ROASTER_NORTH,
    });
    await expect(active).toHaveAttribute('aria-selected', 'true');

    const colours = await active.evaluate((option) => {
      const list = getComputedStyle(option.parentElement!);
      const style = getComputedStyle(option);
      return {
        text: style.color,
        ring: style.outlineColor,
        surface: list.backgroundColor,
      };
    });
    const surface = firstColour(colours.surface);
    expect(contrast(firstColour(colours.text), surface)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrast(firstColour(colours.ring), surface)).toBeGreaterThanOrEqual(
      3,
    );
  });
}

/** Earlier brews, each field with two values that share a word and one that does not. */
const VESSELS = [
  { vessel_name: 'Carafe', vessel_weight: 300 },
  { vessel_name: 'Carafe', vessel_weight: 350 },
  { vessel_name: 'Carafe', vessel_weight: 300 },
  { vessel_name: 'Cup', vessel_weight: 200 },
];

const BREW_FIELDS = [
  {
    field: 'pressure_profile',
    name: 'Profile',
    values: ['Turbo shot', 'Turbo shot', 'Turbo bloom', 'Flat 9 bar'],
    query: 'turbo',
  },
  {
    field: 'coffee_type',
    name: 'Coffee Type',
    values: ['Lungo', 'Lungo doppio', 'Ristretto', 'Lungo'],
    query: 'lungo',
  },
] as const;

async function startWithBrewTexts(page: Page): Promise<void> {
  const data = generateDataSet({
    brews: 6,
    beans: 2,
    archivedBeanShare: 0,
    seed: 3,
  });
  for (const [index, brew] of data.BREWS.entries()) {
    for (const { field, values } of BREW_FIELDS) {
      brew[field] = values[index] ?? '';
    }
    Object.assign(
      brew,
      VESSELS[index] ?? { vessel_name: '', vessel_weight: 0 },
    );
  }
  Object.assign(data.SETTINGS[0], {
    manage_parameters: {
      pressure_profile: true,
      coffee_type: true,
      vessel: true,
    },
  });
  await seedDatabase(page, data);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Brews', exact: true }).click();
  await expect(
    page.getByRole('tab', { name: 'Brews', selected: true }),
  ).toBeVisible();
  await openAddBrew(page);
}

for (const { name, query } of BREW_FIELDS) {
  test(`the brew field "${name}" suggests earlier values by keyboard`, async ({
    page,
  }) => {
    await startWithBrewTexts(page);
    const field = suggestionField(page, name);
    // The coffee type is taken over from the last brew.
    await field.fill('');

    await field.pressSequentially(query);
    const options = suggestions(page).getByRole('option');
    await expect(options).toHaveCount(2);
    await expect(page.locator('.cdk-live-announcer-element')).toHaveText(
      '2 suggestions',
    );

    await field.press('ArrowDown');
    await field.press('ArrowDown');
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(field).toHaveAttribute(
      'aria-activedescendant',
      (await options.nth(1).getAttribute('id'))!,
    );
    const second = (await options.nth(1).textContent())!.trim();
    await field.press('Enter');
    await expect(field).toHaveValue(second);
    await expect(suggestions(page)).toHaveCount(0);

    await field.fill('');
    await field.pressSequentially(query);
    await expect(options).toHaveCount(2);
    await field.press('Escape');
    await expect(suggestions(page)).toHaveCount(0);
    await expect(field).toHaveValue(query);
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });
}

test('the vessel suggestion sets the name and the weight together', async ({
  page,
}) => {
  await startWithBrewTexts(page);
  const name = suggestionField(page, 'Vessel name');
  const weight = brewField(page, 'Vessel weight');
  // The vessel may be taken over from the last brew.
  await name.fill('');
  await weight.fill('');

  await name.pressSequentially('car');
  const options = suggestions(page).getByRole('option');
  await expect(options).toHaveText(['Carafe – 300 g', 'Carafe – 350 g']);
  await expect(page.locator('.cdk-live-announcer-element')).toHaveText(
    '2 suggestions',
  );

  await name.press('ArrowDown');
  await name.press('ArrowDown');
  await name.press('Enter');
  await expect(name).toHaveValue('Carafe');
  await expect(weight).toHaveValue('350');
  await expect(suggestions(page)).toHaveCount(0);

  await weight.fill('3');
  await expect(suggestions(page)).toHaveCount(0);
});
