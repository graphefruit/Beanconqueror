import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { contrast, firstColour } from './support/colour';
import { completeFirstRun } from './support/first-run';

/**
 * The basic form controls stay operable by role and expose their state to
 * assistive technology: radios report checked, sliders move with the arrow
 * keys, and text fields have a visible label. The required bean name, the
 * favourites switch of the bean filter and the settings checkboxes are checked
 * by their unit tests. In light and dark, every state of a
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
  await expect(rating).toHaveAttribute('aria-valuetext', '2 of 5');
  await page.keyboard.press('ArrowLeft');
  await expect(rating).toHaveAttribute('aria-valuenow', '1');
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

  test(`choice dialog radios show both states against the dialog (${theme})`, async ({
    page,
  }) => {
    await openAddBean(page);
    await setDark(page, dark);
    await page.getByRole('button', { name: /^Roast type/ }).focus();
    await page.keyboard.press('Enter');
    const choices = page.getByRole('alertdialog', { name: 'Roast type' });
    await expect(choices.getByRole('radio', { name: 'Unknown' })).toBeChecked();

    const ring = async (name: string) =>
      firstColour(
        await choices
          .getByRole('radio', { name })
          .evaluate(
            (radio) =>
              getComputedStyle(radio.querySelector('.alert-radio-icon')!)
                .borderTopColor,
          ),
      );
    const surface = firstColour(
      await choices.evaluate(
        (dialog) => getComputedStyle(dialog).backgroundColor,
      ),
    );
    const unchecked = await ring('Filter');
    const checked = await ring('Unknown');
    expect(contrast(unchecked, surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(checked, surface)).toBeGreaterThanOrEqual(3);
    expect(checked).not.toEqual(unchecked);
  });
}

for (const dark of [false, true]) {
  const theme = dark ? 'dark' : 'light';
  test(`a text field keeps a visible edge (${theme})`, async ({ page }) => {
    await openAddBean(page);
    await setDark(page, dark);

    // The field is drawn by its item: the bottom line of the item's inner row
    // (inset lines) or of the whole row (full lines).
    const edge = await textField(page, /^Name/).evaluate((input) => {
      const item = input.closest('ion-item')!;
      const native = item.shadowRoot!.querySelector('.item-native')!;
      const line = [item.shadowRoot!.querySelector('.item-inner')!, native]
        .map((part) => getComputedStyle(part))
        .find((style) => parseFloat(style.borderBottomWidth) > 0)!;
      return {
        line: line.borderBottomColor,
        surface: getComputedStyle(native).backgroundColor,
      };
    });
    const surface = firstColour(edge.surface);
    expect(
      contrast(firstColour(edge.line, surface), surface),
    ).toBeGreaterThanOrEqual(3);
  });
}
