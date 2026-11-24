import { expect, test } from './fixtures';
import { startWithBeans } from './support/beans';
import { textStops } from './support/screen-reader';

test('a screen reader stops once on each field of the bean filter', async ({
  page,
}) => {
  await startWithBeans(page);
  await page.getByRole('button', { name: 'Filter beans' }).click();
  const filter = page.getByRole('dialog', { name: 'Filter beans' });
  await expect(
    page.getByRole('button', { name: /^Roast type, / }),
  ).toBeAttached();
  const labels = [
    'Roast type',
    'Roaster',
    'Roast date',
    'Degree of Roast',
    'Rating',
  ];
  await expect
    .poll(async () =>
      (await textStops(filter)).filter((stop) =>
        labels.some((label) => stop.startsWith(label)),
      ),
    )
    .toEqual([]);
});
