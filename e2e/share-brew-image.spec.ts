import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { BREW_TEST_START, brewList } from './support/brew-form';
import { startWithFirstBrew } from './support/first-brew';
import { seedDatabase } from './support/seed';
import { generateDataSet } from './support/synthetic-data';

/**
 * A brew is shared as a picture of its brew card, with the graph below it
 * when it has one. The picture is drawn from the preview the dialog shows.
 */

// The browser cannot write the file to share; the app logs that as an error.
test.use({ allowedConsoleErrors: [/^Share - could not write the file /] });

/** Home lists the brew as well, hidden behind the Brews tab. */
function options(page: Page): Locator {
  return brewList(page).getByRole('button', {
    name: /^Options for the brew of /,
  });
}

async function shareAsImage(page: Page): Promise<void> {
  await options(page).click();
  await page
    .getByRole('button', { name: 'Share as image', exact: true })
    .click();
}

function picture(page: Page): Locator {
  return page.getByRole('img', { name: /^Image of the brew: / });
}

/** Height to width of the picture: 4:5 at least. */
async function aspect(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  return box!.height / box!.width;
}

test('a brew is shared as a picture of its card, in a colour of choice', async ({
  page,
}) => {
  await page.clock.install({ time: BREW_TEST_START });
  await startWithFirstBrew(page, BREW_TEST_START);
  await shareAsImage(page);

  await expect(
    page.getByRole('heading', { level: 1, name: 'Share brew' }),
  ).toBeVisible();
  await expect(picture(page)).toHaveAccessibleName(
    /^Image of the brew: [\d.]+ [\d:]+\. Ethiopia Yirgacheffe Natural\. .*Grinder: Comandante C40\. In\/Out \(BR\): 18gr \/ 300gr \(1 \/ 16\.67\)\..* BeanConqueror$/,
  );
  await expect(picture(page)).toContainText('BeanConqueror');
  expect(await aspect(picture(page))).toBeGreaterThanOrEqual(1.249);

  const colours = page.getByRole('group', { name: 'Colour' });
  await expect(colours.getByRole('radio')).toHaveCount(4);
  // The app is light, so the picture starts in the app's light colours.
  await expect(colours.getByRole('radio', { name: 'App light' })).toBeChecked();
  await expect(picture(page)).toHaveCSS(
    'background-color',
    'rgb(234, 217, 196)',
  );
  await colours.getByRole('radio', { name: 'App dark' }).check();
  await expect(picture(page)).toHaveCSS('background-color', 'rgb(33, 25, 20)');
  await colours.getByRole('radio', { name: 'Sage' }).check();
  await expect(picture(page)).toHaveCSS('background-color', 'rgb(47, 94, 76)');
  // The keyboard moves through the colours with the arrow keys.
  await page.keyboard.press('ArrowRight');
  await expect(colours.getByRole('radio', { name: 'Caramel' })).toBeChecked();

  const drawn = page.waitForEvent('console', (message) =>
    message.text().startsWith('Share - image drawn in'),
  );
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await drawn;
  // The browser cannot write the file, so the app says it was not shared.
  const failed = page.getByRole('alertdialog').filter({
    hasText: 'The image could not be shared. Please try again.',
  });
  await expect(failed).toBeVisible();
  await failed.getByRole('button', { name: 'OK' }).click();

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(picture(page)).toHaveCount(0);
  await expect(options(page)).toBeFocused();
});

test('the graph of a brew goes below its card on the picture', async ({
  page,
}) => {
  const data = generateDataSet({ brews: 1, beans: 1, archivedBeanShare: 0 });
  data.SETTINGS[0].welcome_page_showed = true;
  data.BREWS[0].flow_profile = `brews/${data.BREWS[0].config.uuid}_flow_profile.json`;
  await seedDatabase(page, data);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Brews' }).click();

  await shareAsImage(page);

  await expect(picture(page)).toHaveAccessibleName(
    /\. With graph\. BeanConqueror$/,
  );
  const graph = picture(page).locator('img.share-graph');
  await expect(graph).toHaveAttribute('src', /^data:image\/png;base64,/);
  // Drawn three times as sharp as it is shown.
  await expect
    .poll(() =>
      graph.evaluate((img: HTMLImageElement) => [
        img.naturalWidth,
        img.naturalHeight,
      ]),
    )
    .toEqual([900, 450]);
  expect(await aspect(picture(page))).toBeGreaterThanOrEqual(1.249);

  // A dark colour set draws the graph again, in its dark lines.
  const light = await graph.getAttribute('src');
  await page
    .getByRole('group', { name: 'Colour' })
    .getByRole('radio', { name: 'App dark' })
    .check();
  await expect(graph).not.toHaveAttribute('src', light!);
  await expect(graph).toHaveAttribute('src', /^data:image\/png;base64,/);
});
