import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { seedDatabase } from './support/seed';
import { readStoredValue } from './support/stored-values';
import { generateDataSet } from './support/synthetic-data';
import { mainTabName, startsWith, text, type Language } from './support/texts';

/**
 * Names, texts and operation for screen reader and keyboard users, in English
 * and German: Ionic's built-in English names are replaced by the app's texts,
 * messages come from the translations, and the buttons that start a brew and
 * Save react to Enter and Space as to a tap. The info icons and the names of
 * the settings checkboxes are checked by the unit tests of the settings page.
 */

/** Ionic's English names, which must not reach users of any language. */
const IONIC_NAMES = [
  'Activate to adjust the size of the dialog overlaying the screen',
  'search text',
  'reset',
];

type DataSet = ReturnType<typeof generateDataSet>;

/** Starts an installation with some brews and beans in `language`. */
async function start(
  page: Page,
  language: Language,
  adjust: (data: DataSet) => void = () => undefined,
): Promise<void> {
  const data = generateDataSet({
    brews: 20,
    beans: 6,
    seed: 3,
    endDate: new Date('2026-11-01T18:00:00Z'),
  });
  data.SETTINGS[0].language = language;
  adjust(data);
  // The pressure profile filter is offered once a brew has a profile.
  data.BREWS[0].pressure_profile = 'Blooming';
  await seedDatabase(page, data);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', language);
}

function visible(locator: Locator): Locator {
  return locator.filter({ visible: true });
}

