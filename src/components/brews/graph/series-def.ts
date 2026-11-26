import type { IBrewCustomAxis } from '../../../classes/brew/brewFlow';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import type { IBrewGraphs } from '../../../interfaces/brew/iBrewGraphs';
import type {
  IGraphColors,
  IGraphColorSetting,
} from '../../../interfaces/settings/iGraphColors';

export type SeriesKind = 'live' | 'reference';

export type FixedSeriesId =
  | 'weight'
  | 'weightSecond'
  | 'flowPerSecond'
  | 'realtimeFlow'
  | 'realtimeFlowSecond'
  | 'pressure'
  | 'temperature'
  | 'waterDispensed'
  | 'waterDispensedFlowSecond';

export type CustomSeriesId = `custom:${string}`;
export type SeriesId = FixedSeriesId | CustomSeriesId;

export type FixedAxisId =
  'weight' | 'flow' | 'pressure' | 'temperature' | 'water';
/** A custom series has an axis of its own with the same id. */
export type AxisId = FixedAxisId | CustomSeriesId;

export interface SeriesColour {
  light: string;
  dark: string;
}

/** How one series is drawn; data come from a FlowSeriesBuffer. */
export interface SeriesDef {
  id: SeriesId;
  kind: SeriesKind;
  /** Translated name, "prefix: name" for an imported axis with a prefix. */
  label: string;
  unit: string;
  axisId: AxisId;
  colour: SeriesColour;
  /** Axis range a custom axis starts with (IBrewCustomAxis.yAxisRangeMin/Max). */
  range?: { min?: number; max?: number };
  /** Hidden until the user shows it (IBrewCustomAxis.hiddenDefault). */
  hiddenByDefault?: boolean;
}

export type Translate = (key: string) => string;

interface FixedSeriesSpec {
  id: FixedSeriesId;
  labelKey: string;
  unit: string;
  axisId: FixedAxisId;
  /** Start visibility in the brew form (settings.graph); none = always shown. */
  setting?: keyof IBrewGraphs;
}

/**
 * Names, units and axes as GraphHelperService.fillTraces gives them; the
 * second scale's series take the names of their chips, so they can be told
 * apart from the first scale's.
 */
const FIXED_SERIES: readonly FixedSeriesSpec[] = [
  {
    id: 'weight',
    labelKey: 'BREW_FLOW_WEIGHT',
    unit: 'g',
    axisId: 'weight',
    setting: 'weight',
  },
  {
    id: 'weightSecond',
    labelKey: 'BREW_FLOW_WEIGHT_SECOND',
    unit: 'g',
    axisId: 'weight',
    setting: 'weightSecond',
  },
  {
    id: 'flowPerSecond',
    labelKey: 'BREW_FLOW_WEIGHT_PER_SECOND',
    unit: 'g/s',
    axisId: 'flow',
    setting: 'calc_flow',
  },
  {
    id: 'realtimeFlow',
    labelKey: 'BREW_FLOW_WEIGHT_REALTIME',
    unit: 'g/s',
    axisId: 'flow',
    setting: 'realtime_flow',
  },
  {
    id: 'realtimeFlowSecond',
    labelKey: 'BREW_FLOW_WEIGHT_REALTIME_SECOND',
    unit: 'g/s',
    axisId: 'flow',
    setting: 'realtime_flowSecond',
  },
  {
    id: 'pressure',
    labelKey: 'BREW_PRESSURE_FLOW',
    unit: 'bar',
    axisId: 'pressure',
    setting: 'pressure',
  },
  {
    id: 'temperature',
    labelKey: 'BREW_TEMPERATURE_REALTIME',
    unit: '°C',
    axisId: 'temperature',
    setting: 'temperature',
  },
  {
    id: 'waterDispensed',
    labelKey: 'BREW_FLOW_WATER_DISPENSED_VOLUME',
    unit: 'ml',
    axisId: 'water',
  },
  {
    id: 'waterDispensedFlowSecond',
    labelKey: 'BREW_FLOW_WATER_DISPENSED_REALTIME',
    unit: 'ml/s',
    axisId: 'flow',
  },
];

export const FIXED_SERIES_IDS: readonly FixedSeriesId[] = FIXED_SERIES.map(
  (spec) => spec.id,
);

export function isCustomId(id: string): id is CustomSeriesId {
  return id.startsWith('custom:');
}

export function customSeriesId(key: string): CustomSeriesId {
  return `custom:${key}`;
}

function spec(id: FixedSeriesId): FixedSeriesSpec {
  return FIXED_SERIES.find((candidate) => candidate.id === id);
}

function colourOf(setting: IGraphColorSetting, kind: SeriesKind): SeriesColour {
  const pair = kind === 'live' ? setting.active : setting.reference;
  return { light: pair.light, dark: pair.dark };
}

/** The colour of a series in the given theme. */
export function seriesColour(def: SeriesDef, dark: boolean): string {
  return dark ? def.colour.dark : def.colour.light;
}

