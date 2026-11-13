import {
  generateDataSet,
  type SyntheticBean,
  type SyntheticBeanInformation,
  type SyntheticBrew,
  type SyntheticDataSet,
  type SyntheticSettings,
} from './synthetic-data';

/**
 * A small, hand-made data set for the bean tests: twelve beans in every state the bean list
 * knows (available, frozen, thawed, archived, a group of frozen portions, a blend, a bean with a
 * photo) and the brews that give them a usage, a rating and an age.
 *
 * Every date is given in days before `now`, the time the tests set the browser clock to, so the
 * ages on the cards are fixed numbers. Field names and defaults come from the generated data
 * (`synthetic-data.ts`), which is compared with the model classes.
 */

const DAY_MS = 86_400_000;

export interface BeanTestSettings extends SyntheticSettings {
  freeze_coffee_beans: boolean;
  show_archived_beans: boolean;
  security_check_when_going_back: boolean;
  date_format: string;
  currency: string;
  bean_manage_parameters: { bean_information: boolean };
  bean_visible_list_view_parameters: {
    bean_information: boolean;
    country: boolean;
    percentage: boolean;
  };
  bean_filter?: Record<string, Record<string, unknown>>;
}

export interface BeanDataSet extends Omit<SyntheticDataSet, 'SETTINGS'> {
  SETTINGS: BeanTestSettings[];
}

export interface BeanDataOptions {
  /** The time the browser clock is set to. */
  now: Date;
  /**
   * Address of the photo of "Gamma Blend". The web build cannot read stored photo files, but it
   * shows an attachment that is a web address as it is; so the photo is an image of the app
   * itself. On a device attachments are file paths.
   */
  photoUrl?: string;
  /** Further available beans "Extra 01", "Extra 02", …, to make the list scroll. */
  extraBeans?: number;
  /** Changes to the settings of the data set. */
  settings?: Partial<BeanTestSettings>;
}

/** Names of the beans in the data set. */
export const BEANS = {
  alpha: 'Alpha Filter',
  ethiopia: 'Äthiopien Natural',
  blend: 'Gamma Blend',
  overused: 'Delta Minus',
  small: 'Epsilon Rest',
  portionSource: 'Zeta Original',
  portion: 'Zeta Portion',
  frozen: 'Eta Frost',
  thawed: 'Theta Aufgetaut',
  archived: 'Iota Archiv',
  archivedFrozen: 'Kappa Archiv Frost',
  archivedLate: 'Lambda Archiv',
} as const;

export const ROASTER_NORTH = 'Rösterei Nord';
export const ROASTER_SOUTH = 'Rösterei Süd';
export const PREPARATION_NAME = 'V60';
export const MILL_NAME = 'Hand grinder';
/** Group of "Zeta Original" and its three frozen portions. */
export const PORTION_GROUP_ID = 'group-zeta';

