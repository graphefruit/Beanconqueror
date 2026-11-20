import { expect, type Page } from '@playwright/test';

/**
 * Completes the first-run dialogs of a fresh install without adding data:
 * declines analytics, skips bean/method/grinder setup and dismisses "What's new".
 */
export async function completeFirstRun(page: Page): Promise<void> {
  await page.getByRole('button', { name: "Don't activate" }).click();

  // Only the step being shown is in the accessibility tree; its name says which.
  for (const step of ['Step 2 of 5', 'Step 3 of 5', 'Step 4 of 5']) {
    await page
      .getByRole('group', { name: step })
      .getByRole('button', { name: 'Skip' })
      .click();
  }

  await page
    .getByRole('group', { name: 'Step 5 of 5' })
    .getByRole('button', { name: 'Next' })
    .click();

  await page.getByRole('button', { name: 'Understood' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
