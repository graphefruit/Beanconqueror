import { expect, test } from './fixtures';
import { BEANS } from './support/bean-data';
import {
  beanCard,
  beanField,
  dialogsClosed,
  findBean,
  showTab,
  startWithBeans,
  storedBean,
} from './support/beans';
import { topDialog } from './support/brew-form';

/**
 * Characterization of the bean details as they are shown today: a read-only
 * dialog with the same three tabs as the form. Its title is the only level-1
 * heading; labels and values are text, sections are level 2.
 */

test('a tap on a card shows the details of the bean on three tabs', async ({
  page,
}) => {
  await startWithBeans(page);

  await (await findBean(page, BEANS.blend)).getByText(BEANS.blend).click();
  await expect(page.getByText(BEANS.blend, { exact: true })).toBeVisible();

  // Brews, usage, age and the favourite mark of the card are not shown here.
  // "Roast type" is the kind of roast (filter, espresso), not the roast
  // degree the card shows under the same label.
  await expect(topDialog(page)).toMatchAriaSnapshot(`
    - dialog "Bean details":
      - banner:
        - button "Back"
        - heading "Bean details" [level=1]
        - button "Edit bean"
      - tablist:
        - tab "General" [selected]
        - tab "Frozen information"
        - tab "Variety information"
      - tabpanel "General":
        - text: "Name: Gamma Blend Roaster: Rösterei Süd Roast date: Roast type: Filter Rating 5"
        - slider "Rating" [disabled]
        - 'img "Rating: 5 of 5 stars"'
        - text: "Blend: Blend"
        - heading "More information" [level=2]
        - text: "Weight: 1000 Cost: 30 Flavour profile:"
        - checkbox "Decaffeinated:" [disabled]
        - button "Website:"
        - checkbox "Archive?:" [disabled]
        - text: "Notes:"
      - contentinfo:
        - button "Cancel"
  `);
  await expect(page.getByRole('textbox')).toHaveCount(0);

  // The tab is there for a bean that was never frozen, too.
  await showTab(page.getByRole('tab', { name: 'Frozen information' }));
  await expect(topDialog(page)).toMatchAriaSnapshot(`
    - dialog:
      - banner
      - tablist
      - tabpanel "Frozen information": "Frozen date: Unfrozen date: Freezing storage type: Unknown Frozen notes:"
      - contentinfo:
        - button "Cancel"
  `);

  await showTab(page.getByRole('tab', { name: 'Variety information' }));
  for (const [index, country, percentage] of [
    [1, 'Ethiopia', '50'],
    [2, 'Brazil', '30'],
    [3, 'Colombia', '20'],
  ] as const) {
    // Each variety is a section of its own.
    await expect(
      page.getByRole('heading', {
        level: 2,
        name: new RegExp(`^${index}\\.\\sBean Type$`),
      }),
    ).toBeVisible();
    const details = page.locator('ion-modal').last();
    await expect(details.getByText(country, { exact: true })).toBeVisible();
    await expect(details.getByText(percentage, { exact: true })).toBeVisible();
  }
  await expect(
    page.locator('ion-modal').last().getByText('Country:', { exact: true }),
  ).toHaveCount(3);

  await page.getByRole('button', { name: 'Cancel' }).click();
  await dialogsClosed(page);
});

test('a bean edited from its details is shown with the new values', async ({
  page,
}) => {
  await startWithBeans(page);
  await (await findBean(page, 'Gamma')).getByText(BEANS.blend).click();
  await expect(page.getByText(BEANS.blend, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Edit bean' }).click();
  await expect(page.getByRole('banner').getByText('Edit bean')).toBeVisible();
  await beanField(page, /^Name/).fill('Gamma Neu');
  await page.getByRole('button', { name: 'Save' }).click();

  // The form closes, the details stay open.
  await expect(
    page.getByRole('banner').getByText('Bean details'),
  ).toBeVisible();
  await expect(page.getByText('Gamma Neu', { exact: true })).toBeVisible();
  expect((await storedBean(page, 'Gamma Neu')).bean_information).toHaveLength(
    3,
  );

  await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await dialogsClosed(page);
  await expect(beanCard(page, 'Gamma Neu')).toBeVisible();
});
