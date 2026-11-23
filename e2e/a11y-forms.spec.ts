import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { seedDatabase } from './support/seed';
import { readStoredValue } from './support/stored-values';
import { generateDataSet } from './support/synthetic-data';
import { startsWith, text, type Language } from './support/texts';

/**
 * Form controls, charts and the remaining roles for screen reader and
 * keyboard users, in English and German: sliders, unit choices and date
 * fields say what they set, chips and choice cards are buttons, required
 * fields say why saving failed, long explanations are descriptions, charts
 * have a text, sorting works without dragging, and the welcome dialog shows
 * one step at a time.
 */

type Texts = (key: string, params?: Record<string, string>) => string;

async function start(
  page: Page,
  language: Language,
  { welcome = false, freeze = false } = {},
): Promise<void> {
  const data = generateDataSet({
    brews: 20,
    beans: 6,
    seed: 3,
    endDate: new Date('2026-11-01T18:00:00Z'),
  });
  data.SETTINGS[0].language = language;
  data.SETTINGS[0].welcome_page_showed = !welcome;
  data.SETTINGS[0].freeze_coffee_beans = freeze;
  await seedDatabase(page, data);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', language);
  if (!welcome) {
    await expect(page).toHaveURL(/\/home\/dashboard$/);
  }
}

/** Shows a screen the way the router does, without a reload. */
async function show(page: Page, route: string): Promise<void> {
  await page.evaluate((path) => {
    history.pushState({}, '', path);
    dispatchEvent(new PopStateEvent('popstate'));
  }, route);
  await expect(page).toHaveURL(new RegExp(`${route}$`));
}

