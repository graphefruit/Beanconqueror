import type { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import type { AxisSettings } from './axis-scale';
import type { FlowSeriesBuffer } from './flow-series-buffer';
import type { AxisId, SeriesDef, SeriesId } from './series-def';

/**
 * static: a card, nothing to touch. detail: a saved brew with cursor.
 * live: the brew form; axes start at the settings and only grow.
 */
export type ChartMode = 'live' | 'detail' | 'static';

export interface MountOptions {
  width: number;
  height: number;
  dark: boolean;
  mode: ChartMode;
  /** Start ranges of the axes (Settings.graph_weight, graph_flow, graph_pressure). */
  axisSettings: AxisSettings;
  /** Picks the espresso or filter ranges and growth. */
  style?: PREPARATION_STYLE_TYPE;
}

/** The visible time range. */
export type Viewport =
  /** The last `windowSec` seconds; the newest sample stays at 90 %. */
  | { mode: 'follow'; windowSec: number }
  /**
   * The live brew form's window: it jumps once per `windowSec` and then shows
   * the last `backSec` seconds before the jump and 10 s beyond the next one.
   */
  | { mode: 'stepped'; windowSec: number; backSec: number }
  /** The whole brew. */
  | { mode: 'fitAll' }
  | { mode: 'range'; from: number; to: number };

export interface ChartAnnotation {
  kind: 'vline' | 'hline' | 'pointLabel';
  /** Seconds since brew start (vline, pointLabel). A pointLabel without t follows the last sample of its series. */
  t?: number;
  /** Value on `axisId` (hline, pointLabel). A pointLabel without y shows the series value at t. */
  y?: number;
  axisId?: AxisId;
  seriesId?: SeriesId;
  label: string;
  colour: string;
}

export interface ExportImageOptions {
  /** CSS pixels of the picture; the bitmap is `scale` times larger. */
  width: number;
  height: number;
  /** Line colours of the light or dark theme, independent of the app's. */
  theme: 'light' | 'dark';
  /** Colour of the axis text and ticks, e.g. to read on the ground it is laid on. */
  ink?: string;
  /** Leaves the ground clear instead of the theme's graph background. */
  transparent: boolean;
  scale: number;
}

/**
 * A brew graph renderer.
 *
 * Setters only record state. A renderer draws at most once per animation
 * frame, and only when its state changed or, in live mode, the attached
 * buffers' `version`. Outside live mode the buffers are read after a setter,
 * so a host that reloads a buffer attaches it again. Appending to a buffer
 * never draws synchronously. Several renderers may attach the same buffer.
 */
export interface BrewChartPort {
  /** Resolves once the library is loaded and the chart is in `el`. */
  mount(el: HTMLElement, opts: MountOptions): Promise<void>;
  /** Series to draw, live and reference; references are drawn underneath. */
  setSeries(defs: readonly SeriesDef[]): void;
  /** Buffer of the series of kind 'live'. */
  attach(buffer: FlowSeriesBuffer): void;
  /** Buffer of the series of kind 'reference', or none. */
  setReferences(buffer: FlowSeriesBuffer | null): void;
  setViewport(viewport: Viewport): void;
  /** Shows or hides a series, live and reference alike. */
  setVisible(seriesId: SeriesId, visible: boolean): void;
  /** Follows the app theme (ThemeService.dark). */
  setDark(dark: boolean): void;
  /** Time cursor in seconds, or none. */
  setCursor(tSec: number | null): void;
  /** Cut range [from, to] in seconds, or none. */
  setCutMarkers(range: readonly [number, number] | null): void;
  setAnnotations(list: readonly ChartAnnotation[]): void;
  /** CSS pixels, e.g. from a ResizeObserver; several calls in a frame draw once. */
  resize(width: number, height: number): void;
  /** The graph as a PNG data URL, drawn off screen. */
  exportImage(options: ExportImageOptions): Promise<string>;
  destroy(): void;
}
