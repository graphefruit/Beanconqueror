import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { BEANS, ROASTER_NORTH } from './support/bean-data';
import {
  beanAction,
  beanCard,
  showBeanSegment,
  startWithBeans,
} from './support/beans';

/**
 * A bean is shared as a picture of its bean card, drawn from the preview
 * the dialog shows. Price and purchase date are never on it.
 */

// The browser cannot write the file to share; the app logs that as an error.
test.use({ allowedConsoleErrors: [/^Share - could not write the file /] });

function picture(page: Page): Locator {
  return page.getByRole('img', { name: /^Image of the bean: / });
}

/** Height to width of the picture: 4:5 at least. */
async function aspect(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  return box!.height / box!.width;
}

test('a bean is shared as a picture of its card, in a colour of choice', async ({
  page,
}) => {
  await startWithBeans(page);
  await beanAction(page, BEANS.alpha, 'Share as image');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Share bean' }),
  ).toBeVisible();
  await expect(picture(page)).toHaveAccessibleName(
    new RegExp(
      `^Image of the bean: Favourite\\. ${BEANS.alpha} \\(Filter\\), ${ROASTER_NORTH}\\. .*Brews: 2\\. .*BeanConqueror$`,
    ),
  );
  // The card shows the cost of 12.5; the picture leaves it out.
  await expect(picture(page)).not.toContainText('12.5');
  await expect(picture(page)).not.toHaveAccessibleName(/12\.5|Cost/);
  await expect(picture(page)).toContainText('BeanConqueror');
  expect(await aspect(picture(page))).toBeGreaterThanOrEqual(1.249);

  const colours = page.getByRole('group', { name: 'Colour' });
  await expect(colours.getByRole('radio')).toHaveCount(4);
  await expect(colours.getByRole('radio', { name: 'App light' })).toBeChecked();
  await colours.getByRole('radio', { name: 'Sage' }).check();
  await expect(picture(page)).toHaveCSS('background-color', 'rgb(47, 94, 76)');
  await page.keyboard.press('ArrowRight');
  await expect(colours.getByRole('radio', { name: 'Caramel' })).toBeChecked();

  const drawn = page.waitForEvent('console', (message) =>
    message.text().startsWith('Share - image drawn in'),
  );
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await drawn;
  const failed = page.getByRole('alertdialog').filter({
    hasText: 'The image could not be shared. Please try again.',
  });
  await expect(failed).toBeVisible();
  await failed.getByRole('button', { name: 'OK' }).click();

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(picture(page)).toHaveCount(0);
  await expect(
    beanCard(page, BEANS.alpha)
      .first()
      .getByRole('button', { name: /^Options for / })
      .first(),
  ).toBeFocused();
});

test('the card of frozen portions and the frozen notes go on the picture', async ({
  page,
}) => {
  await startWithBeans(page);
  await showBeanSegment(page, 'Frozen');

  // The card of the group shares the portion it shows.
  await beanAction(page, BEANS.portion, 'Share as image');
  await expect(picture(page)).toHaveAccessibleName(
    new RegExp(
      `^Image of the bean: Frozen\\. ${BEANS.portion} .*Frozen id: ZP\\d\\.`,
    ),
  );
  await expect(page.getByRole('switch', { name: 'Show notes' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(picture(page)).toHaveCount(0);

  await beanAction(page, BEANS.frozen, 'Share as image');
  await expect(picture(page)).toHaveAccessibleName(
    /Frozen notes: Vakuumiert\./,
  );
  await page.getByRole('switch', { name: 'Show notes' }).click();
  await expect(picture(page)).not.toHaveAccessibleName(/Vakuumiert/);
  await expect(picture(page)).not.toContainText('Vakuumiert');
});

test('the photo of the bean goes on the picture only when it is switched on', async ({
  page,
  baseURL,
}) => {
  // The web build shows an attachment that is a web address as it is.
  await startWithBeans(page, {
    photoUrl: `${baseURL}/assets/img/empirical_water_spring.png`,
  });
  await beanAction(page, BEANS.blend, 'Share as image');

  const toggle = page.getByRole('switch', { name: 'Show photo' });
  await expect(toggle).not.toBeChecked();
  await expect(picture(page).locator('img')).toHaveCount(0);
  await expect(picture(page)).not.toHaveAccessibleName(/Photo of the bean/);

  await toggle.click();
  await expect(picture(page).locator('img')).toBeVisible();
  await expect(picture(page)).toHaveAccessibleName(/\. Photo of the bean\. /);
  const drawn = page.waitForEvent('console', (message) =>
    message.text().startsWith('Share - image drawn in'),
  );
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await drawn;
  const failed = page.getByRole('alertdialog').filter({
    hasText: 'The image could not be shared. Please try again.',
  });
  await failed.getByRole('button', { name: 'OK' }).click();

  await toggle.click();
  await expect(picture(page).locator('img')).toHaveCount(0);
  await page.getByRole('button', { name: 'Back' }).click();

  // A bean without a photo offers no switch.
  await beanAction(page, BEANS.alpha, 'Share as image');
  await expect(picture(page)).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Show photo' })).toHaveCount(0);
});
