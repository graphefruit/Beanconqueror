/**
 * Synthetic Beanconqueror data sets for tests and performance measurements.
 *
 * The output has the shape the app stores in its database and writes into a backup: one array per
 * storage key (see "Collections" in docs/ARCHITECTURE.md). Field names and defaults mirror the
 * model classes in src/classes/; src/test-utils/__tests__/synthetic-data.spec.ts compares them
 * with real instances, so a renamed or added field fails that test instead of silently drifting.
 *
 * Preparations and settings only carry the fields the data set needs. The app fills every missing
 * field with the class default when it loads them (`initializeByObject`), as it does for backups
 * from older versions.
 *
 * The module has no imports and no Node APIs, so Playwright, Node (type stripping) and the Karma
 * unit test can all load it. The same options always produce the same data.
 */

export const BREW_TIERS = [1_000, 7_000, 15_000] as const;

export interface DataSetOptions {
  /** Number of brews. */
  brews: number;
  /** Number of beans, including archived ones. Default 1,000. */
  beans?: number;
  /** Seed of the random generator. Default 1. */
  seed?: number;
  /**
   * End of the period the brews cover (the `years` before it). It is not the time of the last
   * brew: no brew is later, but the last one can be hours or, with few brews, days earlier.
   * Default 2026-11-01 18:00 UTC.
   */
  endDate?: Date;
  /** Default 5. */
  years?: number;
  /** Share of beans that are archived (finished) once used up. Default 0.4. */
  archivedBeanShare?: number;
  /**
   * Adds references to photos and flow profiles. The files themselves are not generated, so the
   * app shows them as missing. Default false.
   */
  fileReferences?: boolean;
}

export interface EntryConfig {
  uuid: string;
  unix_timestamp: number;
}

interface Cupping {
  body: number;
  brightness: number;
  clean_cup: number;
  complexity: number;
  cuppers_correction: number;
  dry_fragrance: number;
  finish: number;
  flavor: number;
  sweetness: number;
  uniformity: number;
  wet_aroma: number;
  notes: string;
}

interface CuppedFlavor {
  predefined_flavors: Record<string, unknown>;
  custom_flavors: string[];
}

export interface SyntheticBeanInformation {
  country: string;
  region: string;
  farm: string;
  farmer: string;
  elevation: string;
  harvest_time: string;
  variety: string;
  processing: string;
  certification: string;
  percentage: number;
  purchasing_price: number;
  fob_price: number;
}

/** `src/classes/bean/bean.ts`; enums are stored by key. */
export interface SyntheticBean {
  name: string;
  buyDate: string;
  roastingDate: string;
  note: string;
  roaster: string;
  config: EntryConfig;
  roast: string;
  roast_range: number;
  roast_custom: string;
  beanMix: 'SINGLE_ORIGIN' | 'BLEND';
  aromatics: string;
  weight: number;
  finished: boolean;
  cost: number;
  attachments: string[];
  decaffeinated: boolean;
  cupping_points: string;
  bean_roasting_type: 'FILTER' | 'ESPRESSO' | 'OMNI';
  bean_information: SyntheticBeanInformation[];
  url: string;
  ean_article_number: string;
  bean_roast_information: {
    drop_temperature: number;
    roast_length: number;
    roaster_machine: string;
    green_bean_weight: number;
    outside_temperature: number;
    humidity: number;
    bean_uuid: string;
    first_crack_minute: number;
    first_crack_temperature: number;
    second_crack_minute: number;
    second_crack_temperature: number;
  };
  rating: number;
  qr_code: string;
  internal_share_code: string;
  favourite: boolean;
  shared: boolean;
  cupping: Cupping;
  cupped_flavor: CuppedFlavor;
  frozenDate: string;
  unfrozenDate: string;
  frozenId: string;
  frozenGroupId: string;
  frozenStorageType: string;
  frozenNote: string;
  bestDate: string;
  openDate: string;
  co2e_kg: number;
}

/** `src/classes/brew/brew.ts`. */
export interface SyntheticBrew {
  grind_size: string;
  grind_weight: number;
  method_of_preparation: string;
  mill: string;
  mill_speed: number;
  mill_timer: number;
  pressure_profile: string;
  bean: string;
  brew_temperature_time: number;
  brew_temperature: number;
  brew_time: number;
  brew_quantity: number;
  brew_quantity_type: 'GR' | 'ML';
  note: string;
  rating: number;
  coffee_type: string;
  coffee_concentration: string;
  coffee_first_drip_time: number;
  coffee_blooming_time: number;
  attachments: string[];
  config: EntryConfig;
  tds: number;
  brew_beverage_quantity: number;
  brew_beverage_quantity_type: 'GR' | 'ML';
  mill_timer_milliseconds: number;
  brew_time_milliseconds: number;
  brew_temperature_time_milliseconds: number;
  coffee_first_drip_time_milliseconds: number;
  coffee_blooming_time_milliseconds: number;
  coordinates: {
    accuracy: null;
    altitude: null;
    altitudeAccuracy: null;
    heading: null;
    latitude: null;
    longitude: null;
    speed: null;
  };
  cupping: Cupping;
  cupped_flavor: CuppedFlavor;
  method_of_preparation_tools: string[];
  bean_weight_in: number;
  favourite: boolean;
  best_brew: boolean;
  water: string;
  vessel_name: string;
  vessel_weight: number;
  flow_profile: string;
  reference_flow_profile: { type: 'NONE'; uuid: string };
  preparationDeviceBrew: { type: 'NONE'; params?: undefined };
  customInformation: { visualizer_id: string };
}

