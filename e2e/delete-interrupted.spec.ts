import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { createBeanDataSet } from './support/bean-data';
import { BEAN_TEST_NOW } from './support/beans';
import { openFromProfile } from './support/profile';
import { seedDatabase } from './support/seed';
import { readStoredValue } from './support/stored-values';

/**
 * A deletion of an entry with the entries depending on it that the app did
 * not return from leaves a note. The next start deletes the entry when
 * nothing depends on it any more, and never what depends on it.
 */

interface Stored {
  config: { uuid: string; rev?: number };
}

const DOOMED = 'Doomed grinder';
const DOOMED_UUID = 'doomed-uuid';

const uuids = (entries: readonly Stored[]) =>
  entries.map((entry) => entry.config.uuid);

async function storedUuids(page: Page, key: string): Promise<string[]> {
  return uuids((await readStoredValue<Stored[]>(page, key)) ?? []);
}

/** The data set with a second grinder, named by every `brewsOfIt`-th brew. */
function dataWithDoomedGrinder(brewsOfIt: number | undefined) {
  const base = createBeanDataSet({ now: BEAN_TEST_NOW });
  const [kept] = base.MILL;
  const doomed = {
    ...kept,
    name: DOOMED,
    config: { ...kept.config, uuid: DOOMED_UUID },
  };
  return {
    kept,
    doomed,
    data: {
      ...base,
      MILL: [kept, doomed],
      BREWS: base.BREWS.map((brew, i) =>
        brewsOfIt !== undefined && i % brewsOfIt === 0
          ? { ...brew, mill: DOOMED_UUID }
          : brew,
      ),
      PENDING_DELETION: {
        collection: 'MILL',
        uuid: DOOMED_UUID,
        started_at: new Date(BEAN_TEST_NOW).getTime() - 60_000,
      },
    },
  };
}

async function startWith(page: Page, data: object): Promise<void> {
  await page.clock.install({ time: BEAN_TEST_NOW });
  await seedDatabase(page, data);
  await page.goto('/');
  await openFromProfile(page, 'Grinders');
  await expect(page.locator('mill-information-card').first()).toBeVisible();
}

test('the next start deletes the entry that was left without the entries depending on it', async ({
  page,
}) => {
  const { kept, doomed, data } = dataWithDoomedGrinder(undefined);

  await startWith(page, data);

  await expect(
    page.locator('mill-information-card').filter({ hasText: DOOMED }),
  ).toHaveCount(0);
  expect(await storedUuids(page, 'MILL')).toEqual([kept.config.uuid]);
  expect(await storedUuids(page, 'BREWS')).toEqual(uuids(data.BREWS));
  const device = await readStoredValue<{ device_id: string }>(page, 'DEVICE');
  await expect
    .poll(() => readStoredValue(page, 'DELETION_JOURNAL'))
    .toEqual([
      {
        collection: 'MILL',
        uuid: DOOMED_UUID,
        deleted_at: expect.any(Number),
        device_id: device?.device_id,
        rev: doomed.config.rev ?? 0,
      },
    ]);
  expect(await readStoredValue(page, 'PENDING_DELETION')).toBeNull();
});

test('the next start deletes nothing while entries still depend on the entry', async ({
  page,
}) => {
  const { kept, data } = dataWithDoomedGrinder(2);
  expect(
    data.BREWS.filter((brew) => brew.mill === DOOMED_UUID).length,
  ).toBeGreaterThan(1);

  await startWith(page, data);

  await expect(
    page.locator('mill-information-card').filter({ hasText: DOOMED }),
  ).toBeVisible();
  expect(await storedUuids(page, 'MILL')).toEqual([
    kept.config.uuid,
    DOOMED_UUID,
  ]);
  expect(await storedUuids(page, 'BREWS')).toEqual(uuids(data.BREWS));
  expect(await readStoredValue(page, 'DELETION_JOURNAL')).toBeNull();
  // The note is acted on once: a later start does not delete the entry
  // either, whatever depends on it then.
  expect(await readStoredValue(page, 'PENDING_DELETION')).toBeNull();
});

test('the next start finishes the deletion only after the data updates', async ({
  page,
}) => {
  const { kept, doomed, data } = dataWithDoomedGrinder(undefined);
  // As an older version left it: a differing copy shares the uuid of the
  // entry, and the update that makes it an entry of its own is not done.
  const copy = { ...doomed, name: 'Copied grinder' };
  const [version] = data.VERSION;

  await startWith(page, {
    ...data,
    MILL: [kept, doomed, copy],
    VERSION: [
      {
        ...version,
        updatedDataVersions: version.updatedDataVersions.filter(
          (update) => update !== 'UPDATE_17',
        ),
      },
    ],
  });

  // Finished before the update, the copy would keep the uuid of the entry
  // that was deleted.
  await expect(
    page.locator('mill-information-card').filter({ hasText: copy.name }),
  ).toBeVisible();
  await expect(
    page.locator('mill-information-card').filter({ hasText: DOOMED }),
  ).toHaveCount(0);
  const mills = (await readStoredValue<(typeof copy)[]>(page, 'MILL')) ?? [];
  expect(mills.map((mill) => mill.name)).toEqual([kept.name, copy.name]);
  expect(mills[1].config.uuid).not.toBe(DOOMED_UUID);
  await expect
    .poll(async () =>
      (
        (await readStoredValue<{ uuid: string }[]>(page, 'DELETION_JOURNAL')) ??
        []
      ).map((note) => note.uuid),
    )
    .toEqual([DOOMED_UUID]);
});
