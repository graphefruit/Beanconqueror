import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';

/**
 * Tablet layout rules (tablet projects in playwright.config.ts): content sits in a centred
 * column no wider than --bq-content-max-width, single full-width buttons stop at
 * --bq-button-max-width, and nothing scrolls sideways.
 */

interface Layout {
  viewportWidth: number;
  maxWidth: number;
  buttonMaxWidth: number;
  /** Visible blocks of the front page's content and footer: [left, right]. */
  blocks: { name: string; left: number; right: number }[];
  /** Full-width buttons of the front page. */
  blockButtons: { name: string; width: number }[];
  /** Elements whose content is wider than their box (horizontal scrolling). */
  overflowing: string[];
}

async function measureLayout(page: Page): Promise<Layout> {
  return page.evaluate(() => {
    const px = (name: string) =>
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(name),
      );
    const describe = (element: Element) =>
      [element.tagName.toLowerCase(), element.classList[0]]
        .filter(Boolean)
        .join('.');
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return element.checkVisibility() && rect.width > 0 && rect.height > 0;
    };

    // The page in front: an open modal, otherwise the visible routed page.
    const pages = [...document.querySelectorAll('.ion-page')].filter(
      (element) =>
        visible(element) &&
        !element.classList.contains('ion-page-hidden') &&
        element.querySelector(':scope > ion-content'),
    );
    const front = pages.at(-1);
    if (!front) {
      throw new Error('no visible page with content');
    }

    const regions = front.querySelectorAll(
      ':scope > ion-content, :scope > ion-footer',
    );
    const blocks = [...regions].flatMap((region) =>
      [...region.children]
        .filter((child) => child.getAttribute('slot') !== 'fixed')
        .filter(visible)
        .map((child) => {
          const rect = child.getBoundingClientRect();
          return { name: describe(child), left: rect.left, right: rect.right };
        }),
    );

    const blockButtons = [...front.querySelectorAll('ion-button.button-block')]
      .filter(visible)
      .map((button) => ({
        name: button.textContent?.trim() ?? describe(button),
        width: button.getBoundingClientRect().width,
      }));

    const scrollers = [
      document.documentElement,
      document.body,
      ...[...front.querySelectorAll(':scope > ion-content')].map(
        (content) =>
          content.shadowRoot?.querySelector('.inner-scroll') ?? content,
      ),
    ];
    const overflowing = scrollers
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .map(describe);

    return {
      viewportWidth: window.innerWidth,
      maxWidth: px('--bq-content-max-width'),
      buttonMaxWidth: px('--bq-button-max-width'),
      blocks,
      blockButtons,
      overflowing,
    };
  });
}

async function expectTabletLayout(page: Page): Promise<void> {
  // Let entry transitions finish so the front page has its final position.
  await expect
    .poll(() => page.evaluate(() => document.getAnimations().length))
    .toBe(0);
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

async function openTab(page: Page, name: string): Promise<void> {
  const tab = page.getByRole('tab', { name });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
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
  await openTab(page, 'Beans');
  await page.getByRole('button', { name: 'Import beans' }).click();

  const sheet = page.locator('ion-modal.modal-sheet');
  await expect(sheet.getByText('Scan QR Code')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.getAnimations().length))
    .toBe(0);

  const { panel, viewportWidth, maxWidth } = await sheet.evaluate((modal) => {
    const wrapper = modal.shadowRoot!.querySelector('.modal-wrapper')!;
    const rect = wrapper.getBoundingClientRect();
    return {
      panel: { left: rect.left, right: rect.right, width: rect.width },
      viewportWidth: window.innerWidth,
      maxWidth: parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--bq-sheet-max-width',
        ),
      ),
    };
  });
  expect(panel.width).toBeLessThanOrEqual(maxWidth + 1);
  expect(Math.abs(panel.left - (viewportWidth - panel.right))).toBeLessThan(2);
});
