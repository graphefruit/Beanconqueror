import { expect, test } from './fixtures';
import { contrast, firstColour, type Rgb } from './support/colour';
import { openFromProfile } from './support/profile';
import { seedDatabase } from './support/seed';
import { generateDataSet } from './support/synthetic-data';

/**
 * The three icon buttons above the brew list have names a screen reader can
 * speak, in the app language, and the collapse toggle tells its state.
 */

test('the brew list buttons are named and the collapse toggle tells its state', async ({
  page,
}) => {
  await seedDatabase(page, generateDataSet({ brews: 12, beans: 3, seed: 5 }));
  await page.goto('/');
  await page.getByRole('tab', { name: 'Brews', exact: true }).click();

  await expect(
    page.getByRole('button', { name: 'Filter brews', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Sort brews', exact: true }),
  ).toBeVisible();

  const collapse = page.getByRole('button', {
    name: 'Collapse brew list items',
  });
  await expect(collapse).toHaveAttribute('aria-pressed', 'false');
  await collapse.click();
  await expect(collapse).toHaveAttribute('aria-pressed', 'true');
  await collapse.click();
  await expect(collapse).toHaveAttribute('aria-pressed', 'false');

  // An active sort order is part of the name, as the icon shows it.
  await page.getByRole('button', { name: 'Sort brews', exact: true }).click();
  await page.getByText('Bean name', { exact: true }).click();
  await page.getByRole('button', { name: 'Apply filter' }).click();
  await expect(
    page.getByRole('button', { name: 'Sort brews (active)' }),
  ).toBeVisible();
});

test('the brew list buttons are named in the app language', async ({
  page,
}) => {
  await seedDatabase(page, generateDataSet({ brews: 12, beans: 3, seed: 5 }));
  await page.goto('/');

  await openFromProfile(page, 'Settings');
  // By keyboard: a pointer hits the select's own control instead of its button.
  await page.getByRole('button', { name: /^Language Settings/ }).press('Enter');
  await page.getByRole('radio', { name: 'German' }).click();
  await page.getByRole('button', { name: 'Choose' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');

  await page.getByRole('button', { name: 'back' }).click();
  await page.getByRole('tab', { name: 'Brühungen', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Brühungen filtern', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Brühungen sortieren', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Einträge der Brühliste einklappen' }),
  ).toHaveAttribute('aria-pressed', 'false');
});

/**
 * An inactive filter, sort or collapse icon is a grey disc with a white symbol. The
 * symbol is read against the disc (4.5:1), and the disc, or its edge in dark
 * mode, stands out from the page and the cards (WCAG 1.4.11, 3:1).
 */
for (const dark of [false, true]) {
  const theme = dark ? 'dark' : 'light';
  test(`inactive list toolbar icons keep their contrast (${theme})`, async ({
    page,
  }) => {
    await seedDatabase(page, generateDataSet({ brews: 3, beans: 1, seed: 5 }));
    await page.goto('/');
    await page.getByRole('tab', { name: 'Brews', exact: true }).click();
    await page.evaluate(
      (on) => document.documentElement.classList.toggle('ion-palette-dark', on),
      dark,
    );

    const surfaces = await page.evaluate(() =>
      ['--bq-surface-page', '--bq-surface-card'].map((token) => {
        const probe = document.createElement('span');
        probe.style.color = `var(${token})`;
        document.body.append(probe);
        const colour = getComputedStyle(probe).color;
        probe.remove();
        return colour;
      }),
    );

    for (const name of [
      'Filter brews',
      'Sort brews',
      'Collapse brew list items',
    ]) {
      // The role sits on the native button in the shadow root; the icon is
      // slotted into its host.
      const icon = page
        .locator('ion-button')
        .filter({ has: page.getByRole('button', { name, exact: true }) })
        .locator('ion-icon');
      // The icon draws its SVG into its shadow root once it has loaded.
      await expect
        .poll(() =>
          icon.evaluate((el) => !!el.shadowRoot?.querySelector('svg')),
        )
        .toBe(true);
      const parts = await icon.evaluate((el) => {
        const svg = el.shadowRoot!.querySelector('svg')!;
        const disc = getComputedStyle(svg.querySelector('#bg, #shape')!);
        const glyph = getComputedStyle(
          [...svg.querySelectorAll('path')].pop()!,
        );
        return { disc: disc.fill, edge: disc.stroke, glyph: glyph.fill };
      });
      const disc = firstColour(parts.disc);
      const edge: Rgb = parts.edge === 'none' ? disc : firstColour(parts.edge);

      expect(contrast(firstColour(parts.glyph), disc)).toBeGreaterThanOrEqual(
        4.5,
      );
      for (const surface of surfaces) {
        expect(contrast(edge, firstColour(surface))).toBeGreaterThanOrEqual(3);
      }
    }
  });
}
