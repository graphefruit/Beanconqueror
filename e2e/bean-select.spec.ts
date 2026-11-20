import { expect, test } from './fixtures';
import { openAddBrew } from './support/brew-form';
import { seedDatabase } from './support/seed';
import { generateDataSet } from './support/synthetic-data';
import { scrollToEnd, VIRTUAL_LIST } from './support/virtual-list';

/**
 * The bean chooser of a brew lists the beans in its dialog, which scrolls;
 * only the beans near the screen are rendered.
 */

test('the last bean of a long list can be chosen', async ({ page }) => {
  await seedDatabase(
    page,
    generateDataSet({
      brews: 10,
      beans: 80,
      archivedBeanShare: 0,
      endDate: new Date('2026-11-01T18:00:00Z'),
    }),
  );
  await page.goto('/');
  await openAddBrew(page);
  const list = page.locator(`bean-modal-select ${VIRTUAL_LIST}`);
  const rows = list.getByRole('listitem');
  // While the form is still settling a tap can get lost.
  await expect(async () => {
    await page
      .getByRole('button', { name: /^Bean Type, / })
      .click({ force: true, timeout: 2000 });
    await expect(rows.first()).toBeVisible({ timeout: 3000 });
  }).toPass();

  const total = Number(await rows.first().getAttribute('aria-setsize'));
  expect(await rows.count()).toBeLessThan(total);

  await scrollToEnd(list);
  const last = rows.last();
  await expect(last).toHaveAttribute('aria-posinset', String(total));
  await expect(last).toBeInViewport();
  const name = (await last.locator('.choice-label').textContent())!.trim();
  await last.getByRole('radio').click();
  await page.getByRole('button', { name: 'Choose', exact: true }).click();

  await expect(
    page.getByRole('button', { name: `Bean Type, ${name}` }),
  ).toBeVisible();
});
