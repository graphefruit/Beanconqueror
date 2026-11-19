import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ROASTER_NORTH, ROASTER_SOUTH } from './support/bean-data';
import {
  openAddBean,
  showTab,
  startWithBeans,
  suggestionField,
} from './support/beans';

/**
 * The fields of the bean form that suggest the values of the stored beans are
 * comboboxes: the suggestions form a listbox below the field, the arrow keys
 * move through them while the focus stays in the field, Enter picks one and
 * Escape closes the list. Their number is announced.
 */

function suggestions(page: Page): Locator {
  return page.getByRole('listbox', { name: 'Suggestions' });
}

function liveRegion(page: Page): Locator {
  return page.locator('.cdk-live-announcer-element');
}

async function idOf(locator: Locator): Promise<string> {
  const id = await locator.getAttribute('id');
  expect(id).toBeTruthy();
  return id ?? '';
}

test('the roaster is picked from its suggestions with the keyboard', async ({
  page,
}) => {
  await startWithBeans(page);
  await openAddBean(page);

  const roaster = suggestionField(page, 'Roaster');
  await expect(roaster).toHaveAttribute('aria-autocomplete', 'list');
  await expect(roaster).toHaveAttribute('aria-expanded', 'false');

  await roaster.pressSequentially('rös');
  const list = suggestions(page);
  await expect(list.getByRole('option')).toHaveText([
    ROASTER_NORTH,
    ROASTER_SOUTH,
  ]);
  await expect(roaster).toHaveAttribute('aria-expanded', 'true');
  await expect(roaster).toHaveAttribute('aria-controls', await idOf(list));
  // The typed part stands out.
  await expect(list.getByRole('option').first().locator('strong')).toHaveText(
    'Rös',
  );
  await expect(liveRegion(page)).toHaveText('2 suggestions');

  await roaster.press('ArrowDown');
  const north = list.getByRole('option', { name: ROASTER_NORTH });
  await expect(north).toHaveAttribute('aria-selected', 'true');
  await expect(roaster).toHaveAttribute(
    'aria-activedescendant',
    await idOf(north),
  );

  await roaster.press('ArrowDown');
  const south = list.getByRole('option', { name: ROASTER_SOUTH });
  await expect(south).toHaveAttribute('aria-selected', 'true');
  await expect(north).toHaveAttribute('aria-selected', 'false');
  await expect(roaster).toHaveAttribute(
    'aria-activedescendant',
    await idOf(south),
  );

  await roaster.press('Enter');
  await expect(roaster).toHaveValue(ROASTER_SOUTH);
  await expect(list).toHaveCount(0);
  await expect(roaster).toHaveAttribute('aria-expanded', 'false');
  await expect(roaster).not.toHaveAttribute('aria-activedescendant');
  await expect(roaster).toBeFocused();
});

test('Escape closes the suggestions and leaves the form open', async ({
  page,
}) => {
  await startWithBeans(page);
  await openAddBean(page);

  const roaster = suggestionField(page, 'Roaster');
  await roaster.pressSequentially('rös');
  await expect(suggestions(page)).toBeVisible();

  await roaster.press('Escape');
  await expect(suggestions(page)).toHaveCount(0);
  await expect(roaster).toHaveAttribute('aria-expanded', 'false');
  await expect(roaster).toHaveValue('rös');
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('a country is picked from its suggestions with the keyboard', async ({
  page,
}) => {
  await startWithBeans(page);
  await openAddBean(page);
  await showTab(page.getByRole('tab', { name: 'Variety information' }));

  const country = suggestionField(page, 'Country');
  await country.pressSequentially('ia');
  await expect(suggestions(page).getByRole('option')).toHaveText([
    'Ethiopia',
    'Colombia',
  ]);

  // The up arrow starts at the last suggestion.
  await country.press('ArrowUp');
  await country.press('Enter');
  await expect(country).toHaveValue('Colombia');
  await expect(suggestions(page)).toHaveCount(0);
});
