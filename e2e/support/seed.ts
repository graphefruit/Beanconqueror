import type { Page } from '@playwright/test';

const SEED_PAGE = '/__seed__/page';
const SEED_DATA = '/__seed__/data.json';

/**
 * Writes the data set into the app's database before the app starts, as an existing installation
 * would have it: Ionic Storage keeps one entry per collection in the IndexedDB store `_ionickv`
 * of the database `__baristaDB` (src/main.ts). A blank page on the app origin does the writing,
 * so the app is not running meanwhile.
 */
export async function seedDatabase(
  page: Page,
  data: object,
  json: string = JSON.stringify(data),
): Promise<void> {
  await page.route(`**${SEED_PAGE}`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>seed</title>',
    }),
  );
  await page.route(`**${SEED_DATA}`, (route) =>
    route.fulfill({ contentType: 'application/json', body: json }),
  );
  await page.goto(SEED_PAGE);
  await page.evaluate(async (url) => {
    const entries = (await (await fetch(url)).json()) as Record<
      string,
      unknown
    >;
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('__baristaDB');
      request.onupgradeneeded = () =>
        request.result.createObjectStore('_ionickv');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('open failed'));
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('_ionickv', 'readwrite');
      const store = transaction.objectStore('_ionickv');
      for (const [key, value] of Object.entries(entries)) {
        store.put(value, key);
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('write failed'));
    });
    db.close();
  }, SEED_DATA);
  await page.unroute(`**${SEED_PAGE}`);
  await page.unroute(`**${SEED_DATA}`);
}
