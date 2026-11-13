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

/**
 * True when the focused control draws the double ring of solid (coral)
 * fills: an inner spread in the gap token at the ring offset and an outer
 * spread in the ring token at offset plus ring width, both on the control
 * itself (for ion-button, the native button inside its shadow root).
 */
async function showsDoubleRing(target: Locator): Promise<boolean> {
  return target.evaluate((element) => {
    const tokens = getComputedStyle(document.documentElement);
    const resolve = (token: string): string => {
      const probe = document.createElement('div');
      probe.style.color = tokens.getPropertyValue(token).trim();
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    const offset = parseFloat(
      tokens.getPropertyValue('--bq-focus-ring-offset'),
    );
    const width = parseFloat(tokens.getPropertyValue('--bq-focus-ring-width'));
    const shadow = getComputedStyle(element).boxShadow;
    return (
      shadow.includes(
        `${resolve('--bq-focus-ring-gap')} 0px 0px 0px ${offset}px`,
      ) &&
      shadow.includes(
        `${resolve('--bq-focus-ring')} 0px 0px 0px ${offset + width}px`,
      )
    );
  });
}

async function expectFocusRing(page: Page, target: Locator): Promise<void> {
  await tabTo(page, target);
  // Ionic animates its own focus states; the ring has to be there once they settle.
  await expect
    .poll(() => showsFocusRing(target), {
      message: `focus ring on ${String(target)}`,
    })
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
    const save = page.getByRole('button', { name: 'Save' });
    await expectFocusRing(page, save);
    // A single ring would disappear into the coral fill; the gap keeps it apart.
    await expect
      .poll(() => showsDoubleRing(save), { message: 'double ring on Save' })
      .toBe(true);
  });
}

const TABS = [
  { name: 'Home', path: '/home/dashboard', key: 'Enter' },
  { name: 'Brews', path: '/home/brews', key: 'Enter' },
  { name: 'Beans', path: '/home/beans', key: 'Enter' },
  { name: 'Methods', path: '/home/preparations', key: 'Enter' },
  { name: 'Grinders', path: '/home/mills', key: ' ' },
] as const;

for (const theme of ['light', 'dark'] as const) {
  test(`every tab in the tab bar can be reached and opened by keyboard (${theme})`, async ({
    page,
  }) => {
    await page.goto('/');
    await completeFirstRun(page);
    await setTheme(page, theme);

    // Lists also use tablists (segments), so pick the one holding the tabs.
    const tabBar = page.getByRole('tablist').filter({
      has: page.getByRole('tab', { name: 'Home', exact: true }),
    });
    // Counts tab selections, so a key press that selects twice shows up.
    await page.evaluate(() => {
      const w = window as unknown as { tabSelections: number };
      w.tabSelections = 0;
      document.addEventListener(
        'ionTabButtonClick',
        () => w.tabSelections++,
        true,
      );
    });
    const tabSelections = () =>
      page.evaluate(
        () => (window as unknown as { tabSelections: number }).tabSelections,
      );

    for (const { name, path, key } of TABS) {
      const tab = tabBar.getByRole('tab', { name, exact: true });
      await expectFocusRing(page, tab);
      // Ionic's focus tint is a positioned layer in the tab that would paint
      // over the inset ring, leaving only a grey fill.
      await expect
        .poll(() =>
          tab.evaluate((link) => getComputedStyle(link, '::after').opacity),
        )
        .toBe('0');
      const selectionsBefore = await tabSelections();
      await page.keyboard.press(key);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      expect(await tabSelections(), `${key} selects ${name} once`).toBe(
        selectionsBefore + 1,
      );
      // Screen readers announce the open tab as selected, and only that one.
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(tabBar.getByRole('tab', { selected: true })).toHaveCount(1);
    }
  });
}

test('tapping a settings slider does not draw the keyboard focus ring', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await page.getByRole('button', { name: 'menu' }).click();
  await page.getByRole('link', { name: 'Settings' }).click();

  const slider = page.getByRole('slider').first();
  await slider.scrollIntoViewIfNeeded();
  // Sliders are disabled while the page scrolls.
  await expect(slider).not.toHaveAttribute('aria-disabled', 'true');
  await slider.tap();

  // The tap focuses the knob (Ionic even marks it .ion-focused on touch), but
  // the ring is for keyboard focus only.
  await expect(slider).toBeFocused();
  await slider.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  expect(await showsFocusRing(slider)).toBe(false);
});