async function openTab(page: Page, language: Language, key: string) {
  const tab = page.getByRole('tab', { name: mainTabName(text(language, key)) });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

async function openFromProfile(page: Page, language: Language, key: string) {
  const tab = page.getByRole('tab', {
    name: mainTabName(text(language, 'NAV_PROFILE')),
  });
  await expect(async () => {
    await tab.click();
    await expect(page).toHaveURL(/\/home\/profile$/, { timeout: 2000 });
  }).toPass();
  await page
    .locator('app-profile')
    .getByRole('link', { name: startsWith(text(language, key)) })
    .click();
}

function openDialog(page: Page): Locator {
  return visible(page.getByRole('dialog'));
}

/**
 * The names Chromium gives the elements of `role` on show, as a screen reader
 * gets them: unlike Playwright's, with the spaces and the text-transform of
 * the text.
 */
async function chromiumNames(page: Page, role: string): Promise<string[]> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  return nodes
    .filter((node) => !node.ignored && node.role?.value === role)
    .map((node) => String(node.name?.value ?? ''));
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const language of ['en', 'de'] as const) {
  test.describe(language, () => {
    const t = (key: string, params?: Record<string, string>) =>
      text(language, key, params);

    test('search fields and the grip of sheets are named in the app language', async ({
      page,
    }) => {
      await start(page, language);
      await openTab(page, language, 'NAV_BEANS');

      const search = visible(
        page.getByRole('searchbox', { name: t('A11Y.SEARCH_BEANS') }),
      );
      await expect(search).toHaveCount(1);
      await search.fill('x');
      const clear = visible(
        page.getByRole('button', { name: t('A11Y.CLEAR_SEARCH') }),
      );
      await clear.click();
      await expect(search).toHaveValue('');

      await visible(
        page.getByRole('button', { name: t('A11Y.FILTER_BEANS') }),
      ).click();
      await expect(
        openDialog(page).getByRole('button', {
          name: t('A11Y.RESIZE_DIALOG'),
          exact: true,
        }),
      ).toBeVisible();

      for (const name of IONIC_NAMES) {
        await expect(
          page.getByRole('button', { name, exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('searchbox', { name, exact: true }),
        ).toHaveCount(0);
      }
    });

    test('the choices of the pressure profile filter are answered in the app language', async ({
      page,
    }) => {
      await start(page, language);
      await openTab(page, language, 'NAV_BREWS');
      await expect(
        visible(page.getByRole('searchbox', { name: t('A11Y.SEARCH_BREWS') })),
      ).toHaveCount(1);
      await visible(
        page.getByRole('button', { name: t('A11Y.FILTER_BREWS') }),
      ).click();
      await visible(
        page.getByRole('button', {
          name: startsWith(`${t('BREW_DATA_PRESSURE_PROFILE')},`),
        }),
      ).press('Enter');

      const alert = page.getByRole('alertdialog');
      await expect(
        alert.getByRole('button', { name: t('CANCEL'), exact: true }),
      ).toBeVisible();
      await expect(
        alert.getByRole('button', { name: t('CHOOSE'), exact: true }),
      ).toBeVisible();
      await expect(alert.getByRole('button', { name: 'OK' })).toHaveCount(0);
    });

    test('a toast is closed by a button named in the app language and announced once', async ({
      page,
    }) => {
      await start(page, language);
      await openTab(page, language, 'NAV_BREWS');
      await visible(
        page.getByRole('button', {
          name: startsWith(t('A11Y.BREW_OPTIONS_FOR', { date: '' })),
        }),
      )
        .first()
        .click();
      await page
        .getByRole('button', {
          name: t('POPOVER_BREWS_OPTION_TOGGLE_FAVOURITE'),
          exact: true,
        })
        .click();

      const toast = page.locator('ion-toast');
      const message = new RegExp(
        `${t('TOAST_BREW_FAVOURITE_ADDED')}|${t('TOAST_BREW_FAVOURITE_REMOVED')}`,
      );
      await expect(toast.getByRole('status')).toHaveText(message);
      // Spoken from the app's live region only, not from the toast as well.
      await expect(toast.getByRole('status')).toHaveAttribute(
        'aria-live',
        'off',
      );
      await expect(page.locator('.cdk-live-announcer-element')).toHaveText(
        message,
      );
      const close = toast.getByRole('button', { name: t('CLOSE') });
      await expect(close).toHaveText('X');
      await close.click();
      await expect(toast).toHaveCount(0);
    });

    test('the calendar of the statistics speaks and shows the app language', async ({
      page,
    }) => {
      await start(page, language);
      await openFromProfile(page, language, 'NAV_STATISTICS');
      // The host takes the tap; Playwright would wait for the inner tab.
      await page.locator('ion-segment-button[value="CUSTOM"]').click();
      await visible(page.locator('ion-datetime-button')).first().click();

      const calendar = visible(page.locator('ion-datetime'));
      await expect(
        calendar.getByRole('button', { name: t('A11Y.PREVIOUS_MONTH') }),
      ).toBeVisible();
      await expect(
        calendar.getByRole('button', { name: t('A11Y.NEXT_MONTH') }),
      ).toBeVisible();
      const months = Array.from({ length: 12 }, (_, month) =>
        new Intl.DateTimeFormat(language, { month: 'long' }).format(
          new Date(2026, month, 15),
        ),
      );
      const toggle = calendar.getByRole('button', {
        name: t('A11Y.SHOW_YEAR_PICKER'),
      });
      await expect(toggle).toHaveText(new RegExp(months.join('|')));

      await expect(
        calendar.getByRole('button', { name: startsWith(`${t('TODAY')}, `) }),
      ).toHaveCount(1);
      if (language !== 'en') {
        await expect(
          calendar.getByRole('button', { name: /^Today, / }),
        ).toHaveCount(0);
      }

      await toggle.click();
      await expect(
        calendar.getByRole('button', { name: t('A11Y.HIDE_YEAR_PICKER') }),
      ).toBeVisible();
    });

    for (const key of ['Enter', ' ']) {
      const keyName = key === ' ' ? 'Space' : key;

      test(`${keyName} on the add button of the brews tab starts a brew`, async ({
        page,
      }) => {
        await start(page, language);
        await openTab(page, language, 'NAV_BREWS');

        await visible(
          page.getByRole('button', { name: t('ADD_BREW'), exact: true }),
        ).press(key);

        await expect(openDialog(page)).toHaveCount(1);
      });

      test(`${keyName} on the add button of Home starts a brew`, async ({
        page,
      }) => {
        await start(page, language);

        await visible(
          page.getByRole('button', { name: t('ADD_BREW'), exact: true }),
        ).press(key);

        await expect(openDialog(page)).toHaveCount(1);
      });
    }

    test('the brews tab offers what a long press on an add button does as a button of its own', async ({
      page,
    }) => {
      await start(page, language);
      await openTab(page, language, 'NAV_BREWS');

      // The button is named after the title of the dialog it opens.
      await visible(
        page.getByRole('button', { name: t('PRESET_BREW_TITLE'), exact: true }),
      ).press('Enter');

      await expect(openDialog(page)).toHaveCount(1);
      await expect(
        visible(
          page.getByRole('heading', {
            name: t('PRESET_BREW_TITLE'),
            exact: true,
          }),
        ),
      ).toHaveCount(1);
    });

    test('names have no spaces at their ends and the count of a segment as written', async ({
      page,
      browserName,
    }) => {
      test.skip(
        browserName !== 'chromium',
        'Reads the accessibility tree of Chromium.',
      );
      await start(page, language);
      await expect(
        page.getByRole('button', {
          name: startsWith(t('UNWRAPPED.BUTTON.TITLE')),
        }),
      ).toBeVisible();
      const unwrap = (await chromiumNames(page, 'button')).filter((name) =>
        name.includes(t('UNWRAPPED.BUTTON.TITLE')),
      );
      expect(unwrap).toHaveLength(1);
      expect(unwrap[0]).toBe(unwrap[0].trim());

      await openTab(page, language, 'NAV_BEANS');
      await expect(
        visible(page.locator('beans bean-information').getByRole('heading')),
      ).not.toHaveCount(0);
      const headings = (await chromiumNames(page, 'heading')).filter(
        (name) => name !== t('NAV_BEANS'),
      );
      expect(headings.length).toBeGreaterThan(1);
      for (const name of headings) {
        expect(name).toBe(name.trim());
        expect(name).not.toMatch(/\s\s/);
      }
      // Chromium takes the capitals Ionic gives the label of a segment into
      // its name; the count is read as written.
      const count = escape(t('A11Y.COUNT_TOTAL', { total: '#' })).replace(
        '#',
        '\\d+',
      );
      const tabs = (await chromiumNames(page, 'tab')).filter((name) =>
        name.startsWith(t('PAGE_BEANS_LIST_OBTAINABLE')),
      );
      expect(tabs).toHaveLength(1);
      expect(tabs[0]).toMatch(
        new RegExp(`^${escape(t('PAGE_BEANS_LIST_OBTAINABLE'))}, ${count}$`),
      );
    });

    // Roles and names of the card: its unit test.
    test('a tap on the archive mark of a brew card on Home opens the brew', async ({
      page,
    }) => {
      await start(page, language, (data) => {
        const latest = data.BREWS.reduce((a, b) =>
          a.config.unix_timestamp > b.config.unix_timestamp ? a : b,
        );
        data.BEANS.find((bean) => bean.config.uuid === latest.bean)!.finished =
          true;
      });
      const cards = page.locator('dashboard brew-information');
      // Home shows the cards in their own layout.
      await expect(
        cards.first().getByRole('heading', { level: 3 }),
      ).toBeVisible();
      const box = await cards
        .first()
        .locator('ion-icon[name="archive"]')
        .boundingBox();
      await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await expect(page).toHaveURL(/\/home\/dashboard$/);
      await expect(openDialog(page)).toHaveCount(1);
    });

    test('settings: only the choice in the analytics question is stored', async ({
      page,
    }) => {
      await start(page, language);
      await openFromProfile(page, language, 'NAV_SETTINGS');
      const settings = page.locator('settings');
      const name = t('PAGE_SETTINGS_ANALYTICS_INFORMATION');
      const checkbox = settings.getByRole('checkbox', { name, exact: true });
      const row = settings.locator('ion-item').filter({
        has: page.locator('.field-label', {
          hasText: new RegExp(`^\\s*${escape(name)}\\s*$`),
        }),
      });
      // Behind the open question the page is hidden from the AX tree.
      const state = row.locator('ion-checkbox');
      const stored = async () =>
        (
          await readStoredValue<{ matomo_analytics?: boolean }[]>(
            page,
            'SETTINGS',
          )
        )?.[0].matomo_analytics;
      const dialog = openDialog(page);
      // The buttons are slotted, outside the element with the role.
      const question = page.locator('ion-modal');

      const taps: [string, () => Promise<void>][] = [
        [
          'the edge of the row',
          async () => {
            const box = await row.boundingBox();
            await row.click({ position: { x: 4, y: box!.height / 2 } });
          },
        ],
        ['the checkbox', () => checkbox.click()],
        [
          'Space',
          async () => {
            await checkbox.focus();
            await page.keyboard.press('Space');
          },
        ],
      ];
      for (const [what, tap] of taps) {
        await tap();
        await expect(dialog, what).toHaveCount(1);
        await expect(state, what).toHaveAttribute('aria-checked', 'false');
        // A save would have been written by the time the question is shown.
        await page.waitForTimeout(300);
        expect(await stored(), what).toBe(false);
        await page.keyboard.press('Escape');
        await expect(dialog, what).toHaveCount(0);
        await expect(state, what).toHaveAttribute('aria-checked', 'false');
        expect(await stored(), what).toBe(false);
      }

      await checkbox.click();
      await question
        .getByRole('button', { name: t('ACTIVATE'), exact: true })
        .click();
      await expect(dialog).toHaveCount(0);
      await expect(checkbox).toBeChecked();
      await expect.poll(stored).toBe(true);

      await checkbox.click();
      await question
        .getByRole('button', { name: t('DO_NOT_ACTIVE'), exact: true })
        .click();
      await expect(dialog).toHaveCount(0);
      await expect(checkbox).not.toBeChecked();
      await expect.poll(stored).toBe(false);
    });
  });
}