function uuid(kind: string, index: number): string {
  return `${kind}-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

export function createBeanDataSet(options: BeanDataOptions): BeanDataSet {
  const now = options.now.getTime();
  const daysAgo = (days: number) => new Date(now - days * DAY_MS).toISOString();
  const unixDaysAgo = (days: number) =>
    Math.floor((now - days * DAY_MS) / 1000);

  // One generated bean and brew serve as templates with every field of the models.
  const generated = generateDataSet({
    brews: 1,
    beans: 1,
    endDate: options.now,
  });
  const preparation = generated.PREPARATION.find(
    (entry) => entry.name === PREPARATION_NAME && !entry.finished,
  );
  const mill = generated.MILL.find((entry) => !entry.finished);
  if (!preparation || !mill) {
    throw new Error('The generated data has no active V60 or grinder');
  }
  mill.name = MILL_NAME;

  const beans: SyntheticBean[] = [];
  const brews: SyntheticBrew[] = [];

  const variety = (
    country: string,
    percentage: number,
  ): SyntheticBeanInformation => ({
    country,
    region: '',
    farm: '',
    farmer: '',
    elevation: '',
    harvest_time: '',
    variety: '',
    processing: '',
    certification: '',
    percentage,
    purchasing_price: 0,
    fob_price: 0,
  });

  const addBean = (
    name: string,
    values: Partial<SyntheticBean> = {},
  ): SyntheticBean => {
    const index = beans.length + 1;
    // Added one year ago, in the order of the list below.
    const created = unixDaysAgo(365) + index;
    const bean: SyntheticBean = {
      ...generated.BEANS[0],
      name,
      buyDate: '',
      roastingDate: '',
      note: '',
      roaster: '',
      config: {
        uuid: uuid('bean', index),
        unix_timestamp: created,
        created_at: created * 1000,
        updated_at: 0,
        rev: 0,
        updated_by: '',
      },
      roast: 'UNKNOWN',
      roast_range: 0,
      roast_custom: '',
      beanMix: 'SINGLE_ORIGIN',
      aromatics: '',
      weight: 250,
      finished: false,
      cost: 0,
      attachments: [],
      decaffeinated: false,
      bean_roasting_type: 'FILTER',
      bean_information: [variety('', 0)],
      rating: 0,
      favourite: false,
      openDate: '',
      ...values,
    };
    beans.push(bean);
    return bean;
  };

  const addBrew = (
    bean: SyntheticBean,
    days: number,
    values: Partial<SyntheticBrew>,
  ): void => {
    const index = brews.length + 1;
    const created = unixDaysAgo(days);
    brews.push({
      ...generated.BREWS[0],
      bean: bean.config.uuid,
      method_of_preparation: preparation.config.uuid,
      method_of_preparation_tools: [],
      mill: mill.config.uuid,
      mill_speed: 0,
      water: '',
      note: '',
      rating: 0,
      grind_weight: 0,
      bean_weight_in: 0,
      favourite: false,
      best_brew: false,
      pressure_profile: '',
      tds: 0,
      config: {
        uuid: uuid('brew', index),
        unix_timestamp: created,
        created_at: created * 1000,
        updated_at: 0,
        rev: 0,
        updated_by: '',
      },
      ...values,
    });
  };

  // Available ---------------------------------------------------------------------------------

  // Used 18 g + 18.5 g = 36.5 g of 250 g, 10 days old, brews rated 4 and 2.
  const alpha = addBean(BEANS.alpha, {
    weight: 250,
    cost: 12.5,
    roaster: ROASTER_NORTH,
    roastingDate: daysAgo(10),
    favourite: true,
  });
  addBrew(alpha, 3, { grind_weight: 18, rating: 4 });
  // The weight of the beans put in counts instead of the ground weight.
  addBrew(alpha, 1, { grind_weight: 18, bean_weight_in: 18.5, rating: 2 });

  // No roasting date and no weight.
  addBean(BEANS.ethiopia, { weight: 0 });

  addBean(BEANS.blend, {
    beanMix: 'BLEND',
    bean_information: [
      variety('Ethiopia', 50),
      variety('Brazil', 30),
      variety('Colombia', 20),
    ],
    weight: 1000,
    cost: 30,
    roaster: ROASTER_SOUTH,
    roast: 'CUSTOM_ROAST',
    roast_custom: 'Hausröstung',
    rating: 5,
    attachments: options.photoUrl ? [options.photoUrl] : [],
  });

  // More used than the bag held: 3 x 40 g of 100 g.
  const overused = addBean(BEANS.overused, {
    weight: 100,
    roastingDate: daysAgo(20),
  });
  for (const days of [6, 5, 4]) {
    addBrew(overused, days, { grind_weight: 40 });
  }

  addBean(BEANS.small, { weight: 20, roastingDate: daysAgo(5) });

  // What is left of a bag that was frozen in three portions.
  addBean(BEANS.portionSource, {
    weight: 10,
    roastingDate: daysAgo(40),
    frozenGroupId: PORTION_GROUP_ID,
  });

  // Frozen ------------------------------------------------------------------------------------

  for (const frozenId of ['ZP1', 'ZP2', 'ZP3']) {
    addBean(BEANS.portion, {
      weight: 80,
      cost: 4,
      roastingDate: daysAgo(40),
      frozenDate: daysAgo(30),
      frozenId,
      frozenGroupId: PORTION_GROUP_ID,
    });
  }

  // 10 days until it was frozen, 200 days in the freezer.
  addBean(BEANS.frozen, {
    weight: 250,
    roastingDate: daysAgo(210),
    frozenDate: daysAgo(200),
    frozenId: 'EF1',
    frozenNote: 'Vakuumiert',
  });

  // Available again ---------------------------------------------------------------------------

  // 20 days until it was frozen, 95 days in the freezer, thawed 5 days ago.
  addBean(BEANS.thawed, {
    weight: 200,
    roastingDate: daysAgo(120),
    frozenDate: daysAgo(100),
    unfrozenDate: daysAgo(5),
    frozenId: 'TA1',
  });

  // Archive -----------------------------------------------------------------------------------

  const archived = addBean(BEANS.archived, {
    finished: true,
    roastingDate: daysAgo(60),
    rating: 3,
  });
  addBrew(archived, 40, { grind_weight: 15 });

  addBean(BEANS.archivedFrozen, {
    finished: true,
    roastingDate: daysAgo(70),
    frozenDate: daysAgo(65),
    frozenId: 'KA1',
  });

  // Its last brew is older than the day it was frozen.
  const archivedLate = addBean(BEANS.archivedLate, {
    finished: true,
    roastingDate: daysAgo(50),
    frozenDate: daysAgo(20),
    frozenId: 'LA1',
  });
  addBrew(archivedLate, 45, { grind_weight: 15 });

  for (let i = 1; i <= (options.extraBeans ?? 0); i++) {
    addBean(`Extra ${String(i).padStart(2, '0')}`, {
      roastingDate: daysAgo(7),
    });
  }

  return {
    ...generated,
    BEANS: beans,
    BREWS: brews,
    PREPARATION: [preparation],
    MILL: [mill],
    WATER: [],
    SETTINGS: [
      {
        ...generated.SETTINGS[0],
        freeze_coffee_beans: true,
        show_archived_beans: true,
        security_check_when_going_back: false,
        date_format: 'DD.MM.YYYY',
        currency: 'EUR',
        bean_manage_parameters: { bean_information: true },
        bean_visible_list_view_parameters: {
          bean_information: true,
          country: true,
          percentage: true,
        },
        ...options.settings,
      },
    ],
  };
}
