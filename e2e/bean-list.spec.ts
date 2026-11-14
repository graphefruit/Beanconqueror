import { expect, test } from './fixtures';
import { BEANS } from './support/bean-data';
import {
  beanAction,
  beanCard,
  beanCards,
  beanCardValue,
  beanNames,
  beanSegment,
  LIST_HEIGHT_ERROR,
  openBeansTab,
  showBeanSegment,
  startWithBeans,
  storedBean,
} from './support/beans';
import { completeFirstRun } from './support/first-run';
import { readStoredValue } from './support/stored-values';

/**
 * Characterization of the bean list as it works today: the three segments
 * and their counters, the order of the cards, what a card shows, groups of
 * frozen portions and collapsing. The list only renders the cards near the
 * screen, so the order is read from the collapsed list.
 */

test.use({ allowedConsoleErrors: [LIST_HEIGHT_ERROR] });

const collapse = { name: 'Collapse bean list items' };
const expand = { name: 'Expand bean list items' };

test('the segments count the available, frozen and archived beans', async ({
  page,
}) => {
  await startWithBeans(page);

  await expect(beanSegment(page, 'Available')).toHaveAccessibleName(
    'Available ( 7 )',
  );
  // Known defect: the three frozen portions are one entry, so the counter
  // reads "shown / all" as if a filter hid two of four beans.
  await expect(beanSegment(page, 'Frozen')).toHaveAccessibleName(
    'Frozen ( 2 / 4 )',
  );
  await expect(beanSegment(page, 'Archive')).toHaveAccessibleName(
    'Archive ( 3 )',
  );
});

test('the collapsed list shows the beans by name and stays collapsed after a restart', async ({
  page,
}) => {
  await startWithBeans(page);

  await page.getByRole('button', collapse).click();
  await expect(page.getByRole('button', expand)).toBeVisible();
  // Without a sort order the names are compared as the language does: "Ä"
  // follows "A".
  await expect
    .poll(() => beanNames(page))
    .toEqual([
      BEANS.alpha,
      BEANS.ethiopia,
      BEANS.overused,
      BEANS.small,
      BEANS.blend,
      BEANS.thawed,
      BEANS.portionSource,
    ]);
  await expect(beanCard(page, BEANS.alpha)).not.toContainText('Roast date');
  await expect
    .poll(async () => {
      const [settings] =
        (await readStoredValue<{ bean_collapsed: unknown }[]>(
          page,
          'SETTINGS',
        )) ?? [];
      return settings?.bean_collapsed;
    })
    .toEqual({ OPEN: true, ARCHIVED: false, FROZEN: false });

  await page.reload();
  await openBeansTab(page);
  await expect(beanCards(page)).toHaveCount(7);
  await expect(beanCard(page, BEANS.alpha)).not.toContainText('Roast date');
  await expect(page.getByRole('button', expand)).toBeVisible();
  await expect(page.getByRole('button', collapse)).toHaveCount(0);

  // Each segment is collapsed on its own.
  await showBeanSegment(page, 'Frozen');
  await expect(beanCard(page, BEANS.frozen)).toContainText('Roast date');
  await showBeanSegment(page, 'Available');
  await page.getByRole('button', expand).click();
  await expect(beanCard(page, BEANS.alpha)).toContainText('Roast date');
});

test('a card shows the brews, the usage and the age of its bean', async ({
  page,
}) => {
  await startWithBeans(page);

  const alpha = beanCard(page, BEANS.alpha);
  await expect(beanCardValue(alpha, 'Roast date')).toHaveText('19.02.2026');
  await expect(beanCardValue(alpha, 'Roaster')).toHaveText('Rösterei Nord');
  await expect(beanCardValue(alpha, 'Brews')).toHaveText('2');
  await expect(beanCardValue(alpha, 'Roasted before')).toHaveText(
    '10 days old',
  );
  // 18 g ground and 18.5 g of beans put in.
  await expect(beanCardValue(alpha, 'Consumed')).toHaveText(
    '36.5g of 250g (213.5g)',
  );
  await expect(beanCardValue(alpha, 'Cost')).toHaveText('12.5 (50 €/kg)');

  // Known defect: a bean without a roasting date is "0 days old".
  const ethiopia = beanCard(page, BEANS.ethiopia);
  await expect(beanCardValue(ethiopia, 'Roast date')).toHaveText('-');
  await expect(beanCardValue(ethiopia, 'Roasted before')).toHaveText(
    '0 days old',
  );
  await expect(beanCardValue(ethiopia, 'Consumed')).toHaveText('0g of 0g (0g)');

  // Known defect: more used than the bag held leaves a negative rest.
  await expect(
    beanCardValue(beanCard(page, BEANS.overused), 'Consumed'),
  ).toHaveText('120g of 100g (-20g)');
});

