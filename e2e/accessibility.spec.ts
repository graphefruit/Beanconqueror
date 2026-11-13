import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';

/**
 * axe scan of the main areas after first run, in light and dark.
 *
 * Works like the ESLint suppressions ratchet: known violations live in
 * `accessibility-baseline.json` as "<rule id> | <target selector>" per area and theme.
 * A violation missing from the baseline fails the test. A baseline entry that no longer
 * occurs fails too, so fixed issues are removed and cannot silently come back.
 * Refresh the file with `A11Y_UPDATE_BASELINE=1 pnpm e2e e2e/accessibility.spec.ts`.
 */

type Theme = 'light' | 'dark';
type Baseline = Record<string, Partial<Record<Theme, string[]>>>;

const BASELINE_FILE = 'accessibility-baseline.json';
const UPDATE_BASELINE = !!process.env['A11Y_UPDATE_BASELINE'];
const WCAG_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];

// Angular derives these attribute names from the component's template and styles, so they
// change with unrelated edits and would churn the baseline.
const EMULATED_ENCAPSULATION_ATTRIBUTE = /\[_ng(?:content|host)-[^\]]*\]/g;

// Update mode rewrites one shared file per test, so the tests of this file must not run
// in parallel workers. Failures do not skip the remaining areas.
test.describe.configure({ mode: 'default' });

function baselinePath(testInfo: TestInfo): string {
  return resolve(testInfo.project.testDir, BASELINE_FILE);
}

function readBaseline(testInfo: TestInfo): Baseline {
  const file = baselinePath(testInfo);
  return existsSync(file)
    ? (JSON.parse(readFileSync(file, 'utf8')) as Baseline)
    : {};
}

function writeBaseline(
  testInfo: TestInfo,
  area: string,
  found: Record<Theme, string[]>,
): void {
  const baseline = readBaseline(testInfo);
  baseline[area] = found;
  const sorted = Object.fromEntries(
    Object.keys(baseline)
      .sort()
      .map((key) => [key, baseline[key]]),
  );
  writeFileSync(baselinePath(testInfo), `${JSON.stringify(sorted, null, 2)}\n`);
}

/**
 * Lets entry and theme transitions finish so axe does not measure half-faded colours.
 * Transitions only exist after the next style recalculation, hence the frames first, and
 * `document.getAnimations()` leaves out those inside Ionic's shadow roots (e.g. segments).
 */
async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const nextFrame = () =>
      new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    const collect = (root: Document | ShadowRoot): Animation[] => [
      ...root.getAnimations(),
      ...[...root.querySelectorAll('*')].flatMap((element) =>
        element.shadowRoot ? collect(element.shadowRoot) : [],
      ),
    ];
    const running = () =>
      collect(document).filter(
        (animation) =>
          animation.playState === 'running' &&
          animation.effect?.getComputedTiming().iterations !== Infinity,
      );
    await nextFrame();
    await nextFrame();
    for (let pending = running(); pending.length > 0; pending = running()) {
      await Promise.all(
        pending.map((animation) => animation.finished.catch(() => undefined)),
      );
      await nextFrame();
    }
  });
}

async function scan(page: Page): Promise<string[]> {
  await settle(page);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const keys = results.violations.flatMap((violation) =>
    violation.nodes.map(
      (node) =>
        `${violation.id} | ${node.target
          .map(String)
          .join(' >>> ')
          .replace(EMULATED_ENCAPSULATION_ATTRIBUTE, '')}`,
    ),
  );
  return [...new Set(keys)].sort();
}

/**
 * Dark is switched like the theme service does on the web, via the palette class; the
 * stored default theme is light, and changing the setting would make each test longer
 * without exercising more of the colour tokens.
 */
async function setTheme(page: Page, theme: Theme): Promise<void> {
  await page.evaluate(
    (dark) =>
      document.documentElement.classList.toggle('ion-palette-dark', dark),
    theme === 'dark',
  );
  if (theme === 'dark') {
    await expect(page.locator('html')).toHaveClass(/\bion-palette-dark\b/);
  } else {
    await expect(page.locator('html')).not.toHaveClass(/\bion-palette-dark\b/);
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
      await expect(page.getByRole('tab', { name: 'Home' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
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
      await expect(
        page.getByRole('button', { name: 'Add bean' }),
      ).toBeVisible();
    },
  },
  {
    name: 'add-bean',
    open: async (page) => {
      await openTab(page, 'Beans');
      await page.getByRole('button', { name: 'Add bean' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    },
  },
  {
    name: 'profile',
    open: async (page) => {
      await openTab(page, 'Profile');
      await expect(
        page.getByRole('link', { name: /^Preparation methods/ }),
      ).toBeVisible();
    },
  },
  {
    name: 'preparations',
    open: async (page) => {
      await openTab(page, 'Profile');
      await page.getByRole('link', { name: /^Preparation methods/ }).click();
      await expect(
        page.getByRole('button', { name: 'Add preparation method' }),
      ).toBeVisible();
    },
  },
  {
    name: 'mills',
    open: async (page) => {
      await openTab(page, 'Profile');
      await page.getByRole('link', { name: /^Grinders/ }).click();
      await expect(
        page.getByRole('button', { name: 'Add grinder' }),
      ).toBeVisible();
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
];

for (const area of areas) {
  test(`${area.name} has no new accessibility violations`, async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await completeFirstRun(page);
    await area.open(page);

    const found = {} as Record<Theme, string[]>;
    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);
      found[theme] = await scan(page);
    }

    if (UPDATE_BASELINE) {
      writeBaseline(testInfo, area.name, found);
      return;
    }

    const known = readBaseline(testInfo)[area.name] ?? {};
    for (const theme of ['light', 'dark'] as const) {
      const expected = known[theme] ?? [];
      const added = found[theme].filter((key) => !expected.includes(key));
      const fixed = expected.filter((key) => !found[theme].includes(key));
      expect
        .soft(
          added,
          `New axe violations in ${area.name} (${theme}). Fix them; add them to ` +
            `e2e/${BASELINE_FILE} only with a documented reason.`,
        )
        .toEqual([]);
      expect
        .soft(
          fixed,
          `Fixed in ${area.name} (${theme}), please remove from e2e/${BASELINE_FILE} ` +
            '(or rerun with A11Y_UPDATE_BASELINE=1).',
        )
        .toEqual([]);
    }
  });
}
