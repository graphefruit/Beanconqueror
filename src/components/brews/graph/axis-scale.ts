import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import type { AxisId, SeriesDef } from './series-def';

export type Range = readonly [number, number];

/** Lowest and highest finite value of the data on an axis, or null without any. */
export interface Extent {
  min: number;
  max: number;
}

interface Bounds {
  lower: number;
  upper: number;
}

/** The settings the start ranges are read from (Settings.graph_*). */
export interface AxisSettings {
  graph_weight: { ESPRESSO: Bounds; FILTER: Bounds };
  graph_flow: { ESPRESSO: Bounds; FILTER: Bounds };
  graph_pressure: Bounds;
}

const TEMPERATURE_RANGE: Range = [0, 100];
const WATER_FALLBACK = 100;
const CUSTOM_FALLBACK: Range = [0, 20];

/** Extent of a list of values, ignoring everything that is not a finite number. */
export function extentOf(values: Iterable<number>): Extent | null {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (Number.isFinite(v)) {
      if (v < min) {
        min = v;
      }
      if (v > max) {
        max = v;
      }
    }
  }
  return min <= max ? { min, max } : null;
}

export function mergeExtents(
  a: Extent | null,
  b: Extent | null,
): Extent | null {
  if (!a || !b) {
    return a ?? b;
  }
  return { min: Math.min(a.min, b.min), max: Math.max(a.max, b.max) };
}

/**
 * Upper bound of an axis that counts up from zero: the fallback while the
 * data fit, otherwise the data plus 5 %, so a bigger brew is not clipped.
 */
export function fittedUpperBound(
  extent: Extent | null,
  fallback: number,
): number {
  if (!extent || extent.max <= fallback) {
    return fallback;
  }
  return Math.ceil(extent.max * 1.05);
}

/**
 * Range of a custom axis: the fixed range while the data fit, otherwise both
 * ends of the data with 10 % room, so a series between 88 and 93 keeps its
 * steps instead of becoming a line on an axis from zero.
 */
export function fittedCustomRange(
  extent: Extent | null,
  fallback: Range,
): Range {
  if (!extent) {
    return fallback;
  }
  const { min, max } = extent;
  if (min >= fallback[0] && max <= fallback[1]) {
    return fallback;
  }
  if (min === max) {
    return [min - 1, max + 1];
  }
  const padding = (max - min) * 0.1;
  return [min - padding, max + padding];
}

/** A range with lower < upper; an empty one gets a band of 1 either side. */
export function visibleRange(range: Range): Range {
  if (range[0] < range[1]) {
    return range;
  }
  if (range[0] === range[1]) {
    return [range[0] - 1, range[1] + 1];
  }
  return [range[1], range[0]];
}

function customFallback(def: SeriesDef | undefined): Range {
  return [
    def?.range?.min ?? CUSTOM_FALLBACK[0],
    def?.range?.max ?? CUSTOM_FALLBACK[1],
  ];
}

function isEspresso(style: PREPARATION_STYLE_TYPE | undefined): boolean {
  return style === PREPARATION_STYLE_TYPE.ESPRESSO;
}

/**
 * Range an axis of the brew form starts with: weight, flow and pressure from
 * the settings, temperature 0–100 °C, water and custom axes fitted to the
 * data already there (a loaded brew or a reference). Live custom axes start
 * at zero unless all their values are negative.
 */
export function initialLiveRange(
  axisId: AxisId,
  settings: AxisSettings,
  style: PREPARATION_STYLE_TYPE | undefined,
  extent: Extent | null,
  def?: SeriesDef,
): Range {
  const key = isEspresso(style) ? 'ESPRESSO' : 'FILTER';
  switch (axisId) {
    case 'weight':
      return [
        settings.graph_weight[key].lower,
        settings.graph_weight[key].upper,
      ];
    case 'flow':
      return [settings.graph_flow[key].lower, settings.graph_flow[key].upper];
    case 'pressure':
      return [settings.graph_pressure.lower, settings.graph_pressure.upper];
    case 'temperature':
      return TEMPERATURE_RANGE;
    case 'water':
      return [0, fittedUpperBound(extent, WATER_FALLBACK)];
  }
  const fitted = fittedCustomRange(extent, customFallback(def));
  return visibleRange(extent && extent.max < 0 ? fitted : [0, fitted[1]]);
}

