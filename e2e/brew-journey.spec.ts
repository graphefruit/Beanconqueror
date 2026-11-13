import { expect, test } from './fixtures';
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
import { completeFirstRunWithBrew } from './support/first-brew';

/**
 * Characterization of the brew journey as it works today: add, show in list
 * and details, edit, repeat, cancel and delete. The brew form will be rebuilt;
 * these tests pin the user-visible behavior the rebuild has to keep.
 * Each test starts with one bean (Ethiopia Yirgacheffe Natural), a V60, one
 * grinder (Comandante C40) and one brew of 18 g / 300 g.
 */

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: BREW_TEST_START });
  await page.goto('/');
  await completeFirstRunWithBrew(page);
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

  await expect(page.getByText('Brew added successfully')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Current ( 2 )' })).toBeVisible();
  // Newest brew first; the card shows dose, water and brew ratio, grind
  // setting and temperature, and the rating as stars.
  await expect(brewList(page)).toContainText(
    /15\.5gr \/ 250gr\s*\(1 \/ 16\.13\)\s*Grind Setting\s*14 clicks\s*Brew Temperature\s*94/,
  );
  await expect(
    page.getByRole('img', { name: 'Rating: 3 out of 5 stars' }),
  ).toBeVisible();

  await brewAction(page, 'Details');
  // Read in the default sort order, as shown on screen.
  await expect(topDialog(page)).toMatchAriaSnapshot(`
    - heading "Bean Type:" [level=2]
    - heading "Ethiopia Yirgacheffe Natural" [level=3]
    - heading "Brew Ratio:" [level=2]
    - heading "1 / 16.13" [level=3]
    - heading "Ground Coffee (gr):" [level=2]
    - heading "15.5" [level=3]
    - heading "Grinder:" [level=2]
    - heading "Comandante C40" [level=3]
    - heading "Grind Setting:" [level=2]
    - heading "14 clicks" [level=3]
    - heading "Preparation method:" [level=2]
    - heading "V60" [level=3]
    - heading "Brew Temperature:" [level=2]
    - heading "94" [level=3]
    - heading "Time:" [level=2]
    - heading "00:00:00" [level=3]
    - heading "Amount of water:" [level=2]
    - heading "250 (gr)" [level=3]
    - heading "Rating:" [level=2]
    - heading "3" [level=3]
    - heading "Notes:" [level=2]
    - text: Juicy, bright
    - heading "Creation Date" [level=2]
    - heading "01.03.2026 09:00" [level=3]
  `);
});

test('editing a brew opens it with its values and saves the change', async ({
  page,
}) => {
  await brewAction(page, 'Edit');
  await expect(page.getByText('Edit brew')).toBeVisible();
  await expect(brewField(page, 'Ground Coffee (gr)')).toHaveValue('18');
  await expect(brewField(page, WATER)).toHaveValue('300');
  // The live ratio is part of the water field's label.
  await expect(brewField(page, WATER)).toHaveAccessibleName(
    'Amount of water (1 / 16.67 , 60 g/l)',
  );

  await fillBrewField(page, 'Ground Coffee (gr)', '20');
  await expect(brewField(page, WATER)).toHaveAccessibleName(
    'Amount of water (1 / 15.00 , 66.67 g/l)',
  );
  await saveBrew(page);

  await expect(page.getByText('Brew has been edited')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Current ( 1 )' })).toBeVisible();
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
  await expect(page.getByRole('tab', { name: 'Current ( 2 )' })).toBeVisible();
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

test('cancelling a new brew discards it without asking', async ({ page }) => {
  await openAddBrew(page);
  await fillBrewField(page, 'Ground Coffee (gr)', '17');
  // "Ask before leaving" is off by default, so no confirmation is shown.
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Current ( 1 )' })).toBeVisible();
});

test('deleting a brew asks first and removes it', async ({ page }) => {
  // After the action sheet and the confirmation close, the brew list sometimes
  // stays hidden from the accessibility tree for several seconds (everything
  // below it is aria-hidden). The result is therefore checked by visible text.
  await brewAction(page, 'Delete');
  const confirm = page.getByRole('alertdialog', { name: /Delete brew\?/ });
  await confirm.getByRole('button', { name: 'No' }).click();
  await expect(confirm).toHaveCount(0);
  await expect(page.getByText('In/Out (BR)')).toBeVisible();

  await brewAction(page, 'Delete');
  await confirm.getByRole('button', { name: 'Yes' }).click();
  await expect(page.getByText('Brew has been deleted')).toBeVisible();
  // The Home tab has the same empty-state text; only the Brews tab is shown.
  await expect(
    page.getByText('No brews added yet').filter({ visible: true }),
  ).toHaveCount(1);
  await expect(page.getByText('In/Out (BR)')).toHaveCount(0);
});
