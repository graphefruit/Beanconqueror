import { expect, test } from './fixtures';
import { BEANS, type BeanTestSettings } from './support/bean-data';
import {
  beanAction,
  beanCard,
  beanCards,
  beanCardValue,
  beanField,
  beanNames,
  beanSegment,
  dialogsClosed,
  openBeansTab,
  saveBean,
  showBeanSegment,
  startWithBeans,
  storedBean,
  tabName,
} from './support/beans';
import { readStoredValue } from './support/stored-values';
import { isUncovered, scrollToEnd, VIRTUAL_LIST } from './support/virtual-list';

/**
 * Characterization of the bean list as it works today: the three segments
 * and their counters, the order of the cards, what a card shows, groups of
 * frozen portions and collapsing. The list only renders the cards near the
 * screen, so the order is read from the collapsed list.
 */

// One toggle button: pressed while the cards are collapsed.
const collapse = { name: 'Collapse bean list items', pressed: false };
const expand = { name: 'Collapse bean list items', pressed: true };

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

test('frozen portions of one bag share a card that opens to show them', async ({
  page,
}) => {
  // What the group card and its portions show is checked by unit tests.
  await startWithBeans(page);
  await showBeanSegment(page, 'Frozen');

  await expect(beanCards(page)).toHaveCount(2);
  const groupToggle = page.getByRole('button', {
    name: /^Beans in the group /,
  });
  await groupToggle.click();
  await expect(groupToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(beanCards(page)).toHaveCount(4);

  // An action on a card loads the list again; the group stays open.
  await beanAction(page, BEANS.frozen, 'Favourite');
  await expect(
    beanCard(page, BEANS.frozen).getByRole('img', { name: 'Favourite' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Beans in the group / }),
  ).toHaveAttribute('aria-expanded', 'true');
  await expect(beanCards(page)).toHaveCount(4);

  // So it does in another segment and back.
  await showBeanSegment(page, 'Available');
  await showBeanSegment(page, 'Frozen');
  await expect(beanCards(page)).toHaveCount(4);
});

test('the list stays where it is after a card action and returns to the top for a search', async ({
  page,
}) => {
  await startWithBeans(page, { extraBeans: 30 });
  await expect(beanSegment(page, 'Available')).toHaveAccessibleName(
    tabName('Available ( 37 )'),
  );

  // The last card; the list only renders the cards near the screen.
  const last = beanCard(page, BEANS.portionSource);
  await scrollToEnd(page.locator(VIRTUAL_LIST).filter({ visible: true }));
  await expect(last).toBeInViewport();
  await expect(beanCard(page, BEANS.alpha)).toHaveCount(0);

  await beanAction(page, BEANS.portionSource, 'Favourite');
  await expect
    .poll(async () => (await storedBean(page, BEANS.portionSource)).favourite)
    .toBe(true);
  await expect(last).toBeInViewport();

  await page.getByRole('searchbox').fill('a');
  await expect(beanCard(page, BEANS.alpha)).toBeInViewport();
});

test('the list stays with the bean after it was edited, frozen or archived', async ({
  page,
}) => {
  await startWithBeans(page, { extraBeans: 30 });
  await scrollToEnd(page.locator(VIRTUAL_LIST).filter({ visible: true }));
  // Third from the end, just above the screen.
  const blend = beanCard(page, BEANS.blend);
  await blend.scrollIntoViewIfNeeded();
  await expect(blend).toBeInViewport();

  await beanAction(page, BEANS.blend, 'Edit');
  await beanField(page, 'Weight').fill('900');
  await beanField(page, 'Weight').blur();
  await saveBean(page);
  await expect(beanCardValue(blend, 'Consumed')).toHaveText(/of 900g/);
  await expect(blend).toBeInViewport();
  // Clear of the add button, so that the next action can be tapped.
  const blendOptions = blend
    .getByRole('button', { name: /^Options for / })
    .first();
  await expect.poll(() => isUncovered(blendOptions)).toBe(true);
  await expect(beanCard(page, BEANS.alpha)).toHaveCount(0);

  await beanAction(page, BEANS.blend, 'Freeze coffee bean');
  await beanField(page, 'Edit freeze date').click();
  await expect(beanField(page, 'Edit freeze date')).toHaveValue('01.03.2026');
  await beanField(page, 'Freeze partial bag (g)').fill('100');
  await beanField(page, 'Freeze partial bag (g)').blur();
  await page.getByRole('button', { name: 'Add single frozen bag' }).click();
  await page.getByRole('button', { name: 'Create beans' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await dialogsClosed(page);
  await expect(beanSegment(page, 'Frozen')).toHaveAccessibleName(
    tabName('Frozen ( 3 / 5 )'),
  );
  await expect(blend).toBeInViewport();
  await expect(beanCard(page, BEANS.alpha)).toHaveCount(0);

  // A bean that leaves the list leaves its neighbours on the screen.
  await beanAction(page, BEANS.thawed, 'Archive');
  await page.getByRole('button', { name: 'Archive', exact: true }).click();
  await dialogsClosed(page);
  await expect(beanSegment(page, 'Available')).toHaveAccessibleName(
    tabName('Available ( 36 )'),
  );
  await expect(beanCard(page, BEANS.thawed)).toHaveCount(0);
  await expect(beanCard(page, BEANS.portionSource)).toBeInViewport();
  await expect(beanCard(page, BEANS.alpha)).toHaveCount(0);
});

test('each segment is shown where it was left', async ({ page }) => {
  await startWithBeans(page, { extraBeans: 30 });
  await scrollToEnd(page.locator(VIRTUAL_LIST).filter({ visible: true }));
  await expect(beanCard(page, BEANS.portionSource)).toBeInViewport();

  // The archive collapsed: its cards have another height.
  await showBeanSegment(page, 'Archive');
  await expect(beanCard(page, BEANS.archived)).toBeInViewport();
  await page.getByRole('button', collapse).click();
  await showBeanSegment(page, 'Available');
  await expect(beanCard(page, BEANS.portionSource)).toBeInViewport();
  await expect(beanCard(page, BEANS.alpha)).toHaveCount(0);

  // So is the list after another tab.
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await openBeansTab(page);
  await expect(beanCard(page, BEANS.portionSource)).toBeInViewport();
});

test('with all fields on the cards the last bean can be reached and tapped, collapsed or not', async ({
  page,
}) => {
  const allFields = Object.fromEntries(
    [
      'buyDate',
      'roast_range',
      'url',
      'ean_article_number',
      'cupping_points',
      'decaffeinated',
      'bean_information',
      'country',
      'region',
      'farm',
      'farmer',
      'elevation',
      'harvest_time',
      'variety',
      'processing',
      'certification',
      'percentage',
      'purchasing_price',
      'fob_price',
      'bestDate',
      'openDate',
      'co2e_kg',
    ].map((field) => [field, true]),
  ) as BeanTestSettings['bean_visible_list_view_parameters'];
  await startWithBeans(page, {
    extraBeans: 30,
    settings: { bean_visible_list_view_parameters: allFields },
  });
  const list = page.locator(VIRTUAL_LIST).filter({ visible: true });
  const last = beanCard(page, BEANS.portionSource);
  const add = page.getByRole('button', { name: 'Add bean' }).filter({
    visible: true,
  });
  const options = last.getByRole('button', { name: /^Options for / }).first();

  for (const toggle of [collapse, expand]) {
    await scrollToEnd(list);
    await expect(last).toBeInViewport();
    await expect.poll(() => isUncovered(options)).toBe(true);
    await expect(async () => {
      const button = (await add.boundingBox())!;
      const card = (await last.boundingBox())!;
      expect(card.y + card.height).toBeLessThanOrEqual(button.y);
    }).toPass();

    await page.getByRole('button', toggle).click();
    // Collapsing starts the list from the top.
    await expect(beanCard(page, BEANS.alpha)).toBeInViewport();
  }
  await scrollToEnd(list);
  await expect(last).toBeInViewport();
  await expect.poll(() => isUncovered(options)).toBe(true);
});

test('a photo that loads late moves the cards below it', async ({
  page,
  baseURL,
}) => {
  const photoUrl = `${baseURL}/assets/img/empirical_water_spring.png`;
  await page.route(photoUrl, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });
  await startWithBeans(page, { photoUrl });
  const blend = beanCard(page, BEANS.blend);
  // The list renders the card once it is near the screen.
  await expect(async () => {
    await page
      .locator(VIRTUAL_LIST)
      .filter({ visible: true })
      .evaluate((list) => {
        list
          .closest('ion-content')
          ?.shadowRoot?.querySelector('.inner-scroll')
          ?.scrollBy(0, 300);
      });
    await expect(blend).toHaveCount(1, { timeout: 200 });
  }).toPass();
  await expect(blend.locator('async-image').getByRole('img')).toBeVisible();

  // The card after it, in the order by name.
  const next = beanCard(page, BEANS.thawed);
  await blend.evaluate((card) => card.scrollIntoView());
  await expect(async () => {
    const above = (await blend.boundingBox())!;
    const below = (await next.boundingBox())!;
    expect(below.y).toBeGreaterThanOrEqual(above.y + above.height);
  }).toPass();
});
