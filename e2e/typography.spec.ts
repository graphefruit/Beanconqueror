import type { Locator } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';

/**
 * People with low vision must be able to pinch-zoom (WCAG 1.4.4). Allowing
 * zoom is only safe while every text field is at least 16px: below that, iOS
 * Safari zooms into a field on focus and the layout jumps.
 */

const MIN_FIELD_FONT_SIZE_PX = 16;

async function fontSizesOf(fields: Locator): Promise<number[]> {
  return fields.evaluateAll((elements) =>
    elements.map((element) => parseFloat(getComputedStyle(element).fontSize)),
  );
}

test('the viewport lets people zoom', async ({ page }) => {
  await page.goto('/');
  // A meta element has no role; it is read as markup, not as page content.
  const content =
    (await page.locator('meta[name="viewport"]').getAttribute('content')) ?? '';
  const settings = Object.fromEntries(
    content
      .split(',')
      .map((part) =>
        part.split('=').map((value) => value.trim().toLowerCase()),
      ),
  );

  expect(settings['user-scalable'] ?? 'yes').not.toMatch(/^(no|0)$/);
  // axe asks for at least 5x so zooming is not capped early.
  if (settings['maximum-scale'] !== undefined) {
    expect(Number(settings['maximum-scale'])).toBeGreaterThanOrEqual(5);
  }
});

test('text fields in the add-bean form are at least 16px', async ({ page }) => {
  await page.goto('/');
  await completeFirstRun(page);
  await page.getByRole('tab', { name: 'Beans' }).click();
  await page.getByRole('button', { name: 'Add bean' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // The modal's content is slotted into Ionic's dialog element, so the fields
  // are found on the page; everything behind the modal is hidden from the
  // accessibility tree. Ionic's scroll assist keeps a disabled copy of a
  // focused input, hence enabled fields only.
  const fields = page
    .getByRole('textbox', { disabled: false })
    .or(page.getByRole('spinbutton', { disabled: false }))
    .or(page.getByRole('searchbox', { disabled: false }));
  await expect(page.getByRole('textbox', { name: /^Name/ })).toBeVisible();

  expect(await fontSizesOf(fields)).not.toHaveLength(0);
  for (const size of await fontSizesOf(fields)) {
    expect(size).toBeGreaterThanOrEqual(MIN_FIELD_FONT_SIZE_PX);
  }

  // The scale is in rem; a smaller root size (user setting) must not pull
  // fields under the iOS zoom threshold.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '12px';
  });
  for (const size of await fontSizesOf(fields)) {
    expect(size).toBeGreaterThanOrEqual(MIN_FIELD_FONT_SIZE_PX);
  }
});
