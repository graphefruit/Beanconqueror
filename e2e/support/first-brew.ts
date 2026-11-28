import { expect, type Page } from '@playwright/test';

import { FIRST_BREW_DATA } from './first-brew-data';
import { seedDatabase } from './seed';

/**
 * Completes the first-run dialogs of a fresh install and adds one bean, a V60,
 * one grinder and one brew through the UI, so brew cards have content. Ends on
 * the Brews tab. Freeze the clock before `page.goto` for a deterministic brew
 * date.
 */
export async function completeFirstRunWithBrew(page: Page): Promise<void> {
  await page.getByRole('button', { name: "Don't activate" }).click();

  await page
    .getByRole('group', { name: 'Step 2 of 5' })
    .getByRole('button', { name: 'Add bean' })
    .click();
  await page
    .getByRole('textbox', { name: /^Name/ })
    .fill('Ethiopia Yirgacheffe Natural');
  await page.getByRole('button', { name: 'Save' }).click();

  await page
    .getByRole('group', { name: 'Step 3 of 5' })
    .getByRole('button', { name: 'Add Preparation method' })
    .click();
  await page.getByText('V60', { exact: true }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  await page
    .getByRole('group', { name: 'Step 4 of 5' })
    .getByRole('button', { name: 'Add grinder' })
    .click();
  await page.getByRole('textbox', { name: /^Name/ }).fill('Comandante C40');
  await page.getByRole('button', { name: 'Save' }).click();

  await page
    .getByRole('group', { name: 'Step 5 of 5' })
    .getByRole('button', { name: 'Next' })
    .click();
  await page.getByRole('button', { name: 'Understood' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: 'Add brew' }).click();
  await page.getByRole('textbox', { name: 'Ground Coffee (gr)' }).fill('18');
  await page.getByRole('textbox', { name: /^Amount of water/ }).fill('300');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // The home page switches to the Brews tab once the form has closed, and
  // until the brew list is shown its own "Add brew" and brew buttons are
  // still on screen. Ionic selects the tab only when the switch is done.
  await expect(
    page.getByRole('tab', { name: 'Brews', selected: true }),
  ).toBeVisible();
}

export type FirstBrewData = typeof FIRST_BREW_DATA;

/**
 * Starts the app with what `completeFirstRunWithBrew` stores, written into the database before
 * the start, and ends on the Brews tab as that does. For tests that do not check the first run
 * itself: through the UI it takes up to 22 s of a test's 30 s in a cold WebKit worker. `now` is
 * the time of the brew; pass the time of a frozen clock. `change` adjusts a copy of the data
 * before it is written, e.g. to hide parameters as an existing installation may have them.
 */
export async function startWithFirstBrew(
  page: Page,
  now: Date = new Date(),
  change?: (data: FirstBrewData) => void,
): Promise<void> {
  const data = structuredClone(FIRST_BREW_DATA);
  change?.(data);
  const shift = now.getTime() - FIRST_BREW_DATA.BREWS[0].config.created_at;
  const json = JSON.stringify(data, (key, value: unknown) => {
    if (typeof value !== 'number') {
      return value;
    }
    if (key === 'unix_timestamp') {
      return value + Math.round(shift / 1000);
    }
    return key === 'created_at' || key === 'updated_at' ? value + shift : value;
  });
  await seedDatabase(page, {}, json);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Brews' }).click();
  await expect(
    page.getByRole('tab', { name: 'Brews', selected: true }),
  ).toBeVisible();
}
