import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { test as base, type Locator, type Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { seedDatabase } from './support/seed';
import { generateDataSet } from './support/synthetic-data';

/**
 * Names, texts and operation for screen reader and keyboard users, in English
 * and German: Ionic's built-in English names are replaced by the app's texts,
 * messages come from the translations, and the buttons that start a brew, the
 * info icons and Save react to Enter and Space as to a tap.
 */

type Language = 'en' | 'de';

const ROOT = resolve(__dirname, '..');

function flatten(
  value: Record<string, unknown>,
  prefix = '',
): [string, string][] {
  return Object.entries(value).flatMap(([key, entry]) =>
    typeof entry === 'object' && entry !== null
      ? flatten(entry as Record<string, unknown>, `${prefix}${key}.`)
      : [[`${prefix}${key}`, String(entry)] as [string, string]],
  );
}

const TEXTS: Record<Language, Map<string, string>> = {
  en: readTexts('en'),
  de: readTexts('de'),
};

function readTexts(language: Language): Map<string, string> {
  const file = join(ROOT, 'src/assets/i18n', `${language}.json`);
  return new Map(
    flatten(JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>),
  );
}

function text(
  language: Language,
  key: string,
  params: Record<string, string> = {},
): string {
  const value = TEXTS[language].get(key);
  if (value === undefined) {
    throw new Error(`No text for ${key}`);
  }
  return value.replace(/{{\s*(\w+)\s*}}/g, (_, name: string) => params[name]);
}

function startsWith(value: string): RegExp {
  return new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
}

/** Ionic's English names, which must not reach users of any language. */
const IONIC_NAMES = [
  'Activate to adjust the size of the dialog overlaying the screen',
  'search text',
  'reset',
];

/** Starts an installation with some brews and beans in `language`. */
async function start(page: Page, language: Language): Promise<void> {
  const data = generateDataSet({
    brews: 20,
    beans: 6,
    seed: 3,
    endDate: new Date('2026-11-01T18:00:00Z'),
  });
  data.SETTINGS[0].language = language;
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
  const tab = page.getByRole('tab', { name: text(language, key), exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

async function openFromProfile(page: Page, language: Language, key: string) {
  const tab = page.getByRole('tab', {
    name: text(language, 'NAV_PROFILE'),
    exact: true,
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
        page.getByRole('button', { name: t('A11Y.BREW_OPTIONS'), exact: true }),
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

    test('an info icon is a button named after its topic that opens by keyboard', async ({
      page,
    }) => {
      await start(page, language);
      await openFromProfile(page, language, 'NAV_SETTINGS');

      const info = page.getByRole('button', {
        name: t('A11Y.MORE_INFORMATION_ABOUT', {
          topic: t('PAGE_SETTINGS_IMAGE_QUALITY'),
        }),
      });
      await info.press('Enter');
      const alert = page.getByRole('alertdialog');
      await expect(alert).toContainText(
        t('PAGE_SETTINGS_IMAGE_QUALITY_TOOLTIP'),
      );
      await alert.getByRole('button', { name: t('OK') }).click();
      await expect(alert).toHaveCount(0);

      await info.press(' ');
      await expect(alert).toBeVisible();
      await expect(
        page.getByRole('img', { name: t('MORE_INFORMATION') }),
      ).toHaveCount(0);
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

      await visible(
        page.getByRole('button', { name: t('A11Y.IMPORT_BREW'), exact: true }),
      ).press('Enter');

      await expect(openDialog(page)).toHaveCount(1);
      await expect(visible(page.getByText(t('PRESET_BREW_TITLE')))).toHaveCount(
        1,
      );
    });

    test('Save keeps the focus while it ignores a second tap', async ({
      page,
    }) => {
      await start(page, language);
      await openTab(page, language, 'NAV_BEANS');
      await visible(
        page.getByRole('button', { name: t('ADD_BEAN'), exact: true }),
      ).click();
      const save = visible(
        page.getByRole('button', { name: t('SAVE'), exact: true }),
      );

      // Without a name, the bean is not saved and the dialog stays open.
      await save.press('Enter');

      // Read at once, while further taps are ignored (half a second).
      const state = await save.evaluate((button) => {
        const host = (button.getRootNode() as ShadowRoot).host;
        return {
          disabled: host.hasAttribute('disabled'),
          unavailable: button.getAttribute('aria-disabled'),
          focused:
            document.activeElement === host &&
            host.shadowRoot?.activeElement === button,
        };
      });
      expect(state).toEqual({
        disabled: false,
        unavailable: 'true',
        focused: true,
      });
      await expect(save).toBeFocused();
    });
  });
}

/** Source files of the app, as text, with their path below the project. */
function sources(extension: RegExp): { path: string; text: string }[] {
  const files: { path: string; text: string }[] = [];
  const walk = (directory: string) => {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) {
        walk(path);
      } else if (extension.test(name) && !name.endsWith('.spec.ts')) {
        files.push({
          path: relative(ROOT, path),
          text: readFileSync(path, 'utf8'),
        });
      }
    }
  };
  walk(join(ROOT, 'src'));
  return files;
}

/** Comments hold code that does not run, e.g. switched-off device features. */
function withoutComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const KEY = /^[A-Z0-9_]+(\.[A-Z0-9_]+)*$/;

/** Calls that show or speak their first argument, translated as a key. */
const MESSAGE_CALL =
  /\.(?:showInfoToast|showInfoToastBottom|showMessage|showLoadingSpinner|setLoadingSpinnerMessage|showLoadingMessage|showConfirm)\(\s*(['`])([^'`]*)\1/g;

/** The start of every call that shows or speaks a message. */
const MESSAGE_CALL_START =
  /\.(?:showInfoToast|showInfoToastBottom|showMessage|showLoadingSpinner|setLoadingSpinnerMessage|showLoadingMessage|showConfirm)\(/g;

/** The index of the quote that ends the text starting at `start`. */
function endOfText(source: string, start: number): number {
  let i = start + 1;
  while (i < source.length && source[i] !== source[start]) {
    i += source[i] === '\\' ? 2 : 1;
  }
  return i;
}

/**
 * The code of the arguments of the call whose "(" ends at `start`: the
 * contents of quoted texts are left out, the expressions in templates kept.
 */
function argumentCode(source: string, start: number): string {
  let code = '';
  let depth = 1;
  for (let i = start; i < source.length && depth > 0; i++) {
    const char = source[i];
    if (char === "'" || char === '"' || char === '`') {
      const end = endOfText(source, i);
      for (const part of source.slice(i, end).matchAll(/\$\{([^}]*)\}/g)) {
        code += char === '`' ? ` ${part[1]} ` : '';
      }
      i = end;
    } else {
      depth += char === '(' ? 1 : char === ')' ? -1 : 0;
      code += char;
    }
  }
  return code;
}

/** Caught errors and what is made of them for a message. */
const TECHNICAL_ERROR =
  /JSON\.stringify\(|(?<![\w.])_?(?:e|ex|err|error|exception)\b/;

/** A method of the class that is given the error chooses a key from it. */
const KEY_FROM_ERROR = /this\.\w+\(\s*_?\w+\s*\)/g;

/**
 * Messages that still show the technical cause. Importing a backup reports
 * it on purpose (settingsPageFiles.spec.ts); whether it stays is for the
 * maintainer to decide.
 */
const KNOWN_TECHNICAL_MESSAGES = [
  'src/app/settings/settings.page.ts: this.translate.instant() + error , )',
  'src/app/settings/settings.page.ts: this.translate.instant() + error , )',
  'src/app/settings/settings.page.ts: this.translate.instant() + + JSON.stringify(ex), )',
];

const LITERAL_KEY_USES = [
  /(['"])([^'"\n{}]+?)\1\s*\|\s*translate/g,
  /translate\.(?:instant|get)\(\s*(['`])([^'`\n]+?)\1/g,
  MESSAGE_CALL,
];

/**
 * Keys that are known to be missing, each with the reason they are not
 * added. The component is never shown (AppComponent returns before it).
 */
const KNOWN_MISSING_KEYS = new Set(['METICULOUS_NEEDS_HELP_TITLE']);

base.describe('texts in the source', () => {
  base('every key the app shows exists in English and German', () => {
    const missing: string[] = [];
    for (const { path, text: source } of sources(/\.(html|ts)$/)) {
      const code = withoutComments(source);
      for (const pattern of LITERAL_KEY_USES) {
        for (const match of code.matchAll(pattern)) {
          const key = match[2];
          // Prefixes of keys put together at run time end in _ or .
          if (
            !KEY.test(key) ||
            key.endsWith('_') ||
            KNOWN_MISSING_KEYS.has(key)
          ) {
            continue;
          }
          for (const language of ['en', 'de'] as const) {
            if (!TEXTS[language].has(key)) {
              missing.push(`${path}: ${key} (${language})`);
            }
          }
        }
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });

  base('messages for users are keys, not fixed English text', () => {
    const fixed: string[] = [];
    for (const { path, text: source } of sources(/\.ts$/)) {
      for (const match of withoutComments(source).matchAll(MESSAGE_CALL)) {
        // A template with placeholders is put together from translations.
        if (!KEY.test(match[2]) && !match[2].includes('${')) {
          fixed.push(`${path}: ${match[2]}`);
        }
      }
    }
    expect(fixed).toEqual([]);
  });

  base(
    'messages for users leave the technical cause of an error to the log',
    () => {
      const technical: string[] = [];
      for (const { path, text: source } of sources(/\.ts$/)) {
        const code = withoutComments(source);
        for (const match of code.matchAll(MESSAGE_CALL_START)) {
          const start = match.index + match[0].length;
          const args = argumentCode(code, start);
          if (TECHNICAL_ERROR.test(args.replace(KEY_FROM_ERROR, ''))) {
            technical.push(`${path}: ${args.replace(/\s+/g, ' ').trim()}`);
          }
        }
      }
      expect(technical).toEqual(KNOWN_TECHNICAL_MESSAGES);
    },
  );

  base('choices in a dialog name their buttons in the app language', () => {
    const untranslated: string[] = [];
    for (const { path, text: source } of sources(/\.html$/)) {
      for (const match of withoutComments(source).matchAll(
        /<ion-select(?=[\s>])[^>]*>/g,
      )) {
        const tag = match[0];
        // Popovers, sheets and the app's own overlays have no such buttons.
        const otherInterface =
          /interface\s*=\s*["'](?:popover|action-sheet|modal)/.test(tag) ||
          /-overlay\b/.test(tag);
        if (
          !otherInterface &&
          !(tag.includes('cancelText') && tag.includes('okText'))
        ) {
          untranslated.push(`${path}: ${tag.slice(0, 80)}`);
        }
      }
    }
    expect(untranslated).toEqual([]);
  });
});
