import { expect, type Page } from '@playwright/test';

/**
 * Opens a page the way users reach every section that is not a tab of its
 * own: the Profile tab, then the hub entry whose name starts with `entry`
 * (the entry's description follows in its accessible name). The tab shows the
 * page it was left on; tapping it again goes back to the hub.
 */
export async function openFromProfile(
  page: Page,
  entry: string,
): Promise<void> {
  const tab = page.getByRole('tab', { name: 'Profile', exact: true });
  await expect(async () => {
    await tab.click();
    await expect(page).toHaveURL(/\/home\/profile$/, { timeout: 2000 });
  }).toPass();
  const name = new RegExp(`^${entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  await page.getByRole('link', { name }).click();
}
