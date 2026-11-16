import { expect, test } from './fixtures';
import { seedDatabase } from './support/seed';
import { readStoredValue } from './support/stored-values';
import { generateDataSet, type SyntheticBrew } from './support/synthetic-data';

const UPDATE = 'UPDATE_18';

interface StoredSettings {
  brew_filter: {
    OPEN: { method_of_preparation_tools: string[] };
    ARCHIVED: { method_of_preparation_tools: string[] };
  };
}

function brewFilter(tools: string[]) {
  return {
    mill: [],
    bean: [],
    method_of_preparation: [],
    method_of_preparation_tools: tools,
    water: [],
    favourite: false,
    best_brew: false,
    chart_data: false,
    profiles: [],
    rating: { upper: 5, lower: -1 },
  };
}

test('a start takes the preparation tools out of brews they do not belong to', async ({
  page,
}) => {
  const data = generateDataSet({ brews: 40, beans: 5 });
  const [espresso, pourOver] = data.PREPARATION.filter(
    (preparation) => preparation.tools.length > 0,
  );
  const own = espresso.tools[0].config.uuid;
  const foreign = pourOver.tools[0].config.uuid;
  const ofEspresso = data.BREWS.filter(
    (brew) => brew.method_of_preparation === espresso.config.uuid,
  );
  expect(ofEspresso.length).toBeGreaterThanOrEqual(3);

  // As older versions could leave it: a brew with a tool of another
  // preparation, one with a tool that was deleted, and one whose
  // preparation is gone. The update that cleans this up has not run.
  const [withForeign, withDeleted, withoutPreparation] = ofEspresso;
  withForeign.method_of_preparation_tools = [foreign, own];
  withDeleted.method_of_preparation_tools = ['deleted-tool'];
  withoutPreparation.method_of_preparation = 'deleted-preparation';
  withoutPreparation.method_of_preparation_tools = [own, 'deleted-tool'];
  const [version] = data.VERSION;
  const seeded = {
    ...data,
    SETTINGS: [
      {
        ...data.SETTINGS[0],
        brew_filter: {
          OPEN: brewFilter(['deleted-tool', own]),
          ARCHIVED: brewFilter([foreign, 'deleted-tool']),
        },
      },
    ],
    VERSION: [
      {
        ...version,
        updatedDataVersions: version.updatedDataVersions.filter(
          (update) => update !== UPDATE,
        ),
      },
    ],
  };

  await seedDatabase(page, seeded);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Add brew' })).toBeVisible();

  await expect
    .poll(async () =>
      (
        await readStoredValue<(typeof version)[]>(page, 'VERSION')
      )?.[0].updatedDataVersions.includes(UPDATE),
    )
    .toBe(true);

  const brews = (await readStoredValue<SyntheticBrew[]>(page, 'BREWS')) ?? [];
  const changed = [withForeign.config.uuid, withDeleted.config.uuid];
  // Every other brew is stored as it was, also the one without preparation.
  expect(brews.filter((brew) => !changed.includes(brew.config.uuid))).toEqual(
    data.BREWS.filter((brew) => !changed.includes(brew.config.uuid)),
  );
  for (const [before, tools] of [
    [withForeign, [own]],
    [withDeleted, []],
  ] as const) {
    const after = brews.find((brew) => brew.config.uuid === before.config.uuid);
    // Counted as a change, so a sync passes it on.
    expect(after).toEqual({
      ...before,
      method_of_preparation_tools: [...tools],
      config: {
        ...before.config,
        rev: before.config.rev + 1,
        updated_at: expect.any(Number),
        updated_by: expect.any(String),
      },
    });
    expect(after?.config.updated_at).toBeGreaterThan(before.config.updated_at);
  }

  const [settings] =
    (await readStoredValue<StoredSettings[]>(page, 'SETTINGS')) ?? [];
  expect(settings.brew_filter.OPEN.method_of_preparation_tools).toEqual([own]);
  expect(settings.brew_filter.ARCHIVED.method_of_preparation_tools).toEqual([
    foreign,
  ]);
});
