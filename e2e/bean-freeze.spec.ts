import { expect, test } from './fixtures';
import { BEANS, PORTION_GROUP_ID } from './support/bean-data';
import {
  BEAN_TEST_NOW,
  beanAction,
  beanCard,
  beanCards,
  beanField,
  beanSegment,
  dialogsClosed,
  findBean,
  LIST_HEIGHT_ERROR,
  NO_BEAN_FILTER,
  openBeansTab,
  searchBeans,
  seededBean,
  showBeanSegment,
  startWithBeans,
  storedBean,
  storedBeanFilters,
  storedBeans,
  storedBeansNamed,
} from './support/beans';
import { toast } from './support/toast';

/**
 * Characterization of freezing and thawing beans as it works today. On a
 * device a tap on the freeze date opens the date picker; the web build has
 * none and sets the current time instead.
 */

test.use({ allowedConsoleErrors: [LIST_HEIGHT_ERROR] });

/** Milliseconds between a stored date and the time the clock was set to. */
function sinceTestStart(date: string): number {
  return new Date(date).getTime() - BEAN_TEST_NOW.getTime();
}

test('freezing a part of a bag creates a frozen bean and reduces the bag', async ({
  page,
}) => {
  const data = await startWithBeans(page);
  const before = seededBean(data, BEANS.alpha);

  await beanAction(page, BEANS.alpha, 'Freeze coffee bean');
  // 250 g less the 36.5 g that were brewed can be frozen; nothing is yet.
  await expect(page.getByText('Left unfrozen: 213.5g / 0g')).toBeVisible();
  const create = page.getByRole('button', { name: 'Freeze bean' });
  await expect(create).toBeDisabled();

  await beanField(page, 'Edit freeze date').click();
  await expect(beanField(page, 'Edit freeze date')).toHaveValue('01.03.2026');
  await beanField(page, 'Freeze partial bag (g)').fill('100');
  await beanField(page, 'Freeze partial bag (g)').blur();
  await page.getByRole('button', { name: 'Add single frozen bag' }).click();
  await expect(page.getByText('Left unfrozen: 213.5g / 100g')).toBeVisible();
  await expect(
    page.getByRole('listitem').filter({ hasText: '100g' }),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Create beans' }).click();

  // The new frozen beans are listed; their cards have no menu.
  await expect(
    page.getByRole('banner').getByText('Frozen beans list'),
  ).toBeVisible();
  const listed = page.locator('ion-modal bean-information');
  await expect(listed).toHaveCount(1);
  await expect(listed).toContainText(BEANS.alpha);
  await expect(
    listed.getByRole('button', { name: 'Bean options' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Back' }).click();
  await dialogsClosed(page);

  const [bag, frozen] = await storedBeansNamed(page, BEANS.alpha);
  // The weight of the bag goes down by what was frozen, the cost with it.
  expect(bag).toEqual({
    ...before,
    weight: 150,
    cost: 7.5,
    frozenGroupId: expect.stringMatching(/.+/),
    config: {
      ...before.config,
      rev: 1,
      updated_at: expect.any(Number),
      updated_by: expect.any(String),
    },
  });
  expect(frozen).toEqual({
    ...before,
    weight: 100,
    cost: 5,
    frozenId: expect.stringMatching(/.+/),
    frozenGroupId: bag.frozenGroupId,
    frozenDate: expect.any(String),
    config: expect.objectContaining({ rev: 1 }),
  });
  expect(frozen.config.uuid).not.toBe(before.config.uuid);
  expect(sinceTestStart(frozen.frozenDate)).toBeGreaterThanOrEqual(0);
  expect(sinceTestStart(frozen.frozenDate)).toBeLessThan(60_000);

  await expect(beanSegment(page, 'Available')).toHaveAccessibleName(
    'Available ( 7 )',
  );
  await expect(beanSegment(page, 'Frozen')).toHaveAccessibleName(
    'Frozen ( 3 / 5 )',
  );
  await page.reload();
  await openBeansTab(page);
  await expect(beanSegment(page, 'Frozen')).toHaveAccessibleName(
    'Frozen ( 3 / 5 )',
  );
  await showBeanSegment(page, 'Frozen');
  await expect(beanCard(page, BEANS.alpha)).toContainText(frozen.frozenId);
});

test('freezing a whole bag keeps the bean and marks it as frozen', async ({
  page,
}) => {
  const data = await startWithBeans(page);
  const before = seededBean(data, BEANS.small);
  const card = await findBean(page, BEANS.small);

  await card.getByRole('button', { name: 'Bean options' }).click();
  await page.getByRole('button', { name: 'Freeze coffee bean' }).click();
  await expect(page.getByText('Left unfrozen: 20g / 0g')).toBeVisible();
  await beanField(page, 'Edit freeze date').click();
  await page.getByRole('button', { name: 'Freeze bean' }).click();

  await expect(toast(page, 'Bean has been frozen')).toBeVisible();
  await dialogsClosed(page);
  const frozen = await storedBean(page, BEANS.small);
  expect(frozen).toEqual({
    ...before,
    frozenId: expect.stringMatching(/.+/),
    frozenDate: expect.any(String),
    config: {
      ...before.config,
      rev: 1,
      updated_at: expect.any(Number),
      updated_by: expect.any(String),
    },
  });
  expect(sinceTestStart(frozen.frozenDate)).toBeGreaterThanOrEqual(0);
  expect(sinceTestStart(frozen.frozenDate)).toBeLessThan(60_000);
  expect(await storedBeans(page)).toHaveLength(14);

  // The search for the bean is still active: none of the six beans left.
  await expect(beanSegment(page, 'Available')).toHaveAccessibleName(
    'Available ( 0 / 6 )',
  );
  await expect(beanSegment(page, 'Frozen')).toHaveAccessibleName(
    'Frozen ( 3 / 5 )',
  );
});

test('thawing a whole frozen bean makes it available again', async ({
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
  const before = seededBean(data, BEANS.frozen);
  await showBeanSegment(page, 'Frozen');

  await beanAction(page, BEANS.frozen, 'Unfreeze coffee bean');
  await expect(
    page.getByRole('banner').getByText('Unfreeze coffee bean'),
  ).toBeVisible();
  // Known defects: the weight field has no name, and what can be thawed is
  // the weight of the bag, not what is left of it after the brews.
  await expect(page.getByRole('spinbutton')).toHaveValue('250');
  await expect(page.getByRole('spinbutton')).toHaveAccessibleName('');
  await page.getByRole('button', { name: 'Unfreeze coffee bean' }).click();

  await expect(toast(page, 'Bean has been unfrozen')).toBeVisible();
  await dialogsClosed(page);
  const thawed = await storedBean(page, BEANS.frozen);
  expect(thawed).toEqual({
    ...before,
    unfrozenDate: expect.any(String),
    config: {
      ...before.config,
      rev: 1,
      updated_at: expect.any(Number),
      updated_by: expect.any(String),
    },
  });
  expect(sinceTestStart(thawed.unfrozenDate)).toBeGreaterThanOrEqual(0);
  expect(sinceTestStart(thawed.unfrozenDate)).toBeLessThan(60_000);

  await expect(beanSegment(page, 'Available')).toHaveAccessibleName(
    'Available ( 8 )',
  );
  await expect(beanSegment(page, 'Frozen')).toHaveAccessibleName(
    'Frozen ( 1 / 3 )',
  );
  // Known defect: thawing resets the filters of all segments.
  await expect
    .poll(() => storedBeanFilters(page))
    .toEqual({
      OPEN: NO_BEAN_FILTER,
      FROZEN: NO_BEAN_FILTER,
      ARCHIVED: NO_BEAN_FILTER,
    });
});

test('thawing a part of a frozen bean splits it', async ({ page }) => {
  const data = await startWithBeans(page);
  const before = seededBean(data, BEANS.portion);
  await showBeanSegment(page, 'Frozen');

  // The card of the group stands for its first portion.
  await beanAction(page, BEANS.portion, 'Unfreeze coffee bean');
  await expect(
    page.getByRole('banner').getByText('Unfreeze coffee bean'),
  ).toBeVisible();
  await page.getByRole('spinbutton').fill('30');
  await page
    .getByRole('button', { name: 'Unfreeze partial coffee bean' })
    .click();

  await expect(toast(page, 'Bean has been partially unfrozen')).toBeVisible();
  await dialogsClosed(page);
  const portions = await storedBeansNamed(page, BEANS.portion);
  expect(portions).toHaveLength(4);
  // The frozen rest keeps its id; weight and cost are split by weight.
  expect(portions[0]).toMatchObject({
    weight: 50,
    cost: 2.5,
    frozenId: before.frozenId,
    frozenDate: before.frozenDate,
    unfrozenDate: '',
    frozenGroupId: PORTION_GROUP_ID,
  });
  const thawed = portions[3];
  expect(thawed).toMatchObject({
    weight: 30,
    cost: 1.5,
    frozenDate: before.frozenDate,
    frozenGroupId: PORTION_GROUP_ID,
  });
  expect(thawed.frozenId).not.toBe(before.frozenId);
  expect(thawed.config.uuid).not.toBe(before.config.uuid);
  expect(sinceTestStart(thawed.unfrozenDate)).toBeGreaterThanOrEqual(0);

  // The thawed part joins what was left of the original bag in one group:
  // seven entries for eight available beans.
  await expect(beanSegment(page, 'Available')).toHaveAccessibleName(
    'Available ( 7 / 8 )',
  );
  await expect(beanSegment(page, 'Frozen')).toHaveAccessibleName(
    'Frozen ( 2 / 4 )',
  );
  await showBeanSegment(page, 'Available');
  await searchBeans(page, 'Zeta');
  await expect(beanCards(page)).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Expand bean group' }),
  ).toBeVisible();
});
