import { BEAN_FREEZING_STORAGE_ENUM } from '../../enums/beans/beanFreezingStorage';
import { ROASTS_ENUM } from '../../enums/beans/roasts';
import type { IBean } from '../../interfaces/bean/iBean';
import type { IBeanInformation } from '../../interfaces/bean/iBeanInformation';
import type { IBeanParameter } from '../../interfaces/parameter/iBeanParameter';
import type { Translate } from '../brews/brew-share-card-rules';
import { SHARE_CARD_MAX_STARS } from '../brews/brew-share-card-rules';
import type { DeepReadonly } from '../core/read-only';
import {
  beanAgeInDays,
  hasFrozenInformation,
  isFrozen,
  isSelfRoasted,
} from './bean-rules';
import type { BeanUsage } from './bean-usage.store';

export interface BeanShareSource {
  readonly bean: DeepReadonly<IBean>;
  /** What the settings show on bean cards. */
  readonly listParameters: Readonly<IBeanParameter>;
  /** The rating is not 1 to 5 whole stars, so it is shown as a number. */
  readonly customRating: boolean;
  readonly usage: BeanUsage;
  /** Milliseconds, for the age of the roast. */
  readonly now: number;
  readonly formatDate: (date: string) => string;
  readonly formatNumber: (value: number) => string;
  readonly t: Translate;
}

export type BeanShareMark =
  'decaffeinated' | 'frozen' | 'unfrozen' | 'selfRoasted' | 'favourite';

export interface BeanShareRow {
  readonly labelKey: string;
  /** The number of the origin in a blend, as the bean card writes it. */
  readonly prefix: string;
  readonly value: string;
  /** Takes the whole width, as lists and long text do on the bean card. */
  readonly wide: boolean;
  /** Goes with the notes switch. */
  readonly note: boolean;
}

export interface BeanShareCard {
  readonly marks: readonly BeanShareMark[];
  readonly name: string;
  /** Translated, empty when unknown or hidden. */
  readonly roastingType: string;
  readonly roaster: string;
  readonly frozenId: string;
  /** Whole stars out of 5. */
  readonly roastRange?: number;
  /** Whole stars out of 5, or the number of a custom rating. */
  readonly rating?: { readonly stars?: number; readonly value?: string };
  readonly rows: readonly BeanShareRow[];
  readonly hasNote: boolean;
  /** The bean card shows the notes, so the picture starts with them. */
  readonly noteShown: boolean;
  /** Path or web address of the first photo of the bean, empty without one. */
  readonly photo: string;
}

type Visible = keyof IBeanParameter;

/** The fields of an origin in the order the bean card shows them. */
const ORIGIN_FIELDS: readonly [keyof IBeanInformation & Visible, string][] = [
  ['country', 'BEAN_DATA_COUNTRY'],
  ['region', 'BEAN_DATA_REGION'],
  ['farm', 'BEAN_DATA_FARM'],
  ['farmer', 'BEAN_DATA_FARMER'],
  ['elevation', 'BEAN_DATA_ELEVATION'],
  ['variety', 'BEAN_DATA_VARIETY'],
  ['processing', 'BEAN_DATA_PROCESSING'],
  ['harvest_time', 'BEAN_DATA_HARVEST_TIME'],
  ['percentage', 'BEAN_DATA_PERCENTAGE'],
  ['certification', 'BEAN_DATA_CERTIFICATION'],
];

/**
 * What the shared picture of a bean shows: the bean card as the app shows
 * it, with the fields the settings show and the empty ones left out. Price,
 * purchase date and the prices of the origins are never on it.
 */
