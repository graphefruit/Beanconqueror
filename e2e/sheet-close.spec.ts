import { expect, test } from './fixtures';
import { BEANS, createBeanDataSet } from './support/bean-data';
import {
  BEAN_TEST_NOW,
  beanCard,
  dialogsClosed,
  startWithBeans,
} from './support/beans';
import { BREW_TEST_START, openAddBrew } from './support/brew-form';
import { completeFirstRunWithBrew } from './support/first-brew';
import { openFromProfile } from './support/profile';
import { seedDatabase } from './support/seed';

/**
 * Screen readers can neither swipe a sheet down nor tap beside it. A sheet
 * without a cancel button of its own ends with a button that closes it, for
 * everybody.
 */
test('a screen reader can close an actions menu without choosing an action', async ({
  page,
}) => {
  await startWithBeans(page);
  const options = beanCard(page, BEANS.alpha)
    .first()
    .getByRole('button', { name: /^Options for / })
    .first();
  await options.click();
  const menu = page.getByRole('dialog');
  await expect(menu).toBeVisible();

  // The dialog role sits in the modal's shadow root, the content is slotted.
  const close = page.getByRole('button', { name: 'Close dialog' });
  // Last in the menu, after every action.
  expect(
    await page
      .locator('actions-popover ion-content')
      .evaluate((content) => content.lastElementChild?.textContent?.trim()),
  ).toBe('Close dialog');
  await expect(close).toBeVisible();
  await close.click();

  await dialogsClosed(page);
  await expect(options).toBeFocused();
});

test('a screen reader can close the device menu of the brew form', async ({
  page,
}) => {
  await page.clock.install({ time: BREW_TEST_START });
  await page.goto('/');
  await completeFirstRunWithBrew(page);
  await openAddBrew(page);
  const options = page.getByRole('button', { name: 'Brew options' });
  await options.click();
  await expect(
    page.locator('app-settings-popover-bluetooth-actions'),
  ).toBeVisible();

  const close = page.getByRole('button', { name: 'Close dialog' });
  await expect(close).toBeVisible();
  await close.click();

  await expect(
    page.locator('app-settings-popover-bluetooth-actions'),
  ).toHaveCount(0);
  // The brew form underneath stays open.
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  await expect(options).toBeFocused();
});

test('closing the green bean sort without choosing keeps the sort', async ({
  page,
}) => {
  const base = createBeanDataSet({ now: BEAN_TEST_NOW });
  await page.clock.install({ time: BEAN_TEST_NOW });
  await seedDatabase(page, {
    ...base,
    GREEN_BEANS: [
      {
        name: 'Green bean',
        note: '',
        date: '',
        config: { ...base.BEANS[0].config, uuid: 'green-uuid' },
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
      },
    ],
    SETTINGS: [{ ...base.SETTINGS[0], show_roasting_section: true }],
  });
  await page.goto('/');
  await openFromProfile(page, 'Bean Roasting');
  const sort = page.getByRole('button', { name: 'Sort green beans' });
  await sort.click();
  const close = page.getByRole('button', { name: 'Close dialog' });
  await expect(close).toBeVisible();
  await close.click();

  // Closed without data, which the page once read without a check.
  await expect(close).toHaveCount(0);
  await expect(sort).toBeVisible();
});
