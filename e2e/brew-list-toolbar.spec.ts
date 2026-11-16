import { expect, test } from './fixtures';
import { openFromProfile } from './support/profile';
import { seedDatabase } from './support/seed';
import { generateDataSet } from './support/synthetic-data';

/**
 * The three icon buttons above the brew list have names a screen reader can
 * speak, in the app language, and the collapse toggle tells its state.
 */

test('the brew list buttons are named and the collapse toggle tells its state', async ({
  page,
}) => {
  await seedDatabase(page, generateDataSet({ brews: 12, beans: 3, seed: 5 }));
  await page.goto('/');
  await page.getByRole('tab', { name: 'Brews', exact: true }).click();

  await expect(
    page.getByRole('button', { name: 'Filter brews', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Sort brews', exact: true }),
  ).toBeVisible();

  const collapse = page.getByRole('button', {
    name: 'Collapse brew list items',
  });
  await expect(collapse).toHaveAttribute('aria-pressed', 'false');
  await collapse.click();
  await expect(collapse).toHaveAttribute('aria-pressed', 'true');
  await collapse.click();
  await expect(collapse).toHaveAttribute('aria-pressed', 'false');

  // An active sort order is part of the name, as the icon shows it.
  await page.getByRole('button', { name: 'Sort brews', exact: true }).click();
  await page.getByText('Bean name', { exact: true }).click();
  await page.getByRole('button', { name: 'Apply filter' }).click();
  await expect(
    page.getByRole('button', { name: 'Sort brews (active)' }),
  ).toBeVisible();
});

test('the brew list buttons are named in the app language', async ({
  page,
}) => {
  await seedDatabase(page, generateDataSet({ brews: 12, beans: 3, seed: 5 }));
  await page.goto('/');

  await openFromProfile(page, 'Settings');
  // By keyboard: a pointer hits the select's own control instead of its button.
  await page.getByRole('button', { name: /^Language Settings/ }).press('Enter');
  await page.getByRole('radio', { name: 'German' }).click();
  await page.getByRole('button', { name: 'Choose' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');

  await page.getByRole('button', { name: 'back' }).click();
  await page.getByRole('tab', { name: 'Brühungen', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Brühungen filtern', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Brühungen sortieren', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Einträge der Brühliste einklappen' }),
  ).toHaveAttribute('aria-pressed', 'false');
});