export function beanShareCard(source: BeanShareSource): BeanShareCard {
  const { bean, t } = source;
  const visible = (key: Visible): boolean =>
    source.listParameters[key] === true;
  const rows: BeanShareRow[] = [];
  const add = (
    labelKey: string,
    shown: boolean,
    value: string | number | undefined | null,
    options: { wide?: boolean; note?: boolean; prefix?: string } = {},
  ) => {
    const text = value === undefined || value === null ? '' : String(value);
    if (shown && text.trim() !== '') {
      rows.push({
        labelKey,
        prefix: options.prefix ?? '',
        value: text,
        wide: !!options.wide,
        note: !!options.note,
      });
    }
  };
  const date = (value: string) => (value ? source.formatDate(value) : '');

  const frozenInformation = hasFrozenInformation(bean);
  add('BEAN_DATA_FROZEN_DATE', true, date(bean.frozenDate));
  add('BEAN_DATA_UNFROZEN_DATE', true, date(bean.unfrozenDate));
  add(
    'BEAN_DATA_FROZEN_STORAGE_TYPE',
    frozenInformation &&
      !!bean.frozenStorageType &&
      bean.frozenStorageType !== BEAN_FREEZING_STORAGE_ENUM.UNKNOWN,
    t('BEAN_FREEZING_STORAGE_TYPE_' + bean.frozenStorageType),
  );
  add('BEAN_DATA_FROZEN_NOTE', frozenInformation, bean.frozenNote, {
    wide: true,
    note: true,
  });
  add(
    'BEAN_DATA_ROASTING_DATE',
    visible('roastingDate'),
    date(bean.roastingDate),
  );
  add('BEAN_DATA_BEST_DATE', visible('bestDate'), date(bean.bestDate));
  add('BEAN_DATA_OPEN_DATE', visible('openDate'), date(bean.openDate));
  const roast = bean.roast as string;
  add(
    'BEAN_DATA_ROAST_NAME_TYPE',
    visible('roast') && roast !== 'UNKNOWN',
    roast === 'CUSTOM_ROAST'
      ? bean.roast_custom
      : ROASTS_ENUM[roast as keyof typeof ROASTS_ENUM],
  );
  add('PAGE_HOME_TOTAL_BREWS', true, source.usage.brews);
  const age = beanAgeInDays(bean, source.now, source.usage.lastBrewAt);
  add(
    'ROASTED_BEFORE',
    visible('roastingDate') && !!bean.roastingDate,
    `${age} ${t(age === 1 ? 'DAY_OLD' : 'DAYS_OLD')}`,
  );
  add(
    'BEANS_AMOUNT_USED',
    visible('weight') && bean.weight > 0,
    t('BEAN_WEIGHT_ALREADY_USED', {
      gramUsed: source.formatNumber(source.usage.grams),
      gramTotal: bean.weight,
      leftOver: source.formatNumber(bean.weight - source.usage.grams),
    }),
  );
  add(
    'BREW_DATA_FLAVOR',
    true,
    [
      ...bean.cupped_flavor.custom_flavors,
      ...Object.keys(bean.cupped_flavor.predefined_flavors).map((key) =>
        t('CUPPING_' + key),
      ),
    ].join(', '),
    { wide: true },
  );
  const mix = bean.beanMix as string;
  add(
    'BEAN_SORT_MIX',
    visible('beanMix') && !!mix && mix !== 'UNKNOWN',
    t('BEAN_MIX_' + mix),
  );
  add(
    'BEAN_DATA_CUPPING_POINTS',
    visible('cupping_points'),
    bean.cupping_points,
  );
  add(
    'BEAN_DATA_DECAFFEINATED',
    visible('decaffeinated'),
    t(bean.decaffeinated ? 'YES' : 'NO'),
  );
  add('BEAN_DATA_URL', visible('url'), bean.url, { wide: true });
  add('BEAN_DATA_EAN', visible('ean_article_number'), bean.ean_article_number);
  add('BEAN_DATA_AROMATICS', visible('aromatics'), bean.aromatics, {
    wide: true,
  });
  add('NOTES', true, bean.note, { wide: true, note: true });
  if (visible('bean_information')) {
    const blend = mix === 'BLEND';
    (bean.bean_information ?? []).forEach((origin, index) => {
      for (const [key, labelKey] of ORIGIN_FIELDS) {
        add(labelKey, visible(key), origin?.[key] || '', {
          prefix: blend ? `${index + 1}. ` : '',
        });
      }
    });
  }

  const frozen = isFrozen(bean);
  const marks: BeanShareMark[] = [];
  if (bean.decaffeinated) marks.push('decaffeinated');
  if (frozen) marks.push('frozen');
  if (!frozen && bean.frozenId) marks.push('unfrozen');
  if (isSelfRoasted(bean)) marks.push('selfRoasted');
  if (bean.favourite) marks.push('favourite');

  const roastingType = bean.bean_roasting_type as string;
  return {
    marks,
    name: bean.name ?? '',
    roastingType:
      visible('bean_roasting_type') &&
      !!roastingType &&
      roastingType !== 'UNKNOWN'
        ? t('BEAN_ROASTING_TYPE_' + roastingType)
        : '',
    roaster: visible('roaster') ? (bean.roaster ?? '') : '',
    frozenId: bean.frozenId ?? '',
    roastRange:
      visible('roast_range') && bean.roast_range > 0
        ? Math.min(SHARE_CARD_MAX_STARS, Math.round(bean.roast_range))
        : undefined,
    rating: beanShareRating(
      bean.rating,
      visible('rating'),
      source.customRating,
    ),
    rows,
    hasNote: rows.some((row) => row.note),
    noteShown: visible('note'),
    photo: (bean.attachments ?? []).find((path) => !!path?.trim()) ?? '',
  };
}

