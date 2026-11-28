/**
 * uPlot implementation of BrewChartPort.
 *
 * The series come at different rates (weight and flow 10 Hz, pressure 14 Hz,
 * temperature 2 Hz, imported metrics at their own), and a reference brew has
 * its own times. uPlot's mode 2 gives every series its own x: the data are
 * zero-copy Float64Array subarrays of the FlowSeriesBuffer, cut per frame to
 * the visible window by binary search. Appending costs the buffer's O(1);
 * a frame costs the visible samples. A gap (NaN) is bridged, not broken.
 *
 * Pixel ratio: uPlot reads devicePixelRatio once into a module-level value.
 * loadUplot() caps it at 2 while the module evaluates, which bounds the
 * canvas memory of the live graph (and of every other uPlot chart); an
 * exported image is drawn at its own scale.
 */
import type uPlot from 'uplot';

import { readableLine } from '../../../services/graphHelper/line-contrast';
import {
  extentOf,
  fittedRange,
  growScale,
  growthRule,
  initialLiveRange,
  mergeExtents,
  type Extent,
  type Range,
} from './axis-scale';
import type {
  BrewChartPort,
  ChartAnnotation,
  ExportImageOptions,
  MountOptions,
  Viewport,
} from './brew-chart-port';
import { lowerBound, type FlowSeriesBuffer } from './flow-series-buffer';
import { groundOf, insetAxesPlugin, insetSide } from './inset-axes';
import type {
  UplotOverlayPlugin,
  UplotOverlayState,
} from './overlays/uplot-plugin';
import {
  seriesColour,
  type AxisId,
  type SeriesDef,
  type SeriesId,
  type SeriesKind,
} from './series-def';

type UPlotCtor = typeof uPlot;
type Facet = [Float64Array, Float64Array];

export interface UplotRendererOptions {
  /** Injected for tests; defaults to window.requestAnimationFrame. */
  requestFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (handle: number) => void;
}

export const MAX_PIXEL_RATIO = 2;
const FONT = '-apple-system, Roboto, sans-serif';

/**
 * Axis text and grid of the two themes; the ground is the card colour of the
 * app ($card in bq-tokens.scss), which the default line colours are tested on.
 */
export const CHART_PALETTE = {
  light: { text: '#444444', grid: 'rgba(0,0,0,0.1)', background: '#ffffff' },
  dark: { text: '#e0e0e0', grid: '#8e8e8e', background: '#2a211a' },
} as const;

/** WCAG contrast of the axis values on their ground. */
const VALUE_CONTRAST = 4.5;

/** Subset of uPlot.min.css the renderer needs (no legend, no title). */
const UPLOT_CSS =
  '.uplot,.uplot *{box-sizing:border-box}.uplot{width:min-content;line-height:1.5}' +
  '.u-wrap{position:relative;user-select:none}.u-over,.u-under{position:absolute}' +
  '.u-under{overflow:hidden}.uplot canvas{display:block;position:relative;width:100%;height:100%}' +
  '.u-axis{position:absolute}.u-axis.u-off{display:none}';
const CSS_ID = 'bq-uplot-css';

let uplotModule: Promise<UPlotCtor> | undefined;

/** Loads uPlot once, with devicePixelRatio capped while its module evaluates. */
export function loadUplot(): Promise<UPlotCtor> {
  uplotModule ??= importCapped().catch((error: unknown) => {
    // A failed chunk load may succeed on the next try.
    uplotModule = undefined;
    throw error;
  });
  return uplotModule;
}

async function importCapped(): Promise<UPlotCtor> {
  const own = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
  let capped = false;
  if (window.devicePixelRatio > MAX_PIXEL_RATIO) {
    try {
      Object.defineProperty(window, 'devicePixelRatio', {
        configurable: true,
        get: () => MAX_PIXEL_RATIO,
      });
      capped = true;
    } catch {
      // Not configurable here: draw at the full ratio.
    }
  }
  try {
    return (await import('uplot')).default;
  } finally {
    if (capped) {
      if (own) {
        Object.defineProperty(window, 'devicePixelRatio', own);
      } else {
        delete (window as { devicePixelRatio?: number }).devicePixelRatio;
      }
    }
  }
}

