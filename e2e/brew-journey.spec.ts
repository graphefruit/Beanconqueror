import { expect, test } from './fixtures';
import { pressHardwareBack } from './support/back-button';
import { tabName } from './support/beans';
import {
  BREW_TEST_START,
  brewAction,
  brewField,
  brewList,
  fillBrewField,
  openAddBrew,
  saveBrew,
  topDialog,
  WATER,
} from './support/brew-form';
import { startWithFirstBrew } from './support/first-brew';
import { toast } from './support/toast';

/**
 * Characterization of the brew journey as it works today: add, show in list
 * and details, edit, repeat, cancel (with a question once something was entered)
 * and delete. The brew form will be rebuilt;
 * these tests pin the user-visible behavior the rebuild has to keep.
 * Each test starts with one bean (Ethiopia Yirgacheffe Natural), a V60, one
 * grinder (Comandante C40) and one brew of 18 g / 300 g.
 */

const DISCARD_QUESTION = /Brewing information has been modified/;

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: BREW_TEST_START });
  await startWithFirstBrew(page, BREW_TEST_START);
});

test('a new brew shows its entered values in the list and in the details', async ({
  page,
}) => {
  await openAddBrew(page);
  // The only bean, method and grinder are preselected.
  await expect(
    page.getByRole('button', { name: 'Preparation method, V60' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: 'Bean Type, Ethiopia Yirgacheffe Natural',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Grinder, Comandante C40' }),
  ).toBeVisible();

  await fillBrewField(page, 'Grind Setting', '14 clicks');
  await fillBrewField(page, 'Ground Coffee (gr)', '15.5');
  await fillBrewField(page, 'Brew Temperature', '94');
  await fillBrewField(page, WATER, '250');
  await fillBrewField(page, 'Notes', 'Juicy, bright');
  const rating = page.getByRole('slider', { name: /Rating/ });
  await rating.focus();
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('ArrowRight');
  }
  await expect(rating).toHaveAttribute('aria-valuenow', '3');
  await saveBrew(page);

  await expect(toast(page, 'Brew added successfully')).toBeVisible();
  await expect(
    page.getByRole('tab', { name: tabName('Current ( 2 )') }),
  ).toBeVisible();
  // Newest brew first; the card shows dose, water and brew ratio, grind
  // setting and temperature, and the rating as stars.
  await expect(brewList(page)).toContainText(
    /15\.5gr \/ 250gr\s*\(1 \/ 16\.13\)\s*Grind Setting\s*14 clicks\s*Brew Temperature\s*94/,
  );
  await expect(
    page.getByRole('img', { name: 'Rating: 3 of 5 stars' }),
  ).toBeVisible();

  await brewAction(page, 'Details');
  // Read in the default sort order, as shown on screen.
  await expect(topDialog(page)).toMatchAriaSnapshot(`
    - heading "Before brewing" [level=2]
    - text: "Bean Type: Ethiopia Yirgacheffe Natural Brew Ratio: 1 / 16.13 Ground Coffee (gr): 15.5 Grinder: Comandante C40 Grind Setting: 14 clicks Preparation method: V60 Brew Temperature: 94"
    - heading "While brewing" [level=2]
    - text: "/^Time: 00:00:00 /"
    - heading "After brewing" [level=2]
    - text: "Amount of water: 250 (gr) Beverage quantity: 0 (gr) Rating: 3 Notes: Juicy, bright"
    - text: Creation Date 01.03.2026 09:00
  `);
});

test('editing a brew opens it with its values and saves the change', async ({
  page,
}) => {
  await brewAction(page, 'Edit');
  await expect(page.getByText('Edit brew')).toBeVisible();
  await expect(brewField(page, 'Ground Coffee (gr)')).toHaveValue('18');
  await expect(brewField(page, WATER)).toHaveValue('300');

  await fillBrewField(page, 'Ground Coffee (gr)', '20');
  await saveBrew(page);

  await expect(toast(page, 'Brew has been edited')).toBeVisible();
  await expect(
    page.getByRole('tab', { name: tabName('Current ( 1 )') }),
  ).toBeVisible();
  await expect(brewList(page)).toContainText(/20gr \/ 300gr\s*\(1 \/ 15\.00\)/);
});

test('repeating a brew opens a new brew pre-filled from it', async ({
  page,
}) => {
  await brewAction(page, 'Repeat');
  await expect(page.getByText('Add brew')).toBeVisible();
  await expect(brewField(page, 'Ground Coffee (gr)')).toHaveValue('18');
  await expect(brewField(page, WATER)).toHaveValue('300');
  await expect(
    page.getByRole('button', { name: 'Preparation method, V60' }),
  ).toBeVisible();

  await saveBrew(page);
  await expect(
    page.getByRole('tab', { name: tabName('Current ( 2 )') }),
  ).toBeVisible();
  await expect(brewList(page)).toContainText(
    /18gr \/ 300gr\s*\(1 \/ 16\.67\)[^]*18gr \/ 300gr\s*\(1 \/ 16\.67\)/,
  );
});

test('the brew details offer repeat and edit', async ({ page }) => {
  await brewAction(page, 'Details');
  await page.getByRole('button', { name: 'Repeat brew' }).click();
  await expect(page.getByText('Add brew')).toBeVisible();
  await expect(brewField(page, 'Ground Coffee (gr)')).toHaveValue('18');
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: 'Edit brew' }).click();
  await expect(page.getByText('Edit brew')).toBeVisible();
  await expect(brewField(page, 'Ground Coffee (gr)')).toHaveValue('18');
});