function beanShareRating(
  rating: number,
  shown: boolean,
  custom: boolean,
): BeanShareCard['rating'] {
  if (!shown || !(rating > 0)) {
    return undefined;
  }
  if (custom) {
    return { value: String(+rating.toFixed(2)) };
  }
  return { stars: Math.min(SHARE_CARD_MAX_STARS, Math.round(rating)) };
}

const MARK_NAMES: Readonly<Record<BeanShareMark, string>> = {
  decaffeinated: 'BEAN_DATA_DECAFFEINATED',
  frozen: 'FROZEN_BEANS',
  unfrozen: 'A11Y.UNFROZEN',
  selfRoasted: 'A11Y.SELF_ROASTED',
  favourite: 'POPOVER_BREWS_OPTION_TOGGLE_FAVOURITE',
};

/** The rows the picture shows: the notes only while they are switched on. */
export function shownBeanShareRows(
  card: BeanShareCard,
  note: boolean,
): readonly BeanShareRow[] {
  return note ? card.rows : card.rows.filter((row) => !row.note);
}

/**
 * The photo as a data address for the picture: drawing it from a data address
 * does not depend on how the platform serves stored files. Photos are stored
 * as JPEG or PNG.
 */
export function beanSharePhotoSrc(path: string, base64: string): string {
  const type = /\.png$/i.test(path) ? 'image/png' : 'image/jpeg';
  return `data:${type};base64,${base64}`;
}

/**
 * The text a screen reader reads for the picture: everything on it, in the
 * order it is shown.
 */
export function describeBeanShareCard(
  card: BeanShareCard,
  shown: { readonly note: boolean; readonly photo: boolean },
  t: Translate,
): string {
  const name = card.roastingType
    ? `${card.name} (${card.roastingType})`
    : card.name;
  const parts = [
    ...card.marks.map((mark) => t(MARK_NAMES[mark])),
    card.roaster ? `${name}, ${card.roaster}` : name,
    card.frozenId ? `${t('BEAN_DATA_FROZEN_ID')}: ${card.frozenId}` : '',
  ];
  if (card.roastRange !== undefined) {
    parts.push(
      t('A11Y.STARS', {
        name: t('BEAN_DATA_ROAST_NAME'),
        rating: card.roastRange,
        max: SHARE_CARD_MAX_STARS,
      }),
    );
  }
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
  if (shown.photo) {
    parts.push(t('SHARE_CARD.BEAN_PHOTO'));
  }
  for (const row of shownBeanShareRows(card, shown.note)) {
    parts.push(`${row.prefix}${t(row.labelKey)}: ${row.value}`);
  }
  parts.push('BeanConqueror');
  return t('SHARE_CARD.BEAN_DESCRIPTION', {
    content: parts.filter((part) => part.trim() !== '').join('. '),
  });
}
