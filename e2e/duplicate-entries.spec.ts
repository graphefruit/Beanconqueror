import { expect, test } from './fixtures';
import { completeFirstRunWithBrew } from './support/first-brew';
import { readStoredValue, writeStoredValue } from './support/stored-values';

interface StoredBrew {
  note: string;
  config: { uuid: string };
}

interface StoredVersion {
  updatedDataVersions: string[];
}

const CLEANUP = 'UPDATE_17';

test('copies of a brew left by an older version are cleaned up at start', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRunWithBrew(page);

  const [brew] = (await readStoredValue<StoredBrew[]>(page, 'BREWS')) ?? [];
  const [version] =
    (await readStoredValue<StoredVersion[]>(page, 'VERSION')) ?? [];
  if (!brew || !version) {
    throw new Error('Expected a stored brew and version after the first run');
  }
  expect(version.updatedDataVersions).toContain(CLEANUP);

  // As an older version left them: an identical and a differing copy of
  // the brew, and the cleanup not done yet.
  const differing: StoredBrew = { ...structuredClone(brew), note: 'Copy' };
  await writeStoredValue(page, 'BREWS', [
    brew,
    structuredClone(brew),
    differing,
  ]);
  await writeStoredValue(page, 'VERSION', [
    {
      ...version,
      updatedDataVersions: version.updatedDataVersions.filter(
        (_update) => _update !== CLEANUP,
      ),
    },
  ]);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Add brew' })).toBeVisible();

  await expect
    .poll(async () =>
      (
        await readStoredValue<StoredVersion[]>(page, 'VERSION')
      )?.[0].updatedDataVersions.includes(CLEANUP),
    )
    .toBe(true);
  const brews = (await readStoredValue<StoredBrew[]>(page, 'BREWS')) ?? [];
  // The identical copy is gone; nothing refers to the brew, so the
  // differing copy is a brew of its own now. Everything else is unchanged.
  expect(brews).toHaveLength(2);
  expect(brews[0]).toEqual(brew);
  expect(brews[1].config.uuid).not.toBe(brew.config.uuid);
  expect({
    ...brews[1],
    config: { ...brews[1].config, uuid: brew.config.uuid },
  }).toEqual(differing);
  // The copies never were brews of their own.
  expect(await readStoredValue(page, 'DELETION_JOURNAL')).toBeNull();
});
