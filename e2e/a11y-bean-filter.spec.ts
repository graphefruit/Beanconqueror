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

test('the choices of the bean sort are buttons that tell which one is chosen', async ({
  page,
}) => {
  await startWithBeans(page);
  await page.getByRole('button', { name: 'Sort beans' }).click();
  const byName = page.getByRole('button', { name: 'Bean name', exact: true });
  const descending = page.getByRole('button', {
    name: 'Descending',
    exact: true,
  });
  const extended = page.getByRole('button', { name: 'Extended sort' });

  await expect(byName).toHaveAttribute('aria-pressed', 'false');
  await expect(extended).toHaveAttribute('aria-expanded', 'false');

  await byName.focus();
  await page.keyboard.press('Enter');
  await expect(byName).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', { name: 'Ascending', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(descending).toHaveAttribute('aria-pressed', 'false');

  await extended.click();
  await expect(extended).toHaveAttribute('aria-expanded', 'true');
  await expect(
    page.getByRole('button', { name: 'Weight', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
});