/**
 * Range of an axis of a saved brew (detail, cards, export): fitted to all of
 * its data. Weight and flow keep zero in view with 5 % room above, pressure
 * starts at the setting and ends one bar above the peak.
 */
export function fittedRange(
  axisId: AxisId,
  settings: AxisSettings,
  extent: Extent | null,
  def?: SeriesDef,
): Range {
  switch (axisId) {
    case 'weight':
    case 'flow': {
      if (!extent) {
        return [0, 1];
      }
      const lower = Math.min(0, extent.min);
      return visibleRange([lower, extent.max + (extent.max - lower) * 0.05]);
    }
    case 'pressure': {
      const { lower, upper } = settings.graph_pressure;
      return visibleRange([lower, extent ? Math.ceil(extent.max + 1) : upper]);
    }
    case 'temperature':
      return TEMPERATURE_RANGE;
    case 'water':
      return [0, fittedUpperBound(extent, WATER_FALLBACK)];
  }
  return visibleRange(fittedCustomRange(extent, customFallback(def)));
}

/**
 * How a live axis grows. `factor`: once a value comes within `tolerance` of
 * the upper bound, the bound moves to value × factor. `ceil`: a value above
 * the bound moves it to the next whole number above value + 1 (pressure).
 * null: the axis keeps its range (temperature).
 */
export type GrowthRule =
  | { kind: 'factor'; factor: number; tolerance: number }
  | { kind: 'ceil' }
  | null;

/** Growth of the live axes as the brew graph does it today. */
export function growthRule(
  axisId: AxisId,
  style: PREPARATION_STYLE_TYPE | undefined,
): GrowthRule {
  const espresso = isEspresso(style);
  const factor = espresso ? 1.25 : 1.5;
  switch (axisId) {
    case 'weight':
      return { kind: 'factor', factor, tolerance: espresso ? 1 : 10 };
    case 'flow':
      return { kind: 'factor', factor, tolerance: espresso ? 0.5 : 3 };
    case 'pressure':
      return { kind: 'ceil' };
    case 'temperature':
      return null;
    case 'water':
      return { kind: 'factor', factor: 1.25, tolerance: 1 };
  }
  return { kind: 'factor', factor, tolerance: 1 };
}

function growUp(
  range: Range,
  value: number,
  factor: number,
  tolerance: number,
): Range {
  const [lower, upper] = range;
  const headroom = Math.abs(value) * (factor - 1);
  if (upper < 0) {
    // A negative range grows away from zero at the bottom and towards zero at
    // the top; a value back above zero needs a bound above it.
    let next: [number, number] = [lower, upper];
    if (value <= lower + tolerance) {
      next = [value - headroom, next[1]];
    }
    if (value >= upper - tolerance) {
      next = [
        next[0],
        value >= 0 ? value + headroom : Math.min(0, value + headroom),
      ];
    }
    return next[0] === lower && next[1] === upper ? range : next;
  }
  if (value >= upper - tolerance) {
    // The bound has to end up above the value, which a bare multiplication
    // does not guarantee near zero.
    const nextUpper = Math.max(upper, value + headroom);
    return nextUpper === upper ? range : [lower, nextUpper];
  }
  return range;
}

/**
 * Grows a live axis range so that the new values `extent` stay inside; it
 * never shrinks. Returns `range` itself when nothing changes.
 */
export function growScale(
  range: Range,
  extent: Extent | null,
  rule: GrowthRule,
): Range {
  if (!extent || !rule) {
    return range;
  }
  if (rule.kind === 'ceil') {
    return extent.max > range[1]
      ? [range[0], Math.ceil(extent.max + 1)]
      : range;
  }
  // The lowest value first: it can only move the bottom of a negative range,
  // which the highest value may then lift above zero.
  const grown =
    extent.min === extent.max
      ? range
      : growUp(range, extent.min, rule.factor, rule.tolerance);
  return growUp(grown, extent.max, rule.factor, rule.tolerance);
}
