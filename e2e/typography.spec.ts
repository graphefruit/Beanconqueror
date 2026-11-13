import type { Locator } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRunWithBrew } from './support/first-brew';
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

test('bar chrome is not cut off at 200 % text size', async ({ page }) => {
  await page.goto('/');
  await completeFirstRun(page);
  // The user's text size scales the root font; rem-based text follows it.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });

  // The tab bar has a fixed height and shares the screen width between five
  // tabs, so its labels must neither overflow the button nor the bar.
  const viewportWidth = page.viewportSize()!.width;
  await expect(page.getByRole('tab')).toHaveCount(5);
  for (const tab of await page.getByRole('tab').all()) {
    const fit = await tab.evaluate((tabElement) => {
      // The tab role sits on Ionic's inner anchor; the label is slotted into
      // the host element.
      const root = tabElement.getRootNode();
      const button = root instanceof ShadowRoot ? root.host : tabElement;
      const label = button.querySelector('ion-label')!;
      const box = button.getBoundingClientRect();
      return {
        name: label.textContent?.trim(),
        left: box.left,
        right: box.right,
        clippedX: label.scrollWidth > label.clientWidth,
        clippedY: label.scrollHeight > label.clientHeight,
      };
    });
    expect(fit.left, `${fit.name} starts on screen`).toBeGreaterThanOrEqual(0);
    expect(fit.right, `${fit.name} ends on screen`).toBeLessThanOrEqual(
      viewportWidth,
    );
    expect(fit.clippedX, `${fit.name} label fits its width`).toBe(false);
    expect(fit.clippedY, `${fit.name} label fits its height`).toBe(false);
  }

  // Ionic ellipsizes the header title; the screen name must stay whole.
  const title = page.getByRole('banner').getByText('Overview', { exact: true });
  await expect(title).toBeVisible();
  const truncated = await title.evaluate((span) => {
    const inner = span
      .closest('ion-title')!
      .shadowRoot!.querySelector('.toolbar-title')!;
    return inner.scrollWidth > inner.clientWidth;
  });
  expect(truncated, 'screen title is not ellipsized').toBe(false);
});

test.describe('brew cards at 200 % text size', () => {
  test.beforeEach(async ({ page }) => {
    // A fixed date keeps the cards' text the same on every run; September is
    // the longest English month name the home card shows.
    await page.clock.setFixedTime(new Date('2026-09-23T10:30:00+02:00'));
    await page.goto('/');
    await completeFirstRunWithBrew(page);
  });

  test('the brew list card keeps labels, date and time readable', async ({
    page,
  }) => {
    await page.getByRole('tab', { name: 'Brews' }).click();
    const card = page.locator('ion-card.brew-layout');
    await expect(card).toBeVisible();
    await expect(card.getByText('10:30', { exact: true })).toBeVisible();
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });

    const layout = await card.evaluate((cardElement) => {
      const labels = [...cardElement.querySelectorAll('ion-label')].map(
        (label) => {
          const style = getComputedStyle(label);
          return {
            text: label.textContent?.trim(),
            fontSize: parseFloat(style.fontSize),
            lineHeight: parseFloat(style.lineHeight),
          };
        },
      );
      const title = cardElement
        .querySelector('ion-title')!
        .shadowRoot!.querySelector('.toolbar-title')!;
      const time = [...cardElement.querySelectorAll('ion-title span')].find(
        (span) => span.textContent?.trim() === '10:30',
      )!;
      const titleBox = title.getBoundingClientRect();
      const timeBox = time.getBoundingClientRect();
      return {
        labels,
        titleClippedX: title.scrollWidth > title.clientWidth,
        titleClippedY: title.scrollHeight > title.clientHeight,
        timeInsideTitle:
          timeBox.left >= titleBox.left &&
          timeBox.right <= titleBox.right &&
          timeBox.bottom <= titleBox.bottom,
        beanNameBottom: cardElement
          .querySelector('.brew-title')!
          .getBoundingClientRect().bottom,
        dividerTop: cardElement.querySelector('hr')!.getBoundingClientRect()
          .top,
      };
    });

    // Wrapped labels ("Preparation method", "In/Out (BR)") must not stack
    // their lines on top of each other.
    expect(layout.labels).not.toHaveLength(0);
    for (const label of layout.labels) {
      expect(
        label.lineHeight,
        `${label.text} line height`,
      ).toBeGreaterThanOrEqual(label.fontSize);
    }
    expect(layout.titleClippedX, 'date is not cut off').toBe(false);
    expect(layout.titleClippedY, 'date is not cut off').toBe(false);
    expect(layout.timeInsideTitle, 'time stays visible').toBe(true);
    expect(
      layout.beanNameBottom,
      'bean name stays above the divider',
    ).toBeLessThanOrEqual(layout.dividerTop);
  });

  test('the home card keeps the month inside the date column', async ({
    page,
  }) => {
    await page.getByRole('tab', { name: 'Home' }).click();
    const card = page.locator('ion-card.dashboard-layout');
    await expect(card.getByText('September')).toBeVisible();
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });

    const fit = await card.evaluate((cardElement) => {
      const date = cardElement
        .querySelector('.dashboard-time-center')!
        .getBoundingClientRect();
      const divider = cardElement.querySelector('.vr')!.getBoundingClientRect();
      // The date's text, measured by its glyphs rather than its boxes.
      const column = cardElement.querySelector('.dashboard-time-center')!;
      const walker = document.createTreeWalker(column, NodeFilter.SHOW_TEXT);
      const glyphs: DOMRect[] = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const range = document.createRange();
        range.selectNodeContents(node);
        glyphs.push(
          ...[...range.getClientRects()].filter((rect) => rect.width > 0),
        );
      }
      const text = {
        left: Math.min(...glyphs.map((rect) => rect.left)),
        right: Math.max(...glyphs.map((rect) => rect.right)),
      };
      return {
        textLeft: text.left,
        textRight: text.right,
        columnLeft: date.left,
        dividerLeft: divider.left,
      };
    });
    expect(
      fit.textLeft,
      'date starts inside its column',
    ).toBeGreaterThanOrEqual(fit.columnLeft);
    expect(fit.textRight, 'date ends before the divider').toBeLessThanOrEqual(
      fit.dividerLeft,
    );
  });
});
