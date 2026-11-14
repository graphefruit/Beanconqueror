import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';
import { openFromProfile } from './support/profile';

/**
 * The basic form controls stay operable by role and expose their state to
 * assistive technology: checkboxes, radios and switches report checked,
 * sliders move with the arrow keys, and text fields have a visible label and
 * announce a missing required value. In light and dark, every state of a
 * control stands out from its surroundings (WCAG 1.4.11, 3:1) and the choice
 * is never marked by colour alone.
 */

/**
 * Ionic's scroll assist briefly shows a disabled copy of a focused input with
 * the same name; the user only ever types into the enabled one.
 */
function textField(page: Page, name: string | RegExp) {
  return page.getByRole('textbox', { name, disabled: false });
}

async function openAddBean(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Beans' }).click();
  await page.getByRole('button', { name: 'Add bean' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

type Rgb = [number, number, number];

/** The first colour in a computed value, e.g. of a background or box-shadow. */
function firstColour(value: string): Rgb {
  const match = /rgba?\((\d+), (\d+), (\d+)/.exec(value);
  if (!match) throw new Error(`no colour in "${value}"`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function contrast(a: Rgb, b: Rgb): number {
  const luminance = (rgb: Rgb) => {
    const [r, g, b] = rgb.map((channel) => {
      const c = channel / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

async function setDark(page: Page, dark: boolean): Promise<void> {
  await page.evaluate(
    (on) => document.documentElement.classList.toggle('ion-palette-dark', on),
    dark,
  );
}

/**
 * Label, track and pill colours of a segment button. The tab role sits on the
 * native button inside the host's shadow root, next to the pill.
 */
async function segmentColours(tab: Locator) {
  const values = await tab.evaluate((native) => {
    const host = (native.getRootNode() as ShadowRoot).host;
    const pill = host.shadowRoot!.querySelector(
      '.segment-button-indicator-background',
    )!;
    const pillStyle = getComputedStyle(pill);
    const hostStyle = getComputedStyle(host);
    return {
      label: hostStyle.color,
      track: hostStyle.backgroundColor,
      pill: pillStyle.backgroundColor,
      outline: pillStyle.boxShadow,
      pillShown: getComputedStyle(pill.parentElement!).opacity,
    };
  });
  return {
    label: firstColour(values.label),
    track: firstColour(values.track),
    pill: firstColour(values.pill),
    outline: values.outline,
    pillShown: values.pillShown === '1',
  };
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await completeFirstRun(page);
});

test('a settings checkbox can be switched on and off', async ({ page }) => {
  await openFromProfile(page, 'Settings');

  const fastRepeat = page.getByRole('checkbox', { name: /^Fast brew repeat/ });
  await expect(fastRepeat).not.toBeChecked();
  await fastRepeat.click();
  await expect(fastRepeat).toBeChecked();
  await fastRepeat.click();
  await expect(fastRepeat).not.toBeChecked();
});

test('a choice list marks the picked option as checked', async ({ page }) => {
  await openAddBean(page);
  // Opened from the keyboard: Ionic layers the select's visible wrapper over
  // its button, so a pointer click on the button itself never lands.
  await page.getByRole('button', { name: /^Roast type/ }).focus();
  await page.keyboard.press('Enter');

  const choices = page.getByRole('alertdialog', { name: 'Roast type' });
  await expect(choices.getByRole('radio', { name: 'Unknown' })).toBeChecked();
  const filter = choices.getByRole('radio', { name: 'Filter' });
  await filter.click();
  await expect(filter).toBeChecked();
  await expect(
    choices.getByRole('radio', { name: 'Unknown' }),
  ).not.toBeChecked();
});

test('the add-bean form labels its fields and its rating slider follows the arrow keys', async ({
  page,
}) => {
  await openAddBean(page);

  const name = textField(page, /^Name/);
  await expect(name).toBeVisible();
  // The label is shown on screen, not only exposed to screen readers.
  await expect(page.getByText(/^Name\*?$/)).toBeVisible();

  const rating = page.getByRole('slider', { name: /Rating/ });
  await expect(rating).toHaveAttribute('aria-valuenow', '0');
  await rating.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(rating).toHaveAttribute('aria-valuenow', '2');
  await page.keyboard.press('ArrowLeft');
  await expect(rating).toHaveAttribute('aria-valuenow', '1');
});

test('leaving the required bean name empty is announced as an error', async ({
  page,
}) => {
  await openAddBean(page);

  const name = textField(page, /^Name/);
  await expect(name).not.toHaveAttribute('aria-invalid', 'true');
  await name.click();
  await textField(page, 'Roaster').click();

  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toHaveAccessibleDescription(
    'Please enter a name for these beans.',
  );

  await name.fill('Ethiopia Guji');
  await textField(page, 'Roaster').click();
  await expect(name).not.toHaveAttribute('aria-invalid', 'true');
});

test('the favourites filter switch can be turned on and off', async ({
  page,
}) => {
  await openAddBean(page);
  await textField(page, /^Name/).fill('Ethiopia Guji');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page
    .getByRole('button', { name: /filter/i })
    .first()
    .click();
  const favourites = page.getByRole('switch', { name: 'Only favorites' });
  await expect(favourites).not.toBeChecked();
  await favourites.click();
  await expect(favourites).toBeChecked();
  await favourites.click();
  await expect(favourites).not.toBeChecked();
});

for (const dark of [false, true]) {
  const theme = dark ? 'dark' : 'light';

  test(`the chosen segment is an outlined pill on the track (${theme})`, async ({
    page,
  }) => {
    await page.getByRole('tab', { name: 'Beans' }).click();
    await setDark(page, dark);
    const chosen = page.getByRole('tab', { name: /^Available/ });
    const other = page.getByRole('tab', { name: /^Archive/ });
    await expect(chosen).toHaveAttribute('aria-selected', 'true');

    const selected = await segmentColours(chosen);
    const unselected = await segmentColours(other);
    expect(selected.pillShown).toBe(true);
    expect(unselected.pillShown).toBe(false);
    expect(contrast(selected.label, selected.pill)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(unselected.label, unselected.track)).toBeGreaterThanOrEqual(
      4.5,
    );
    // Not colour alone: the pill has an outline that stands out from the track.
    expect(selected.outline).toMatch(/ inset/);
    expect(
      contrast(firstColour(selected.outline), selected.track),
    ).toBeGreaterThanOrEqual(3);
  });
}
