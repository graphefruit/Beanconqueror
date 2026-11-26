import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { Preparation } from '../../../classes/preparation/preparation';
import { Settings } from '../../../classes/settings/settings';
import { BREW_QUANTITY_TYPES_ENUM } from '../../../enums/brews/brewQuantityTypes';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import {
  brewShareCard,
  BrewShareSource,
  BrewShareTexts,
  describeBrewShareCard,
  Translate,
} from '../brew-share-card-rules';

const TEXTS: BrewShareTexts = {
  date: '15.01.2027',
  time: '09:20',
  ratio: '1 / 16.67',
  brewTime: '02:47',
  extractionYield: '20.1',
  temperatureTime: '00:30',
  bloomingTime: '00:40',
  firstDripTime: '00:08',
  water: 'Third Wave',
  beanAge: '12',
  tools: ['Paper filter', ''],
  flavors: [],
};

describe('brew share card rules', () => {
  let settings: Settings;
  let preparation: Preparation;
  let bean: Bean;
  let brew: Brew;

  beforeEach(() => {
    settings = new Settings();
    preparation = new Preparation();
    preparation.name = 'V60';
    preparation.style_type = PREPARATION_STYLE_TYPE.POUR_OVER;
    bean = new Bean();
    bean.name = 'Yirgacheffe';
    bean.roaster = 'Tonino';
    brew = new Brew();
    brew.grind_weight = 18;
    brew.brew_quantity = 300;
    brew.brew_time = 167;
  });

  function source(changes: Partial<BrewShareSource> = {}): BrewShareSource {
    return {
      brew,
      bean,
      preparation,
      millName: 'Comandante',
      listParameters: settings.visible_list_view_parameters,
      customRating: false,
      texts: TEXTS,
      formatNumber: (value) => String(value),
      ...changes,
    };
  }

  function showEveryField(): void {
    const parameters =
      settings.visible_list_view_parameters as unknown as Record<
        string,
        boolean
      >;
    for (const key of Object.keys(parameters)) {
      parameters[key] = true;
    }
  }

  const rows = (card = brewShareCard(source())) =>
    card.rows.map((row) => [row.labelKey, row.value]);

  it('shows what the brew card shows with the default settings, empty fields left out', () => {
    const card = brewShareCard(source());

    expect(card.date).toBe('15.01.2027');
    expect(card.time).toBe('09:20');
    expect(card.bean).toBe('Yirgacheffe');
    expect(card.roaster).toBe('Tonino');
    expect(rows(card)).toEqual([
      ['BREW_DATA_PREPARATION_METHOD', 'V60'],
      ['BREW_DATA_MILL', 'Comandante'],
      ['BREW_DATA_IN_OUT_BR', '18gr / 300gr (1 / 16.67)'],
      ['BREW_DATA_TIME', '02:47'],
    ]);
  });

  it('shows the beverage of an espresso and the unit the brew was entered in', () => {
    preparation.style_type = PREPARATION_STYLE_TYPE.ESPRESSO;
    brew.brew_beverage_quantity = 36.5;
    brew.brew_beverage_quantity_type =
      'ML' as unknown as BREW_QUANTITY_TYPES_ENUM;

    expect(rows()[2]).toEqual([
      'BREW_DATA_IN_OUT_BR',
      '18gr / 36.5ml (1 / 16.67)',
    ]);
  });

  it('shows every field the settings show, in the order of the brew card', () => {
    showEveryField();
    preparation.style_type = PREPARATION_STYLE_TYPE.ESPRESSO;
    bean.roastingDate = '2027-01-03';
    Object.assign(brew, {
      brew_beverage_quantity: 40,
      grind_size: '15',
      mill_speed: 800,
      tds: 1.4,
      brew_temperature: 93,
      pressure_profile: 'Flat 9 bar',
      bean_weight_in: 18.2,
      mill_timer: 6,
      vessel_name: 'Cup',
      vessel_weight: 180,
      brew_temperature_time: 30,
      coffee_blooming_time: 40,
      coffee_first_drip_time: 8,
      water: 'water-1',
      coffee_type: 'Ristretto',
      coffee_concentration: 'Strong',
      method_of_preparation_tools: ['tool-1', 'tool-2'],
      note: 'Sweet',
    });

    const all = source({
      texts: { ...TEXTS, flavors: ['Peach', 'Jasmine'] },
    });

    expect(rows(brewShareCard(all)).map(([label]) => label)).toEqual([
      'BREW_DATA_PREPARATION_METHOD',
      'BREW_DATA_MILL',
      'BREW_DATA_IN_OUT_BR',
      'BREW_DATA_TIME',
      'BREW_DATA_GRIND_SIZE',
      'BREW_DATA_TDS_EY',
      'BREW_DATA_BREW_TEMPERATURE',
      'BREW_DATA_PRESSURE_PROFILE',
      'BREW_DATA_BEAN_WEIGHT_IN',
      'BREW_DATA_MILL_TIMER',
      'BREW_DATA_VESSEL_NAME_WEIGHT',
      'BREW_DATA_TEMPERATURE_TIME',
      'BREW_DATA_COFFEE_BLOOMING_TIME',
      'BREW_DATA_COFFEE_FIRST_DRIP_TIME',
      'BREW_DATA_WATER',
      'BREW_DATA_COFFEE_TYPE',
      'BREW_DATA_COFFEE_CONCENTRATION',
      'BREW_INFORMATION_BEAN_AGE',
      'BREW_DATA_PREPARATION_METHOD_TOOL',
      'BREW_DATA_FLAVOR',
    ]);
    const card = brewShareCard(all);
    const value = (label: string) =>
      card.rows.find((row) => row.labelKey === label);
    expect(value('BREW_DATA_GRIND_SIZE').value).toBe('15 @ 800');
    expect(value('BREW_DATA_TDS_EY').value).toBe('1.4, %20.1');
    expect(value('BREW_DATA_VESSEL_NAME_WEIGHT').value).toBe('Cup / 180');
    expect(value('BREW_DATA_PREPARATION_METHOD_TOOL')).toEqual({
      labelKey: 'BREW_DATA_PREPARATION_METHOD_TOOL',
      value: 'Paper filter',
      wide: true,
    });
    expect(value('BREW_DATA_FLAVOR').value).toBe('Peach, Jasmine');
    expect(card.note).toBe('Sweet');
    expect(card.noteShown).toBeTrue();
  });

  it('shows the mill speed alone when the grind setting is empty', () => {
    brew.mill_speed = 800;

    expect(rows()).toContain(['BREW_DATA_GRIND_SIZE', '@ 800']);
  });

  it('follows the parameters of the preparation when it has its own', () => {
    preparation.use_custom_parameters = true;
    preparation.visible_list_view_parameters.mill = false;
    preparation.visible_list_view_parameters.brew_time = false;
    preparation.visible_list_view_parameters.coffee_first_drip_time = true;
    brew.coffee_first_drip_time = 8;

    expect(rows()).toEqual([
      ['BREW_DATA_PREPARATION_METHOD', 'V60'],
      ['BREW_DATA_IN_OUT_BR', '18gr / 300gr (1 / 16.67)'],
      ['BREW_DATA_COFFEE_FIRST_DRIP_TIME', '00:08'],
    ]);
  });

  it('leaves the first drip out of a filter brew without own parameters', () => {
    brew.coffee_first_drip_time = 8;

    expect(rows().map(([label]) => label)).not.toContain(
      'BREW_DATA_COFFEE_FIRST_DRIP_TIME',
    );
  });

  it('never shows place, price or purchase date, also when they are set', () => {
    showEveryField();
    brew.coordinates = {
      ...brew.coordinates,
      latitude: 52.520008,
      longitude: 13.404954,
    };
    bean.cost = 17.9;
    bean.buyDate = '2027-01-05';
    bean.url = 'https://shop.example/bean';

    const card = JSON.stringify(brewShareCard(source()));

    for (const secret of ['52.52', '13.40', '17.9', '2027-01-05', 'shop.']) {
      expect(card).not.toContain(secret);
    }
  });

  it('offers the note but starts without it when the brew card hides it', () => {
    brew.note = 'Brewed for Anna';

    const card = brewShareCard(source());

    expect(card.note).toBe('Brewed for Anna');
    expect(card.noteShown).toBeFalse();
  });

  it('shows the rating as stars, a custom one as a number, none when hidden', () => {
    brew.rating = 4;
    expect(brewShareCard(source()).rating).toEqual({ stars: 4 });

    brew.rating = 7.556;
    expect(brewShareCard(source({ customRating: true })).rating).toEqual({
      value: '7.56',
    });

    settings.visible_list_view_parameters.rating = false;
    expect(brewShareCard(source()).rating).toBeUndefined();

    settings.visible_list_view_parameters.rating = true;
    brew.rating = 0;
    expect(brewShareCard(source()).rating).toBeUndefined();
  });

  describe('description', () => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'SHARE_CARD.DESCRIPTION': 'Image of the brew: {{content}}',
        'A11Y.STARS': '{{name}}: {{rating}} of {{max}} stars',
        'A11Y.HAS_GRAPH': 'With graph',
        BREW_DATA_RATING: 'Rating',
        BREW_DATA_NOTES: 'Notes',
        BREW_DATA_PREPARATION_METHOD: 'Preparation method',
        BREW_DATA_MILL: 'Grinder',
        BREW_DATA_IN_OUT_BR: 'In/Out (BR)',
        BREW_DATA_TIME: 'Time',
      },
      de: {
        'SHARE_CARD.DESCRIPTION': 'Bild der Brühung: {{content}}',
        'A11Y.STARS': '{{name}}: {{rating}} von {{max}} Sternen',
        'A11Y.HAS_GRAPH': 'Mit Graph',
        BREW_DATA_RATING: 'Bewertung',
        BREW_DATA_NOTES: 'Notizen',
        BREW_DATA_PREPARATION_METHOD: 'Zubereitungsmethode',
        BREW_DATA_MILL: 'Mühle',
        BREW_DATA_IN_OUT_BR: 'In/Out (BR)',
        BREW_DATA_TIME: 'Zeit',
      },
    };
    const translate =
      (language: string): Translate =>
      (key, params = {}) =>
        Object.entries(params).reduce(
          (text, [name, value]) => text.replace(`{{${name}}}`, String(value)),
          translations[language][key] ?? key,
        );

    beforeEach(() => {
      brew.rating = 4;
      brew.note = 'Sweet';
    });

    it('reads everything on the picture in its order', () => {
      expect(
        describeBrewShareCard(
          brewShareCard(source()),
          { note: true, graph: true },
          translate('en'),
        ),
      ).toBe(
        'Image of the brew: Yirgacheffe (Tonino). 15.01.2027 09:20. ' +
          'Rating: 4 of 5 stars. Preparation method: V60. Grinder: Comandante. ' +
          'In/Out (BR): 18gr / 300gr (1 / 16.67). Time: 02:47. Notes: Sweet. ' +
          'With graph. BeanConqueror',
      );
    });

    it('leaves out the note and the graph when they are not on the picture, in German', () => {
      bean.roaster = '';
      brew.rating = 7.5;

      expect(
        describeBrewShareCard(
          brewShareCard(source({ customRating: true })),
          { note: false, graph: false },
          translate('de'),
        ),
      ).toBe(
        'Bild der Brühung: Yirgacheffe. 15.01.2027 09:20. Bewertung: 7.5. ' +
          'Zubereitungsmethode: V60. Mühle: Comandante. ' +
          'In/Out (BR): 18gr / 300gr (1 / 16.67). Zeit: 02:47. BeanConqueror',
      );
    });
  });
});
