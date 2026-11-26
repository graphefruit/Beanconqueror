import type { Bean } from '../../classes/bean/bean';
import type { Brew } from '../../classes/brew/brew';
import type { ListViewBrewParameter } from '../../classes/parameter/listViewBrewParameter';
import type { Preparation } from '../../classes/preparation/preparation';
import { BREW_QUANTITY_TYPES_ENUM } from '../../enums/brews/brewQuantityTypes';
import { PREPARATION_STYLE_TYPE } from '../../enums/preparations/preparationStyleTypes';
import { buildBrewImportProvenanceChip } from '../../services/brewImport/brew-import-provenance';

/** Texts the brew only knows with the settings and the other stores. */
export interface BrewShareTexts {
  readonly date: string;
  readonly time: string;
  readonly ratio: string;
  readonly brewTime: string;
  readonly extractionYield: string;
  readonly temperatureTime: string;
  readonly bloomingTime: string;
  readonly firstDripTime: string;
  readonly water: string;
  readonly beanAge: string;
  readonly tools: readonly string[];
  readonly flavors: readonly string[];
}

export interface BrewShareSource {
  readonly brew: Brew;
  readonly bean?: Pick<
    Bean,
    'name' | 'roaster' | 'roastingDate' | 'isFrozen' | 'isUnfrozen'
  >;
  readonly preparation?: Pick<
    Preparation,
    | 'name'
    | 'style_type'
    | 'use_custom_parameters'
    | 'visible_list_view_parameters'
  >;
  readonly millName: string;
  /** What the settings show on brew cards. */
  readonly listParameters: ListViewBrewParameter;
  /** The rating is not 1 to 5 whole stars, so it is shown as a number. */
  readonly customRating: boolean;
  readonly texts: BrewShareTexts;
  readonly formatNumber: (value: number) => string;
}

export interface BrewShareRow {
  readonly labelKey: string;
  readonly value: string;
  /** Takes the whole width, as lists and long text do on the brew card. */
  readonly wide: boolean;
}

export interface BrewShareCard {
  readonly best: boolean;
  readonly favourite: boolean;
  readonly date: string;
  readonly time: string;
  /** A snowflake before the bean; in brackets once the beans are thawed. */
  readonly frozen?: 'frozen' | 'unfrozen';
  readonly bean: string;
  readonly roaster: string;
  /** Whole stars out of 5, or the number of a custom rating. */
  readonly rating?: { readonly stars?: number; readonly value?: string };
  /** The chip of an imported brew: where it came from, and the device. */
  readonly imported?: string;
  readonly rows: readonly BrewShareRow[];
  /** Offered with a switch, as it is the one part that can be personal. */
  readonly note: string;
  /** The brew card shows the note, so the picture starts with it. */
  readonly noteShown: boolean;
}

export const SHARE_CARD_MAX_STARS = 5;

/**
 * What the shared picture of a brew shows: the brew card as the app shows it,
 * with the fields the settings show and the empty ones left out. Place, price
 * and purchase date are never on it; the brew card does not show them either.
 */
