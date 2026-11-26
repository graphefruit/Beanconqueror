import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * Rules read from the source, not from the running app: they hold for every
 * file and need no browser. Texts shown to users come from the translations,
 * the app does not zoom, and the colours before the app starts repeat the
 * system bar tokens.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
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

function flatten(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, entry]) =>
    typeof entry === 'object' && entry !== null
      ? flatten(entry as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

const KEYS_OF = {
  en: new Set(flatten(JSON.parse(read('src/assets/i18n/en.json')))),
  de: new Set(flatten(JSON.parse(read('src/assets/i18n/de.json')))),
};

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
  /\.(?:showInfoToast|showInfoToastBottom|showMessage|showMessageWithDetails|showLoadingSpinner|setLoadingSpinnerMessage|showLoadingMessage|showConfirm)\(\s*(['`])([^'`]*)\1/g;

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

describe('texts in the source', () => {
  test('every key the app shows exists in English and German', () => {
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
            if (!KEYS_OF[language].has(key)) {
              missing.push(`${path}: ${key} (${language})`);
            }
          }
        }
      }
    }
    assert.deepEqual([...new Set(missing)], []);
  });

  // Lokalise starts from the English keys; German is kept by hand alongside.
  test('English and German have the same keys', () => {
    assert.deepEqual([...KEYS_OF.de].sort(), [...KEYS_OF.en].sort());
  });

  test('messages for users are keys, not fixed English text', () => {
    const fixed: string[] = [];
    for (const { path, text: source } of sources(/\.ts$/)) {
      for (const match of withoutComments(source).matchAll(MESSAGE_CALL)) {
        // A template with placeholders is put together from translations.
        if (!KEY.test(match[2]) && !match[2].includes('${')) {
          fixed.push(`${path}: ${match[2]}`);
        }
      }
    }
    assert.deepEqual(fixed, []);
  });

  // A message that names the cause, e.g. of a failed backup import, shows
  // it apart under "Technical details:" (UIAlert.showMessageWithDetails),
  // which these calls are not.
  test('messages for users leave the technical cause of an error to the log', () => {
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
    assert.deepEqual(technical, []);
  });

  test('choices in a dialog name their buttons in the app language', () => {
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
    assert.deepEqual(untranslated, []);
  });
});

/** The attributes of each `<meta name="…">` tag of src/index.html. */
function metaTags(name: string): Record<string, string>[] {
  const tags = read('src/index.html').match(/<meta\b[^>]*>/g) ?? [];
  return tags
    .map((tag) =>
      Object.fromEntries(
        [...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [
          key,
          value,
        ]),
      ),
    )
    .filter((attributes) => attributes['name'] === name);
}

describe('src/index.html', () => {
  test('the viewport blocks zooming the app', () => {
    const [viewport] = metaTags('viewport');
    const settings = Object.fromEntries(
      (viewport?.['content'] ?? '')
        .split(',')
        .map((part) =>
          part.split('=').map((value) => value.trim().toLowerCase()),
        ),
    );

    assert.equal(settings['user-scalable'], 'no');
    // A capped scale also stops iOS from zooming into a focused field.
    assert.equal(Number(settings['maximum-scale']), 1);
  });

  test('the static theme-color tags repeat the system bar tokens', () => {
    // The tokens and the palette they point to are declared on :root.
    const root =
      read('src/theme/bq-tokens.scss').match(
        /^:root\s*\{([\s\S]*?)^\}/m,
      )?.[1] ?? '';
    const declared = new Map(
      [...root.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map(
        ([, name, value]) => [name, value.trim()],
      ),
    );
    const resolve = (name: string): string | undefined => {
      const value = declared.get(name);
      const reference = value?.match(/^var\((--[\w-]+)\)$/)?.[1];
      return reference ? resolve(reference) : value?.toLowerCase();
    };
    const cream = '#ead9c4';
    const espresso = '#211914';

    assert.deepEqual(
      ['--bq-system-bar-light', '--bq-system-bar-dark'].map(resolve),
      [cream, espresso],
    );
    assert.deepEqual(
      metaTags('theme-color').map((meta) => [
        meta['media'],
        meta['content'].toLowerCase(),
      ]),
      [
        ['(prefers-color-scheme: light)', cream],
        ['(prefers-color-scheme: dark)', espresso],
      ],
    );
  });
});

// How the directive behaves on an ion-button: its unit test.
test('Save of the add-bean form ignores a second tap', () => {
  const save = read('src/app/beans/beans-add/beans-add.component.html').match(
    /<ion-button\b[^>]*\(click\)="addBean\(\)"[^>]*>/,
  )?.[0];

  assert.match(save ?? '', /\sdisable-double-click\s/);
});
