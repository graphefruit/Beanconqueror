import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';
import {
  measureLayout,
  measureSheet,
  openImportSheet,
  openTab,
  waitForAnimations,
} from './support/layout';

/**
 * Tablet layout rules (tablet projects in playwright.config.ts): content sits in a centred
 * column no wider than --bq-content-max-width, single full-width buttons stop at
 * --bq-button-max-width, sheets are a centred panel no wider than --bq-sheet-max-width,
 * and nothing scrolls sideways. The phone counterpart is phone-landscape.spec.ts.
 */

async function expectTabletLayout(page: Page): Promise<void> {
  await waitForAnimations(page);
  const layout = await measureLayout(page);

  expect(layout.maxWidth).toBeGreaterThan(0);
  expect(layout.overflowing, 'horizontal scrolling').toEqual([]);
  expect(layout.blocks.length).toBeGreaterThan(0);

  const columnLeft = (layout.viewportWidth - layout.maxWidth) / 2;
  const columnRight = columnLeft + layout.maxWidth;
  for (const block of layout.blocks) {
    expect(block.left, `${block.name} left edge`).toBeGreaterThanOrEqual(
      columnLeft - 1,
    );
    expect(block.right, `${block.name} right edge`).toBeLessThanOrEqual(
      columnRight + 1,
    );
  }
  for (const button of layout.blockButtons) {
    expect(button.width, `"${button.name}" width`).toBeLessThanOrEqual(
      layout.buttonMaxWidth + 1,
    );
  }
}

const areas: { name: string; open: (page: Page) => Promise<void> }[] = [
  {
    name: 'home',
    open: async (page) => {
      await expect(
        page.getByRole('button', { name: 'Add brew' }),
      ).toBeVisible();
    },
  },
  {
    name: 'brews',
    open: (page) => openTab(page, 'Brews'),
  },
  {
    name: 'beans',
    open: async (page) => {
      await openTab(page, 'Beans');
      await expect(page.getByRole('tab', { name: /^Available/ })).toBeVisible();
    },
  },
  {
    name: 'settings',
    open: async (page) => {
      await page.getByRole('button', { name: 'menu' }).click();
      await page
        .getByRole('link', { name: 'Settings' })
        .or(page.getByRole('button', { name: 'Settings' }))
        .or(page.getByRole('menuitem', { name: 'Settings' }))
        .first()
        .click();
      await expect(
        page.getByRole('button', { name: /^Language Settings/ }),
      ).toBeVisible();
    },
  },
  {
    name: 'add bean',
    open: async (page) => {
      await openTab(page, 'Beans');
      await page.getByRole('button', { name: 'Add bean' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    },
  },
];

for (const area of areas) {
  test(`${area.name} keeps its content in the centred column`, async ({
    page,
  }) => {
    await page.goto('/');
    await completeFirstRun(page);
    await area.open(page);

    await expectTabletLayout(page);
  });
}

test('a sheet opens as a centred panel narrower than the screen', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openImportSheet(page);

  const panel = await measureSheet(page);
  expect(panel.width).toBeLessThanOrEqual(panel.sheetMaxWidth + 1);
  expect(
    Math.abs(panel.left - (panel.viewportWidth - panel.right)),
  ).toBeLessThan(2);
});
