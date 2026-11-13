import { type Page } from '@playwright/test';

/** Reads one value from the app database (Ionic Storage on IndexedDB). */
export async function readStoredValue<T>(
  page: Page,
  key: string,
): Promise<T | null> {
  const value: unknown = await page.evaluate(
    (_key) =>
      new Promise<unknown>((resolve, reject) => {
        const open = indexedDB.open('__baristaDB');
        open.onerror = () =>
          reject(open.error ?? new Error('Could not open the database'));
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
          request.onerror = () =>
            reject(request.error ?? new Error('Could not read ' + _key));
          request.onsuccess = () => {
            db.close();
            resolve(request.result ?? null);
          };
        };
      }),
    key,
  );
  return value as T | null;
}
