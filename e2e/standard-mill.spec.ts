import { expect, test } from './fixtures';
import { seedDatabase } from './support/seed';
import { readStoredValue } from './support/stored-values';
import {
  generateDataSet,
  withBrewsLeftWithoutStandardMill,
  type SyntheticBrew,
} from './support/synthetic-data';

test('a start points the brews left without a grinder at the grinder Standard', async ({
  page,
}) => {
  const data = withBrewsLeftWithoutStandardMill(
    generateDataSet({ brews: 40, beans: 5 }),
  );
  const standard = data.MILL[0].config.uuid;
  // Created after the grinder: not one of the brews it was added for.
  const later = data.BREWS[0];
  later.config = {
    ...later.config,
    unix_timestamp: data.MILL[0].config.unix_timestamp + 1,
  };

  await seedDatabase(page, data);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Add brew' })).toBeVisible();

  await expect
    .poll(async () =>
      (
        await readStoredValue<typeof data.VERSION>(page, 'VERSION')
      )?.[0].updatedDataVersions.includes('UPDATE_19'),
    )
    .toBe(true);
  const brews = (await readStoredValue<SyntheticBrew[]>(page, 'BREWS')) ?? [];
  expect(brews).toEqual(
    data.BREWS.map((brew) =>
      brew === later ? brew : { ...brew, mill: standard },
    ),
  );
});
