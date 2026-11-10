import { expect, type Page } from '@playwright/test';

/**
 * Completes the first-run dialogs of a fresh install without adding data:
 * declines analytics, skips bean/method/grinder setup and dismisses "What's new".
 */
export async function completeFirstRun(page: Page): Promise<void> {
  await page.getByRole('button', { name: "Don't activate" }).click();

  // All welcome steps stay in the accessibility tree, so scope to the step being shown.
  for (const step of ['2 / 5', '3 / 5', '4 / 5']) {
    await page
      .getByRole('group', { name: step })
      .getByRole('button', { name: 'Skip' })
      .click();
  }

  // The final welcome button is icon-only without an accessible name (known a11y gap);
  // it is the only button in the last step. Replace with a named locator once it is labelled.
  await page.getByRole('group', { name: '5 / 5' }).getByRole('button').click();

  await page.getByRole('button', { name: 'Understood' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
