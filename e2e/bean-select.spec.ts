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

test('a bean tapped while the chooser slides in stays chosen', async ({
  page,
}) => {
  await seedDatabase(
    page,
    generateDataSet({
      brews: 10,
      beans: 5,
      archivedBeanShare: 0,
      endDate: new Date('2026-11-01T18:00:00Z'),
    }),
  );
  await page.goto('/');
  await openAddBrew(page);
  const select = page.getByRole('button', { name: /^Bean Type, / });
  // The form preselects the bean of the last brew.
  const preselected = /"Bean Type, (.+)"/.exec(await select.ariaSnapshot())![1];

  // Slowed down tenfold, the chooser surely is still sliding in at the tap.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.1 });
  await page.evaluate(() => {
    const state = window as unknown as { chooserEntered: boolean };
    state.chooserEntered = false;
    document.addEventListener(
      'ionModalDidPresent',
      () => (state.chooserEntered = true),
      { once: true },
    );
  });
  const entered = () =>
    page.evaluate(
      () => (window as unknown as { chooserEntered: boolean }).chooserEntered,
    );

  const rows = page
    .locator(`bean-modal-select ${VIRTUAL_LIST}`)
    .getByRole('listitem');
  const other = rows.filter({
    hasNot: page.locator('.choice-label', { hasText: preselected }),
  });
  await select.click({ force: true });
  await expect(other.first()).toBeAttached();
  const name = (await other
    .first()
    .locator('.choice-label')
    .textContent())!.trim();
  // Forced: the row is still moving, and a finger does not wait for it.
  await other.first().getByRole('radio').click({ force: true });
  expect(await entered()).toBe(false);

  await expect.poll(entered, { timeout: 15_000 }).toBe(true);
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
  await expect(other.first().getByRole('radio')).toBeChecked();
  await page.getByRole('button', { name: 'Choose', exact: true }).click();

  await expect(
    page.getByRole('button', { name: `Bean Type, ${name}` }),
  ).toBeVisible();
});