/** `src/classes/preparation/preparationTool.ts`. */
export interface SyntheticPreparationTool {
  name: string;
  config: EntryConfig;
  archived: boolean;
}

/** Subset of `src/classes/preparation/preparation.ts`; parameter blocks keep their defaults. */
export interface SyntheticPreparation {
  name: string;
  note: string;
  config: EntryConfig;
  /** `PREPARATION_STYLE_TYPE` value, as the preparation form stores it. */
  style_type: 'ESPRESSO' | 'POUR OVER' | 'FULL_IMMERSION' | 'PERCOLATION';
  type: string;
  finished: boolean;
  use_custom_parameters: boolean;
  tools: SyntheticPreparationTool[];
  attachments: string[];
}

/** `src/classes/mill/mill.ts`. */
export interface SyntheticMill {
  name: string;
  note: string;
  config: EntryConfig;
  finished: boolean;
  attachments: string[];
  has_adjustable_speed: boolean;
  has_timer: boolean;
}

/** `src/classes/water/water.ts`. */
export interface SyntheticWater {
  name: string;
  note: string;
  config: EntryConfig;
  attachments: string[];
  finished: boolean;
  general_hardness: number;
  total_alkalinity: number;
  calcium: number;
  magnesium: number;
  sodium: number;
  potassium: number;
  chloride: number;
  sulfate: number;
  tds: number;
  general_hardness_type: string;
  total_alkalinity_type: string;
  calcium_type: string;
  magnesium_type: string;
  sodium_type: string;
  potassium_type: string;
  chloride_type: string;
  sulfate_type: string;
  tds_type: string;
  type: string;
}

/**
 * Subset of `src/classes/settings/settings.ts`: what a returning user has already answered, so
 * the app starts without first-run dialogs.
 */
export interface SyntheticSettings {
  config: EntryConfig;
  language: string;
  welcome_page_showed: boolean;
  matomo_analytics: boolean;
  matomo_analytics_last_question: number;
  /** `BREW_VIEW_ENUM.SINGLE_PAGE`. */
  brew_view: '0';
}

/** `src/classes/version/iVersion.ts` (class `Version`). */
export interface SyntheticVersion {
  config: EntryConfig;
  alreadyDisplayedVersions: string[];
  updatedDataVersions: string[];
}

export interface SyntheticDataSet {
  BEANS: SyntheticBean[];
  BREWS: SyntheticBrew[];
  PREPARATION: SyntheticPreparation[];
  MILL: SyntheticMill[];
  WATER: SyntheticWater[];
  SETTINGS: SyntheticSettings[];
  VERSION: SyntheticVersion[];
  GREEN_BEANS: never[];
  ROASTING_MACHINES: never[];
  GRAPH: never[];
  BARISTAMODE_BREWS: never[];
}

/**
 * Data migrations `UIUpdate.checkUpdate()` has already applied to this data, so a start runs the
 * migration check without migrating anything. The unit test runs that check and fails when the
 * app gets a migration that is missing here.
 */
export const APPLIED_DATA_VERSIONS = Array.from(
  { length: 15 },
  (_, i) => `UPDATE_${i + 1}`,
);

/**
 * Update screens already seen (`Version.getUpdatedVersions()`). The unit test checks that the
 * web build (`UIUpdate.checkUpdateScreen()`) shows none at start.
 */
export const DISPLAYED_UPDATE_SCREENS = ['8.8.0'];

/**
 * A word that only occurs in brew notes (not in bean, roaster, origin or preparation names), so a
 * search for it matches exactly the brews whose note contains it.
 */
export const NOTE_SEARCH_TERM = 'syrupy';

const DAY = 86_400;
const DEFAULT_END_DATE = new Date('2026-11-01T18:00:00Z');

