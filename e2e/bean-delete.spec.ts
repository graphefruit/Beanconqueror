import { expect, test } from './fixtures';
import { BEANS } from './support/bean-data';
import {
  beanAction,
  beanCard,
  beanSegment,
  dialogsClosed,
  NO_BEAN_FILTER,
  seededBean,
  startWithBeans,
  storedBeanFilters,
  storedBeans,
} from './support/beans';
import { readStoredValue } from './support/stored-values';
import { toast } from './support/toast';

/**
 * Characterization of deleting a bean as it works today: after a question
 * the bean and all of its brews are removed, and each removed entry leaves a
 * local note.
 */

interface StoredBrew {
  bean: string;
  config: { uuid: string };
}

test('deleting a bean removes it and its brews after a question', async ({
  page,
}) => {
  const data = await startWithBeans(page, {
    settings: {
      bean_filter: {
        OPEN: NO_BEAN_FILTER,
        FROZEN: NO_BEAN_FILTER,
        ARCHIVED: { ...NO_BEAN_FILTER, favourite: true },
      },
    },
  });
  const bean = seededBean(data, BEANS.overused);
  const brews = data.BREWS.filter((brew) => brew.bean === bean.config.uuid);
  expect(brews).toHaveLength(3);

  await beanAction(page, BEANS.overused, 'Delete');
  const question = page.getByRole('alertdialog');
  await expect(question).toContainText(
    'Delete bean? All associated brews will be deleted as well!',
  );
  await question.getByRole('button', { name: 'No' }).click();
  await dialogsClosed(page);
  await expect(beanCard(page, BEANS.overused)).toBeVisible();
  expect(await storedBeans(page)).toHaveLength(14);

  await beanAction(page, BEANS.overused, 'Delete');
  await question.getByRole('button', { name: 'Yes' }).click();

  await expect(toast(page, 'Bean has been deleted')).toBeVisible();
  await dialogsClosed(page);
  await expect(beanCard(page, BEANS.overused)).toHaveCount(0);
  await expect(beanSegment(page, 'Available')).toHaveAccessibleName(
    'Available ( 6 )',
  );

  const device = await readStoredValue<{ device_id: string }>(page, 'DEVICE');
  await expect
    .poll(async () => (await storedBeans(page)).map((entry) => entry.name))
    .not.toContain(BEANS.overused);
  expect(await storedBeans(page)).toHaveLength(13);
  const storedBrews =
    (await readStoredValue<StoredBrew[]>(page, 'BREWS')) ?? [];
  expect(storedBrews.map((brew) => brew.config.uuid)).toEqual(
    data.BREWS.filter((brew) => brew.bean !== bean.config.uuid).map(
      (brew) => brew.config.uuid,
    ),
  );

  // One note per removed entry: the brews first, then the bean. The entries
  // were never changed on this device, so their revision is 0.
  const note = (collection: string, uuid: string) => ({
    collection,
    uuid,
    deleted_at: expect.any(Number),
    device_id: device?.device_id,
    rev: 0,
  });
  await expect
    .poll(() => readStoredValue(page, 'DELETION_JOURNAL'))
    .toEqual([
      ...brews.map((brew) => note('BREWS', brew.config.uuid)),
      note('BEANS', bean.config.uuid),
    ]);

  // Deleting resets the filters of all segments as well.
  await expect
    .poll(() => storedBeanFilters(page))
    .toEqual({
      OPEN: NO_BEAN_FILTER,
      FROZEN: NO_BEAN_FILTER,
      ARCHIVED: NO_BEAN_FILTER,
    });

  await page.getByRole('tab', { name: 'Brews', exact: true }).click();
  await expect(
    page.getByRole('tab', { name: /^Current/ }),
  ).toHaveAccessibleName('Current ( 2 )');
});
