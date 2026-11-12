import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';

/**
 * Keyboard and switch users must see where focus is (WCAG 2.4.7, 1.4.11).
 * Walks Home, the menu and Settings with the Tab key only and checks that each
 * stop draws the focus ring token (espresso in light, white in dark) instead of
 * one of Ionic's faint background tints.
 */

type Theme = 'light' | 'dark';

async function setTheme(page: Page, theme: Theme): Promise<void> {
  await page.evaluate(
    (dark) =>
      document.documentElement.classList.toggle('ion-palette-dark', dark),
    theme === 'dark',
  );
}

/** Presses Tab until `target` has focus, like a keyboard user looking for it. */
async function tabTo(page: Page, target: Locator, maxPresses = 60) {
  await expect(target).toHaveCount(1);
  for (let press = 0; press < maxPresses; press++) {
    // Settings sliders are disabled while the page scrolls, and focusing the
    // previous control scrolls it; a user waits until the slider is usable.
    await expect(target).not.toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Tab');
    const focused = await target
      .evaluate(
        (element) => {
          const root = element.getRootNode() as Document | ShadowRoot;
          return root.activeElement === element;
        },
        undefined,
        { timeout: 1000 },
      )
      .catch(() => false);
    if (focused) {
      break;
    }
  }
  await expect(target).toBeFocused();
}

/**
 * True when the focused control, the Ionic component that owns it or that
 * component's shadow content draws a ring of at least 2px in the ring token,
 * as an outline or a box-shadow spread. The walk stops at the owning ion-*
 * host so a ring on a surrounding ion-item cannot stand in for the control's
 * own ring. A control that is disabled at that moment never counts: Ionic's
 * disabled range knob has a 5px white outline that equals the dark ring.
 */
async function showsFocusRing(target: Locator): Promise<boolean> {
  return target.evaluate((element) => {
    if (element.getAttribute('aria-disabled') === 'true') {
      return false;
    }

    const ringColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--bq-focus-ring')
      .trim();
    // Resolve the token to the rgb() form computed styles use.
    const probe = document.createElement('div');
    probe.style.color = ringColor;
    document.body.append(probe);
    const ring = getComputedStyle(probe).color;
    probe.remove();

    const candidates = new Set<Element>();
    let node: Element | null = element;
    for (let depth = 0; node && depth < 6; depth++) {
      candidates.add(node);
      node.shadowRoot?.querySelectorAll('*').forEach((e) => candidates.add(e));
      if (node.tagName.startsWith('ION-')) {
        break;
      }
      const root = node.getRootNode();
      node =
        node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
    }

    const spread = new RegExp(
      `${ring.replace(/[()]/g, '\\$&')} (?:-?[\\d.]+px ){3}([\\d.]+)px`,
    );
    return [...candidates].some((candidate) => {
      const style = getComputedStyle(candidate);
      const outline =
        style.outlineStyle !== 'none' &&
        parseFloat(style.outlineWidth) >= 2 &&
        style.outlineColor === ring;
      const match = spread.exec(style.boxShadow);
      return outline || (!!match && parseFloat(match[1]) >= 2);
    });
  });
}

async function expectFocusRing(page: Page, target: Locator): Promise<void> {
  await tabTo(page, target);
  // Ionic animates its own focus states; the ring has to be there once they settle.
  await expect
    .poll(() => showsFocusRing(target), { message: `focus ring on ${target}` })
    .toBe(true);
}

for (const theme of ['light', 'dark'] as const) {
  test(`focus is visible when tabbing through home and settings (${theme})`, async ({
    page,
  }) => {
    await page.goto('/');
    await completeFirstRun(page);
    await setTheme(page, theme);

    await expectFocusRing(page, page.getByRole('button', { name: 'menu' }));
    await expectFocusRing(page, page.getByRole('button', { name: 'Add brew' }));
    await expectFocusRing(page, page.getByRole('link', { name: /Brews/ }));

    await page.getByRole('button', { name: 'menu' }).click();
    const settingsEntry = page.getByRole('link', { name: 'Settings' });
    await expectFocusRing(page, settingsEntry);
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('button', { name: /^Language Settings/ }),
    ).toBeVisible();

    await expectFocusRing(page, page.getByRole('tab', { name: 'General' }));
    await expectFocusRing(
      page,
      page.getByRole('button', { name: 'Import', exact: true }),
    );
    await expectFocusRing(
      page,
      page.getByRole('button', { name: /^Language Settings/ }),
    );
    await expectFocusRing(page, page.getByRole('slider').first());
    await expectFocusRing(
      page,
      page.getByRole('checkbox', { name: 'Analytics' }),
    );
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`focus is visible on add-bean fields and the coral save button (${theme})`, async ({
    page,
  }) => {
    await page.goto('/');
    await completeFirstRun(page);
    await setTheme(page, theme);
    await page.getByRole('tab', { name: 'Beans' }).click();
    await page.getByRole('button', { name: 'Add bean' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await expectFocusRing(page, page.getByRole('textbox', { name: /^Name/ }));
    await expectFocusRing(page, page.getByRole('button', { name: 'Save' }));
  });
}
