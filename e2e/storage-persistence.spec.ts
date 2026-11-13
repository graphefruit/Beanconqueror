import { expect, test } from './fixtures';

test('the app asks the browser at start-up to keep its database', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const requests = { count: 0 };
    (window as any).__persistRequests = requests;
    navigator.storage.persist = () => {
      requests.count++;
      return Promise.resolve(true);
    };
  });

  await page.goto('/');

  await expect
    .poll(() => page.evaluate(() => (window as any).__persistRequests.count))
    .toBe(1);
  await expect(page.locator('ion-app')).toBeVisible();
});
