import { expect, type Page } from '@playwright/test';

/**
 * Opening the brew form logs this error in the browser: the form asks for a
 * refractometer that the web build reports as connected but cannot provide.
 * Tests that add a brew allow it until that is fixed in the brew form.
 */
export const BREW_FORM_REFRACTOMETER_ERROR = /reading 'resultEvent'/;

/**
 * Completes the first-run dialogs of a fresh install and adds one bean, a V60,
 * one grinder and one brew through the UI, so brew cards have content.
 * Freeze the clock before `page.goto` for a deterministic brew date.
 */
export async function completeFirstRunWithBrew(page: Page): Promise<void> {
  await page.getByRole('button', { name: "Don't activate" }).click();

  await page
    .getByRole('group', { name: '2 / 5' })
    .getByRole('button', { name: 'Add bean' })
    .click();
  await page
    .getByRole('textbox', { name: /^Name/ })
    .fill('Ethiopia Yirgacheffe Natural');
  await page.getByRole('button', { name: 'Save' }).click();

  await page
    .getByRole('group', { name: '3 / 5' })
    .getByRole('button', { name: 'Add Preparation method' })
    .click();
  await page.getByText('V60', { exact: true }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  await page
    .getByRole('group', { name: '4 / 5' })
    .getByRole('button', { name: 'Add grinder' })
    .click();
  await page.getByRole('textbox', { name: /^Name/ }).fill('Comandante C40');
  await page.getByRole('button', { name: 'Save' }).click();

  // See first-run.ts: the last welcome button has no accessible name yet.
  await page.getByRole('group', { name: '5 / 5' }).getByRole('button').click();
  await page.getByRole('button', { name: 'Understood' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: 'Add brew' }).click();
  await page.getByRole('textbox', { name: 'Ground Coffee (gr)' }).fill('18');
  await page.getByRole('textbox', { name: /^Amount of water/ }).fill('300');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
