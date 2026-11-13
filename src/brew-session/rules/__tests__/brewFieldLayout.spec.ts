import { OrderBrewParameter } from '../../../classes/parameter/orderBrewParameter';
import { Preparation } from '../../../classes/preparation/preparation';
import { Settings } from '../../../classes/settings/settings';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import {
  BREW_DETAIL_FIELDS,
  BREW_FORM_FIELDS,
  BrewFieldKey,
  brewFieldLayout,
  BrewFieldTable,
  EMPTY_BREW_FIELD_LAYOUT,
} from '../brewFieldLayout';

type Section = 'before' | 'while' | 'after';
const SECTIONS: Section[] = ['before', 'while', 'after'];

/**
 * The brew form and the brew details as they were before the fields were
 * placed in the markup: every block that carried a `[style.order]` binding,
 * in the order of the markup, with the binding and the `@if` around it as
 * the templates had them. Conditions on runtime state (the chosen grinder,
 * typeahead results, loaded data) are left out; they stay in the templates.
 */
interface OldBlock {
  key: BrewFieldKey | 'creation_date';
  order: (_settings: Settings, _preparation: Preparation) => unknown;
  shown?: (_settings: Settings, _preparation: Preparation) => unknown;
}

/**
 * What the templates did with brewFieldOrderPipe for the order and with
 * brewFieldVisiblePipe for the switch of a field.
 */
function pipe(
  _settingsValue: unknown,
  _preparationValue: unknown,
  _custom: unknown,
): unknown {
  return _custom ? _preparationValue : _settingsValue;
}

function sortedAs(_section: Section, _parameter: string): OldBlock['order'] {
  return (s, p) =>
    pipe(
      (s.brew_order[_section] as any)[_parameter],
      (p.brew_order[_section] as any)[_parameter],
      p.use_custom_parameters,
    );
}

function field(_section: Section, _parameter: BrewFieldKey): OldBlock {
  return {
    key: _parameter,
    order: sortedAs(_section, _parameter),
    shown: (s, p) =>
      pipe(
        (s.manage_parameters as any)[_parameter],
        (p.manage_parameters as any)[_parameter],
        p.use_custom_parameters,
      ),
  };
}

const ESPRESSO = PREPARATION_STYLE_TYPE.ESPRESSO;

const OLD_GRAPH: OldBlock = {
  key: 'graph',
  order: sortedAs('while', 'brew_time'),
};
const OLD_CALCULATED_COFFEE_BREW_TIME: OldBlock = {
  key: 'calculated_coffee_brew_time',
  order: sortedAs('while', 'brew_time'),
  shown: (s, p) =>
    (pipe(
      s.manage_parameters.brew_time &&
        s.manage_parameters.coffee_first_drip_time,
      p.manage_parameters.brew_time &&
        p.manage_parameters.coffee_first_drip_time,
      p.use_custom_parameters,
    ) &&
      p.style_type === ESPRESSO) ||
    (p.use_custom_parameters && p.manage_parameters.coffee_first_drip_time),
};
const OLD_COFFEE_FIRST_DRIP_TIME: OldBlock = {
  key: 'coffee_first_drip_time',
  order: sortedAs('while', 'coffee_first_drip_time'),
  shown: (s, p) =>
    (pipe(
      s.manage_parameters.coffee_first_drip_time,
      p.manage_parameters.coffee_first_drip_time,
      p.use_custom_parameters,
    ) &&
      p.style_type === ESPRESSO) ||
    (p.use_custom_parameters && p.manage_parameters.coffee_first_drip_time),
};
const OLD_BREW_QUANTITY: OldBlock = {
  key: 'brew_quantity',
  order: sortedAs('after', 'brew_quantity'),
  shown: (s, p) =>
    pipe(
      s.manage_parameters.brew_quantity,
      p.manage_parameters.brew_quantity,
      p.use_custom_parameters,
    ) && p.style_type !== ESPRESSO,
};
const OLD_CALCULATED_EXTRACTION_YIELD: OldBlock = {
  key: 'calculated_extraction_yield',
  order: sortedAs('after', 'tds'),
  shown: (s, p) =>
    pipe(
      s.manage_parameters.grind_weight &&
        s.manage_parameters.brew_beverage_quantity &&
        s.manage_parameters.tds,
      p.manage_parameters.grind_weight &&
        p.manage_parameters.brew_beverage_quantity &&
        p.manage_parameters.tds,
      p.use_custom_parameters,
    ),
};

