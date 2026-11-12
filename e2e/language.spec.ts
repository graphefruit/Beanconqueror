import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';

test('the chosen app language is announced to assistive technology', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await page.getByRole('button', { name: 'menu' }).click();
  await page
    .getByRole('link', { name: 'Settings' })
    .or(page.getByRole('button', { name: 'Settings' }))
    .or(page.getByRole('menuitem', { name: 'Settings' }))
    .first()
    .click();
  // Opened by keyboard, as screen reader users do.
  await page.getByRole('button', { name: /^Language Settings/ }).press('Enter');
  await page.getByRole('radio', { name: 'German' }).click();
  await page.getByRole('button', { name: 'Choose' }).click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.getByText('Spracheinstellung')).toBeVisible();
});
