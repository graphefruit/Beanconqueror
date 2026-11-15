import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { IBean } from '../../../interfaces/bean/iBean';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import {
  beanAgeInDays,
  hasFrozenInformation,
  hasPhotos,
  isFrozen,
  isScannedBean,
  isSelfRoasted,
  showsCostPerKg,
} from '../bean-rules';
import { ingestBean } from '../bean.store';

function legacyBean(fields: Partial<IBean>): Bean {
  const bean = new Bean();
  Object.assign(bean, fields);
  return bean;
}

/** The same bean as the store hands it out. */
function storeBean(bean: Bean): IBean {
  return ingestBean(JSON.stringify(bean));
}

function brewAt(unixTimestamp: number): Brew {
  const brew = new Brew();
  brew.config.unix_timestamp = unixTimestamp;
  return brew;
}

const unix = (iso: string) => Date.parse(iso) / 1000;

describe('bean rules', () => {
  describe('match the methods of Bean', () => {
    const cases: [string, Partial<IBean>][] = [
      ['an empty bean', {}],
      ['a frozen bean', { frozenDate: '2026-01-10T10:00:00.000Z' }],
      [
        'a thawed bean',
        {
          frozenDate: '2026-01-10T10:00:00.000Z',
          unfrozenDate: '2026-02-10T10:00:00.000Z',
        },
      ],
      ['only a thaw date', { unfrozenDate: '2026-02-10T10:00:00.000Z' }],
      [
        'a self-roasted bean',
        { bean_roast_information: { bean_uuid: 'green' } as never },
      ],
      [
        'roast information without a green bean',
        { bean_roast_information: { bean_uuid: '' } as never },
      ],
      ['a scanned bean', { qr_code: 'abc' }],
      ['a bean with a photo', { attachments: ['photo.jpg'] }],
      ['a bean with an empty photo list', { attachments: [] }],
      ['a bean without a photo list', { attachments: null }],
    ];
    for (const [name, fields] of cases) {
      it(`for ${name}`, () => {
        const bean = legacyBean(fields);
        const stored = storeBean(bean);

        expect(isFrozen(stored)).toBe(bean.isFrozen());
        expect(hasFrozenInformation(stored)).toBe(bean.hasFrozenInformation());
        expect(isSelfRoasted(stored)).toBe(!!bean.isSelfRoasted());
        expect(isScannedBean(stored)).toBe(bean.isScannedBean());
        expect(hasPhotos(stored)).toBe(!!bean.hasPhotos());
      });
    }
  });

  it('shows the price per kilogram only for a bag that is not one kilogram', () => {
    expect(showsCostPerKg({ weight: 250, cost: 12.5 })).toBeTrue();
    expect(showsCostPerKg({ weight: 1000, cost: 30 })).toBeFalse();
    expect(showsCostPerKg({ weight: 0, cost: 30 })).toBeFalse();
    expect(showsCostPerKg({ weight: 250, cost: 0 })).toBeFalse();
    expect(showsCostPerKg({ weight: -5, cost: 3 })).toBeFalse();
    expect(showsCostPerKg({ weight: 250, cost: -3 })).toBeFalse();
    expect(showsCostPerKg({ weight: undefined, cost: 3 })).toBeFalse();
  });

  describe('beanAgeInDays', () => {
    afterEach(() => jasmine.clock().uninstall());

    interface AgeCase {
      name: string;
      now: string;
      bean: Partial<IBean>;
      /** Brews of an archived bean, as `config.unix_timestamp`. */
      brews?: number[];
      /** In Europe/Berlin; without, only compared with Bean. */
      expected?: number;
    }

    // Times are given in UTC; the days are counted in the local time zone
    // of the test run, by the rule and by the model alike. The expected
    // values hold for Europe/Berlin, where the tests run.
    const cases: AgeCase[] = [
      {
        name: 'without a roasting date',
        now: '2026-03-01T08:00:00.000Z',
        bean: { roastingDate: '' },
        expected: 0,
      },
      {
        name: 'roasted ten days ago',
        now: '2026-03-01T08:00:00.000Z',
        bean: { roastingDate: '2026-02-19T08:00:00.000Z' },
        expected: 10,
      },
      {
        name: 'roasted yesterday late, now early in the morning',
        now: '2026-03-01T00:30:00.000Z',
        bean: { roastingDate: '2026-02-28T22:00:00.000Z' },
        expected: 1,
      },
      {
        name: 'over the start of summer time (Europe)',
        now: '2026-03-30T00:30:00.000Z',
        bean: { roastingDate: '2026-03-28T23:30:00.000Z' },
        expected: 1,
      },
      {
        name: 'over the start of summer time, late in the day',
        now: '2026-03-29T21:59:00.000Z',
        bean: { roastingDate: '2026-03-28T00:00:00.000Z' },
        expected: 1,
      },
      {
        name: 'over the end of summer time (Europe)',
        now: '2026-10-26T00:30:00.000Z',
        bean: { roastingDate: '2026-10-24T22:30:00.000Z' },
        expected: 1,
      },
      {
        name: 'over the start of summer time (USA)',
        now: '2026-03-09T12:00:00.000Z',
        bean: { roastingDate: '2026-03-07T12:00:00.000Z' },
        expected: 2,
      },
      {
        name: 'over the end of summer time (USA)',
        now: '2026-11-02T12:00:00.000Z',
        bean: { roastingDate: '2026-10-31T12:00:00.000Z' },
        expected: 2,
      },
      {
        name: 'frozen: 10 days, then 200 days in the freezer',
        now: '2026-03-01T08:00:00.000Z',
        bean: {
          roastingDate: '2025-08-03T08:00:00.000Z',
          frozenDate: '2025-08-13T08:00:00.000Z',
        },
        expected: 12,
      },
      {
        name: 'thawed: 20 days, 95 frozen, 5 thawed',
        now: '2026-03-01T08:00:00.000Z',
        bean: {
          roastingDate: '2025-11-01T08:00:00.000Z',
          frozenDate: '2025-11-21T08:00:00.000Z',
          unfrozenDate: '2026-02-24T08:00:00.000Z',
        },
        expected: 26,
      },
      {
        name: 'frozen and thawed over a change of summer time',
        now: '2026-11-01T08:00:00.000Z',
        bean: {
          roastingDate: '2026-03-20T08:00:00.000Z',
          frozenDate: '2026-03-30T08:00:00.000Z',
          unfrozenDate: '2026-10-27T08:00:00.000Z',
        },
        expected: 17,
      },
      {
        name: 'archived: stops on the day of the last brew',
        now: '2026-03-01T08:00:00.000Z',
        bean: { roastingDate: '2026-01-01T08:00:00.000Z', finished: true },
        brews: [
          unix('2026-01-11T08:00:00.000Z'),
          unix('2026-01-21T23:30:00.000Z'),
          unix('2026-01-05T08:00:00.000Z'),
        ],
        expected: 21,
      },
      {
        name: 'archived without brews: counts until today',
        now: '2026-03-01T08:00:00.000Z',
        bean: { roastingDate: '2026-01-01T08:00:00.000Z', finished: true },
        brews: [],
        expected: 59,
      },
      {
        name: 'archived and frozen, last brew before freezing',
        now: '2026-03-01T08:00:00.000Z',
        bean: {
          roastingDate: '2026-01-10T08:00:00.000Z',
          frozenDate: '2026-02-09T08:00:00.000Z',
          finished: true,
        },
        brews: [unix('2026-01-15T08:00:00.000Z')],
        // The days from freezing to the last brew are negative: -25 / 90
        // rounds down to -1.
        expected: 29,
      },
      {
        name: 'a brew in milliseconds counts as it is',
        now: '2026-03-01T08:00:00.000Z',
        bean: { roastingDate: '2026-01-01T08:00:00.000Z', finished: true },
        brews: [unix('2026-01-11T08:00:00.000Z') * 1000],
      },
    ];

    for (const testCase of cases) {
      it(`gives the same age as Bean: ${testCase.name}`, () => {
        const now = Date.parse(testCase.now);
        const brews = (testCase.brews ?? []).map(brewAt);
        spyOn(UIBeanHelper, 'getInstance').and.returnValue({
          getAllBrewsForThisBean: () => brews.slice(),
        } as unknown as UIBeanHelper);
        jasmine.clock().install();
        jasmine.clock().mockDate(new Date(now));
        const bean = legacyBean(testCase.bean);
        const lastBrewAt = brews.length
          ? Math.max(...brews.map((brew) => brew.config.unix_timestamp))
          : undefined;

        const age = beanAgeInDays(storeBean(bean), now, lastBrewAt);

        expect(age).toBe(bean.beanAgeInDays());
        if (
          testCase.expected !== undefined &&
          Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Berlin'
        ) {
          expect(age).toBe(testCase.expected);
        }
      });
    }

    it('uses the time it is given, not the clock', () => {
      const bean = { roastingDate: '2026-02-19T08:00:00.000Z' } as IBean;
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date('2030-01-01T00:00:00.000Z'));

      expect(
        beanAgeInDays(bean, Date.parse('2026-03-01T08:00:00.000Z'), undefined),
      ).toBe(10);
    });

    it('ignores the last brew of a bean that is not archived', () => {
      const bean = { roastingDate: '2026-02-19T08:00:00.000Z' } as IBean;

      expect(
        beanAgeInDays(
          bean,
          Date.parse('2026-03-01T08:00:00.000Z'),
          unix('2026-02-20T08:00:00.000Z'),
        ),
      ).toBe(10);
    });
  });
});
