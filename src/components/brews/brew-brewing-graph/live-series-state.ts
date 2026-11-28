import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import type { IBrewGraphs } from '../../../interfaces/brew/iBrewGraphs';
import type { ISettings } from '../../../interfaces/settings/iSettings';
import type { Viewport } from '../graph/brew-chart-port';
import {
  customSeriesId,
  initiallyVisible,
  isCustomId,
  seriesColour,
  type FixedSeriesId,
  type SeriesDef,
  type SeriesId,
} from '../graph/series-def';

/** What a chip of the live graph shows for one series. */
export interface LiveSeriesChip {
  readonly visible: boolean;
  readonly color: string | undefined;
  readonly name: string | undefined;
}

/** Toggle key of each fixed series (as `toggleChartLines` takes it) and its series. */
export const LIVE_SERIES_IDS = {
  weight: 'weight',
  calc_flow: 'flowPerSecond',
  realtime_flow: 'realtimeFlow',
  pressure: 'pressure',
  temperature: 'temperature',
  weightSecond: 'weightSecond',
  realtimeFlowSecond: 'realtimeFlowSecond',
  waterDispensed: 'waterDispensed',
  waterDispensedFlowSecond: 'waterDispensedFlowSecond',
} as const satisfies Record<string, FixedSeriesId>;

type ToggleKey = keyof typeof LIVE_SERIES_IDS;

/**
 * Chip state per fixed series, keyed like `toggleChartLines`. Custom metrics
 * sit apart, because an imported metric may share a fixed series' key.
 */
export type LiveSeriesState = Readonly<
  Partial<Record<ToggleKey, LiveSeriesChip>>
> & { readonly custom: Readonly<Record<string, LiveSeriesChip>> };

/** The series a chip toggles: a fixed one by its key, else the custom metric of that key. */
export function liveSeriesId(toggleKey: string): SeriesId {
  return Object.prototype.hasOwnProperty.call(LIVE_SERIES_IDS, toggleKey)
    ? LIVE_SERIES_IDS[toggleKey as ToggleKey]
    : customSeriesId(toggleKey);
}

/** Chips of the live series in the colours of the theme; series without a definition have none. */
export function liveSeriesState(
  defs: readonly SeriesDef[],
  hidden: ReadonlySet<SeriesId>,
  dark: boolean,
): LiveSeriesState {
  const state: Partial<Record<ToggleKey, LiveSeriesChip>> = {};
  const custom: Record<string, LiveSeriesChip> = {};
  const toggleKeys = new Map<SeriesId, ToggleKey>(
    Object.entries(LIVE_SERIES_IDS).map(([key, id]) => [id, key as ToggleKey]),
  );
  for (const def of defs) {
    if (def.kind !== 'live') {
      continue;
    }
    const chip: LiveSeriesChip = {
      visible: !hidden.has(def.id),
      color: seriesColour(def, dark),
      name: def.label,
    };
    if (isCustomId(def.id)) {
      custom[def.id.slice('custom:'.length)] = chip;
    } else {
      state[toggleKeys.get(def.id)] = chip;
    }
  }
  return { ...state, custom };
}

/** Series the brew form starts with hidden, per settings.graph of its preparation style. */
export function initiallyHidden(
  defs: readonly SeriesDef[],
  graphSettings: IBrewGraphs,
): Set<SeriesId> {
  return new Set(
    defs
      .filter((def) => !initiallyVisible(def, graphSettings))
      .map((def) => def.id),
  );
}

/** The devices the brew form has connected, as its chips ask for them. */
export interface ConnectedDevices {
  scale: boolean;
  scaleTwoWeights: boolean;
  pressure: boolean;
  temperature: boolean;
  /** Type of the connected machine, undefined without one. */
  machine: PreparationDeviceType | undefined;
  style: PREPARATION_STYLE_TYPE | undefined;
}

/**
 * The live series the connected devices deliver, by the rules of the chips,
 * so the graph shows their axes before the first sample.
 */
export function awaitedLiveSeries(devices: ConnectedDevices): Set<SeriesId> {
  const { machine } = devices;
  const ids: SeriesId[] = [];
  if (devices.scale || machine === PreparationDeviceType.METICULOUS) {
    ids.push('weight', 'flowPerSecond', 'realtimeFlow');
  }
  if (
    (devices.pressure && devices.style === PREPARATION_STYLE_TYPE.ESPRESSO) ||
    machine !== undefined
  ) {
    ids.push('pressure');
  }
  if (
    devices.temperature ||
    (machine !== undefined && machine !== PreparationDeviceType.METICULOUS)
  ) {
    ids.push('temperature');
  }
  if (
    machine === PreparationDeviceType.SANREMO_YOU ||
    machine === PreparationDeviceType.GAGGIMATE
  ) {
    ids.push('waterDispensed');
  }
  if (machine === PreparationDeviceType.SANREMO_YOU) {
    ids.push('waterDispensedFlowSecond');
  }
  if (devices.scaleTwoWeights) {
    ids.push('weightSecond', 'realtimeFlowSecond');
  }
  return new Set(ids);
}

/** Which kinds of sensor the brew form shows a reference line for. */
export interface ReferenceSensors {
  pressure: boolean;
  temperature: boolean;
}

/**
 * The reference series drawn under the live graph, as the brew form had them:
 * weight, flow and water always, pressure and temperature only with such a
 * sensor, a custom metric only next to a live one of the same key, and the
 * second scale never.
 */
export function shownReferenceDefs(
  references: readonly SeriesDef[],
  live: readonly SeriesDef[],
  sensors: ReferenceSensors,
): SeriesDef[] {
  const liveIds = new Set(live.map((def) => def.id));
  return references.filter((def) => {
    if (isCustomId(def.id)) {
      return liveIds.has(def.id);
    }
    switch (def.id) {
      case 'pressure':
        return sensors.pressure;
      case 'temperature':
        return sensors.temperature;
      case 'weightSecond':
      case 'realtimeFlowSecond':
        return false;
      default:
        return true;
    }
  });
}

/** What decides the visible time range of the live graph. */
export interface LiveViewportInput {
  graphTime: ISettings['graph_time'];
  style: PREPARATION_STYLE_TYPE | undefined;
  maximized: boolean;
  timerRunning: boolean;
  hasSamples: boolean;
}

/**
 * While the timer runs, or before anything was recorded, the window starts
 * with graph_time (normal or maximized) and grows with the brew. A stopped
 * brew with samples, e.g. one being edited or imported, is shown whole.
 */
export function liveViewport(input: LiveViewportInput): Viewport {
  if (!input.timerRunning && input.hasSamples) {
    return { mode: 'fitAll' };
  }
  const times =
    input.style === PREPARATION_STYLE_TYPE.ESPRESSO
      ? input.graphTime.ESPRESSO
      : input.graphTime.FILTER;
  return {
    mode: 'grow',
    startSec: input.maximized ? times.FULL_SCREEN : times.NORMAL_SCREEN,
  };
}
