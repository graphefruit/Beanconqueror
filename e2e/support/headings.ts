import type { Page } from '@playwright/test';

/**
 * The heading outline of the view on top, as screen readers get it: the
 * topmost dialog, or the page when no dialog is open (Ionic hides the page
 * behind a dialog and the tab pages not shown).
 */

export interface Heading {
  level: number;
  name: string;
}

// `- heading "Name" [level=2]`; YAML quotes the line when the name needs it.
const HEADING = /\bheading(?: "((?:[^"\\]|\\.)*)")? \[level=(\d)\]/g;

// A figure ("7", "483.7 g", "12 %") instead of a title. The date and time on a
// brew card is its title: it tells the brews apart.
const VALUE_ONLY = /^[-+]?\d+([.,]\d+)?\s?[a-zA-Z%]{0,3}$/;

/** "Roast date:"; a long text ending in a colon is a title of the legal texts. */
function isFieldLabel(name: string): boolean {
  return name.endsWith(':') && name.split(/\s+/).length <= 5;
}

export async function headingOutline(page: Page): Promise<Heading[]> {
  const dialogs = page.getByRole('dialog');
  const scope =
    (await dialogs.count()) > 0 ? dialogs.last() : page.locator('body');
  const snapshot = await scope.ariaSnapshot();
  return [...snapshot.matchAll(HEADING)].map(([, name = '', level]) => ({
    level: Number(level),
    name: (JSON.parse(`"${name}"`) as string).replace(/''/g, "'").trim(),
  }));
}

/**
 * Breaks of the agreed outline: one level-1 heading (the screen or dialog
 * title) that comes first, no skipped levels, and no heading that is empty, a
 * bare value or a field label ("Name:").
 */
export function outlineProblems(headings: Heading[]): string[] {
  const problems: string[] = [];
  const titles = headings.filter(({ level }) => level === 1);
  if (titles.length !== 1) {
    problems.push(
      `${titles.length} level-1 headings: ${JSON.stringify(titles.map(({ name }) => name))}`,
    );
  } else if (headings[0].level !== 1) {
    problems.push(`"${headings[0].name}" comes before the level-1 heading`);
  }
  headings.forEach(({ level, name }, index) => {
    const previous = headings[index - 1];
    if (previous && level > previous.level + 1) {
      problems.push(`"${name}" skips from level ${previous.level} to ${level}`);
    }
    if (name === '') {
      problems.push(`empty heading at level ${level}`);
    } else if (VALUE_ONLY.test(name) || isFieldLabel(name)) {
      problems.push(`"${name}" is a value or field label, not a title`);
    }
  });
  return problems;
}