function injectCss(): void {
  if (document.getElementById(CSS_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = UPLOT_CSS;
  document.head.appendChild(style);
}

/** m:ss as the brew graph labels its time axis. */
export function formatSeconds(sec: number): string {
  const whole = Math.max(0, Math.round(sec));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Visible time range. `end` is the last live sample (in live mode) or the
 * last sample of live and reference (otherwise).
 */
export function viewportRange(viewport: Viewport, end: number): Range {
  switch (viewport.mode) {
    case 'range':
      return [viewport.from, Math.max(viewport.to, viewport.from + 0.001)];
    case 'fitAll':
      return [0, Math.max(end, 1)];
    case 'grow':
      return liveTimeRange(end, viewport.startSec);
  }
}

/** The live line stops at 1 / LIVE_HEADROOM of the width; beyond, the time axis compresses. */
const LIVE_HEADROOM = 1.25;

/**
 * The window of the live brew graph: it starts with `startSec` and, once the
 * brew comes near the right edge, grows with it from 0, so the start never
 * scrolls away and the newest sample stays at 80 % of the width.
 */
export function liveTimeRange(end: number, startSec: number): Range {
  const start = startSec > 0 ? startSec : 20;
  return [0, Math.max(start, end > 0 ? end * LIVE_HEADROOM : 0)];
}

/** Steps of the time axis, so it counts in whole m:ss steps (no 0:25 or 0:50). */
const TIME_INCRS = [
  1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 21600,
];

/**
 * Whether an axis shows its values: the live graph keeps temperature and
 * water bare, so few columns stand in its small plot.
 */
export function axisShown(axisId: AxisId, bare: boolean): boolean {
  return !(bare && (axisId === 'temperature' || axisId === 'water'));
}

interface Layout {
  /** Drawn series; uPlot series index = position + 1. References first, so they lie underneath. */
  drawn: SeriesDef[];
  axes: AxisId[];
}

/** References first, then the live series; axes in order of first use by a live series. */
export function layoutSeries(defs: readonly SeriesDef[]): Layout {
  const drawn = [
    ...defs.filter((d) => d.kind === 'reference'),
    ...defs.filter((d) => d.kind === 'live'),
  ];
  const axes = [
    ...new Set([
      ...defs.filter((d) => d.kind === 'live').map((d) => d.axisId),
      ...drawn.map((d) => d.axisId),
    ]),
  ];
  return { drawn, axes };
}

interface Look {
  dark: boolean;
  /** Axis text colour instead of the series colour. */
  ink?: string;
  /** Size factor for fonts and lines, for an export at another scale. */
  k: number;
  /** Ground the axis values stand on; null on a picture without ground. */
  ground: string | null;
}

export class UplotRenderer implements BrewChartPort {
  private readonly requestFrame: (callback: FrameRequestCallback) => number;
  private readonly cancelFrame: (handle: number) => void;

  private lib: UPlotCtor | null = null;
  private el: HTMLElement | null = null;
  private opts: MountOptions | null = null;
  private u: uPlot | null = null;
  private frameHandle: number | null = null;
  private destroyed = false;

  private dark = false;
  private layout: Layout = { drawn: [], axes: [] };
  private signature = '';
  private live: FlowSeriesBuffer | null = null;
  private ref: FlowSeriesBuffer | null = null;
  private stopWatching: Array<() => void> = [];
  private viewport: Viewport = { mode: 'fitAll' };
  private readonly hidden = new Set<SeriesId>();
  private awaited: ReadonlySet<SeriesId> = new Set();
  private cursor: number | null = null;
  private cut: readonly [number, number] | null = null;
  private annotations: readonly ChartAnnotation[] = [];
  private size: { width: number; height: number } = { width: 0, height: 0 };
  private sizeDirty = false;

  private structureDirty = false;
  private stateDirty = false;
  private lastLiveVersion = -1;
  private lastRefVersion = -1;

  private liveGeneration = -1;
  private readonly consumed = new Map<SeriesId, number>();
  private readonly liveRanges = new Map<AxisId, Range>();
  private xRange: Range = [0, 1];
  private yRanges = new Map<AxisId, Range>();

  constructor(
    private readonly plugins: readonly UplotOverlayPlugin[] = [],
    options: UplotRendererOptions = {},
  ) {
    this.requestFrame =
      options.requestFrame ?? ((cb) => window.requestAnimationFrame(cb));
    this.cancelFrame =
      options.cancelFrame ?? ((h) => window.cancelAnimationFrame(h));
  }

  public async mount(el: HTMLElement, opts: MountOptions): Promise<void> {
    // Taken before the library loads, so a resize() meanwhile wins: the
    // container may only get its size while uPlot is still loading.
    this.size = {
      width: Math.floor(opts.width),
      height: Math.floor(opts.height),
    };
    const lib = await loadUplot();
    if (this.destroyed) {
      return;
    }
    injectCss();
    this.lib = lib;
    this.el = el;
    this.opts = opts;
    this.dark = opts.dark;
    this.structureDirty = true;
    this.scheduleFrame();
  }

  public setSeries(defs: readonly SeriesDef[]): void {
    const signature = defs
      .map(
        (d) =>
          `${d.kind}|${d.id}|${d.axisId}|${d.colour.light}|${d.colour.dark}|${d.label}`,
      )
      .join(';');
    if (signature !== this.signature) {
      this.signature = signature;
      this.layout = layoutSeries(defs);
      this.resetData();
      this.markStructure();
    }
  }

  public attach(buffer: FlowSeriesBuffer): void {
    this.live = buffer;
    this.watchBuffers();
    this.resetData();
    this.markState();
  }

  public setReferences(buffer: FlowSeriesBuffer | null): void {
    if (buffer !== this.ref) {
      this.ref = buffer;
      this.watchBuffers();
      this.resetData();
      this.markState();
    }
  }

  public setViewport(viewport: Viewport): void {
    this.viewport = viewport;
    this.markState();
  }

  public setVisible(seriesId: SeriesId, visible: boolean): void {
    if (visible) {
      this.hidden.delete(seriesId);
    } else {
      this.hidden.add(seriesId);
    }
    this.markState();
  }

  /** Live series a connected device delivers; their axes show before the first sample. */
  public setAwaited(seriesIds: ReadonlySet<SeriesId>): void {
    this.awaited = seriesIds;
    this.markState();
  }

  public setDark(dark: boolean): void {
    if (dark !== this.dark) {
      this.dark = dark;
      this.markStructure();
    }
  }

  public setCursor(tSec: number | null): void {
    this.cursor = tSec;
    this.markState();
  }

  public setCutMarkers(range: readonly [number, number] | null): void {
    this.cut = range;
    this.markState();
  }

  public setAnnotations(list: readonly ChartAnnotation[]): void {
    this.annotations = list;
    this.markState();
  }

  public resize(width: number, height: number): void {
    const next = { width: Math.floor(width), height: Math.floor(height) };
    if (next.width === this.size.width && next.height === this.size.height) {
      return;
    }
    this.size = next;
    this.sizeDirty = true;
    this.markState();
  }

  public async exportImage(options: ExportImageOptions): Promise<string> {
    const lib = this.lib;
    if (!lib || this.layout.drawn.length === 0) {
      throw new Error('UplotRenderer: nothing to export');
    }
    this.prepare();
    // The overlays are drawn in the picture's theme, the app's graph stays in its own.
    this.applyOverlays({
      ...this.overlayState(),
      dark: options.theme === 'dark',
    });
    const k = options.scale / (lib.pxRatio || window.devicePixelRatio || 1);
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-100000px;top:0;';
    document.body.appendChild(host);
    let chart: uPlot | null = null;
    try {
      const drawn = new Promise<void>((resolve) => {
        const opts = this.buildOptions(
          lib,
          {
            dark: options.theme === 'dark',
            ink: options.ink,
            k,
            ground: options.transparent
              ? null
              : CHART_PALETTE[options.theme].background,
          },
          Math.round(options.width * k),
          Math.round(options.height * k),
        );
        opts.plugins = [
          ...(opts.plugins ?? []),
          { hooks: { draw: [() => resolve()] } },
        ];
        chart = new lib(opts, this.buildData(), host);
        // Values in one ink colour cannot be told apart: keep the columns few.
        this.applyVisibility(
          chart,
          this.opts?.mode === 'live' || options.ink !== undefined,
        );
      });
      await drawn;
      const source = chart.ctx.canvas;
      const out = document.createElement('canvas');
      out.width = source.width;
      out.height = source.height;
      const ctx = out.getContext('2d');
      if (!ctx) {
        throw new Error('UplotRenderer: no 2d context');
      }
      if (!options.transparent) {
        ctx.fillStyle = CHART_PALETTE[options.theme].background;
        ctx.fillRect(0, 0, out.width, out.height);
      }
      ctx.drawImage(source, 0, 0);
      return out.toDataURL('image/png');
    } finally {
      chart?.destroy();
      host.remove();
      this.applyOverlays(this.overlayState());
    }
  }

  public destroy(): void {
    this.destroyed = true;
    this.unwatchBuffers();
    if (this.frameHandle !== null) {
      this.cancelFrame(this.frameHandle);
      this.frameHandle = null;
    }
    this.u?.destroy();
    this.u = null;
    this.el = null;
  }

  // ---- frame loop --------------------------------------------------------

  private markStructure(): void {
    this.structureDirty = true;
    this.scheduleFrame();
  }

  private markState(): void {
    this.stateDirty = true;
    this.scheduleFrame();
  }

  /**
   * In live mode a change of a buffer requests a frame, so an idle or hidden
   * live graph does no work per frame. A saved brew does not grow, so the
   * other modes only draw after a setter (attach again after reloading a
   * buffer).
   */
  private watchBuffers(): void {
    this.unwatchBuffers();
    const wake = (): void => {
      if (this.opts?.mode === 'live') {
        this.scheduleFrame();
      }
    };
    this.stopWatching = [this.live, this.ref]
      .filter((buffer): buffer is FlowSeriesBuffer => buffer !== null)
      .map((buffer) => buffer.onChange(wake));
  }

  private unwatchBuffers(): void {
    this.stopWatching.forEach((stop) => stop());
    this.stopWatching = [];
  }

  /** Requests a frame for the next change; collects several into one. */
  private scheduleFrame(): void {
    if (this.destroyed || this.frameHandle !== null || !this.lib) {
      return;
    }
    this.frameHandle = this.requestFrame(() => {
      this.frameHandle = null;
      this.tick();
    });
  }

  /** One frame: draws only when a buffer or the renderer's state changed. */
  private tick(): void {
    if (!this.lib || !this.el) {
      return;
    }
    const liveVersion = this.live?.version ?? -1;
    const refVersion = this.ref?.version ?? -1;
    const dataChanged =
      liveVersion !== this.lastLiveVersion ||
      refVersion !== this.lastRefVersion;
    const stateChanged = this.stateDirty || this.structureDirty;
    const drawable = this.size.width > 0 && this.size.height > 0;
    if (!drawable || (!dataChanged && !stateChanged)) {
      return;
    }
    this.lastLiveVersion = liveVersion;
    this.lastRefVersion = refVersion;
    if (this.structureDirty || !this.u) {
      this.rebuild();
    } else {
      this.render();
    }
  }

  private rebuild(): void {
    const lib = this.lib;
    const el = this.el;
    if (!lib || !el) {
      return;
    }
    this.structureDirty = false;
    this.sizeDirty = false;
    this.u?.destroy();
    this.u = null;
    if (this.layout.drawn.length === 0) {
      this.stateDirty = false;
      return;
    }
    this.prepare();
    this.u = new lib(
      this.buildOptions(
        lib,
        {
          dark: this.dark,
          k: 1,
          ground:
            groundOf(el) ??
            CHART_PALETTE[this.dark ? 'dark' : 'light'].background,
        },
        this.size.width,
        this.size.height,
      ),
      this.buildData(),
      el,
    );
    // The host names the graph (role=img); canvas and axis labels are noise.
    this.u.root.setAttribute('aria-hidden', 'true');
    this.render();
  }

  // ---- data --------------------------------------------------------------

  private resetData(): void {
    this.consumed.clear();
    this.liveRanges.clear();
    this.lastLiveVersion = -1;
    this.lastRefVersion = -1;
  }

  private bufferOf(kind: SeriesKind): FlowSeriesBuffer | null {
    return kind === 'live' ? this.live : this.ref;
  }

  /**
   * Extent of the data on an axis. A fitted axis leaves hidden series out; a
   * live axis does not, so a series shown again later is not clipped.
   * `from` gives the first sample index to look at per series.
   */
  private extentOn(
    axisId: AxisId,
    withHidden: boolean,
    from?: (def: SeriesDef) => number,
  ): Extent | null {
    let extent: Extent | null = null;
    for (const def of this.layout.drawn) {
      const buffer = this.bufferOf(def.kind);
      if (
        def.axisId !== axisId ||
        !buffer ||
        (!withHidden && this.hidden.has(def.id))
      ) {
        continue;
      }
      const { y } = buffer.view(def.id);
      extent = mergeExtents(extent, extentOf(from ? y.subarray(from(def)) : y));
    }
    return extent;
  }

  /** Computes x and y ranges; a live axis grows with the new live samples only. */
  private prepare(): void {
    const opts = this.opts;
    if (!opts) {
      return;
    }
    const live = opts.mode === 'live';
    const generation = this.live?.generation ?? -1;
    if (generation !== this.liveGeneration) {
      // A cleared or reloaded brew starts from the settings again.
      this.resetData();
      this.liveGeneration = generation;
    }
    if (live) {
      for (const axisId of this.layout.axes) {
        const def = this.layout.drawn.find((d) => d.axisId === axisId);
        let range =
          this.liveRanges.get(axisId) ??
          initialLiveRange(
            axisId,
            opts.axisSettings,
            opts.style,
            this.extentOn(axisId, true),
            def,
          );
        const fresh = this.extentOn(axisId, true, (d) =>
          d.kind === 'live'
            ? (this.consumed.get(d.id) ?? 0)
            : Number.MAX_SAFE_INTEGER,
        );
        range = growScale(range, fresh, growthRule(axisId, opts.style));
        this.liveRanges.set(axisId, range);
      }
      for (const def of this.layout.drawn) {
        if (def.kind === 'live') {
          this.consumed.set(def.id, this.live?.length(def.id) ?? 0);
        }
      }
    }
    this.yRanges = new Map(
      this.layout.axes.map((axisId) => {
        const def = this.layout.drawn.find((d) => d.axisId === axisId);
        const range = live
          ? this.liveRanges.get(axisId)
          : fittedRange(
              axisId,
              opts.axisSettings,
              this.extentOn(axisId, false),
              def,
            );
        return [axisId, range];
      }),
    );
    let end = this.live?.endTime() ?? 0;
    if (!live) {
      end = Math.max(end, this.ref?.endTime() ?? 0);
    }
    this.xRange = viewportRange(this.viewport, end);
  }

  private buildData(): uPlot.AlignedData {
    const windowed = this.viewport.mode === 'range';
    const [from, to] = this.xRange;
    const facets: Facet[] = this.layout.drawn.map((def) => {
      const { t, y } = this.bufferOf(def.kind)?.view(def.id) ?? {
        t: new Float64Array(0),
        y: new Float64Array(0),
      };
      if (!windowed) {
        return [t, y];
      }
      const lo = Math.max(0, lowerBound(t, from) - 1);
      const hi = Math.min(t.length, lowerBound(t, to) + 1);
      return [t.subarray(lo, hi), y.subarray(lo, hi)];
    });
    // Mode 2 data: no shared x, one [x, y] facet per series.
    return [null, ...facets] as unknown as uPlot.AlignedData;
  }

  private hasData(def: SeriesDef): boolean {
    return (this.bufferOf(def.kind)?.length(def.id) ?? 0) > 0;
  }

  // ---- uPlot -------------------------------------------------------------

  private buildOptions(
    lib: UPlotCtor,
    look: Look,
    width: number,
    height: number,
  ): uPlot.Options {
    const { k } = look;
    const palette = look.dark ? CHART_PALETTE.dark : CHART_PALETTE.light;
    const font = `${Math.round(11 * k)}px ${FONT}`;
    const identity: uPlot.Scale.Range = (_u, min, max) => [min, max];
    const scales: uPlot.Scales = {
      x: { time: false, auto: false, range: identity },
    };
    for (const axisId of this.layout.axes) {
      scales[axisId] = { auto: false, range: identity };
    }
    const inset = insetAxesPlugin({
      axes: this.layout.axes.map((axisId, i) => {
        const owner =
          this.layout.drawn.find(
            (d) => d.axisId === axisId && d.kind === 'live',
          ) ?? this.layout.drawn.find((d) => d.axisId === axisId);
        const colour = owner ? seriesColour(owner, look.dark) : palette.text;
        return {
          index: i + 1,
          axisId,
          colour:
            look.ink ??
            (look.ground
              ? readableLine(colour, look.ground, VALUE_CONTRAST)
              : colour),
        };
      }),
      halo: look.ground,
      font: FONT,
      format: (value) => lib.fmtNum(value),
      k,
    });
    const linear = lib.paths.linear?.();
    const series: uPlot.Series[] = [
      {},
      ...this.layout.drawn.map((def): uPlot.Series => ({
        label: def.label,
        stroke: seriesColour(def, look.dark),
        width: (def.kind === 'reference' ? 1.5 : 2) * k,
        dash: def.kind === 'reference' ? [6 * k, 4 * k] : undefined,
        points: { show: false },
        paths: linear,
        facets: [
          { scale: 'x', auto: false, sorted: 1 },
          { scale: def.axisId, auto: false },
        ],
      })),
    ];
    const axes: uPlot.Axis[] = [
      {
        scale: 'x',
        stroke: look.ink ?? palette.text,
        font,
        size: 28 * k,
        space: 40 * k,
        incrs: TIME_INCRS,
        grid: { stroke: palette.grid, width: k },
        ticks: { stroke: palette.grid, width: k, size: 5 * k },
        values: (_u, splits) => splits.map(formatSeconds),
      },
      ...this.layout.axes.map((axisId, i): uPlot.Axis => ({
        scale: axisId,
        side: insetSide(axisId) === 'left' ? 3 : 1,
        size: 0,
        space: 24 * k,
        grid: { show: i === 0, stroke: palette.grid, width: k },
        ticks: { show: false },
        values: inset.values,
        // uPlot only initialises axes created visible; render() hides them.
        show: true,
      })),
    ];
    return {
      mode: 2,
      width,
      height,
      // Room for the half time label at either end and the top value.
      padding: [8 * k, 14 * k, 0, 14 * k],
      legend: { show: false },
      cursor: { show: false, drag: { x: false, y: false, setScale: false } },
      scales,
      series,
      axes,
      // Overlays draw last, so the cursor labels lie above the axis values.
      plugins: [inset.plugin, ...this.plugins.map((p) => p.hooks())],
    };
  }

  /**
   * An axis shows when a shown series on it has data. The live graph shows
   * the axes of the series a device delivers before the first sample too,
   * and its first axis with a shown series in any case, so grid and range
   * stand from the start, as the brew form always showed them.
   */
  private axisVisible(axisId: AxisId, bare: boolean): boolean {
    const shownOn = (id: AxisId): SeriesDef[] =>
      axisShown(id, bare)
        ? this.layout.drawn.filter(
            (d) => d.axisId === id && !this.hidden.has(d.id),
          )
        : [];
    const live = this.opts?.mode === 'live';
    const first =
      live && this.layout.axes.find((id) => shownOn(id).length > 0) === axisId;
    return shownOn(axisId).some(
      (d) =>
        first ||
        this.hasData(d) ||
        (live && d.kind === 'live' && this.awaited.has(d.id)),
    );
  }

  /** Shows the series and axes that have something to show; true when an axis changed. */
  private applyVisibility(
    u: uPlot,
    bare = this.opts?.mode === 'live',
  ): boolean {
    let axesChanged = false;
    let gridDrawn = false;
    this.layout.axes.forEach((axisId, i) => {
      const axis = u.axes[i + 1];
      const show = this.axisVisible(axisId, bare);
      // The first axis shown draws the grid, so hiding weight keeps it.
      const grid = show && !gridDrawn;
      gridDrawn ||= grid;
      if (axis.show !== show || axis.grid?.show !== grid) {
        axis.show = show;
        axis.grid = { ...axis.grid, show: grid };
        axesChanged = true;
      }
    });
    this.layout.drawn.forEach((def, i) => {
      u.series[i + 1].show = !this.hidden.has(def.id) && this.hasData(def);
    });
    u.setScale('x', { min: this.xRange[0], max: this.xRange[1] });
    for (const [axisId, [min, max]] of this.yRanges) {
      u.setScale(axisId, { min, max });
    }
    return axesChanged;
  }

  private render(): void {
    const u = this.u;
    if (!u) {
      return;
    }
    this.prepare();
    this.applyOverlays(this.overlayState());
    const data = this.buildData();
    u.batch(() => {
      if (this.sizeDirty) {
        u.setSize(this.size);
        this.sizeDirty = false;
      }
      u.setData(data, false);
      if (this.applyVisibility(u)) {
        u.redraw(false, true);
      }
    });
    this.stateDirty = false;
  }

  private applyOverlays(state: UplotOverlayState): void {
    for (const plugin of this.plugins) {
      plugin.apply(state);
    }
  }

  private overlayState(): UplotOverlayState {
    const drawn = this.layout.drawn;
    return {
      cursor: this.cursor,
      cut: this.cut,
      annotations: this.annotations,
      dark: this.dark,
      mode: this.opts?.mode ?? 'static',
      scaleOf: (axisId) =>
        this.layout.axes.includes(axisId) ? axisId : undefined,
      seriesIndexOf: (seriesId, kind = 'live') => {
        const i = drawn.findIndex((d) => d.id === seriesId && d.kind === kind);
        return i < 0 ? undefined : i + 1;
      },
      defAt: (index) => drawn[index - 1],
      lastSample: (seriesId) => {
        const n = this.live?.length(seriesId) ?? 0;
        if (!this.live || n === 0) {
          return null;
        }
        const { t, y } = this.live.view(seriesId);
        return { t: t[n - 1], y: y[n - 1] };
      },
    };
  }
}
