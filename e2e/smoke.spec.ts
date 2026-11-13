import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';

test('a new user can finish onboarding and move between the main sections', async ({
  page,
}) => {
  await page.goto('/');

  await completeFirstRun(page);

  await expect(page.getByRole('tab', { name: 'Home' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Add brew' })).toBeVisible();

  await page.getByRole('tab', { name: 'Beans' }).click();

  await expect(page.getByRole('tab', { name: 'Beans' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Add bean' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Available/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Profile' }).click();

  await expect(page.getByRole('tab', { name: 'Profile' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('link', { name: /^Preparation methods/ }).click();
  await expect(
    page.getByRole('button', { name: 'Add preparation method' }),
  ).toBeVisible();
});
