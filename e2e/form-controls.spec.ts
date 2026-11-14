import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';
import { openFromProfile } from './support/profile';

/**
 * The basic form controls stay operable by role and expose their state to
 * assistive technology: checkboxes, radios and switches report checked,
 * sliders move with the arrow keys, and text fields have a visible label and
 * announce a missing required value.
 */

/**
 * Ionic's scroll assist briefly shows a disabled copy of a focused input with
 * the same name; the user only ever types into the enabled one.
 */
function textField(page: Page, name: string | RegExp) {
  return page.getByRole('textbox', { name, disabled: false });
}

async function openAddBean(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Beans' }).click();
  await page.getByRole('button', { name: 'Add bean' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await completeFirstRun(page);
});

test('a settings checkbox can be switched on and off', async ({ page }) => {
  await openFromProfile(page, 'Settings');

  const fastRepeat = page.getByRole('checkbox', { name: /^Fast brew repeat/ });
  await expect(fastRepeat).not.toBeChecked();
  await fastRepeat.click();
  await expect(fastRepeat).toBeChecked();
  await fastRepeat.click();
  await expect(fastRepeat).not.toBeChecked();
});

test('a choice list marks the picked option as checked', async ({ page }) => {
  await openAddBean(page);
  // Opened from the keyboard: Ionic layers the select's visible wrapper over
  // its button, so a pointer click on the button itself never lands.
  await page.getByRole('button', { name: /^Roast type/ }).focus();
  await page.keyboard.press('Enter');

  const choices = page.getByRole('alertdialog', { name: 'Roast type' });
  await expect(choices.getByRole('radio', { name: 'Unknown' })).toBeChecked();
  const filter = choices.getByRole('radio', { name: 'Filter' });
  await filter.click();
  await expect(filter).toBeChecked();
  await expect(
    choices.getByRole('radio', { name: 'Unknown' }),
  ).not.toBeChecked();
});

test('the add-bean form labels its fields and its rating slider follows the arrow keys', async ({
  page,
}) => {
  await openAddBean(page);

  const name = textField(page, /^Name/);
  await expect(name).toBeVisible();
  // The label is shown on screen, not only exposed to screen readers.
  await expect(page.getByText(/^Name\*?$/)).toBeVisible();

  const rating = page.getByRole('slider', { name: /Rating/ });
  await expect(rating).toHaveAttribute('aria-valuenow', '0');
  await rating.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(rating).toHaveAttribute('aria-valuenow', '2');
  await page.keyboard.press('ArrowLeft');
  await expect(rating).toHaveAttribute('aria-valuenow', '1');
});

test('leaving the required bean name empty is announced as an error', async ({
  page,
}) => {
  await openAddBean(page);

  const name = textField(page, /^Name/);
  await expect(name).not.toHaveAttribute('aria-invalid', 'true');
  await name.click();
  await textField(page, 'Roaster').click();

  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toHaveAccessibleDescription(
    'Please enter a name for these beans.',
  );

  await name.fill('Ethiopia Guji');
  await textField(page, 'Roaster').click();
  await expect(name).not.toHaveAttribute('aria-invalid', 'true');
});

test('the favourites filter switch can be turned on and off', async ({
  page,
}) => {
  await openAddBean(page);
  await textField(page, /^Name/).fill('Ethiopia Guji');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page
    .getByRole('button', { name: /filter/i })
    .first()
    .click();
  const favourites = page.getByRole('switch', { name: 'Only favorites' });
  await expect(favourites).not.toBeChecked();
  await favourites.click();
  await expect(favourites).toBeChecked();
  await favourites.click();
  await expect(favourites).not.toBeChecked();
});
