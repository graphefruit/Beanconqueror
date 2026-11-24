import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { showTab } from './support/beans';
import { openAddBrew } from './support/brew-form';
import { tabKey } from './support/keyboard';
import { seedDatabase } from './support/seed';
import { generateDataSet } from './support/synthetic-data';
import { isUncovered, scrollToEnd, VIRTUAL_LIST } from './support/virtual-list';

/**
 * The choosers of a bean and of a reference graph keep their segment and
 * search at the top while their list scrolls under them; the keyboard still
 * goes from the tabs to the search and on to the list.
 */

interface AngularDevHooks {
  getComponent(element: Element): unknown;
}

async function start(page: Page): Promise<void> {
  await seedDatabase(
    page,
    generateDataSet({
      brews: 40,
      beans: 80,
      archivedBeanShare: 0,
      endDate: new Date('2026-11-01T18:00:00Z'),
    }),
  );
  await page.goto('/');
  await openAddBrew(page);
}

function dialog(page: Page): Locator {
  return page.locator('ion-modal:not(.overlay-hidden)').last();
}

/**
 * The rows lie on a card set off from the edges of the dialog, and the radios
 * keep a margin to the edge of that card.
 */
async function expectRowsOnCard(page: Page, list: Locator): Promise<void> {
  const card = list.getByRole('tabpanel');
  const radio = list.getByRole('listitem').first().locator('ion-radio');
  const [screen, cardBox, radioBox] = await Promise.all([
    dialog(page).boundingBox(),
    card.boundingBox(),
    radio.boundingBox(),
  ]);
  if (!screen || !cardBox || !radioBox) {
    throw new Error('The dialog, its card or a radio is not shown');
  }
  expect(cardBox.x - screen.x).toBeGreaterThanOrEqual(8);
  expect(
    screen.x + screen.width - (cardBox.x + cardBox.width),
  ).toBeGreaterThanOrEqual(8);
  expect(radioBox.x - cardBox.x).toBeGreaterThanOrEqual(12);
}

/** Scrolled to the end, the tabs and the search are still on top and can be used. */
async function expectHeadOnTop(page: Page, list: Locator): Promise<void> {
  const tab = dialog(page).getByRole('tab', { selected: true });
  const search = dialog(page).getByRole('searchbox');
  await scrollToEnd(list);
  await expect(list.getByRole('listitem').first()).not.toBeInViewport();
  for (const control of [tab, search]) {
    await expect(control).toBeInViewport();
    await expect.poll(() => isUncovered(control)).toBe(true);
  }

  // The keyboard goes from the tabs to the search.
  await tab.focus();
  const onTabs = () =>
    page.evaluate(
      () => document.activeElement?.closest('ion-segment') !== null,
    );
  for (let presses = 0; presses < 5 && (await onTabs()); presses++) {
    await page.keyboard.press(tabKey(page));
  }
  await expect(search).toBeFocused();
}

test('the bean chooser keeps its tabs and search on top', async ({ page }) => {
  await start(page);
  const list = page.locator(`bean-modal-select ${VIRTUAL_LIST}`);
  // While the form is still settling a tap can get lost.
  await expect(async () => {
    await page
      .getByRole('button', { name: /^Bean Type, / })
      .click({ force: true, timeout: 2000 });
    await expect(list.getByRole('listitem').first()).toBeVisible({
      timeout: 3000,
    });
  }).toPass();

  await expectRowsOnCard(page, list);
  await expectHeadOnTop(page, list);
});

test('the reference graph chooser keeps its tabs and search on top', async ({
  page,
}) => {
  await start(page);
  // Offered only with a connected device or a recorded graph: opened through
  // Angular's development hooks.
  const graph = dialog(page).locator('brew-brewing-graph');
  await expect(graph).toBeAttached();
  await graph.evaluate((element) => {
    const ng = (window as unknown as { ng: AngularDevHooks }).ng;
    const component = ng.getComponent(element) as {
      chooseGraphToSetAsReference(): Promise<void>;
    };
    void component.chooseGraphToSetAsReference();
  });
  const list = page.locator(`app-brew-choose-graph-reference ${VIRTUAL_LIST}`);
  await expect(list.getByRole('listitem').first()).toBeVisible();
  await expectRowsOnCard(page, list);

  // The tabs lie inside the group of the radios: switching them keeps the
  // brew chosen.
  const chosen = list.getByRole('radio').first();
  await chosen.click();
  await expect(chosen).toBeChecked();
  await showTab(dialog(page).getByRole('tab', { name: 'Archived Brews' }));
  await showTab(dialog(page).getByRole('tab', { name: 'Active Brews' }));
  await expect(list.getByRole('radio').first()).toBeChecked();

  await expectHeadOnTop(page, list);
});
