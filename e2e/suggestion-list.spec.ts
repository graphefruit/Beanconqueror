import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ROASTER_NORTH } from './support/bean-data';
import { openAddBean, startWithBeans, suggestionField } from './support/beans';
import { contrast, firstColour } from './support/colour';

/**
 * The suggestions below a field of the bean form and the active one stand out
 * from the list in light and dark. Their roles, keys and announcements are
 * checked by the unit tests of the suggestion list.
 */

function suggestions(page: Page): Locator {
  return page.getByRole('listbox', { name: 'Suggestions' });
}

for (const dark of [false, true]) {
  const theme = dark ? 'dark' : 'light';
  test(`the suggestions and the active one are readable (${theme})`, async ({
    page,
  }) => {
    await startWithBeans(page);
    await openAddBean(page);
    await page.evaluate(
      (on) => document.documentElement.classList.toggle('ion-palette-dark', on),
      dark,
    );

    const roaster = suggestionField(page, 'Roaster');
    await roaster.pressSequentially('rös');
    await roaster.press('ArrowDown');
    const active = suggestions(page).getByRole('option', {
      name: ROASTER_NORTH,
    });
    await expect(active).toHaveAttribute('aria-selected', 'true');

    const colours = await active.evaluate((option) => {
      const list = getComputedStyle(option.parentElement!);
      const style = getComputedStyle(option);
      return {
        text: style.color,
        ring: style.outlineColor,
        surface: list.backgroundColor,
      };
    });
    const surface = firstColour(colours.surface);
    expect(contrast(firstColour(colours.text), surface)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrast(firstColour(colours.ring), surface)).toBeGreaterThanOrEqual(
      3,
    );
  });
}
