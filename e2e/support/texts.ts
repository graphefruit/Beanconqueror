import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** The app's texts in English and German, read from the translation files. */

export type Language = 'en' | 'de';

const ROOT = resolve(__dirname, '../..');

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

export function text(
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

export function startsWith(value: string): RegExp {
  return new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
}

/**
 * The name of a tab of the tab bar: its label, followed by what its red mark
 * means while the tab shows one (as in a new installation).
 */
export function mainTabName(label: string): RegExp {
  return new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(,|$)`);
}