test('leaving an untouched new or repeated brew closes it without asking', async ({
  page,
}) => {
  // The form takes its starting point only once it has filled itself in;
  // leaving earlier would never ask and prove nothing. The settle leaves room
  // for anything it still sets after that.
  await openAddBrew(page);
  await expect(
    page.getByRole('button', { name: 'Preparation method, V60' }),
  ).toBeVisible();
  await page.waitForTimeout(1_000);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);

  // A repeated brew is filled in from the last one: still no input.
  await brewAction(page, 'Repeat');
  await expect(brewField(page, 'Ground Coffee (gr)')).toHaveValue('18');
  await expect(brewField(page, WATER)).toHaveValue('300');
  await page.waitForTimeout(1_000);
  await pressHardwareBack(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('leaving a new brew with input asks first, on cancel and on back', async ({
  page,
}) => {
  await openAddBrew(page);
  await fillBrewField(page, 'Ground Coffee (gr)', '17');
  const question = page.getByRole('alertdialog');

  await pressHardwareBack(page);
  await expect(question).toContainText(DISCARD_QUESTION);
  await question.getByRole('button', { name: 'No' }).click();
  await expect(question).toHaveCount(0);
  await expect(brewField(page, 'Ground Coffee (gr)')).toHaveValue('17');

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(question).toContainText(DISCARD_QUESTION);
  await question.getByRole('button', { name: 'Yes' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('tab', { name: tabName('Current ( 1 )') }),
  ).toBeVisible();
});

test('leaving an edited brew asks first', async ({ page }) => {
  await brewAction(page, 'Edit');
  await expect(page.getByText('Edit brew')).toBeVisible();
  await fillBrewField(page, 'Ground Coffee (gr)', '17');

  await page.keyboard.press('Escape');
  const question = page.getByRole('alertdialog');
  await expect(question).toContainText(DISCARD_QUESTION);
  await question.getByRole('button', { name: 'Yes' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(brewList(page)).toContainText(/18gr \/ 300gr/);
});

test('deleting a brew asks first and removes it', async ({ page }) => {
  await brewAction(page, 'Delete');
  const confirm = page.getByRole('alertdialog', { name: /Delete brew\?/ });
  await confirm.getByRole('button', { name: 'No' }).click();
  await expect(confirm).toHaveCount(0);
  await expect(page.getByText('In/Out (BR)')).toBeVisible();

  await brewAction(page, 'Delete');
  await confirm.getByRole('button', { name: 'Yes' }).click();
  await expect(toast(page, 'Brew has been deleted')).toBeVisible();
  // The Home tab has the same empty-state text; only the Brews tab is shown.
  await expect(
    page.getByText('No brews added yet').filter({ visible: true }),
  ).toHaveCount(1);
  await expect(page.getByText('In/Out (BR)')).toHaveCount(0);
  // Once the action sheet and the confirmation have closed, the list must not
  // stay hidden from screen readers.
  await expect
    .poll(() =>
      page
        .locator('brew')
        .evaluate(
          (list) => list.closest('[aria-hidden="true"], [inert]') === null,
        ),
    )
    .toBe(true);
  await expect(brewList(page)).toBeVisible();
});
