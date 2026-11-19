import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';
import { openFromProfile } from './support/profile';

test('the chosen app language is announced to assistive technology', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await openFromProfile(page, 'Settings');
  // Opened by keyboard, as screen reader users do.
  await page.getByRole('button', { name: /^Language Settings/ }).press('Enter');
  await page.getByRole('radio', { name: 'German' }).click();
  await page.getByRole('button', { name: 'Choose' }).click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.getByText('Spracheinstellung')).toBeVisible();

  // Names for screen readers are translated too, the back button's included.
  // It takes its name when its page opens.
  await page.locator('settings ion-back-button').click();
  await page
    .locator('app-profile')
    .getByRole('link', { name: /^Einstellungen/ })
    .click();
  await expect(
    page
      .locator('settings')
      .getByRole('button', { name: 'Zurück', exact: true }),
  ).toBeVisible();
});
