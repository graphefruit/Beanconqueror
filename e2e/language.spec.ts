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

test('a text not yet translated shows in English, not empty', async ({
  page,
}) => {
  // Lokalise writes a text not yet translated as an empty string. The Italian
  // file is changed here, so the case holds whatever Lokalise delivers next.
  await page.route('**/assets/i18n/it.json', async (route) => {
    const response = await route.fetch();
    const texts = (await response.json()) as Record<string, unknown>;
    await route.fulfill({
      response,
      json: { ...texts, PAGE_SETTINGS_LANGUAGE: '' },
    });
  });
  await page.goto('/');
  await completeFirstRun(page);

  await openFromProfile(page, 'Settings');
  await page.getByRole('button', { name: /^Language Settings/ }).press('Enter');
  await page.getByRole('radio', { name: 'Italiano' }).click();
  await page.getByRole('button', { name: 'Choose' }).click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.getByText('Impostazioni generali')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Language Settings/ }),
  ).toBeVisible();
});