test('frozen portions of one bag share a card that opens to show them', async ({
  page,
}) => {
  await startWithBeans(page);
  await showBeanSegment(page, 'Frozen');

  await expect(beanCards(page)).toHaveCount(2);
  const frozen = beanCard(page, BEANS.frozen);
  await expect(beanCardValue(frozen, 'Frozen date')).toHaveText('13.08.2025');
  await expect(beanCardValue(frozen, 'Frozen notes')).toHaveText('Vakuumiert');
  // 10 days until it was frozen; 90 days in the freezer count as one.
  await expect(beanCardValue(frozen, 'Roasted before')).toHaveText(
    '12 days old',
  );

  // The first portion stands for the group.
  const group = beanCard(page, BEANS.portion).first();
  await expect(group).toContainText('ZP1');
  await group.getByRole('button', { name: 'Expand bean group' }).click();
  await expect(beanCards(page)).toHaveCount(4);
  await expect(group).toContainText('ZP2');
  await expect(group).toContainText('ZP3');
  await expect(group.getByRole('button', { name: 'Bean options' })).toHaveCount(
    3,
  );

  // Any action on a card loads the list again, which closes the group.
  await beanAction(page, BEANS.frozen, 'Favourite');
  await expect(
    page.getByRole('button', { name: 'Expand bean group' }),
  ).toBeVisible();
  await expect(beanCards(page)).toHaveCount(2);
});

test('archived beans are listed in the archive only', async ({ page }) => {
  await startWithBeans(page);
  await showBeanSegment(page, 'Archive');
  await page.getByRole('button', collapse).click();

  await expect
    .poll(() => beanNames(page))
    .toEqual([BEANS.archived, BEANS.archivedFrozen, BEANS.archivedLate]);

  // An archived bean that is still frozen is not among the frozen ones.
  await showBeanSegment(page, 'Frozen');
  await expect(beanCard(page, BEANS.archivedFrozen)).toHaveCount(0);
});

test('the age of an archived bean ends with its last brew', async ({
  page,
}) => {
  await startWithBeans(page);
  await showBeanSegment(page, 'Archive');

  // Roasted 60 days ago, last brewed 40 days ago.
  await expect(
    beanCardValue(beanCard(page, BEANS.archived), 'Roasted before'),
  ).toHaveText('20 days old');
  // Known defect: roasted 50 days ago, last brewed 45 days ago and frozen
  // only after that; the days until it was frozen count nevertheless.
  await expect(
    beanCardValue(beanCard(page, BEANS.archivedLate), 'Roasted before'),
  ).toHaveText('29 days old');
});

test('the archive is hidden when archived beans are switched off', async ({
  page,
}) => {
  await startWithBeans(page, { settings: { show_archived_beans: false } });

  await expect(beanSegment(page, 'Available')).toBeVisible();
  await expect(beanSegment(page, 'Frozen')).toBeVisible();
  await expect(beanSegment(page, 'Archive')).toHaveCount(0);
  await showBeanSegment(page, 'Frozen');
  await expect(beanCards(page)).toHaveCount(2);
  await expect(beanCard(page, BEANS.archivedFrozen)).toHaveCount(0);
});

test('a fresh install has no frozen segment and an empty list without a toolbar', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openBeansTab(page);

  await expect(beanSegment(page, 'Available')).toHaveAccessibleName(
    'Available ( 0 )',
  );
  await expect(beanSegment(page, 'Frozen')).toHaveCount(0);
  await expect(page.getByText("You're out of fresh beans!")).toBeVisible();
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Filter beans' })).toHaveCount(
    0,
  );

  await showBeanSegment(page, 'Archive');
  await expect(page.getByText("You've got no archived beans.")).toBeVisible();
  await expect(page.getByRole('searchbox')).toHaveCount(0);
});

test('the list stays where it is after a card action and returns to the top for a search', async ({
  page,
}) => {
  await startWithBeans(page, { extraBeans: 30 });
  await expect(beanSegment(page, 'Available')).toHaveAccessibleName(
    'Available ( 37 )',
  );

  // The last card; the list only renders the cards near the screen.
  const last = beanCard(page, BEANS.portionSource);
  const list = page.locator('ag-virtual-scroll').filter({ visible: true });
  await expect(async () => {
    // The list grows while it renders the cards it scrolls to.
    await list.evaluate((element) => element.scrollTo(0, element.scrollHeight));
    await expect(last).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(beanCard(page, BEANS.alpha)).toHaveCount(0);

  await beanAction(page, BEANS.portionSource, 'Favourite');
  await expect
    .poll(async () => (await storedBean(page, BEANS.portionSource)).favourite)
    .toBe(true);
  await expect(last).toBeInViewport();

  await page.getByRole('searchbox').fill('a');
  await expect(beanCard(page, BEANS.alpha)).toBeInViewport();
});
