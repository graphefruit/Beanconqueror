import { readBeanMix, readExcelDate } from '../excel-import-rules';

describe('readExcelDate', () => {
  // A day typed as text is local midnight, as the app stores a roast date.
  const localMidnight = new Date(2022, 1, 2).toISOString();
  const cases: [string, unknown, string | null][] = [
    ['an Excel day number', 44594, '2022-02-02T00:00:00.000Z'],
    ['an Excel day number with a time', 44594.5, '2022-02-02T12:00:00.000Z'],
    ['an Excel day number as text', '44594', '2022-02-02T00:00:00.000Z'],
    ['an ISO date', '2022-02-02', localMidnight],
    [
      'an ISO date with a time',
      '2022-02-02T10:30:00Z',
      '2022-02-02T10:30:00.000Z',
    ],
    ['a date as DD.MM.YYYY', '02.02.2022', localMidnight],
    ['a date as D.M.YYYY with spaces', ' 2.2.2022 ', localMidnight],
    ['an empty cell', undefined, ''],
    ['null', null, ''],
    ['empty text', '  ', ''],
    ['what older exports wrote for no date', 'Invalid date', ''],
    ['0, which Excel writes for an empty date', 0, ''],
    ['a negative number', -3, null],
    ['a number too large for a date', 1e12, null],
    ['not a number', NaN, null],
    ['a day that does not exist', '31.02.2022', null],
    ['an ISO day that does not exist', '2022-02-30', null],
    ['an ISO date with a time that is none', '2022-02-02Tnoon', null],
    ['a month that does not exist', '2022-13-01', null],
    ['text', 'next week', null],
    ['a date in another order', '02/02/2022', null],
    ['yes or no', true, null],
  ];

  for (const [name, value, expected] of cases) {
    it(`reads ${name}`, () => {
      expect(readExcelDate(value)).toBe(expected);
    });
  }
});

describe('readBeanMix', () => {
  const cases: [string, unknown, string | null][] = [
    ['the key of a single origin', 'SINGLE_ORIGIN', 'SINGLE_ORIGIN'],
    ['the key of a blend', 'BLEND', 'BLEND'],
    ['the key of an unknown mix', 'UNKNOWN', 'UNKNOWN'],
    ['the English text of a single origin', 'Single Origin', 'SINGLE_ORIGIN'],
    ['the English text of a blend', 'Blend', 'BLEND'],
    ['the English text of an unknown mix', 'Unknown', 'UNKNOWN'],
    ['the German text of an unknown mix', 'Unbekannt', 'UNKNOWN'],
    ['a text in other case with spaces', '  single ORIGIN ', 'SINGLE_ORIGIN'],
    ['an empty cell', undefined, ''],
    ['null', null, ''],
    ['empty text', ' ', ''],
    ['an unknown text', 'Mixed', null],
    ['a name of the object prototype', 'constructor', null],
    ['a number', 1, null],
    ['yes or no', true, null],
  ];

  for (const [name, value, expected] of cases) {
    it(`reads ${name}`, () => {
      expect(readBeanMix(value)).toBe(expected as never);
    });
  }
});
