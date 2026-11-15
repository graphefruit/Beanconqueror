import type { Page } from '@playwright/test';

const SEED_PAGE = '/__seed__/page';
const SEED_DATA = '/__seed__/data.json';
/** Characters of the data per response. */
const PART_LENGTH = 16 * 1024 * 1024;

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
  // In parts: a browser closes when one response is larger than about 100 MB, and 50,000 brews
  // are 78 MB before the protocol encodes them.
  const parts = Math.ceil(json.length / PART_LENGTH);
  await page.route(`**${SEED_DATA}?part=*`, (route) => {
    const part = Number(
      new URL(route.request().url()).searchParams.get('part'),
    );
    return route.fulfill({
      contentType: 'text/plain',
      body: json.slice(part * PART_LENGTH, (part + 1) * PART_LENGTH),
    });
  });
  await page.goto(SEED_PAGE);
  await page.evaluate(
    async ({ url, parts }) => {
      let text = '';
      for (let part = 0; part < parts; part++) {
        text += await (await fetch(`${url}?part=${part}`)).text();
      }
      const entries = JSON.parse(text) as Record<string, unknown>;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('__baristaDB');
        request.onupgradeneeded = () =>
          request.result.createObjectStore('_ionickv');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error('open failed'));
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
    },
    { url: SEED_DATA, parts },
  );
  await page.unroute(`**${SEED_PAGE}`);
  await page.unroute(`**${SEED_DATA}?part=*`);
}