export function fixedSeriesDef(
  id: FixedSeriesId,
  kind: SeriesKind,
  colors: IGraphColors,
  translate: Translate,
): SeriesDef {
  const { labelKey, unit, axisId } = spec(id);
  return {
    id,
    kind,
    label: translate(labelKey),
    unit,
    axisId,
    colour: colourOf(colors[id], kind),
  };
}

/**
 * The axis of a metric without customAxes entry. The colours come from the
 * settings, so a reference stays apart from the live series.
 */
export function fallbackCustomAxis(
  key: string,
  kind: SeriesKind,
  colors: IGraphColors,
): IBrewCustomAxis {
  const water = key === 'waterDispensed';
  const colour = colourOf(
    water ? colors.waterDispensed : colors.customTrace,
    kind,
  );
  return {
    key,
    name: water ? 'BREW_FLOW_WATER_DISPENSED_VOLUME' : key,
    unit: water ? 'ml' : '',
    colorLight: colour.light,
    colorDark: colour.dark,
  };
}

/**
 * The name of an imported axis: the prefix is an i18n key and follows the UI
 * language; next to a prefix the name is the sender's and stays verbatim.
 */
export function customAxisName(
  axis: IBrewCustomAxis,
  translate: Translate,
): string {
  return axis.namePrefix
    ? `${translate(axis.namePrefix)}: ${axis.name}`
    : translate(axis.name);
}

/**
 * A custom series keeps the colours of its axis when live. A reference takes
 * the reference colour of the settings, or it could not be told apart from
 * the live series on the same axis.
 */
export function customSeriesDef(
  axis: IBrewCustomAxis,
  kind: SeriesKind,
  colors: IGraphColors,
  translate: Translate,
): SeriesDef {
  const id = customSeriesId(axis.key);
  const def: SeriesDef = {
    id,
    kind,
    label: customAxisName(axis, translate),
    unit: axis.unit ?? '',
    axisId: id,
    colour:
      kind === 'live'
        ? { light: axis.colorLight, dark: axis.colorDark }
        : colourOf(colors.customTrace, 'reference'),
  };
  const min = Number.isFinite(axis.yAxisRangeMin)
    ? axis.yAxisRangeMin
    : undefined;
  const max = Number.isFinite(axis.yAxisRangeMax)
    ? axis.yAxisRangeMax
    : undefined;
  if (min !== undefined || max !== undefined) {
    def.range = { min, max };
  }
  if (axis.hiddenDefault) {
    def.hiddenByDefault = true;
  }
  return def;
}

/** What a SeriesDef needs to know about the series of a buffer. */
export interface SeriesSource {
  seriesIds(): readonly SeriesId[];
  customAxis(id: CustomSeriesId): IBrewCustomAxis | undefined;
}

/**
 * Definitions of every series in `source`, fixed ones in the order of the
 * brew graph, then the custom ones in the order of the file.
 */
export function seriesDefsFor(
  source: SeriesSource,
  kind: SeriesKind,
  colors: IGraphColors,
  translate: Translate,
): SeriesDef[] {
  const ids = source.seriesIds();
  const fixed = FIXED_SERIES_IDS.filter((id) => ids.includes(id)).map((id) =>
    fixedSeriesDef(id, kind, colors, translate),
  );
  const custom = ids.filter(isCustomId).map((id) => {
    const fallback = fallbackCustomAxis(
      id.slice('custom:'.length),
      kind,
      colors,
    );
    const stored = source.customAxis(id);
    // An imported file may leave out fields or hold other types in them.
    const text = (value: unknown, otherwise: string, empty = true): string =>
      typeof value === 'string' && (empty || value !== '') ? value : otherwise;
    const axis: IBrewCustomAxis = stored
      ? {
          ...stored,
          key: fallback.key,
          name: text(stored.name, fallback.name, false),
          namePrefix: text(stored.namePrefix, '') || undefined,
          unit: text(stored.unit, fallback.unit),
          colorLight: text(stored.colorLight, fallback.colorLight, false),
          colorDark: text(stored.colorDark, fallback.colorDark, false),
        }
      : fallback;
    return customSeriesDef(axis, kind, colors, translate);
  });
  return [...fixed, ...custom];
}

/** settings.graph of a preparation style: espresso has its own, all others share FILTER. */
export function graphSettingsFor(
  graph: { ESPRESSO: IBrewGraphs; FILTER: IBrewGraphs },
  style: PREPARATION_STYLE_TYPE | undefined,
): IBrewGraphs {
  return style === PREPARATION_STYLE_TYPE.ESPRESSO
    ? graph.ESPRESSO
    : graph.FILTER;
}

/**
 * Whether a series starts visible. The brew form follows settings.graph of
 * the preparation style; without it (detail, cards) every series is shown.
 * An imported axis may ask to start hidden either way.
 */
export function initiallyVisible(
  def: SeriesDef,
  graphSettings: IBrewGraphs | null,
): boolean {
  if (def.hiddenByDefault) {
    return false;
  }
  if (!graphSettings || isCustomId(def.id)) {
    return true;
  }
  const setting = spec(def.id).setting;
  return setting ? graphSettings[setting] !== false : true;
}