export function generateDataSet(options: DataSetOptions): SyntheticDataSet {
  const brewCount = options.brews;
  const beanCount = options.beans ?? 1_000;
  const years = options.years ?? 5;
  const archivedBeanShare = options.archivedBeanShare ?? 0.4;
  const fileReferences = options.fileReferences ?? false;
  const end = Math.floor(
    (options.endDate ?? DEFAULT_END_DATE).getTime() / 1000,
  );
  const start = end - Math.round(years * 365 * DAY);
  const random = createRandom(options.seed ?? 1);

  if (!Number.isInteger(brewCount) || brewCount < 0) {
    throw new Error(`brews must be a non-negative integer, got ${brewCount}`);
  }
  if (!Number.isInteger(beanCount) || beanCount < 1) {
    throw new Error(`beans must be a positive integer, got ${beanCount}`);
  }

  const timeline = { start, end, at: (share: number) => at(start, end, share) };
  const preparations = PREPARATIONS.map((p) =>
    createPreparation(p, random, timeline.at(p.addedAt)),
  );
  const mills = MILLS.map((m) => createMill(m, random, timeline.at(m.addedAt)));
  const waters = WATERS.map((w) =>
    createWater(w, random, timeline.at(w.addedAt)),
  );
  const beans = createBeans(beanCount, random, timeline, {
    archivedBeanShare,
    fileReferences,
  });
  const brews = createBrews(brewCount, random, timeline, {
    beans,
    preparations,
    mills,
    waters,
    fileReferences,
  });

  return {
    BEANS: beans.map((b) => b.entry),
    BREWS: brews,
    PREPARATION: preparations.map((p) => p.entry),
    MILL: mills.map((m) => m.entry),
    WATER: waters.map((w) => w.entry),
    SETTINGS: [
      {
        config: { uuid: random.uuid(), unix_timestamp: start },
        language: 'en',
        welcome_page_showed: true,
        matomo_analytics: false,
        matomo_analytics_last_question: end,
        brew_view: '0',
      },
    ],
    VERSION: [
      {
        config: { uuid: random.uuid(), unix_timestamp: start },
        alreadyDisplayedVersions: [...DISPLAYED_UPDATE_SCREENS],
        updatedDataVersions: [...APPLIED_DATA_VERSIONS],
      },
    ],
    GREEN_BEANS: [],
    ROASTING_MACHINES: [],
    GRAPH: [],
    BARISTAMODE_BREWS: [],
  };
}

/** True when a brew is listed under "Current" (bean, grinder and preparation not archived). */
export function isOpenBrew(
  data: SyntheticDataSet,
  brew: SyntheticBrew,
): boolean {
  const finished = (
    list: { config: EntryConfig; finished: boolean }[],
    uuid: string,
  ) => list.find((e) => e.config.uuid === uuid)?.finished === true;
  return (
    !finished(data.BEANS, brew.bean) &&
    !finished(data.MILL, brew.mill) &&
    !finished(data.PREPARATION, brew.method_of_preparation)
  );
}

// ---------------------------------------------------------------------------------------------
// Random numbers

type Random = ReturnType<typeof createRandom>;

/** mulberry32: small, fast and good enough for test data. */
function createRandom(seed: number) {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
  const hex = (length: number) =>
    Array.from({ length }, () => Math.floor(next() * 16).toString(16)).join('');
  return {
    next,
    chance: (probability: number) => next() < probability,
    int: (min: number, max: number) =>
      min + Math.floor(next() * (max - min + 1)),
    float: (min: number, max: number, decimals: number) =>
      Number((min + next() * (max - min)).toFixed(decimals)),
    pick: <T>(items: readonly T[]): T =>
      items[Math.floor(next() * items.length)],
    weighted: <T>(items: readonly (readonly [T, number])[]): T => {
      const total = items.reduce((sum, [, weight]) => sum + weight, 0);
      let roll = next() * total;
      for (const [item, weight] of items) {
        roll -= weight;
        if (roll < 0) {
          return item;
        }
      }
      return items[items.length - 1][0];
    },
    /** Normal distribution (Box-Muller). */
    normal: (mean: number, deviation: number) =>
      mean +
      deviation *
        Math.sqrt(-2 * Math.log(1 - next())) *
        Math.cos(2 * Math.PI * next()),
    /** RFC 4122 version 4 layout, like `crypto.randomUUID()`. */
    uuid: () =>
      `${hex(8)}-${hex(4)}-4${hex(3)}-${'89ab'[Math.floor(next() * 4)]}${hex(3)}-${hex(12)}`,
  };
}

function at(start: number, end: number, share: number): number {
  return Math.round(start + (end - start) * share);
}

function isoDate(unix: number): string {
  return new Date(unix * 1000).toISOString();
}

// ---------------------------------------------------------------------------------------------
// Equipment

interface Timeline {
  start: number;
  end: number;
  at: (share: number) => number;
}

type BrewStyle = 'espresso' | 'filter';

