import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { createBeanDataSet, type BeanDataSet } from './support/bean-data';
import { BEAN_TEST_NOW, dialogsClosed } from './support/beans';
import { openFromProfile } from './support/profile';
import { seedDatabase } from './support/seed';
import { readStoredValue } from './support/stored-values';
import { toast } from './support/toast';

/**
 * Deleting a grinder, a preparation method or a green bean: after a question
 * it is removed together with the entries that depend on it, and each
 * removed entry leaves a local note.
 */

interface Stored {
  config: { uuid: string; rev?: number };
}

const DOOMED = 'Doomed entry';
const DOOMED_UUID = 'doomed-uuid';

async function startWith(page: Page, data: object): Promise<void> {
  await page.clock.install({ time: BEAN_TEST_NOW });
  await seedDatabase(page, data);
  await page.goto('/');
}

const uuids = (entries: readonly Stored[]) =>
  entries.map((entry) => entry.config.uuid);

async function storedUuids(page: Page, key: string): Promise<string[]> {
  return uuids((await readStoredValue<Stored[]>(page, key)) ?? []);
}

/**
 * Deletes the entry named `DOOMED` on the open list, first answering the
 * question with no, and checks what is stored afterwards and after a restart.
 */
async function deleteAndCheck(
  page: Page,
  flow: {
    card: string;
    options: RegExp;
    question: string;
    toast: string;
    /** What is stored afterwards, per collection. */
    left: Record<string, string[]>;
    /** The removed entries in the order of their notes. */
    removed: [collection: string, entry: Stored][];
    /** Brings the list back after a restart. */
    open: () => Promise<void>;
  },
): Promise<void> {
  const card = page.locator(flow.card).filter({ hasText: DOOMED });
  const choose = async (answer: 'Yes' | 'No') => {
    await card.getByRole('button', { name: flow.options }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    const question = page.getByRole('alertdialog');
    await expect(question).toContainText(flow.question);
    await question.getByRole('button', { name: answer }).click();
  };
  const stored = async () =>
    Object.fromEntries(
      await Promise.all(
        Object.keys(flow.left).map(
          async (key) => [key, await storedUuids(page, key)] as const,
        ),
      ),
    );
  const before = await stored();

  await choose('No');
  await dialogsClosed(page);
  await expect(card).toBeVisible();
  expect(await stored()).toEqual(before);

  await choose('Yes');
  await expect(toast(page, flow.toast)).toBeVisible();
  await dialogsClosed(page);
  await expect(card).toHaveCount(0);
  await expect.poll(stored).toEqual(flow.left);

  const device = await readStoredValue<{ device_id: string }>(page, 'DEVICE');
  const notes = flow.removed.map(([collection, entry]) => ({
    collection,
    uuid: entry.config.uuid,
    deleted_at: expect.any(Number),
    device_id: device?.device_id,
    rev: entry.config.rev ?? 0,
  }));
  await expect
    .poll(() => readStoredValue(page, 'DELETION_JOURNAL'))
    .toEqual(notes);

  // The same after a restart.
  await page.goto('/');
  await flow.open();
  await expect(page.locator(flow.card).first()).toBeVisible();
  await expect(card).toHaveCount(0);
  expect(await stored()).toEqual(flow.left);
  expect(await readStoredValue(page, 'DELETION_JOURNAL')).toEqual(notes);
}

const WITH_BREWS = [
  {
    name: 'grinder',
    key: 'MILL',
    field: 'mill',
    entry: 'Grinders',
    card: 'mill-information-card',
    options: /^Options for /,
    question: 'Delete grinder? All associated brews will be deleted as well!',
    toast: 'Grinder has been deleted',
  },
  {
    name: 'preparation method',
    key: 'PREPARATION',
    field: 'method_of_preparation',
    entry: 'Preparation methods',
    card: 'preparation-information-card',
    options: /^Options for /,
    question:
      'Delete preparation method? All associated brews will be deleted as well!',
    toast: 'Preparation method has been deleted',
  },
] as const;

for (const target of WITH_BREWS) {
  test(`deleting a ${target.name} removes it and its brews after a question`, async ({
    page,
  }) => {
    const base = createBeanDataSet({ now: BEAN_TEST_NOW });
    const [kept] = base[target.key];
    const doomed = {
      ...kept,
      name: DOOMED,
      config: { ...kept.config, uuid: DOOMED_UUID },
    };
    // Every other brew was made with the entry that is deleted.
    const brews = base.BREWS.map((brew, i) =>
      i % 2 === 1 ? { ...brew, [target.field]: DOOMED_UUID } : brew,
    );
    const own = brews.filter((brew) => brew[target.field] === DOOMED_UUID);
    expect(own.length).toBeGreaterThan(2);
    await startWith(page, {
      ...base,
      [target.key]: [kept, doomed],
      BREWS: brews,
    });
    const open = () => openFromProfile(page, target.entry);
    await open();

    await deleteAndCheck(page, {
      ...target,
      left: {
        [target.key]: [kept.config.uuid],
        BREWS: uuids(
          brews.filter((brew) => brew[target.field] !== DOOMED_UUID),
        ),
        BEANS: uuids(base.BEANS),
      },
      removed: [
        ...own.map((brew) => ['BREWS', brew] as [string, Stored]),
        [target.key, doomed],
      ],
      open,
    });
  });
}

test('deleting a green bean removes it, the beans roasted from it and their brews after a question', async ({
  page,
}) => {
  const base: BeanDataSet = createBeanDataSet({ now: BEAN_TEST_NOW });
  const green = (name: string, uuid: string) => ({
    name,
    note: '',
    date: '',
    config: { ...base.BEANS[0].config, uuid },
    aromatics: '',
    weight: 1000,
    finished: false,
    cost: 0,
    attachments: [],
    cupping_points: '',
    decaffeinated: false,
    url: '',
    ean_article_number: '',
    rating: 0,
    bean_information: [],
  });
  // The two beans with the most brews were roasted from the green bean.
  const brewsOf = (uuid: string) =>
    base.BREWS.filter((brew) => brew.bean === uuid).length;
  const roasted = new Set(
    uuids(
      [...base.BEANS]
        .sort((a, b) => brewsOf(b.config.uuid) - brewsOf(a.config.uuid))
        .slice(0, 2),
    ),
  );
  const beans = base.BEANS.map((bean) =>
    roasted.has(bean.config.uuid)
      ? {
          ...bean,
          bean_roast_information: {
            ...bean.bean_roast_information,
            bean_uuid: DOOMED_UUID,
          },
        }
      : bean,
  );
  const own = base.BREWS.filter((brew) => roasted.has(brew.bean));
  expect(own.length).toBeGreaterThan(2);
  await startWith(page, {
    ...base,
    BEANS: beans,
    GREEN_BEANS: [
      green('Kept green bean', 'kept-uuid'),
      green(DOOMED, DOOMED_UUID),
    ],
    SETTINGS: [{ ...base.SETTINGS[0], show_roasting_section: true }],
  });
  const open = () => openFromProfile(page, 'Bean Roasting');
  await open();

  await deleteAndCheck(page, {
    card: 'green-bean-information',
    options: /^Options for /,
    question:
      'Delete green bean? All associated roasted beans, as well as brews will be deleted!',
    toast: 'Green bean has been deleted',
    left: {
      GREEN_BEANS: ['kept-uuid'],
      BEANS: uuids(beans.filter((bean) => !roasted.has(bean.config.uuid))),
      BREWS: uuids(base.BREWS.filter((brew) => !roasted.has(brew.bean))),
    },
    removed: [
      ...own.map((brew) => ['BREWS', brew] as [string, Stored]),
      ...beans
        .filter((bean) => roasted.has(bean.config.uuid))
        .map((bean) => ['BEANS', bean] as [string, Stored]),
      ['GREEN_BEANS', green(DOOMED, DOOMED_UUID)],
    ],
    open,
  });
});