function visible(locator: Locator): Locator {
  return locator.filter({ visible: true });
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A text with `{{name}}` in it, matching any name, e.g. "Move (.+) down". */
function pattern(t: Texts, key: string): RegExp {
  return new RegExp(`^${escape(t(key, { name: '#' })).replace('#', '(.+)')}$`);
}

async function click(page: Page, name: string | RegExp): Promise<void> {
  await visible(page.getByRole('button', { name, exact: true }))
    .first()
    .click();
}

/** The modal on show, whose content is slotted into its dialog. */
function openModal(page: Page): Locator {
  return page.locator('ion-modal:not(.overlay-hidden)').last();
}

/** What the app's live region says now. */
function liveRegion(page: Page): Locator {
  return page.locator('.cdk-live-announcer-element');
}

/** Names that are only a value or a unit, e.g. "100 100%" or "gr". */
const VALUE_ONLY = /^[-\d\s.,%]*$|^(gr?|ml|s|ms|bar)$/;

for (const language of ['en', 'de'] as const) {
  test.describe(language, () => {
    const t: Texts = (key, params) => text(language, key, params);

    test('sliders are named after their label and say their value with its unit', async ({
      page,
    }) => {
      await start(page, language);
      await show(page, '/home/profile/settings');
      const settings = page.locator('settings');
      const quality = settings.getByRole('slider', {
        name: t('PAGE_SETTINGS_IMAGE_QUALITY'),
        exact: true,
      });
      // The range shows its minimum until the stored default of 100 arrives,
      // and is disabled for a moment while the page scrolls in.
      await expect(quality).toHaveAttribute('aria-valuenow', '100');
      await expect(quality).not.toHaveAttribute('aria-disabled', 'true');
      const before = 100;
      await quality.focus();
      await page.keyboard.press('ArrowLeft');
      await expect(quality).toHaveAttribute(
        'aria-valuenow',
        String(before - 1),
      );
      await expect(quality).toHaveAttribute(
        'aria-valuetext',
        `${before - 1} %`,
      );
      for (const slider of await visible(settings.getByRole('slider')).all()) {
        await expect(slider).not.toHaveAccessibleName(VALUE_ONLY);
      }

      await show(page, '/home/beans');
      await click(page, t('A11Y.FILTER_BEANS'));
      const filter = openModal(page);
      for (const [key, unit] of [
        ['BEAN_DATA_ROAST_NAME', ''],
        ['BREW_DATA_RATING', ''],
      ]) {
        const label = t(key);
        await expect(
          filter.getByRole('slider', {
            name: t('A11Y.RANGE_FROM', { name: label }),
          }),
        ).toHaveAttribute('aria-valuetext', new RegExp(`^[\\d.,]+${unit}$`));
        await expect(
          filter.getByRole('slider', {
            name: t('A11Y.RANGE_TO', { name: label }),
          }),
        ).toBeVisible();
      }
      // The roast date range is chosen in two named date fields.
      for (const key of ['A11Y.ROAST_DATE_FROM', 'A11Y.ROAST_DATE_TO']) {
        await expect(
          filter.getByRole('textbox', { name: t(key) }),
        ).toHaveAttribute('aria-haspopup', 'dialog');
      }
      for (const textbox of await visible(filter.getByRole('textbox')).all()) {
        await expect(textbox).not.toHaveAccessibleName('');
      }
    });

    test('unit choices, date fields and time fields say what they set', async ({
      page,
      browserName,
    }) => {
      await start(page, language);
      await show(page, '/home/brews');
      await click(page, t('ADD_BREW'));
      const form = openModal(page);
      for (const field of [
        'BREW_DATA_BREW_QUANTITY',
        'BREW_DATA_BREW_BEVERAGE_QUANTITY',
      ]) {
        await expect(
          form.getByRole('button', {
            name: startsWith(t('A11Y.UNIT_OF', { field: t(field) })),
          }),
        ).toBeVisible();
      }
      await expect(form.getByRole('button', { name: VALUE_ONLY })).toHaveCount(
        0,
      );
      // No unnamed image: icons are hidden or named.
      await expect
        .poll(() =>
          form.evaluate(
            (root) =>
              [...root.querySelectorAll('ion-icon, img')].filter(
                (icon) =>
                  icon.getClientRects().length > 0 &&
                  !icon.closest('[aria-hidden="true"]') &&
                  icon.getAttribute('role') !== 'button' &&
                  !icon.getAttribute('aria-label') &&
                  !icon.getAttribute('alt'),
              ).length,
          ),
        )
        .toBe(0);

      // The brew time opens a dialog whose fields are named by their column.
      const time = visible(
        form.getByRole('textbox', { name: t('BREW_DATA_TIME'), exact: true }),
      );
      await expect(time).toHaveAttribute('aria-haspopup', 'dialog');
      await time.focus();
      await page.keyboard.press('Enter');
      const timer = openModal(page);
      for (const key of ['TIMER_MINUTES', 'TIMER_SECONDS']) {
        await expect(
          timer.getByRole('textbox', { name: t(key) }),
        ).toBeVisible();
      }
      await click(page, t('CANCEL'));
      // Quarantined in WebKit: when the closing dialog itself has focus,
      // WebKit moves it to the dialog below before Ionic can give it back, in
      // about one run of five.
      if (browserName !== 'webkit') {
        await expect(time).toBeFocused();
      }

      await click(page, t('CANCEL'));
      await show(page, '/home/beans');
      await click(page, t('ADD_BEAN'));
      const bean = openModal(page);
      // On iOS Ionic briefly shows a copy of a focused field while it scrolls
      // it above the keyboard.
      const roastDate = bean
        .getByRole('textbox', {
          name: startsWith(t('BEAN_DATA_ROASTING_DATE')),
        })
        .and(page.locator(':not(.cloned-input)'));
      await expect(roastDate).toHaveAttribute('readonly', '');
      await expect(roastDate).toHaveAttribute('aria-haspopup', 'dialog');
      await expect(roastDate).toHaveValue('');
      await roastDate.focus();
      await page.keyboard.press('Enter');
      // In the browser the date is set to today at once; the app opens the
      // date picker of the system there.
      await expect(roastDate).not.toHaveValue('');
      await expect(roastDate).toBeFocused();
    });

    test('a save without a name says why and marks the field', async ({
      page,
    }) => {
      await start(page, language, { freeze: true });
      await show(page, '/home/beans');
      await click(page, t('ADD_BEAN'));
      const form = openModal(page);
      const name = form.getByRole('textbox', {
        name: startsWith(t('BEAN_DATA_NAME')),
      });
      await expect(name).toHaveAttribute('required', '');
      // Saved from another tab, the form goes back to the tab with the name.
      const general = form.getByRole('tab', {
        name: startsWith(t('BEAN_TAB_GENERAL_INFORMATION')),
      });
      const frozen = form.getByRole('tab', {
        name: startsWith(t('BEAN_TAB_FROZEN_INFORMATION')),
      });
      await frozen.focus();
      await page.keyboard.press('Enter');
      await expect(frozen).toHaveAttribute('aria-selected', 'true');
      await expect(name).toHaveCount(0);
      await click(page, t('SAVE'));

      await expect(general).toHaveAttribute('aria-selected', 'true');
      await expect(name).toHaveAttribute('aria-invalid', 'true');
      await expect(name).toBeFocused();
      await expect(name).toHaveAccessibleDescription(
        t('BEAN.VALIDATION.NAME_REQUIRED'),
      );
      await expect(liveRegion(page)).toHaveText(
        t('BEAN.VALIDATION.NAME_REQUIRED'),
      );
      // Ionic's error text is no second live region.
      await expect(form.locator('.error-text[role="alert"]')).toHaveCount(0);
      await expect(page.getByRole('dialog')).toHaveCount(1);

      await name.fill('Kenia');
      await expect(name).not.toHaveAttribute('aria-invalid', 'true');
    });

    test('chips with an action are buttons, choice cards are buttons', async ({
      page,
    }) => {
      await start(page, language);
      await show(page, '/home/profile/preparations');
      await click(page, t('ADD_PREPARATION'));
      const choice = openModal(page);
      await expect(
        choice.getByRole('button', {
          name: t('PREPARATION_TYPE_FRENCH_PRESS'),
          exact: true,
        }),
      ).toBeVisible();
      expect(await choice.getByRole('button').count()).toBeGreaterThan(40);
      await click(page, t('BACK'));
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await visible(
        page.getByRole('button', {
          name: t('A11Y.OPTIONS_FOR', { name: 'Espresso machine' }),
        }),
      ).click();
      await click(page, t('EDIT'));
      const edit = openModal(page);
      const chip = edit.getByRole('button', {
        name: t('A11Y.EDIT_TOOL', { tool: '18 g basket' }),
      });
      await chip.focus();
      await page.keyboard.press('Enter');
      // The tool opens in a dialog of its own.
      await expect(
        visible(
          page.getByRole('textbox', { name: startsWith(t('NAME')) }),
        ).last(),
      ).toHaveValue('18 g basket');
    });

    test('checkboxes are named by their title and described by their explanation', async ({
      page,
    }) => {
      await start(page, language);
      await show(page, '/home/profile/settings');
      const checkbox = page.locator('settings').getByRole('checkbox', {
        name: t('PAGE_SETTINGS_SECURITY_CHECK_WHEN_GOING_BACK'),
        exact: true,
      });
      await expect(checkbox).toHaveAccessibleDescription(
        t('PAGE_SETTINGS_SECURITY_CHECK_WHEN_GOING_BACK_DESCRIPTION'),
      );
      for (const each of await visible(
        page.locator('settings').getByRole('checkbox'),
      ).all()) {
        const name = (await each.getAttribute('aria-label')) ?? '';
        expect(name.length, name).toBeLessThanOrEqual(80);
      }
    });

    test('sorting works by keyboard and says the new position', async ({
      page,
    }) => {
      await start(page, language);
      await show(page, '/home/profile/brew-parameter');
      await click(page, t('NAV_SORT_PARAMETERS'));
      const section = page.locator('sort-custom-parameter ion-card').first();
      const moveDown = section.getByRole('button', {
        name: pattern(t, 'A11Y.MOVE_DOWN'),
      });
      await expect(moveDown).not.toHaveCount(0);
      const count = await moveDown.count();
      const first = moveDown.first();
      const entry = pattern(t, 'A11Y.MOVE_DOWN').exec(
        (await first.getAttribute('aria-label')) ?? '',
      )![1];
      const stored = async () =>
        JSON.stringify(
          (await readStoredValue<{ brew_order: unknown }[]>(
            page,
            'SETTINGS',
          ))![0].brew_order,
        );
      const before = await stored();

      await first.focus();
      await page.keyboard.press('Enter');

      await expect(liveRegion(page)).toHaveText(
        t('A11Y.MOVED_TO_POSITION', {
          name: entry,
          position: '2',
          count: String(count),
        }),
      );
      await expect(
        section.getByRole('button', {
          name: t('A11Y.MOVE_DOWN', { name: entry }),
        }),
      ).toBeFocused();
      await expect(
        section
          .getByRole('button', { name: pattern(t, 'A11Y.MOVE_UP') })
          .nth(1),
      ).toHaveAttribute('aria-label', t('A11Y.MOVE_UP', { name: entry }));
      await expect.poll(stored).not.toBe(before);
    });

    test('charts have a text with their title and values', async ({ page }) => {
      await start(page, language);
      await show(page, '/home/profile/statistic');
      const statistic = page.locator('statistic');
      for (const tab of ['STATISTIC_TAB_BREWS', 'STATISTIC_TAB_BEANS']) {
        const segment = statistic.getByRole('tab', { name: t(tab) });
        // Ionic's segment button takes the pointer; the keyboard reaches the tab.
        await segment.focus();
        await page.keyboard.press('Enter');
        const charts = visible(statistic.locator('canvas'));
        await expect(charts.first()).toBeVisible();
        for (const chart of await charts.all()) {
          await expect(chart).toHaveAttribute('role', 'img');
          await expect(chart).toHaveAccessibleName(/\S+\. \S/);
        }
      }

      await statistic
        .getByRole('tab', { name: t('STATISTIC_RANGE_CUSTOM') })
        .focus();
      await page.keyboard.press('Enter');
      await expect(
        statistic.getByRole('button', {
          name: startsWith(`${t('STATISTIC_RANGE_FROM')} `),
        }),
      ).toBeVisible();
      await expect(
        statistic.getByRole('button', {
          name: startsWith(`${t('STATISTIC_RANGE_TO')} `),
        }),
      ).toBeVisible();
    });

    test('the welcome dialog shows one named step at a time', async ({
      page,
    }) => {
      await start(page, language, { welcome: true });
      const steps = page.getByRole('group', {
        name: new RegExp(
          `^${escape(t('A11Y.STEP_OF', { step: '#', count: '5' })).replace('#', '\\d')}$`,
        ),
      });
      await expect(steps).toHaveCount(1);
      await expect(steps).toHaveAccessibleName(
        t('A11Y.STEP_OF', { step: '1', count: '5' }),
      );

      await steps.getByRole('button', { name: t('DO_NOT_ACTIVE') }).click();
      await expect(steps).toHaveCount(1);
      await expect(steps).toHaveAccessibleName(
        t('A11Y.STEP_OF', { step: '2', count: '5' }),
      );
      // The focused heading says the position: phones do not say the group.
      await expect(
        steps.getByRole('heading', {
          name: `${t('A11Y.STEP_OF', { step: '2', count: '5' })}, ${t('WELCOME_PAGE_BEAN_TITLE')}`,
          exact: true,
        }),
      ).toBeFocused();

      await steps.getByRole('button', { name: t('SKIP') }).focus();
      await page.keyboard.press('Enter');
      await expect(steps).toHaveAccessibleName(
        t('A11Y.STEP_OF', { step: '3', count: '5' }),
      );
    });
  });
}
