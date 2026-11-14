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
 * dialog with the same three tabs as the form. The snapshots also record its
 * known accessibility defects: the dialog has no name, and every label and
 * every value is a heading.
 */

test('a tap on a card shows the details of the bean on three tabs', async ({
  page,
}) => {
  await startWithBeans(page);

  await (await findBean(page, BEANS.blend)).getByText(BEANS.blend).click();
  await expect(page.getByRole('heading', { name: BEANS.blend })).toBeVisible();

  // Brews, usage, age and the favourite mark of the card are not shown here.
  // "Roast type" is the kind of roast (filter, espresso), not the roast
  // degree the card shows under the same label.
  await expect(topDialog(page)).toMatchAriaSnapshot(`
    - dialog:
      - banner:
        - button "Back"
        - text: Bean details
        - button "Edit bean"
      - tablist:
        - tab "General" [selected]
        - tab "Frozen information"
        - tab "Variety information"
      - heading "Name:" [level=2]
      - heading "Gamma Blend" [level=3]
      - heading "Roaster:" [level=2]
      - heading "Rösterei Süd" [level=3]
      - heading "Roast date:" [level=2]
      - heading [level=3]
      - heading "Roast type:" [level=2]
      - heading "Filter" [level=3]
      - text: Rating 5
      - 'slider "5 Rating: 5 out of 5 stars" [disabled]'
      - 'img "Rating: 5 out of 5 stars"'
      - heading "Blend:" [level=2]
      - heading "Blend" [level=3]
      - text: More information
      - heading "Weight:" [level=2]
      - heading "1000" [level=3]
      - heading "Cost:" [level=2]
      - heading "30" [level=3]
      - heading "Flavour profile:" [level=2]
      - heading [level=3]
      - checkbox "Decaffeinated:" [disabled]
      - button "Website:":
        - heading "Website:" [level=2]
        - heading [level=3]
      - checkbox "Archive?:" [disabled]
      - heading "Notes:" [level=2]
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
      - heading "Frozen date:" [level=2]
      - heading [level=3]
      - heading "Unfrozen date:" [level=2]
      - heading [level=3]
      - heading "Freezing storage type:" [level=2]
      - heading "Unknown" [level=3]
      - heading "Frozen notes:" [level=2]
      - contentinfo:
        - button "Cancel"
  `);

  await showTab(page.getByRole('tab', { name: 'Variety information' }));
  for (const [index, country, percentage] of [
    [1, 'Ethiopia', '50'],
    [2, 'Brazil', '30'],
    [3, 'Colombia', '20'],
  ] as const) {
    await expect(
      page.getByText(new RegExp(`^${index}\\.\\sBean Type$`)),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: country })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: percentage, exact: true }),
    ).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'Country:' })).toHaveCount(3);

  await page.getByRole('button', { name: 'Cancel' }).click();
  await dialogsClosed(page);
});

test('the details of a frozen bean show when it was frozen', async ({
  page,
}) => {
  await startWithBeans(page);

  await (await findBean(page, BEANS.thawed)).getByText(BEANS.thawed).click();
  await expect(page.getByRole('heading', { name: BEANS.thawed })).toBeVisible();
  await showTab(page.getByRole('tab', { name: 'Frozen information' }));

  await expect(topDialog(page)).toMatchAriaSnapshot(`
    - dialog:
      - banner
      - tablist
      - heading "Frozen date:" [level=2]
      - heading "21.11.2025" [level=3]
      - heading "Unfrozen date:" [level=2]
      - heading "24.02.2026" [level=3]
      - heading "Freezing storage type:" [level=2]
      - heading "Unknown" [level=3]
      - heading "Frozen notes:" [level=2]
      - contentinfo:
        - button "Cancel"
  `);
  // The id of the frozen bag, which the card shows, is missing here.
  await expect(page.locator('ion-modal').getByText('TA1')).toHaveCount(0);
});

test('a bean edited from its details is shown with the new values', async ({
  page,
}) => {
  await startWithBeans(page);
  await (await findBean(page, 'Gamma')).getByText(BEANS.blend).click();
  await expect(page.getByRole('heading', { name: BEANS.blend })).toBeVisible();

  await page.getByRole('button', { name: 'Edit bean' }).click();
  await expect(page.getByRole('banner').getByText('Edit bean')).toBeVisible();
  await beanField(page, /^Name/).fill('Gamma Neu');
  await page.getByRole('button', { name: 'Save' }).click();

  // The form closes, the details stay open.
  await expect(
    page.getByRole('banner').getByText('Bean details'),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Gamma Neu' })).toBeVisible();
  expect((await storedBean(page, 'Gamma Neu')).bean_information).toHaveLength(
    3,
  );

  await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await dialogsClosed(page);
  await expect(beanCard(page, 'Gamma Neu')).toBeVisible();
});