interface PreparationTemplate {
  name: string;
  type: string;
  style: SyntheticPreparation['style_type'];
  /** Relative share of brews while the preparation is in use. */
  weight: number;
  /** Part of the timeline (0 = first day, 1 = last day) in which it is used. */
  addedAt: number;
  retiredAt: number;
  tools: string[];
}

const PREPARATIONS: PreparationTemplate[] = [
  {
    name: 'Espresso machine',
    type: 'PORTAFILTER',
    style: 'ESPRESSO',
    weight: 52,
    addedAt: 0,
    retiredAt: 1,
    tools: ['18 g basket', '20 g basket', 'Puck screen'],
  },
  {
    name: 'V60',
    type: 'V60',
    style: 'POUR OVER',
    weight: 16,
    addedAt: 0,
    retiredAt: 1,
    tools: ['Paper filter', 'Metal filter'],
  },
  {
    name: 'AeroPress',
    type: 'AEROPRESS',
    style: 'FULL_IMMERSION',
    weight: 10,
    addedAt: 0.1,
    retiredAt: 1,
    tools: [],
  },
  {
    name: 'Chemex',
    type: 'CHEMEX',
    style: 'POUR OVER',
    weight: 7,
    addedAt: 0.3,
    retiredAt: 1,
    tools: [],
  },
  {
    name: 'French press',
    type: 'FRENCH_PRESS',
    style: 'FULL_IMMERSION',
    weight: 5,
    addedAt: 0,
    retiredAt: 1,
    tools: [],
  },
  {
    name: 'Moka pot',
    type: 'BIALETTI',
    style: 'PERCOLATION',
    weight: 5,
    addedAt: 0,
    retiredAt: 0.4,
    tools: [],
  },
  {
    name: 'Kalita Wave',
    type: 'KALITA_WAVE',
    style: 'POUR OVER',
    weight: 5,
    addedAt: 0,
    retiredAt: 0.6,
    tools: [],
  },
];

interface MillTemplate {
  name: string;
  addedAt: number;
  retiredAt: number;
  /** Relative share per brew style while the grinder is in use. */
  espresso: number;
  filter: number;
  hasAdjustableSpeed: boolean;
  hasTimer: boolean;
  /** Grind settings in steps (`step` = 1: clicks). */
  grind: { min: number; max: number; step: number };
}

const MILLS: MillTemplate[] = [
  {
    name: 'Entry burr grinder',
    addedAt: 0,
    retiredAt: 0.25,
    espresso: 1,
    filter: 1,
    hasAdjustableSpeed: false,
    hasTimer: true,
    grind: { min: 4, max: 30, step: 1 },
  },
  {
    name: 'Flat burr grinder',
    addedAt: 0.25,
    retiredAt: 1,
    espresso: 7,
    filter: 0,
    hasAdjustableSpeed: false,
    hasTimer: true,
    grind: { min: 1.5, max: 4, step: 0.1 },
  },
  {
    name: 'Conical hand grinder',
    addedAt: 0,
    retiredAt: 1,
    espresso: 0,
    filter: 7,
    hasAdjustableSpeed: false,
    hasTimer: false,
    grind: { min: 14, max: 32, step: 1 },
  },
  {
    name: 'Single dose grinder',
    addedAt: 0.5,
    retiredAt: 1,
    espresso: 3,
    filter: 3,
    hasAdjustableSpeed: true,
    hasTimer: false,
    grind: { min: 5, max: 60, step: 0.5 },
  },
];

interface WaterTemplate {
  name: string;
  type: string;
  addedAt: number;
  retiredAt: number;
  hardness: number;
  alkalinity: number;
  tds: number;
}

const WATERS: WaterTemplate[] = [
  {
    name: 'Tap water',
    type: 'CUSTOM_WATER',
    addedAt: 0,
    retiredAt: 0.3,
    hardness: 14,
    alkalinity: 9,
    tds: 310,
  },
  {
    name: 'Filtered water',
    type: 'CUSTOM_WATER',
    addedAt: 0.2,
    retiredAt: 1,
    hardness: 6,
    alkalinity: 4,
    tds: 120,
  },
  {
    name: 'Light roast recipe',
    type: 'THIRD_WAVE_WATER_CLASSIC_LIGHT_ROAST_PROFILE',
    addedAt: 0.5,
    retiredAt: 1,
    hardness: 4,
    alkalinity: 2,
    tds: 85,
  },
];

interface Created<Entry, Template> {
  entry: Entry;
  template: Template;
}

function createPreparation(
  template: PreparationTemplate,
  random: Random,
  addedAt: number,
): Created<SyntheticPreparation, PreparationTemplate> {
  return {
    template,
    entry: {
      name: template.name,
      note: '',
      config: { uuid: random.uuid(), unix_timestamp: addedAt },
      style_type: template.style,
      type: template.type,
      finished: template.retiredAt < 1,
      use_custom_parameters: false,
      tools: template.tools.map((name) => ({
        name,
        config: { uuid: random.uuid(), unix_timestamp: addedAt },
        archived: false,
      })),
      attachments: [],
    },
  };
}

