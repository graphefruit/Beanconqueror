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

/** Baseline of a value just above its grid line, kept inside the plot. */
export function labelY(pos: number, plotTop: number, px: number): number {
  return Math.max(pos - LIFT_PX * px, plotTop + FONT_PX * px);
}

export interface InsetAxis {
  /** uPlot axis index; its scale is the axis id. */
  index: number;
  axisId: AxisId;
  colour: string;
}

export interface InsetAxesSpec {
  axes: readonly InsetAxis[];
  /** Halo behind the text in the colour of the ground; none on a clear ground. */
  halo: string | null;
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
    const { left, top, width } = u.bbox;
    ctx.save();
    ctx.font = `${Math.round(FONT_PX * px)}px ${spec.font}`;
    ctx.textBaseline = 'bottom';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3 * px;
    ctx.strokeStyle = spec.halo ?? 'transparent';
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
          labels: (splitsOf.get(a.index) ?? []).map((v) => ({
            text: spec.format(v),
            y: labelY(u.valToPos(v, a.axisId, true), top, px),
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
        for (const label of column.labels) {
          if (spec.halo) {
            ctx.strokeText(label.text, xs[i], label.y);
          }
          ctx.fillText(label.text, xs[i], label.y);
        }
      });
    }
    ctx.restore();
  };
  return { plugin: { hooks: { draw } }, values };
}
