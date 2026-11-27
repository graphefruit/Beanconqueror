/**
 * Value axes drawn inside the plot, as Plotly placed them: weight at the left
 * edge, flow, pressure, temperature and water from the right edge inwards.
 * The axes take no width (uPlot `size: 0`), so the lines get the whole width
 * and showing or hiding an axis never moves the plot.
 */
import type uPlot from 'uplot';

import { pixelRatio } from './overlays/uplot-plugin';
import type { AxisId } from './series-def';

export type InsetSide = 'left' | 'right';

/** Right columns from the edge inwards; custom axes follow in their own order. */
const RIGHT_ORDER: readonly AxisId[] = [
  'flow',
  'pressure',
  'temperature',
  'water',
];
const FONT_PX = 11;
/** CSS pixels between the edge and the first column, and between columns. */
const EDGE_PX = 4;
const COLUMN_GAP_PX = 6;
/** CSS pixels a value stands above its grid line. */
const LIFT_PX = 2;

export function insetSide(axisId: AxisId): InsetSide {
  return axisId === 'weight' ? 'left' : 'right';
}

/** Position of an axis's column, counted from its edge inwards. */
export function insetRank(axisId: AxisId): number {
  const i = RIGHT_ORDER.indexOf(axisId);
  return i < 0 ? RIGHT_ORDER.length : i;
}

/**
 * x of each column's outer text edge, for columns given from the edge
 * inwards: right columns are right-aligned at it, left ones left-aligned.
 */
export function insetColumns(
  widths: readonly number[],
  edge: number,
  side: InsetSide,
  px: number,
): number[] {
  const inward = side === 'right' ? -1 : 1;
  let x = edge + inward * EDGE_PX * px;
  return widths.map((width) => {
    const at = x;
    x += inward * (width + COLUMN_GAP_PX * px);
    return at;
  });
}

/**
 * Where a value's text stands, kept inside the plot: on an axis with grid
 * lines just above its line (baseline bottom), on one without centred on its
 * height (baseline middle), since no line shows which height it marks.
 */
export function labelY(
  pos: number,
  plot: { top: number; bottom: number },
  px: number,
  onGrid: boolean,
): number {
  if (onGrid) {
    return Math.max(pos - LIFT_PX * px, plot.top + FONT_PX * px);
  }
  const half = (FONT_PX * px) / 2;
  return Math.min(Math.max(pos, plot.top + half), plot.bottom - half);
}

/**
 * The colour of the first ground behind `el`, the card or page the clear
 * canvas sits on; null when nothing behind it has one.
 */
export function groundOf(el: Element | null): string | null {
  for (let node = el; node; node = node.parentElement) {
    // ion-content paints its ground on an element inside its shadow root.
    const painted =
      node.shadowRoot?.getElementById('background-content') ?? node;
    const colour = getComputedStyle(painted).backgroundColor;
    if (colour && colour !== 'transparent' && !/[,/]\s*0\)$/.test(colour)) {
      return colour;
    }
  }
  return null;
}

export interface InsetAxis {
  /** uPlot axis index; its scale is the axis id. */
  index: number;
  axisId: AxisId;
  colour: string;
  /** The axis draws grid lines. */
  grid: boolean;
}

export interface InsetAxesSpec {
  axes: readonly InsetAxis[];
  font: string;
  format: (value: number) => string;
  k: number;
}

/**
 * The plugin draws the values; `values` goes into every inset uPlot axis, so
 * uPlot still picks the splits but draws no text of its own. One instance
 * belongs to one chart.
 */
export function insetAxesPlugin(spec: InsetAxesSpec): {
  plugin: uPlot.Plugin;
  values: uPlot.Axis.DynamicValues;
} {
  const splitsOf = new Map<number, number[]>();
  const values: uPlot.Axis.DynamicValues = (_u, splits, axisIdx) => {
    splitsOf.set(axisIdx, splits);
    return splits.map((): string | null => null);
  };
  const draw = (u: uPlot): void => {
    const ctx = u.ctx;
    const px = spec.k * pixelRatio(u);
    const { left, top, width, height } = u.bbox;
    const plot = { top, bottom: top + height };
    ctx.save();
    ctx.font = `${Math.round(FONT_PX * px)}px ${spec.font}`;
    for (const side of ['left', 'right'] as const) {
      const columns = spec.axes
        .filter(
          (a) =>
            insetSide(a.axisId) === side &&
            u.axes[a.index]?.show &&
            Number.isFinite(u.scales[a.axisId]?.min) &&
            splitsOf.has(a.index),
        )
        .sort((a, b) => insetRank(a.axisId) - insetRank(b.axisId))
        .map((a) => ({
          colour: a.colour,
          baseline: a.grid ? ('bottom' as const) : ('middle' as const),
          labels: (splitsOf.get(a.index) ?? []).map((v) => ({
            text: spec.format(v),
            y: labelY(u.valToPos(v, a.axisId, true), plot, px, a.grid),
          })),
        }));
      const xs = insetColumns(
        columns.map((c) =>
          Math.max(0, ...c.labels.map((l) => ctx.measureText(l.text).width)),
        ),
        side === 'right' ? left + width : left,
        side,
        px,
      );
      ctx.textAlign = side;
      columns.forEach((column, i) => {
        ctx.fillStyle = column.colour;
        ctx.textBaseline = column.baseline;
        for (const label of column.labels) {
          ctx.fillText(label.text, xs[i], label.y);
        }
      });
    }
    ctx.restore();
  };
  return { plugin: { hooks: { draw } }, values };
}