export function brewShareCard(source: BrewShareSource): BrewShareCard {
  const { brew, preparation, texts } = source;
  const visible = (key: keyof ListViewBrewParameter): boolean =>
    preparation?.use_custom_parameters
      ? !!preparation.visible_list_view_parameters[key]
      : !!source.listParameters[key];
  const espresso = preparation?.style_type === PREPARATION_STYLE_TYPE.ESPRESSO;

  const rows: BrewShareRow[] = [];
  const add = (
    labelKey: string,
    shown: boolean,
    value: string | number | undefined,
    wide = false,
  ) => {
    const text = value === undefined || value === null ? '' : String(value);
    if (shown && text !== '') {
      rows.push({ labelKey, value: text, wide });
    }
  };

  add(
    'BREW_DATA_PREPARATION_METHOD',
    visible('method_of_preparation'),
    preparation?.name,
  );
  add('BREW_DATA_MILL', visible('mill'), source.millName);
  const [quantity, unit] = espresso
    ? [brew.brew_beverage_quantity, brew.brew_beverage_quantity_type]
    : [brew.brew_quantity, brew.brew_quantity_type];
  add(
    'BREW_DATA_IN_OUT_BR',
    true,
    `${source.formatNumber(brew.grind_weight)}gr / ${source.formatNumber(quantity)}${BREW_QUANTITY_TYPES_ENUM[unit as unknown as keyof typeof BREW_QUANTITY_TYPES_ENUM] ?? ''} (${texts.ratio})`,
  );
  add(
    'BREW_DATA_TIME',
    brew.brew_time > 0 && visible('brew_time'),
    texts.brewTime,
  );
  const grindSize = brew.grind_size !== '' && visible('grind_size');
  const millSpeed = brew.mill_speed > 0 && visible('mill_speed');
  add(
    'BREW_DATA_GRIND_SIZE',
    grindSize || millSpeed,
    [grindSize ? brew.grind_size : '', millSpeed ? `@ ${brew.mill_speed}` : '']
      .filter((part) => part !== '')
      .join(' '),
  );
  add(
    'BREW_DATA_TDS_EY',
    brew.tds > 0 && brew.brew_beverage_quantity > 0,
    `${brew.tds}, %${texts.extractionYield}`,
  );
  add(
    'BREW_DATA_BREW_TEMPERATURE',
    brew.brew_temperature > 0 && visible('brew_temperature'),
    brew.brew_temperature,
  );
  add(
    'BREW_DATA_PRESSURE_PROFILE',
    visible('pressure_profile'),
    brew.pressure_profile,
  );
  add(
    'BREW_DATA_BEAN_WEIGHT_IN',
    brew.bean_weight_in > 0 && visible('bean_weight_in'),
    brew.bean_weight_in,
  );
  add(
    'BREW_DATA_MILL_TIMER',
    brew.mill_timer > 0 && visible('mill_timer'),
    brew.mill_timer,
  );
  add(
    'BREW_DATA_VESSEL_NAME_WEIGHT',
    brew.vessel_name !== '' && visible('vessel'),
    brew.vessel_name ? `${brew.vessel_name} / ${brew.vessel_weight}` : '',
  );
  add(
    'BREW_DATA_TEMPERATURE_TIME',
    brew.brew_temperature_time > 0 && visible('brew_temperature_time'),
    texts.temperatureTime,
  );
  add(
    'BREW_DATA_COFFEE_BLOOMING_TIME',
    brew.coffee_blooming_time > 0 && visible('coffee_blooming_time'),
    texts.bloomingTime,
  );
  // As on the brew card: espresso only, unless the preparation shows it.
  add(
    'BREW_DATA_COFFEE_FIRST_DRIP_TIME',
    brew.coffee_first_drip_time > 0 &&
      (espresso || !!preparation?.use_custom_parameters) &&
      visible('coffee_first_drip_time'),
    texts.firstDripTime,
  );
  add('BREW_DATA_WATER', brew.water !== '' && visible('water'), texts.water);
  add('BREW_DATA_COFFEE_TYPE', visible('coffee_type'), brew.coffee_type);
  add(
    'BREW_DATA_COFFEE_CONCENTRATION',
    visible('coffee_concentration'),
    brew.coffee_concentration,
  );
  add(
    'BREW_INFORMATION_BEAN_AGE',
    !!source.bean?.roastingDate && visible('bean_age_by_brew_date'),
    texts.beanAge,
  );
  add(
    'BREW_DATA_PREPARATION_METHOD_TOOL',
    visible('method_of_preparation_tool'),
    texts.tools.filter((tool) => tool !== '').join(', '),
    true,
  );
  add('BREW_DATA_FLAVOR', true, texts.flavors.join(', '), true);

  const imported = buildBrewImportProvenanceChip(
    brew.customInformation?.imported,
  );
  return {
    best: !!brew.best_brew,
    favourite: !!brew.favourite,
    date: texts.date,
    time: texts.time,
    frozen: source.bean?.isFrozen()
      ? 'frozen'
      : source.bean?.isUnfrozen()
        ? 'unfrozen'
        : undefined,
    bean: source.bean?.name ?? '',
    roaster: source.bean?.roaster ?? '',
    rating: brewShareRating(
      brew.rating,
      visible('rating'),
      source.customRating,
    ),
    imported: imported
      ? [imported.sourceName, imported.device].filter(Boolean).join(' · ')
      : undefined,
    rows,
    note: brew.note ?? '',
    noteShown: visible('note'),
  };
}

function brewShareRating(
  rating: number,
  shown: boolean,
  custom: boolean,
): BrewShareCard['rating'] {
  if (!shown || !(rating > 0)) {
    return undefined;
  }
  if (custom) {
    return { value: String(+rating.toFixed(2)) };
  }
  return { stars: Math.min(SHARE_CARD_MAX_STARS, Math.round(rating)) };
}

export type Translate = (key: string, params?: object) => string;

/**
 * The text a screen reader reads for the picture: everything on it, in the
 * order it is shown.
 */
export function describeBrewShareCard(
  card: BrewShareCard,
  shown: { readonly note: boolean; readonly graph: boolean },
  t: Translate,
): string {
  const parts = [
    card.best ? t('POPOVER_BEST_BREW') : '',
    card.favourite ? t('POPOVER_BREWS_OPTION_TOGGLE_FAVOURITE') : '',
    `${card.date} ${card.time}`,
    card.frozen === 'frozen'
      ? t('FROZEN_BEANS')
      : card.frozen === 'unfrozen'
        ? t('A11Y.UNFROZEN')
        : '',
    card.roaster ? `${card.bean} (${card.roaster})` : card.bean,
  ];
  if (card.rating?.stars !== undefined) {
    parts.push(
      t('A11Y.STARS', {
        name: t('BREW_DATA_RATING'),
        rating: card.rating.stars,
        max: SHARE_CARD_MAX_STARS,
      }),
    );
  } else if (card.rating) {
    parts.push(`${t('BREW_DATA_RATING')}: ${card.rating.value}`);
  }
  if (card.imported) {
    parts.push(`${t('BREW_IMPORTED_FROM')} ${card.imported}`);
  }
  for (const row of card.rows) {
    parts.push(`${t(row.labelKey)}: ${row.value}`);
  }
  if (shown.note && card.note !== '') {
    parts.push(`${t('BREW_DATA_NOTES')}: ${card.note}`);
  }
  if (shown.graph) {
    parts.push(t('A11Y.HAS_GRAPH'));
  }
  parts.push('BeanConqueror');
  return t('SHARE_CARD.DESCRIPTION', {
    content: parts.filter((part) => part.trim() !== '').join('. '),
  });
}
