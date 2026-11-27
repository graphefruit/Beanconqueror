import { Bean } from '../../../classes/bean/bean';
import { BeanListViewParameter } from '../../../classes/parameter/beanListViewParameter';
import { IBean } from '../../../interfaces/bean/iBean';
import { IBeanInformation } from '../../../interfaces/bean/iBeanInformation';
import { Translate } from '../../brews/brew-share-card-rules';
import {
  beanShareCard,
  BeanShareSource,
  describeBeanShareCard,
  shownBeanShareRows,
} from '../bean-share-card-rules';

const NOW = Date.parse('2027-01-15T09:00:00.000Z');
const DAY = 86_400_000;

/** Keys stay keys, with their parameters, so the tests read what is asked. */
const t: Translate = (key, params) =>
  params ? `${key} ${JSON.stringify(params)}` : key;

function origin(fields: Partial<IBeanInformation>): IBeanInformation {
  return {
    country: '',
    region: '',
    farm: '',
    farmer: '',
    elevation: '',
    harvest_time: '',
    variety: '',
    processing: '',
    certification: '',
    percentage: 0,
    purchasing_price: 0,
    fob_price: 0,
    ...fields,
  };
}

describe('bean share card rules', () => {
  let parameters: BeanListViewParameter;
  let bean: Bean;

  beforeEach(() => {
    parameters = new BeanListViewParameter();
    bean = new Bean();
    bean.name = 'Yirgacheffe';
    bean.roaster = 'Tonino';
  });

  function source(changes: Partial<BeanShareSource> = {}): BeanShareSource {
    return {
      bean: JSON.parse(JSON.stringify(bean)) as IBean,
      listParameters: parameters,
      customRating: false,
      usage: { brews: 3, grams: 54.5, lastBrewAt: undefined },
      now: NOW,
      formatDate: (date) => `date(${date.slice(0, 10)})`,
      formatNumber: (value) => String(value),
      t,
      ...changes,
    };
  }

  const card = (changes: Partial<BeanShareSource> = {}) =>
    beanShareCard(source(changes));
  const rows = (changes: Partial<BeanShareSource> = {}) =>
    card(changes).rows.map((row) => [
      `${row.prefix}${row.labelKey}`,
      row.value,
    ]);

  it('shows what the bean card shows with the default settings, empty fields left out', () => {
    bean.roastingDate = new Date(NOW - 10 * DAY).toISOString();
    bean.weight = 250;
    bean.aromatics = 'Jasmine';

    expect(rows()).toEqual([
      ['BEAN_DATA_ROASTING_DATE', `date(${bean.roastingDate.slice(0, 10)})`],
      ['PAGE_HOME_TOTAL_BREWS', '3'],
      ['ROASTED_BEFORE', '10 DAYS_OLD'],
      [
        'BEANS_AMOUNT_USED',
        'BEAN_WEIGHT_ALREADY_USED {"gramUsed":"54.5","gramTotal":250,"leftOver":"195.5"}',
      ],
      ['BEAN_SORT_MIX', 'BEAN_MIX_SINGLE_ORIGIN'],
      ['BEAN_DATA_AROMATICS', 'Jasmine'],
    ]);
    expect(card()).toEqual(
      jasmine.objectContaining({
        name: 'Yirgacheffe',
        roaster: 'Tonino',
        roastingType: '',
        frozenId: '',
        roastRange: undefined,
        rating: undefined,
        marks: [],
      }),
    );
  });

  it('never shows the price, the purchase date or the prices of an origin', () => {
    parameters.activateAll();
    bean.buyDate = '2027-01-01T10:00:00.000Z';
    bean.cost = 17.91;
    bean.weight = 250;
    bean.bean_information = [
      origin({ country: 'Ethiopia', purchasing_price: 7.77, fob_price: 3.33 }),
    ];

    const shown = rows().flat().join(' | ');

    expect(shown).toContain('Ethiopia');
    for (const hidden of [
      'BEAN_DATA_BUY_DATE',
      '2027-01-01',
      'BEAN_DATA_COST',
      '17.91',
      'BEAN_DATA_PURCHASING_PRICE',
      '7.77',
      'BEAN_DATA_FOB_PRICE',
      '3.33',
    ]) {
      expect(shown).not.toContain(hidden);
    }
    expect(describeBeanShareCard(card(), { note: true }, t)).not.toMatch(
      /17\.91|7\.77|3\.33|BUY_DATE|COST/,
    );
  });

  it('shows everything else the settings switch on', () => {
    parameters.activateAll();
    bean.bestDate = '2027-02-01T10:00:00.000Z';
    bean.openDate = '2027-01-05T10:00:00.000Z';
    bean.roast = 'CUSTOM_ROAST' as never;
    bean.roast_custom = 'House';
    bean.cupped_flavor.custom_flavors = ['Honey'];
    bean.cupped_flavor.predefined_flavors = { 4: true };
    bean.cupping_points = '86';
    bean.decaffeinated = true;
    bean.url = 'https://example.org/bean';
    bean.ean_article_number = '4001234';

    expect(rows()).toEqual([
      ['BEAN_DATA_BEST_DATE', 'date(2027-02-01)'],
      ['BEAN_DATA_OPEN_DATE', 'date(2027-01-05)'],
      ['BEAN_DATA_ROAST_NAME_TYPE', 'House'],
      ['PAGE_HOME_TOTAL_BREWS', '3'],
      ['BREW_DATA_FLAVOR', 'Honey, CUPPING_4'],
      ['BEAN_SORT_MIX', 'BEAN_MIX_SINGLE_ORIGIN'],
      ['BEAN_DATA_CUPPING_POINTS', '86'],
      ['BEAN_DATA_DECAFFEINATED', 'YES'],
      ['BEAN_DATA_URL', 'https://example.org/bean'],
      ['BEAN_DATA_EAN', '4001234'],
    ]);
  });

  it('writes the roast by its name and leaves an unknown one out', () => {
    bean.roast = 'CITY_ROAST' as never;
    expect(rows()).toContain(['BEAN_DATA_ROAST_NAME_TYPE', 'City roast']);

    parameters.roast = false;
    expect(rows().map(([label]) => label)).not.toContain(
      'BEAN_DATA_ROAST_NAME_TYPE',
    );
  });

  it('counts the age of the roast in days, one as a day', () => {
    bean.roastingDate = new Date(NOW - DAY).toISOString();
    expect(rows()).toContain(['ROASTED_BEFORE', '1 DAY_OLD']);

    parameters.roastingDate = false;
    expect(rows().map(([label]) => label)).not.toContain('ROASTED_BEFORE');
  });

  it('shows the origins the settings show, numbered in a blend', () => {
    parameters.bean_information = true;
    parameters.country = true;
    parameters.variety = true;
    parameters.percentage = true;
    bean.beanMix = 'BLEND' as never;
    bean.bean_information = [
      origin({ country: 'Ethiopia', variety: 'Heirloom', region: 'Guji' }),
      origin({ country: 'Brazil', percentage: 40 }),
    ];

    expect(rows().filter(([label]) => /^\d\. /.test(label))).toEqual([
      ['1. BEAN_DATA_COUNTRY', 'Ethiopia'],
      ['1. BEAN_DATA_VARIETY', 'Heirloom'],
      ['2. BEAN_DATA_COUNTRY', 'Brazil'],
      ['2. BEAN_DATA_PERCENTAGE', '40'],
    ]);

    bean.beanMix = 'SINGLE_ORIGIN' as never;
    expect(rows()).toContain(['BEAN_DATA_COUNTRY', 'Ethiopia']);

    parameters.bean_information = false;
    expect(rows().flat()).not.toContain('Ethiopia');
  });

  it('puts the notes and the frozen notes under one switch that starts as the settings show notes', () => {
    bean.note = 'Sweet';
    bean.frozenDate = '2027-01-10T10:00:00.000Z';
    bean.frozenStorageType = 'VACUUM_SEALED' as never;
    bean.frozenNote = 'Bag 2';

    const shown = card();
    expect(shown.hasNote).toBeTrue();
    expect(shown.noteShown).toBeTrue();
    expect(
      shownBeanShareRows(shown, true).map((row) => [row.labelKey, row.value]),
    ).toEqual([
      ['BEAN_DATA_FROZEN_DATE', 'date(2027-01-10)'],
      [
        'BEAN_DATA_FROZEN_STORAGE_TYPE',
        'BEAN_FREEZING_STORAGE_TYPE_VACUUM_SEALED',
      ],
      ['BEAN_DATA_FROZEN_NOTE', 'Bag 2'],
      ['PAGE_HOME_TOTAL_BREWS', '3'],
      ['BEAN_SORT_MIX', 'BEAN_MIX_SINGLE_ORIGIN'],
      ['NOTES', 'Sweet'],
    ]);
    expect(
      shownBeanShareRows(shown, false).map((row) => row.labelKey),
    ).not.toContain('NOTES');
    expect(
      shownBeanShareRows(shown, false).map((row) => row.labelKey),
    ).not.toContain('BEAN_DATA_FROZEN_NOTE');

    parameters.note = false;
    expect(card().noteShown).toBeFalse();

    bean.note = '';
    bean.frozenNote = '';
    expect(card().hasNote).toBeFalse();
  });

  it('leaves the frozen fields out, as the bean card does, while the bean was never frozen', () => {
    bean.frozenStorageType = 'VACUUM_SEALED' as never;
    bean.frozenNote = 'Bag 2';

    const shown = card();

    expect(shown.rows.map((row) => row.labelKey)).not.toContain(
      'BEAN_DATA_FROZEN_STORAGE_TYPE',
    );
    expect(shown.rows.map((row) => row.labelKey)).not.toContain(
      'BEAN_DATA_FROZEN_NOTE',
    );
    expect(shown.hasNote).toBeFalse();
  });

  it('shows the marks, the frozen id, the roasting type and the stars of the bean card', () => {
    parameters.roast_range = true;
    bean.decaffeinated = true;
    bean.favourite = true;
    bean.frozenId = 'F-7';
    bean.frozenDate = '2027-01-10T10:00:00.000Z';
    bean.unfrozenDate = '2027-01-12T10:00:00.000Z';
    bean.bean_roast_information.bean_uuid = 'green';
    bean.bean_roasting_type = 'FILTER' as never;
    bean.roast_range = 2.6;
    bean.rating = 4.4;

    expect(card()).toEqual(
      jasmine.objectContaining({
        marks: ['decaffeinated', 'unfrozen', 'selfRoasted', 'favourite'],
        frozenId: 'F-7',
        roastingType: 'BEAN_ROASTING_TYPE_FILTER',
        roastRange: 3,
        rating: { stars: 4 },
      }),
    );

    bean.unfrozenDate = '';
    expect(card().marks).toContain('frozen');
    expect(card({ customRating: true }).rating).toEqual({ value: '4.4' });

    parameters.rating = false;
    parameters.roast_range = false;
    parameters.bean_roasting_type = false;
    parameters.roaster = false;
    expect(card()).toEqual(
      jasmine.objectContaining({
        roastRange: undefined,
        rating: undefined,
        roastingType: '',
        roaster: '',
      }),
    );
  });

  it('describes everything on the picture in the order it is shown', () => {
    parameters.roast_range = true;
    bean.favourite = true;
    bean.frozenId = 'F-7';
    bean.bean_roasting_type = 'FILTER' as never;
    bean.roast_range = 3;
    bean.rating = 4;
    bean.note = 'Sweet';
    const translations: Record<string, string> = {
      'A11Y.UNFROZEN': 'Unfrozen',
      POPOVER_BREWS_OPTION_TOGGLE_FAVOURITE: 'Favourite',
      BEAN_ROASTING_TYPE_FILTER: 'Filter',
      BEAN_DATA_FROZEN_ID: 'Frozen id',
      BEAN_DATA_ROAST_NAME: 'Degree of roast',
      BREW_DATA_RATING: 'Rating',
      PAGE_HOME_TOTAL_BREWS: 'Brews',
      BEAN_SORT_MIX: 'Type',
      BEAN_MIX_SINGLE_ORIGIN: 'Single origin',
      NOTES: 'Notes',
    };
    const en: Translate = (key, params: Record<string, string | number>) => {
      if (key === 'A11Y.STARS') {
        return `${params.name}: ${params.rating} of ${params.max} stars`;
      }
      if (key === 'SHARE_CARD.BEAN_DESCRIPTION') {
        return `Image of the bean: ${params.content}`;
      }
      return translations[key] ?? key;
    };
    const shown = beanShareCard(source({ t: en }));

    expect(describeBeanShareCard(shown, { note: true }, en)).toBe(
      'Image of the bean: Unfrozen. Favourite. Yirgacheffe (Filter), Tonino. Frozen id: F-7. ' +
        'Degree of roast: 3 of 5 stars. Rating: 4 of 5 stars. Brews: 3. ' +
        'Type: Single origin. Notes: Sweet. BeanConqueror',
    );
    expect(describeBeanShareCard(shown, { note: false }, en)).not.toContain(
      'Notes',
    );
    expect(
      describeBeanShareCard(
        beanShareCard(source({ t: en, customRating: true })),
        { note: false },
        en,
      ),
    ).toContain('Rating: 4. ');
  });

  it('keeps a bean without a name or origins on the picture', () => {
    const empty = JSON.parse(JSON.stringify(bean)) as IBean;
    delete empty.name;
    delete empty.roaster;
    delete empty.bean_information;
    parameters.bean_information = true;

    const shown = card({ bean: empty });

    expect(shown.name).toBe('');
    expect(shown.roaster).toBe('');
    expect(describeBeanShareCard(shown, { note: true }, t)).toContain(
      'BeanConqueror',
    );
  });
});
