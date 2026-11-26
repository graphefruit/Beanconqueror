import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { BEANS } from './support/bean-data';
import {
  beanField,
  findBean,
  openAddBean,
  saveBean,
  showTab,
  startWithBeans,
  storedBean,
  suggestionField,
} from './support/beans';

/**
 * Characterization of blends as they work today: a blend has a numbered
 * card per variety in the form and numbered fields on its list card; a
 * single origin bean has exactly one variety.
 */

const varietyTab = (page: Page) =>
  page.getByRole('tab', { name: 'Variety information' });

/**
 * Chooses the mix of the bean in the form. Opened from the keyboard: Ionic
 * layers the select's visible wrapper over its button, so a pointer click on
 * the button itself never lands.
 */
async function chooseMix(
  page: Page,
  option: 'Single Origin' | 'Blend',
): Promise<void> {
  await page.getByRole('button', { name: /^Blend, / }).focus();
  await page.keyboard.press('Enter');
  const mix = page.getByRole('alertdialog', { name: 'Blend' });
  await mix.getByRole('radio', { name: option, exact: true }).click();
  await mix.getByRole('button', { name: 'Choose' }).click();
  await expect(mix).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: `Blend, ${option}` }),
  ).toBeVisible();
}

async function storedVarieties(page: Page, name: string) {
  const bean = await storedBean(page, name);
  return bean.bean_information.map((variety) => [
    variety.country ?? '',
    variety.percentage ?? 0,
  ]);
}

async function editBean(page: Page, name: string): Promise<void> {
  const card = await findBean(page, name);
  await card.getByRole('button', { name: /^Options for / }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(beanField(page, /^Name/)).toHaveValue(name);
}

test('varieties added to a blend in the form are stored', async ({ page }) => {
  // Which buttons a variety has and what they do is checked by unit tests.
  await startWithBeans(page);
  await openAddBean(page);
  await beanField(page, /^Name/).fill('Hausmischung');
  await chooseMix(page, 'Blend');
  await showTab(varietyTab(page));

  await page.getByRole('button', { name: 'Add another bean type' }).click();
  const countries = suggestionField(page, 'Country');
  const percentages = beanField(page, 'Percentage');
  await expect(countries).toHaveCount(2);
  await countries.nth(0).fill('Kenya');
  await percentages.nth(0).fill('60');
  await countries.nth(1).fill('Peru');
  await percentages.nth(1).fill('40');
  await percentages.nth(1).blur();
  await saveBean(page);

  expect(await storedVarieties(page, 'Hausmischung')).toEqual([
    ['Kenya', 60],
    ['Peru', 40],
  ]);
  expect((await storedBean(page, 'Hausmischung')).beanMix).toBe('BLEND');
});

test('a blend keeps all varieties when it is saved after a look at its mix', async ({
  page,
}) => {
  await startWithBeans(page);
  await editBean(page, BEANS.blend);

  await page.getByRole('button', { name: 'Blend, Blend' }).focus();
  await showTab(varietyTab(page));
  await expect(suggestionField(page, 'Country')).toHaveCount(3);
  await showTab(page.getByRole('tab', { name: 'General' }));
  await saveBean(page);

  expect(await storedVarieties(page, BEANS.blend)).toEqual([
    ['Ethiopia', 50],
    ['Brazil', 30],
    ['Colombia', 20],
  ]);
});

test('a blend turned into a single origin bean keeps its first variety only', async ({
  page,
}) => {
  await startWithBeans(page);
  await editBean(page, BEANS.blend);

  await chooseMix(page, 'Single Origin');
  await showTab(varietyTab(page));
  await expect(suggestionField(page, 'Country')).toHaveCount(1);
  await expect(suggestionField(page, 'Country')).toHaveValue('Ethiopia');
  await saveBean(page);

  // The percentage of the blend stays with it.
  expect(await storedVarieties(page, BEANS.blend)).toEqual([['Ethiopia', 50]]);
  expect((await storedBean(page, BEANS.blend)).beanMix).toBe('SINGLE_ORIGIN');
});