const OLD_FORM: Record<Section, OldBlock[]> = {
  before: [
    field('before', 'grind_size'),
    field('before', 'grind_weight'),
    field('before', 'brew_temperature'),
    field('before', 'method_of_preparation'),
    field('before', 'bean_type'),
    field('before', 'mill'),
    field('before', 'mill_speed'),
    field('before', 'mill_timer'),
    field('before', 'pressure_profile'),
    field('before', 'method_of_preparation_tool'),
    field('before', 'water'),
    field('before', 'bean_weight_in'),
    field('before', 'vessel'),
  ],
  while: [
    field('while', 'brew_temperature_time'),
    OLD_GRAPH,
    field('while', 'brew_time'),
    OLD_CALCULATED_COFFEE_BREW_TIME,
    field('while', 'coffee_blooming_time'),
    OLD_COFFEE_FIRST_DRIP_TIME,
  ],
  after: [
    OLD_BREW_QUANTITY,
    field('after', 'coffee_type'),
    field('after', 'coffee_concentration'),
    // The rating had a label and a slider, one block each.
    field('after', 'rating'),
    field('after', 'rating'),
    field('after', 'note'),
    field('after', 'brew_beverage_quantity'),
    field('after', 'tds'),
    OLD_CALCULATED_EXTRACTION_YIELD,
    field('after', 'set_custom_brew_time'),
    field('after', 'attachments'),
  ],
};

const OLD_DETAIL: Record<Section, OldBlock[]> = {
  before: [
    field('before', 'grind_size'),
    field('before', 'grind_weight'),
    field('before', 'brew_temperature'),
    field('before', 'method_of_preparation'),
    field('before', 'bean_type'),
    { key: 'bean_age', order: sortedAs('before', 'bean_type') },
    { key: 'brew_ratio', order: sortedAs('before', 'bean_type') },
    field('before', 'mill'),
    field('before', 'mill_speed'),
    field('before', 'mill_timer'),
    field('before', 'pressure_profile'),
    field('before', 'method_of_preparation_tool'),
    field('before', 'bean_weight_in'),
    field('before', 'vessel'),
    field('before', 'water'),
  ],
  while: [
    field('while', 'brew_temperature_time'),
    // The flow profile summary and the graph, one block each.
    OLD_GRAPH,
    OLD_GRAPH,
    field('while', 'brew_time'),
    OLD_CALCULATED_COFFEE_BREW_TIME,
    field('while', 'coffee_blooming_time'),
    OLD_COFFEE_FIRST_DRIP_TIME,
  ],
  after: [
    OLD_BREW_QUANTITY,
    field('after', 'coffee_type'),
    field('after', 'coffee_concentration'),
    field('after', 'rating'),
    field('after', 'brew_beverage_quantity'),
    field('after', 'tds'),
    OLD_CALCULATED_EXTRACTION_YIELD,
    field('after', 'note'),
    { key: 'creation_date', order: () => 9999 },
    field('after', 'attachments'),
  ],
};

/** How the browser applied `[style.order]`: whole numbers, else 0. */
function cssOrder(_value: unknown): number {
  return typeof _value === 'number' && Number.isInteger(_value) ? _value : 0;
}

/**
 * The order on screen of the old blocks: flexbox sorts by `order` and keeps
 * the markup order for equal values. Blocks that render one entry together
 * (rating label and slider, flow profile summary and graph) count once.
 */
