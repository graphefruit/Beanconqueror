import { expect, test } from './fixtures';

interface PersistProbe {
  __persistRequests: { count: number };
}

test('the app asks the browser at start-up to keep its database', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const requests = { count: 0 };
    (window as unknown as PersistProbe).__persistRequests = requests;
    navigator.storage.persist = () => {
      requests.count++;
      return Promise.resolve(true);
    };
  });

  await page.goto('/');

  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as PersistProbe).__persistRequests.count,
      ),
    )
    .toBe(1);
  await expect(page.locator('ion-app')).toBeVisible();
});
