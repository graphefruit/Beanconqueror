import type uPlot from 'uplot';

import type { ChartAnnotation, ChartMode } from '../brew-chart-port';
import type { AxisId, SeriesDef, SeriesId, SeriesKind } from '../series-def';

/** Overlay state the renderer hands to its plugins before a redraw. */
export interface UplotOverlayState {
  /** Time cursor in seconds, or none. */
  cursor: number | null;
  /** Cut range [from, to] in seconds, or none. */
  cut: readonly [number, number] | null;
  annotations: readonly ChartAnnotation[];
  dark: boolean;
  mode: ChartMode;
  /** uPlot scale key of an axis, undefined when no series uses it. */
  scaleOf(axisId: AxisId): string | undefined;
  /** uPlot series index of a series, undefined when it is not drawn. */
  seriesIndexOf(seriesId: SeriesId, kind?: SeriesKind): number | undefined;
  /** Definition of the uPlot series at `index`. */
  defAt(index: number): SeriesDef | undefined;
  /** Last live sample of a series, or null. */
  lastSample(seriesId: SeriesId): { t: number; y: number } | null;
}

/**
 * Overlay plugin of the uPlot renderer (cursor, cut markers, annotations).
 *
 * `hooks()` is called for every uPlot instance the renderer builds (a new
 * axis rebuilds it, so does an image export), so it must not keep state that
 * belongs to one instance. `apply()` gets the current overlay state in the
 * frame before a redraw; the plugin draws in its hooks onto `u.ctx`, in
 * canvas pixels, so an exported image includes it.
 */
export interface UplotOverlayPlugin {
  hooks(): uPlot.Plugin;
  apply(state: UplotOverlayState): void;
}

/** Facet [x, y] of series `index` of a mode 2 chart, or null. */
export function facetOf(
  u: uPlot,
  index: number,
): readonly [ArrayLike<number>, ArrayLike<number>] | null {
  const facet = u.data[index] as unknown as
    [ArrayLike<number>, ArrayLike<number>] | null | undefined;
  return facet ?? null;
}

/** Scale key of a mode 2 series. */
export function scaleOfSeries(series: uPlot.Series): string | undefined {
  return series.facets?.[1]?.scale ?? series.scale;
}

/** Canvas pixels per CSS pixel of a chart. */
export function pixelRatio(u: uPlot): number {
  return u.width > 0 ? u.ctx.canvas.width / u.width : 1;
}
