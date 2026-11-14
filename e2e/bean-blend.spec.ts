import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { BEANS } from './support/bean-data';
import {
  beanCardValue,
  beanField,
  findBean,
  openAddBean,
  saveBean,
  showTab,
  startWithBeans,
  storedBean,
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
  await card.getByRole('button', { name: 'Bean options' }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(beanField(page, /^Name/)).toHaveValue(name);
}

test('the card of a blend numbers the fields of its varieties', async ({
  page,
}) => {
  await startWithBeans(page);
  const card = await findBean(page, BEANS.blend);

  await expect(beanCardValue(card, 'Bean mix')).toHaveText('Blend');
  for (const [index, country, percentage] of [
    [1, 'Ethiopia', '50'],
    [2, 'Brazil', '30'],
    [3, 'Colombia', '20'],
  ] as const) {
    await expect(beanCardValue(card, `${index}. Country`)).toHaveText(country);
    await expect(beanCardValue(card, `${index}. Percentage`)).toHaveText(
      percentage,
    );
  }
});

test('varieties of a blend are added, copied and deleted in the form', async ({
  page,
}) => {
  await startWithBeans(page);
  await openAddBean(page);
  await beanField(page, /^Name/).fill('Hausmischung');

  // A single origin bean has one variety without the tools of a blend.
  await showTab(varietyTab(page));
  const countries = beanField(page, 'Country');
  const percentages = beanField(page, 'Percentage');
  const copy = page.getByRole('button', { name: 'Copy variety information' });
  const remove = page.getByRole('button', { name: 'Delete variety' });
  const add = page.getByRole('button', { name: 'Add another bean type' });
  await expect(countries).toHaveCount(1);
  await expect(percentages).toHaveCount(0);
  await expect(copy).toHaveCount(0);
  await expect(add).toHaveCount(0);

  await showTab(page.getByRole('tab', { name: 'General' }));
  await chooseMix(page, 'Blend');
  await showTab(varietyTab(page));
  await expect(page.getByText(/^1\.\sBean Type$/)).toBeVisible();
  await expect(percentages).toHaveCount(1);
  // The only variety cannot be deleted.
  await expect(remove).toHaveCount(0);

  await add.click();
  await expect(countries).toHaveCount(2);
  await expect(remove).toHaveCount(1);
  await countries.nth(0).fill('Kenya');
  await percentages.nth(0).fill('60');
  await countries.nth(1).fill('Peru');
  await percentages.nth(1).fill('40');
  await percentages.nth(1).blur();

  // A copy is added at the end.
  await copy.nth(0).click();
  await expect(countries).toHaveCount(3);
  await expect(countries.nth(2)).toHaveValue('Kenya');
  await expect(percentages.nth(2)).toHaveValue('60');
  // Every variety but the first can be deleted; this deletes the second.
  await expect(remove).toHaveCount(2);
  await remove.nth(0).click();
  await expect(countries).toHaveCount(2);
  await expect(countries.nth(1)).toHaveValue('Kenya');
  await saveBean(page);

  expect(await storedVarieties(page, 'Hausmischung')).toEqual([
    ['Kenya', 60],
    ['Kenya', 60],
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
  await expect(beanField(page, 'Country')).toHaveCount(3);
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
  await expect(beanField(page, 'Country')).toHaveCount(1);
  await expect(beanField(page, 'Country')).toHaveValue('Ethiopia');
  await saveBean(page);

  // The percentage of the blend stays with it.
  expect(await storedVarieties(page, BEANS.blend)).toEqual([['Ethiopia', 50]]);
  expect((await storedBean(page, BEANS.blend)).beanMix).toBe('SINGLE_ORIGIN');
  const card = await findBean(page, BEANS.blend);
  await expect(beanCardValue(card, 'Country')).toHaveText('Ethiopia');
  await expect(beanCardValue(card, '2. Country')).toHaveCount(0);
});