function oldScreenOrder(
  _blocks: OldBlock[],
  _settings: Settings,
  _preparation: Preparation,
): string[] {
  const keys = _blocks
    .map((block, position) => ({
      block,
      position,
      order: cssOrder(block.order(_settings, _preparation)),
    }))
    .filter(
      ({ block }) =>
        block.shown === undefined || block.shown(_settings, _preparation),
    )
    .sort((a, b) => a.order - b.order || a.position - b.position)
    .map(({ block }) => block.key as string);
  return keys.filter((key, index) => key !== keys[index - 1]);
}

/** A small seeded random generator, so every run checks the same cases. */
function seededRandom(_seed: number): () => number {
  let state = _seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Random switches and sort orders. Orders are small whole numbers, so many
 * fields share one, and now and then a value is missing.
 */
function randomize(
  _random: () => number,
  _target: Settings | Preparation,
): void {
  const parameters = _target.manage_parameters as any;
  for (const key of Object.keys(parameters)) {
    const draw = _random();
    parameters[key] = draw < 0.05 ? undefined : draw < 0.65;
  }
  for (const section of SECTIONS) {
    const order = _target.brew_order[section] as any;
    for (const key of Object.keys(order)) {
      const draw = _random();
      order[key] =
        draw < 0.04
          ? undefined
          : draw < 0.08
            ? null
            : Math.floor(_random() * 5);
    }
  }
}

function filterMethod(): Preparation {
  const preparation = new Preparation();
  preparation.style_type = PREPARATION_STYLE_TYPE.POUR_OVER;
  return preparation;
}

function espressoMethod(): Preparation {
  const preparation = new Preparation();
  preparation.style_type = PREPARATION_STYLE_TYPE.ESPRESSO;
  return preparation;
}

function switchAllOn(_target: Settings | Preparation): void {
  for (const key of Object.keys(_target.manage_parameters)) {
    (_target.manage_parameters as any)[key] = true;
  }
}

function setOrder(
  _target: Settings | Preparation,
  _section: Section,
  _orders: Record<string, unknown>,
): void {
  Object.assign(_target.brew_order[_section], _orders);
}

/** The keys of a section of `_table`, in the order of the markup. */
function markupOrder(
  _table: BrewFieldTable,
  _section: Section,
): BrewFieldKey[] {
  const entries: readonly { key: BrewFieldKey }[] = _table[_section];
  return entries.map((entry) => entry.key);
}

/** The parameter an entry of `_table` is sorted as. */
function sortedAsIn(
  _table: BrewFieldTable,
  _section: Section,
  _key: BrewFieldKey,
): string {
  const entries: readonly { key: BrewFieldKey; sortedAs: string }[] =
    _table[_section];
  return entries.find((entry) => entry.key === _key).sortedAs;
}

describe('brewFieldLayout', () => {
  let settings: Settings;

  beforeEach(() => {
    settings = new Settings();
  });

  it('sorts the brew form by the default order of a new installation', () => {
    expect(brewFieldLayout(BREW_FORM_FIELDS, settings, filterMethod())).toEqual(
      {
        before: [
          'bean_type',
          'grind_weight',
          'mill',
          'grind_size',
          'method_of_preparation',
          'brew_temperature',
        ],
        while: ['graph', 'brew_time', 'coffee_blooming_time'],
        after: [
          'brew_quantity',
          'brew_beverage_quantity',
          'rating',
          'note',
          'set_custom_brew_time',
        ],
      },
    );
  });

  it('applies the switches and the order of a preparation with custom parameters', () => {
    const preparation = filterMethod();
    preparation.use_custom_parameters = true;
    preparation.manage_parameters.grind_size = false;
    preparation.manage_parameters.water = true;
    setOrder(preparation, 'before', { water: 0, brew_temperature: 1 });
    // The global settings no longer count for this preparation.
    settings.manage_parameters.grind_size = true;
    settings.manage_parameters.water = false;
    setOrder(settings, 'before', { grind_size: 0 });

    expect(
      brewFieldLayout(BREW_FORM_FIELDS, settings, preparation).before,
    ).toEqual([
      'water',
      'brew_temperature',
      'bean_type',
      'grind_weight',
      'mill',
      'method_of_preparation',
    ]);

    preparation.use_custom_parameters = false;
    expect(
      brewFieldLayout(BREW_FORM_FIELDS, settings, preparation).before,
    ).toEqual([
      'grind_size',
      'bean_type',
      'grind_weight',
      'mill',
      'method_of_preparation',
      'brew_temperature',
    ]);
  });

  it('shows, hides and sorts every parameter of the sort order by the switches that apply', () => {
    for (const custom of [false, true]) {
      for (const section of SECTIONS) {
        for (const key of Object.keys(
          new OrderBrewParameter()[section],
        ) as BrewFieldKey[]) {
          const globalSettings = new Settings();
          // Espresso for the first drip time, a filter method for the
          // amount of water.
          const preparation =
            key === 'coffee_first_drip_time'
              ? espressoMethod()
              : filterMethod();
          preparation.use_custom_parameters = custom;
          const configured = custom ? preparation : globalSettings;
          switchAllOn(configured);
          // Default orders start at 1.
          setOrder(configured, section, { [key]: 0 });

          for (const table of [BREW_FORM_FIELDS, BREW_DETAIL_FIELDS]) {
            if (!table[section].some((entry) => entry.key === key)) {
              continue;
            }
            const shown = brewFieldLayout(table, globalSettings, preparation)[
              section
            ];
            const context = `${key}, custom parameters: ${custom}`;
            // Only entries placed with the same parameter (the graph with
            // the brew time) can come first.
            const first = shown.slice(0, shown.indexOf(key));
            expect(shown).withContext(context).toContain(key);
            for (const entry of first) {
              expect(sortedAsIn(table, section, entry))
                .withContext(context)
                .toBe(key);
            }

            (configured.manage_parameters as any)[key] = false;
            expect(brewFieldLayout(table, globalSettings, preparation)[section])
              .withContext(context)
              .not.toContain(key);
            (configured.manage_parameters as any)[key] = true;
          }
        }
      }
    }
  });

  it('keeps the order of the markup of each view for fields with the same sort order', () => {
    const preparation = filterMethod();
    switchAllOn(settings);
    for (const section of SECTIONS) {
      for (const key of Object.keys(settings.brew_order[section])) {
        setOrder(settings, section, { [key]: 3 });
      }
    }

    const form = brewFieldLayout(BREW_FORM_FIELDS, settings, preparation);
    expect(form.before).toEqual(markupOrder(BREW_FORM_FIELDS, 'before'));
    expect(form.after).toEqual(markupOrder(BREW_FORM_FIELDS, 'after'));
    // Water came before the vessel in the markup of the form, after it in
    // the markup of the details.
    const details = brewFieldLayout(BREW_DETAIL_FIELDS, settings, preparation);
    expect(form.before.indexOf('water')).toBeLessThan(
      form.before.indexOf('vessel'),
    );
    expect(details.before.indexOf('water')).toBeGreaterThan(
      details.before.indexOf('vessel'),
    );
  });

  it('places the graph with the brew time and never leaves it out', () => {
    const preparation = filterMethod();
    settings.manage_parameters.brew_temperature_time = true;
    setOrder(settings, 'while', {
      brew_temperature_time: 3,
      brew_time: 1,
      coffee_blooming_time: 2,
    });
    expect(
      brewFieldLayout(BREW_FORM_FIELDS, settings, preparation).while,
    ).toEqual([
      'graph',
      'brew_time',
      'coffee_blooming_time',
      'brew_temperature_time',
    ]);

    settings.manage_parameters.brew_time = false;
    expect(
      brewFieldLayout(BREW_FORM_FIELDS, settings, preparation).while,
    ).toEqual(['graph', 'coffee_blooming_time', 'brew_temperature_time']);

    // With the same sort order the temperature time came first in the
    // markup.
    setOrder(settings, 'while', { brew_temperature_time: 1 });
    expect(
      brewFieldLayout(BREW_FORM_FIELDS, settings, preparation).while,
    ).toEqual(['brew_temperature_time', 'graph', 'coffee_blooming_time']);

    for (const key of Object.keys(settings.manage_parameters)) {
      (settings.manage_parameters as any)[key] = false;
    }
    for (const table of [BREW_FORM_FIELDS, BREW_DETAIL_FIELDS]) {
      expect(brewFieldLayout(table, settings, preparation).while).toEqual([
        'graph',
      ]);
    }
  });

  it('shows the first drip time and the coffee brew time for espresso, or for any method with custom parameters', () => {
    expect(
      brewFieldLayout(BREW_FORM_FIELDS, settings, espressoMethod()).while,
    ).toEqual([
      'graph',
      'brew_time',
      'calculated_coffee_brew_time',
      'coffee_blooming_time',
      'coffee_first_drip_time',
    ]);
    expect(
      brewFieldLayout(BREW_FORM_FIELDS, settings, filterMethod()).while,
    ).toEqual(['graph', 'brew_time', 'coffee_blooming_time']);

    // Globally the coffee brew time also needs the brew time.
    settings.manage_parameters.brew_time = false;
    expect(
      brewFieldLayout(BREW_FORM_FIELDS, settings, espressoMethod()).while,
    ).toEqual(['graph', 'coffee_blooming_time', 'coffee_first_drip_time']);

    // A preparation with custom parameters needs the first drip time only.
    const preparation = filterMethod();
    preparation.use_custom_parameters = true;
    preparation.manage_parameters.brew_time = false;
    preparation.manage_parameters.coffee_first_drip_time = true;
    expect(
      brewFieldLayout(BREW_FORM_FIELDS, settings, preparation).while,
    ).toEqual([
      'graph',
      'calculated_coffee_brew_time',
      'coffee_blooming_time',
      'coffee_first_drip_time',
    ]);
  });

  it('replaces the amount of water by the beverage quantity for espresso', () => {
    expect(
      brewFieldLayout(BREW_FORM_FIELDS, settings, filterMethod()).after,
    ).toContain('brew_quantity');
    expect(
      brewFieldLayout(BREW_FORM_FIELDS, settings, espressoMethod()).after,
    ).not.toContain('brew_quantity');
  });

  it('shows the extraction yield right after the TDS when ground coffee, beverage quantity and TDS are on', () => {
    settings.manage_parameters.tds = true;
    setOrder(settings, 'after', { tds: 0 });
    expect(
      brewFieldLayout(BREW_FORM_FIELDS, settings, filterMethod()).after,
    ).toEqual([
      'tds',
      'calculated_extraction_yield',
      'brew_quantity',
      'brew_beverage_quantity',
      'rating',
      'note',
      'set_custom_brew_time',
    ]);

    for (const parameter of ['grind_weight', 'brew_beverage_quantity']) {
      const preparation = filterMethod();
      (settings.manage_parameters as any)[parameter] = false;
      expect(brewFieldLayout(BREW_FORM_FIELDS, settings, preparation).after)
        .withContext(parameter)
        .not.toContain('calculated_extraction_yield');
      (settings.manage_parameters as any)[parameter] = true;
    }
  });

  it('places the bean age and the brew ratio of the details with the bean, also when the bean is hidden', () => {
    setOrder(settings, 'before', { bean_type: 20 });
    expect(
      brewFieldLayout(BREW_DETAIL_FIELDS, settings, filterMethod()).before,
    ).toEqual([
      'grind_weight',
      'mill',
      'grind_size',
      'method_of_preparation',
      'brew_temperature',
      'bean_type',
      'bean_age',
      'brew_ratio',
    ]);

    settings.manage_parameters.bean_type = false;
    expect(
      brewFieldLayout(BREW_DETAIL_FIELDS, settings, filterMethod()).before,
    ).toEqual([
      'grind_weight',
      'mill',
      'grind_size',
      'method_of_preparation',
      'brew_temperature',
      'bean_age',
      'brew_ratio',
    ]);
  });

  it('counts a missing order or one that is no whole number as 0', () => {
    for (const value of [undefined, null, Number.NaN, 2.5]) {
      setOrder(settings, 'before', {
        grind_size: value,
        brew_temperature: 0,
      });
      // Both at 0: the grind size came first in the markup.
      expect(brewFieldLayout(BREW_FORM_FIELDS, settings, filterMethod()).before)
        .withContext(String(value))
        .toEqual([
          'grind_size',
          'brew_temperature',
          'bean_type',
          'grind_weight',
          'mill',
          'method_of_preparation',
        ]);
    }
  });

  it('has every parameter of the sort order in the brew form, and all but the custom brew time in the details', () => {
    for (const section of SECTIONS) {
      const parameters = Object.keys(
        new OrderBrewParameter()[section],
      ) as BrewFieldKey[];
      const form = markupOrder(BREW_FORM_FIELDS, section);
      const details = markupOrder(BREW_DETAIL_FIELDS, section);
      expect(form.filter((key) => parameters.includes(key)).sort()).toEqual(
        [...parameters].sort(),
      );
      expect(details.filter((key) => parameters.includes(key)).sort()).toEqual(
        parameters.filter((key) => key !== 'set_custom_brew_time').sort(),
      );
      expect(new Set(form).size).withContext(section).toBe(form.length);
      expect(new Set(details).size).withContext(section).toBe(details.length);
    }
  });

  it('has an empty layout for views that have not loaded their data yet', () => {
    expect(EMPTY_BREW_FIELD_LAYOUT).toEqual({
      before: [],
      while: [],
      after: [],
    });
  });

  it('matches the order on screen of the former templates for random settings and preparations', () => {
    const random = seededRandom(20261113);
    const styles = [
      PREPARATION_STYLE_TYPE.ESPRESSO,
      PREPARATION_STYLE_TYPE.POUR_OVER,
      PREPARATION_STYLE_TYPE.FULL_IMMERSION,
      PREPARATION_STYLE_TYPE.PERCOLATION,
      undefined,
    ];
    for (let run = 0; run < 2000; run++) {
      const randomSettings = new Settings();
      const preparation = new Preparation();
      randomize(random, randomSettings);
      randomize(random, preparation);
      preparation.use_custom_parameters = random() < 0.5;
      preparation.style_type = styles[Math.floor(random() * styles.length)];

      const form = brewFieldLayout(
        BREW_FORM_FIELDS,
        randomSettings,
        preparation,
      );
      const details = brewFieldLayout(
        BREW_DETAIL_FIELDS,
        randomSettings,
        preparation,
      );
      for (const section of SECTIONS) {
        const context = `run ${run}, ${section}`;
        expect<readonly string[]>(form[section])
          .withContext(`form, ${context}`)
          .toEqual(
            oldScreenOrder(OLD_FORM[section], randomSettings, preparation),
          );

        const oldDetails = oldScreenOrder(
          OLD_DETAIL[section],
          randomSettings,
          preparation,
        );
        if (section === 'after') {
          // The details render the creation date after the sorted fields.
          expect(oldDetails.at(-1)).withContext(context).toBe('creation_date');
          oldDetails.pop();
        }
        expect<readonly string[]>(details[section])
          .withContext(`details, ${context}`)
          .toEqual(oldDetails);
      }
    }
  });
});
