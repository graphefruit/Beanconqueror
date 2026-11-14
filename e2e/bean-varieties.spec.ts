import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { setParameter } from './support/brew-form';
import { completeFirstRun } from './support/first-run';
import { openFromProfile } from './support/profile';
import { readStoredValue } from './support/stored-values';

interface StoredBean {
  name: string;
  bean_information: { country?: string }[];
}

/**
 * Ionic's scroll assist briefly shows a disabled copy of a focused input with
 * the same name; the user only ever types into the enabled one.
 */
function textField(page: Page, name: string | RegExp) {
  return page.getByRole('textbox', {
    name,
    exact: typeof name === 'string',
    disabled: false,
  });
}

/**
 * Ionic layers the segment button over its inner tab, so the tap is forced
 * through to where a finger would land; during a page transition it can get
 * lost, so tap until the tab is selected.
 */
async function showTab(page: Page, name: string): Promise<void> {
  const tab = page.getByRole('tab', { name });
  await expect(async () => {
    await tab.click({ force: true });
    await expect(tab).toHaveAttribute('aria-selected', 'true', {
      timeout: 1000,
    });
  }).toPass();
}

/** The variety information is switched off in a fresh install. */
async function enableVarietyInformation(page: Page): Promise<void> {
  await openFromProfile(page, 'Bean parameters');
  await page.getByText('Manage parameters', { exact: true }).click();
  await showTab(page, 'Variety information');
  await setParameter(page, 'Enable variety information', true);

  await page.getByRole('button', { name: 'back', exact: true }).click();
  await page
    .getByRole('banner')
    .filter({ hasText: 'Bean parameters' })
    .getByRole('button', { name: 'back', exact: true })
    .click();
  await expect(page).toHaveURL(/\/home\/profile$/);
}

async function openAddBean(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Beans' }).click();
  await page
    .getByRole('button', { name: 'Add bean' })
    .filter({ visible: true })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

/**
 * Opened from the keyboard: Ionic layers the select's visible wrapper over
 * its button, so a pointer click on the button itself never lands.
 */
async function openMix(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Blend/ }).focus();
  await page.keyboard.press('Enter');
}

async function saveBean(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('a suggestion picked in the second variety of a blend fills that variety', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await enableVarietyInformation(page);

  // The country suggestions come from the stored beans.
  await openAddBean(page);
  await textField(page, /^Name/).fill('Guji Natural');
  await showTab(page, 'Variety information');
  await textField(page, 'Country').fill('Ethiopia');
  await saveBean(page);

  await openAddBean(page);
  await textField(page, /^Name/).fill('House Blend');
  await openMix(page);
  const mix = page.getByRole('alertdialog', { name: 'Blend' });
  await mix.getByRole('radio', { name: 'Blend' }).click();
  await mix.getByRole('button', { name: 'Choose' }).click();
  await expect(mix).toHaveCount(0);
  await showTab(page, 'Variety information');
  await page.getByRole('button', { name: 'Add another bean type' }).click();

  const countries = textField(page, 'Country');
  await expect(countries).toHaveCount(2);
  await countries.nth(1).fill('Eth');

  const suggestion = page.getByRole('button', {
    name: 'Ethiopia',
    exact: true,
  });
  await expect(suggestion).toHaveCount(1);
  // The list closes shortly after the field is left; a tap delivers the
  // press and the release at once, as a finger does.
  await suggestion.tap();
  await expect(countries.nth(1)).toHaveValue('Ethiopia');
  await expect(countries.nth(0)).toHaveValue('');

  await saveBean(page);
  await expect
    .poll(async () => {
      const beans = (await readStoredValue<StoredBean[]>(page, 'BEANS')) ?? [];
      return beans
        .find((bean) => bean.name === 'House Blend')
        ?.bean_information.map((information) => information.country ?? '');
    })
    .toEqual(['', 'Ethiopia']);
});

test('a blend keeps its varieties when its mix is looked at but not changed', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await enableVarietyInformation(page);

  await openAddBean(page);
  await textField(page, /^Name/).fill('House Blend');
  await openMix(page);
  const mix = page.getByRole('alertdialog', { name: 'Blend' });
  await mix.getByRole('radio', { name: 'Blend' }).click();
  await mix.getByRole('button', { name: 'Choose' }).click();
  await expect(mix).toHaveCount(0);
  await showTab(page, 'Variety information');
  await page.getByRole('button', { name: 'Add another bean type' }).click();
  const countries = textField(page, 'Country');
  await expect(countries).toHaveCount(2);
  await countries.nth(0).fill('Ethiopia');
  await countries.nth(1).fill('Brazil');
  await saveBean(page);

  await page.getByRole('button', { name: 'Bean options' }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await openMix(page);
  await expect(mix.getByRole('radio', { name: 'Blend' })).toBeChecked();
  await mix.getByRole('button', { name: 'Cancel' }).click();
  await expect(mix).toHaveCount(0);
  // Leaves the mix field, as the tap on the next field or on Save does.
  await textField(page, /^Name/).focus();
  await saveBean(page);

  await expect
    .poll(async () => {
      const beans = (await readStoredValue<StoredBean[]>(page, 'BEANS')) ?? [];
      return beans
        .find((bean) => bean.name === 'House Blend')
        ?.bean_information.map((information) => information.country ?? '');
    })
    .toEqual(['Ethiopia', 'Brazil']);

  await page.getByText('House Blend', { exact: true }).click();
  await expect(page.getByText('Bean details')).toBeVisible();
  await showTab(page, 'Variety information');
  await expect(page.getByText(/^1\.\sBean Type$/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ethiopia' })).toBeVisible();
  await expect(page.getByText(/^2\.\sBean Type$/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Brazil' })).toBeVisible();
});
