import { expect, type Page } from '@playwright/test';

/** Layout measurements shared by the tablet and phone-landscape specs. */

export interface Layout {
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

export async function measureLayout(page: Page): Promise<Layout> {
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

/** Waits until entry transitions have finished, so elements have their final position. */
export async function waitForAnimations(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => document.getAnimations().length))
    .toBe(0);
}

export interface SheetPanel {
  left: number;
  right: number;
  width: number;
  viewportWidth: number;
  sheetMaxWidth: number;
}

/** Position of the open sheet's panel. */
export async function measureSheet(page: Page): Promise<SheetPanel> {
  await waitForAnimations(page);
  return page.locator('ion-modal.modal-sheet').evaluate((modal) => {
    const wrapper = modal.shadowRoot!.querySelector('.modal-wrapper')!;
    const rect = wrapper.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      width: rect.width,
      viewportWidth: window.innerWidth,
      sheetMaxWidth: parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--bq-sheet-max-width',
        ),
      ),
    };
  });
}

export async function openTab(page: Page, name: string): Promise<void> {
  const tab = page.getByRole('tab', { name });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

/** Opens the bean import sheet from the beans tab. */
export async function openImportSheet(page: Page): Promise<void> {
  await openTab(page, 'Beans');
  await page.getByRole('button', { name: 'Import beans' }).click();
  await expect(
    page.locator('ion-modal.modal-sheet').getByText('Scan QR Code'),
  ).toBeVisible();
}
