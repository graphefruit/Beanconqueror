import { type Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Reads one value from the app database (Ionic Storage on IndexedDB). */
async function readStoredValue(page: Page, key: string): Promise<any> {
  return await page.evaluate(
    (_key) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('__baristaDB');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('_ionickv')) {
            db.close();
            resolve(null);
            return;
          }
          const request = db
            .transaction('_ionickv', 'readonly')
            .objectStore('_ionickv')
            .get(_key);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            db.close();
            resolve(request.result ?? null);
          };
        };
      }),
    key,
  );
}

test('a new installation gets a stable device id and the beginner mode', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);

  await expect
    .poll(async () => (await readStoredValue(page, 'DEVICE'))?.device_id)
    .toMatch(UUID_V4);
  const firstStart = await readStoredValue(page, 'DEVICE');
  const settings = await readStoredValue(page, 'SETTINGS');
  expect(settings[0].user.experience_mode).toBe('beginner');
  expect(firstStart.device_id).not.toBe(settings[0].matomo_analytics_id);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Add brew' })).toBeVisible();

  expect(await readStoredValue(page, 'DEVICE')).toEqual(firstStart);
  expect(
    (await readStoredValue(page, 'SETTINGS'))[0].user.experience_mode,
  ).toBe('beginner');
});