function createMill(
  template: MillTemplate,
  random: Random,
  addedAt: number,
): Created<SyntheticMill, MillTemplate> {
  return {
    template,
    entry: {
      name: template.name,
      note: '',
      config: { uuid: random.uuid(), unix_timestamp: addedAt },
      finished: template.retiredAt < 1,
      attachments: [],
      has_adjustable_speed: template.hasAdjustableSpeed,
      has_timer: template.hasTimer,
    },
  };
}

function createWater(
  template: WaterTemplate,
  random: Random,
  addedAt: number,
): Created<SyntheticWater, WaterTemplate> {
  return {
    template,
    entry: {
      name: template.name,
      note: '',
      config: { uuid: random.uuid(), unix_timestamp: addedAt },
      attachments: [],
      finished: template.retiredAt < 1,
      general_hardness: template.hardness,
      total_alkalinity: template.alkalinity,
      calcium: 0,
      magnesium: 0,
      sodium: 0,
      potassium: 0,
      chloride: 0,
      sulfate: 0,
      tds: template.tds,
      general_hardness_type: 'DH',
      total_alkalinity_type: 'DH',
      calcium_type: 'UNKNOWN',
      magnesium_type: 'UNKNOWN',
      sodium_type: 'UNKNOWN',
      potassium_type: 'UNKNOWN',
      chloride_type: 'UNKNOWN',
      sulfate_type: 'UNKNOWN',
      tds_type: 'PPM',
      type: template.type,
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Beans

const ORIGINS: { country: string; regions: string[] }[] = [
  { country: 'Ethiopia', regions: ['Guji', 'Sidamo', 'Yirgacheffe', 'Limu'] },
  { country: 'Kenya', regions: ['Nyeri', 'Kirinyaga', 'Embu'] },
  { country: 'Colombia', regions: ['Huila', 'Narino', 'Cauca', 'Tolima'] },
  { country: 'Brazil', regions: ['Cerrado', 'Mogiana', 'Sul de Minas'] },
  { country: 'Guatemala', regions: ['Antigua', 'Huehuetenango'] },
  { country: 'Costa Rica', regions: ['Tarrazu', 'West Valley'] },
  { country: 'Rwanda', regions: ['Nyamasheke', 'Huye'] },
  { country: 'Peru', regions: ['Cajamarca', 'Cusco'] },
  { country: 'Honduras', regions: ['Santa Barbara', 'Marcala'] },
  { country: 'Indonesia', regions: ['Aceh', 'Flores'] },
];
const VARIETIES = [
  'Bourbon',
  'Caturra',
  'SL28',
  'Typica',
  'Geisha',
  'Castillo',
  'Heirloom',
  'Catuai',
];
const PROCESSING = ['Washed', 'Natural', 'Honey', 'Anaerobic'];
const ROASTERS = [
  'Northside Roastery',
  'Little Hill Coffee',
  'Blue Kettle Roasters',
  'Copper Drum Coffee',
  'Morning Field Roastery',
  'Harbor Light Coffee',
  'Old Mill Roasting Co.',
  'Red Fox Roasters',
  'Quiet Valley Coffee',
  'Paper Moon Roastery',
  'Stone Bridge Coffee',
  'Tall Pine Roasters',
];
const BLEND_NAMES = [
  'House',
  'Morning',
  'Seasonal',
  'Classic',
  'Dark',
  'Crema',
];
const AROMATICS = [
  'Chocolate',
  'Cherry',
  'Caramel',
  'Jasmine',
  'Citrus',
  'Hazelnut',
  'Berries',
  'Peach',
];
const ROASTS: (readonly [string, number])[] = [
  ['UNKNOWN', 30],
  ['CITY_ROAST', 15],
  ['CITY_PLUS_ROAST', 15],
  ['FULL_CITY_ROAST', 15],
  ['HALF_CITY_ROAST', 10],
  ['FULL_CITY_PLUS_ROAST', 8],
  ['ITALIAN_ROAST', 4],
  ['FRENCH_ROAST', 3],
];

interface BeanUsage {
  entry: SyntheticBean;
  /** Time window in which the bean is brewed. */
  from: number;
  until: number;
}

function createBeans(
  count: number,
  random: Random,
  timeline: Timeline,
  options: { archivedBeanShare: number; fileReferences: boolean },
): BeanUsage[] {
  const span = timeline.end - timeline.start;
  const beans: BeanUsage[] = [];
  for (let i = 0; i < count; i++) {
    // Evenly spread purchases with some jitter; the first bean is there from day one.
    const slot = span / count;
    const buy =
      i === 0
        ? timeline.start - DAY
        : Math.round(timeline.start + slot * i + random.next() * slot * 0.8);
    const until = buy + random.int(10, 40) * DAY;
    const isBlend = random.chance(0.25);
    const roastingType = random.weighted<SyntheticBean['bean_roasting_type']>([
      ['ESPRESSO', 45],
      ['FILTER', 40],
      ['OMNI', 15],
    ]);
    const information = isBlend
      ? blendInformation(random)
      : [originInformation(random, 100)];
    const firstOrigin = information[0];
    const uuid = random.uuid();
    beans.push({
      from: buy,
      until,
      entry: {
        name: isBlend
          ? `${random.pick(BLEND_NAMES)} ${roastingType === 'ESPRESSO' ? 'Espresso' : 'Blend'}`
          : `${firstOrigin.country} ${firstOrigin.region}`,
        buyDate: isoDate(buy),
        roastingDate: isoDate(buy - random.int(2, 12) * DAY),
        note: random.chance(0.2) ? random.pick(BEAN_NOTES) : '',
        roaster: random.pick(ROASTERS),
        config: { uuid, unix_timestamp: buy },
        roast: random.weighted(ROASTS),
        roast_range: random.chance(0.6) ? random.int(0, 10) / 2 : 0,
        roast_custom: '',
        beanMix: isBlend ? 'BLEND' : 'SINGLE_ORIGIN',
        aromatics: Array.from({ length: random.int(1, 3) }, () =>
          random.pick(AROMATICS),
        ).join(', '),
        weight: random.weighted([
          [250, 70],
          [500, 15],
          [1000, 15],
        ]),
        finished:
          until < timeline.end - 7 * DAY &&
          random.chance(options.archivedBeanShare),
        cost: random.float(9, 38, 2),
        attachments:
          options.fileReferences && random.chance(0.3)
            ? [`photo_${random.uuid()}.jpg`]
            : [],
        decaffeinated: random.chance(0.03),
        cupping_points: '',
        bean_roasting_type: roastingType,
        bean_information: information,
        url: '',
        ean_article_number: '',
        bean_roast_information: {
          drop_temperature: 0,
          roast_length: 0,
          roaster_machine: '',
          green_bean_weight: 0,
          outside_temperature: 0,
          humidity: 0,
          bean_uuid: '',
          first_crack_minute: 0,
          first_crack_temperature: 0,
          second_crack_minute: 0,
          second_crack_temperature: 0,
        },
        rating: random.chance(0.6) ? random.int(2, 5) : 0,
        qr_code: '',
        internal_share_code: '',
        favourite: random.chance(0.05),
        shared: false,
        cupping: emptyCupping(),
        cupped_flavor: { predefined_flavors: {}, custom_flavors: [] },
        frozenDate: '',
        unfrozenDate: '',
        frozenId: '',
        frozenGroupId: '',
        frozenStorageType: 'UNKNOWN',
        frozenNote: '',
        bestDate: '',
        openDate: isoDate(buy + random.int(0, 3) * DAY),
        co2e_kg: 0,
      },
    });
  }
  return beans;
}

function originInformation(
  random: Random,
  percentage: number,
): SyntheticBeanInformation {
  const origin = random.pick(ORIGINS);
  const elevation = random.int(12, 22) * 100;
  return {
    country: origin.country,
    region: random.pick(origin.regions),
    farm: '',
    farmer: '',
    elevation: `${elevation}-${elevation + 200}`,
    harvest_time: '',
    variety: random.pick(VARIETIES),
    processing: random.pick(PROCESSING),
    certification: '',
    percentage,
    purchasing_price: 0,
    fob_price: 0,
  };
}

function blendInformation(random: Random): SyntheticBeanInformation[] {
  const parts = random.int(2, 3);
  const first = parts === 2 ? random.pick([50, 60, 70]) : random.pick([40, 50]);
  const shares =
    parts === 2 ? [first, 100 - first] : [first, 30, 100 - first - 30];
  return shares.map((share) => originInformation(random, share));
}

function emptyCupping(): Cupping {
  return {
    body: 0,
    brightness: 0,
    clean_cup: 0,
    complexity: 0,
    cuppers_correction: 0,
    dry_fragrance: 0,
    finish: 0,
    flavor: 0,
    sweetness: 0,
    uniformity: 0,
    wet_aroma: 0,
    notes: '',
  };
}

const BEAN_NOTES = [
  'Bought at the market',
  'Gift from a friend',
  'Rest at least a week',
  'Best as espresso',
];

// ---------------------------------------------------------------------------------------------
// Brews

const BREW_NOTES = [
  'Sweet and balanced',
  'A bit sour, grind finer next time',
  'Bitter finish, grind coarser',
  'Syrupy body',
  'Bright acidity',
  'Notes of stone fruit',
  'Ran too fast, channeling visible',
  'Great with milk',
  'Clean cup',
  'Slightly astringent',
  'Tastes like dark chocolate',
  'Juicy and round',
  'Flat, needs more heat',
  'Floral aroma',
  'Long aftertaste',
];
const PRESSURE_PROFILES = [
  'Flat 9 bar',
  'Declining pressure',
  'Long preinfusion',
];

function createBrews(
  count: number,
  random: Random,
  timeline: Timeline,
  equipment: {
    beans: BeanUsage[];
    preparations: Created<SyntheticPreparation, PreparationTemplate>[];
    mills: Created<SyntheticMill, MillTemplate>[];
    waters: Created<SyntheticWater, WaterTemplate>[];
    fileReferences: boolean;
  },
): SyntheticBrew[] {
  const span = timeline.end - timeline.start;
  const times = brewTimes(count, random, timeline);
  const beanStarts = equipment.beans.map((b) => b.from);

  return times.map((time) => {
    const share = (time - timeline.start) / span;
    const inUse = <
      T extends { template: { addedAt: number; retiredAt: number } },
    >(
      list: T[],
    ) =>
      list.filter(
        (e) => e.template.addedAt <= share && share <= e.template.retiredAt,
      );

    const preparation = random.weighted(
      inUse(equipment.preparations).map((p) => [p, p.template.weight] as const),
    );
    const style: BrewStyle =
      preparation.template.style === 'ESPRESSO' ? 'espresso' : 'filter';
    const mill = random.weighted(
      inUse(equipment.mills)
        .map((m) => [m, m.template[style]] as const)
        .filter(([, weight]) => weight > 0),
    );
    const bean = pickBean(equipment.beans, beanStarts, time, style, random);
    const waters = inUse(equipment.waters);
    const water =
      waters.length > 0 && random.chance(0.5) ? random.pick(waters) : undefined;
    const tools = preparation.entry.tools;
    const uuid = random.uuid();
    const values =
      style === 'espresso'
        ? espressoValues(random)
        : filterValues(random, preparation.template.type);

    return {
      grind_size: grindSize(random, mill.template.grind),
      grind_weight: values.grindWeight,
      method_of_preparation: preparation.entry.config.uuid,
      mill: mill.entry.config.uuid,
      mill_speed: mill.template.hasAdjustableSpeed
        ? random.int(6, 14) * 100
        : 0,
      mill_timer: 0,
      pressure_profile:
        style === 'espresso' && random.chance(0.15)
          ? random.pick(PRESSURE_PROFILES)
          : '',
      bean: bean.entry.config.uuid,
      brew_temperature_time: 0,
      brew_temperature: random.chance(0.85) ? values.temperature : 0,
      brew_time: values.brewTime,
      brew_quantity: values.water,
      brew_quantity_type: 'GR',
      note: random.chance(0.35) ? brewNote(random) : '',
      rating: random.weighted([
        [0, 10],
        [1, 2],
        [2, 8],
        [3, 30],
        [4, 34],
        [5, 16],
      ]),
      coffee_type: '',
      coffee_concentration: '',
      coffee_first_drip_time: values.firstDrip,
      coffee_blooming_time: values.blooming,
      attachments:
        equipment.fileReferences && random.chance(0.03)
          ? [`photo_${random.uuid()}.jpg`]
          : [],
      config: { uuid, unix_timestamp: time },
      tds: random.chance(0.15) ? values.tds : 0,
      brew_beverage_quantity: values.beverage,
      brew_beverage_quantity_type: 'GR',
      mill_timer_milliseconds: 0,
      brew_time_milliseconds: random.int(0, 999),
      brew_temperature_time_milliseconds: 0,
      coffee_first_drip_time_milliseconds: 0,
      coffee_blooming_time_milliseconds: 0,
      coordinates: {
        accuracy: null,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        latitude: null,
        longitude: null,
        speed: null,
      },
      cupping: emptyCupping(),
      cupped_flavor: { predefined_flavors: {}, custom_flavors: [] },
      method_of_preparation_tools:
        tools.length > 0 && random.chance(0.7)
          ? [random.pick(tools).config.uuid]
          : [],
      bean_weight_in: 0,
      favourite: random.chance(0.02),
      best_brew: random.chance(0.005),
      water: water ? water.entry.config.uuid : '',
      vessel_name: '',
      vessel_weight: 0,
      flow_profile:
        equipment.fileReferences && style === 'espresso' && random.chance(0.25)
          ? `brews/${uuid}_flow_profile.json`
          : '',
      reference_flow_profile: { type: 'NONE', uuid: '' },
      preparationDeviceBrew: { type: 'NONE' },
      customInformation: { visualizer_id: '' },
    };
  });
}

/**
 * Sorted, unique brew times. Brewing gets more frequent over the years (twice as often at the
 * end as at the start) and clusters in the morning, after lunch and in the late afternoon.
 */
function brewTimes(
  count: number,
  random: Random,
  timeline: Timeline,
): number[] {
  // Hours count from midnight UTC.
  const firstDay = Math.ceil(timeline.start / DAY) * DAY;
  const days = Math.floor((timeline.end - firstDay) / DAY) + 1;
  const growth = 1;
  const times: number[] = [];
  for (let i = 0; i < count; i++) {
    const u = random.next();
    // Inverse of the distribution function of a density rising linearly by `growth`.
    const x = (-1 + Math.sqrt(1 + 2 * growth * u * (1 + growth / 2))) / growth;
    const day = Math.min(days - 1, Math.floor(x * days));
    const hour = random.weighted([
      [random.normal(8, 1.2), 55],
      [random.normal(13.5, 1.5), 30],
      [random.normal(17, 1.5), 15],
    ]);
    const seconds = Math.round(Math.min(23.5, Math.max(5, hour)) * 3600);
    const time = firstDay + day * DAY + seconds;
    // A brew later than the end on the last day moves to the day before.
    times.push(time > timeline.end ? time - DAY : time);
  }
  times.sort((a, b) => a - b);
  // Two brews never share a second, so every list has a well-defined order.
  for (let i = 1; i < times.length; i++) {
    if (times[i] <= times[i - 1]) {
      times[i] = times[i - 1] + 1;
    }
  }
  // The increments above must not push brews past the end of the timeline.
  const shift = times.length > 0 ? timeline.end - times[times.length - 1] : 0;
  return shift < 0 ? times.map((t) => t + shift) : times;
}

function pickBean(
  beans: BeanUsage[],
  beanStarts: number[],
  time: number,
  style: BrewStyle,
  random: Random,
): BeanUsage {
  // Beans bought up to 40 days before the brew may still be in use.
  let low = lowerBound(beanStarts, time - 40 * DAY);
  const high = lowerBound(beanStarts, time + 1);
  const active: BeanUsage[] = [];
  for (; low < high; low++) {
    if (beans[low].until >= time) {
      active.push(beans[low]);
    }
  }
  if (active.length === 0) {
    // Nothing open at that time: use the most recently bought bean.
    return beans[Math.max(0, high - 1)];
  }
  const suitable = active.filter((b) =>
    style === 'espresso'
      ? b.entry.bean_roasting_type !== 'FILTER'
      : b.entry.bean_roasting_type !== 'ESPRESSO',
  );
  return random.pick(suitable.length > 0 ? suitable : active);
}

function lowerBound(sorted: number[], value: number): number {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (sorted[mid] < value) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

function grindSize(
  random: Random,
  grind: { min: number; max: number; step: number },
): string {
  const steps = Math.round((grind.max - grind.min) / grind.step);
  const value = grind.min + random.int(0, steps) * grind.step;
  return grind.step < 1 ? value.toFixed(1) : String(value);
}

function brewNote(random: Random): string {
  const first = random.pick(BREW_NOTES);
  return random.chance(0.3) ? `${first}. ${random.pick(BREW_NOTES)}` : first;
}

interface BrewValues {
  grindWeight: number;
  water: number;
  beverage: number;
  brewTime: number;
  temperature: number;
  firstDrip: number;
  blooming: number;
  tds: number;
}

function espressoValues(random: Random): BrewValues {
  const grindWeight = random.float(17.5, 19.5, 1);
  return {
    grindWeight,
    water: 0,
    beverage: random.float(grindWeight * 1.8, grindWeight * 2.5, 1),
    brewTime: random.int(22, 36),
    temperature: random.int(91, 95),
    firstDrip: random.chance(0.6) ? random.int(4, 10) : 0,
    blooming: 0,
    tds: random.float(7.5, 11, 2),
  };
}

function filterValues(random: Random, type: string): BrewValues {
  const grindWeight =
    type === 'CHEMEX' || type === 'FRENCH_PRESS'
      ? random.float(28, 36, 1)
      : random.float(12, 20, 1);
  const water = Math.round(grindWeight * random.float(14.5, 17, 1));
  return {
    grindWeight,
    water,
    beverage: random.chance(0.5) ? Math.round(water * 0.88) : 0,
    brewTime:
      type === 'FRENCH_PRESS' ? random.int(240, 300) : random.int(120, 260),
    temperature: random.int(88, 100),
    firstDrip: 0,
    blooming:
      type === 'FRENCH_PRESS' || random.chance(0.3) ? 0 : random.int(30, 45),
    tds: random.float(1.15, 1.55, 2),
  };
}
