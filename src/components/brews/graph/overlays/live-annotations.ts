import type uPlot from 'uplot';

import type { ChartAnnotation } from '../brew-chart-port';
import { lowerBound } from '../flow-series-buffer';
import {
  facetOf,
  pixelRatio,
  scaleOfSeries,
  type UplotOverlayPlugin,
  type UplotOverlayState,
} from './uplot-plugin';

/** CSS pixels; scaled by the canvas pixel ratio when drawn. */
const FONT_PX = 11;
const PAD_X = 4;
const LABEL_H = 15;
const GAP = 4;
const MAX_ROWS = 3;

export interface Span {
  x: number;
  w: number;
}

/**
 * Greedy row assignment for labels along x: each label goes into the first
 * row whose last label ends at least `gap` before it. When all `maxRows` rows
 * are taken, the label goes into the row that frees up first (it overlaps).
 * Returns the row per input index.
 */
export function layoutRows(
  spans: readonly Span[],
  gap: number,
  maxRows: number,
): number[] {
  const order = spans.map((_, i) => i).sort((a, b) => spans[a].x - spans[b].x);
  const rowEnd: number[] = [];
  const rows = new Array<number>(spans.length);
  for (const i of order) {
    const { x, w } = spans[i];
    let row = rowEnd.findIndex((end) => end + gap <= x);
    if (row < 0) {
      row =
        rowEnd.length < maxRows
          ? rowEnd.length
          : rowEnd.indexOf(Math.min(...rowEnd));
    }
    rowEnd[row] = x + w;
    rows[i] = row;
  }
  return rows;
}

/**
 * Moves boxes of height `h` (wanted top edges `ys`) apart so they do not
 * overlap, keeping them within [top, bottom]. Returns the new top edges in
 * input order. If they do not fit, they overlap evenly from `top`.
 */
export function spreadVertically(
  ys: readonly number[],
  h: number,
  top: number,
  bottom: number,
): number[] {
  const order = ys.map((_, i) => i).sort((a, b) => ys[a] - ys[b]);
  const placed = order.map((i) => Math.min(Math.max(ys[i], top), bottom - h));
  for (let k = 1; k < placed.length; k++) {
    placed[k] = Math.max(placed[k], placed[k - 1] + h);
  }
  // Pushed past the bottom: shift back up from the end.
  for (let k = placed.length - 1; k >= 0; k--) {
    const limit = k === placed.length - 1 ? bottom - h : placed[k + 1] - h;
    placed[k] = Math.max(Math.min(placed[k], limit), top);
  }
  const out = new Array<number>(ys.length);
  order.forEach((i, k) => (out[i] = placed[k]));
  return out;
}

/**
 * Value of the sample nearest to `t` (NaN samples skipped), or null when
 * there is none. `xs` must be ascending.
 */
export function valueNear(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  t: number,
): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n === 0) {
    return null;
  }
  let right = lowerBound(xs, t);
  let left = right - 1;
  while (left >= 0 || right < n) {
    const takeLeft = right >= n || (left >= 0 && t - xs[left] <= xs[right] - t);
    const y = ys[takeLeft ? left-- : right++];
    if (Number.isFinite(y)) {
      return y;
    }
  }
  return null;
}

/** Value text of a badge without its own label. */
export function formatValue(y: number): string {
  return Math.abs(y) >= 100 ? y.toFixed(0) : y.toFixed(1);
}

interface Badge {
  colour: string;
  x: number;
  y: number;
  text: string;
  w: number;
}

/**
 * Annotations on the chart canvas: vertical event lines with a label at the
 * top (stacked in rows when they collide), dotted horizontal lines on an
 * axis, and value badges that follow a series' last sample (or sit at a
 * given t). Drawn in uPlot's draw hook, so streaming costs no rebuild and
 * an exported image includes them.
 */
export class LiveAnnotationsPlugin implements UplotOverlayPlugin {
  private state: UplotOverlayState | null = null;
  /** Text widths in CSS px; labels repeat every frame. */
  private readonly widths = new Map<string, number>();

  public apply(state: UplotOverlayState): void {
    this.state = state;
  }

  public hooks(): uPlot.Plugin {
    return { hooks: { draw: [(u) => this.draw(u)] } };
  }

  private draw(u: uPlot): void {
    const state = this.state;
    if (!state || state.annotations.length === 0) {
      return;
    }
    const ctx = u.ctx;
    const ratio = pixelRatio(u);
    ctx.save();
    ctx.font = `${FONT_PX * ratio}px -apple-system, Roboto, sans-serif`;
    ctx.textBaseline = 'middle';
    // uPlot leaves the alignment of the last axis it drew on the context.
    ctx.textAlign = 'left';
    ctx.beginPath();
    ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
    ctx.clip();
    this.drawHLines(u, state, ratio);
    this.drawVLines(u, state, ratio);
    this.drawBadges(u, state, ratio);
    ctx.restore();
  }

  private textWidth(
    ctx: CanvasRenderingContext2D,
    text: string,
    ratio: number,
  ): number {
    let w = this.widths.get(text);
    if (w === undefined) {
      w = ctx.measureText(text).width / ratio;
      this.widths.set(text, w);
    }
    return w;
  }

  private labelBackground(state: UplotOverlayState): string {
    return state.dark ? 'rgba(18,18,18,0.8)' : 'rgba(255,255,255,0.8)';
  }

  private drawHLines(u: uPlot, state: UplotOverlayState, ratio: number): void {
    const { ctx, bbox } = u;
    for (const a of state.annotations) {
      if (a.kind !== 'hline' || a.y === undefined) {
        continue;
      }
      const scale = state.scaleOf(a.axisId ?? 'weight');
      if (!scale || typeof u.scales[scale]?.min !== 'number') {
        continue;
      }
      const y = Math.round(u.valToPos(a.y, scale, true));
      if (y < bbox.top || y > bbox.top + bbox.height) {
        continue;
      }
      ctx.strokeStyle = a.colour;
      ctx.lineWidth = ratio;
      ctx.setLineDash([2 * ratio, 3 * ratio]);
      ctx.beginPath();
      ctx.moveTo(bbox.left, y);
      ctx.lineTo(bbox.left + bbox.width, y);
      ctx.stroke();
      ctx.setLineDash([]);
      if (a.label) {
        const w = (this.textWidth(ctx, a.label, ratio) + 2 * PAD_X) * ratio;
        const x = bbox.left + bbox.width - w - GAP * ratio;
        const top = Math.max(y - (LABEL_H + 2) * ratio, bbox.top);
        ctx.fillStyle = this.labelBackground(state);
        ctx.fillRect(x, top, w, LABEL_H * ratio);
        ctx.fillStyle = a.colour;
        ctx.fillText(a.label, x + PAD_X * ratio, top + (LABEL_H / 2) * ratio);
      }
    }
  }

  private drawVLines(u: uPlot, state: UplotOverlayState, ratio: number): void {
    const { ctx, bbox } = u;
    const lines: { a: ChartAnnotation; x: number; w: number }[] = [];
    for (const a of state.annotations) {
      if (a.kind !== 'vline' || a.t === undefined) {
        continue;
      }
      const x = Math.round(u.valToPos(a.t, 'x', true));
      if (x < bbox.left || x > bbox.left + bbox.width) {
        continue;
      }
      const w = a.label
        ? (this.textWidth(ctx, a.label, ratio) + 2 * PAD_X) * ratio
        : 0;
      lines.push({ a, x, w });
    }
    if (lines.length === 0) {
      return;
    }
    // Labels start at their line and flip left near the right edge.
    const right = bbox.left + bbox.width;
    const spans = lines.map(({ x, w }) => ({
      x: x + w > right ? x - w : x,
      w,
    }));
    const rows = layoutRows(
      spans.map((s) => ({ x: s.x / ratio, w: s.w / ratio })),
      GAP,
      MAX_ROWS,
    );
    ctx.lineWidth = ratio;
    lines.forEach(({ a, x, w }, i) => {
      ctx.strokeStyle = a.colour;
      ctx.beginPath();
      ctx.moveTo(x, bbox.top);
      ctx.lineTo(x, bbox.top + bbox.height);
      ctx.stroke();
      if (w > 0) {
        const top = bbox.top + (rows[i] * (LABEL_H + 2) + 2) * ratio;
        ctx.fillStyle = this.labelBackground(state);
        ctx.fillRect(spans[i].x, top, w, LABEL_H * ratio);
        ctx.fillStyle = a.colour;
        ctx.fillText(
          a.label,
          spans[i].x + PAD_X * ratio,
          top + (LABEL_H / 2) * ratio,
        );
      }
    });
  }

  private badgeOf(
    u: uPlot,
    state: UplotOverlayState,
    a: ChartAnnotation,
    ratio: number,
  ): Badge | null {
    const index = a.seriesId ? state.seriesIndexOf(a.seriesId) : undefined;
    const series = index === undefined ? undefined : u.series[index];
    const scale = series ? scaleOfSeries(series) : undefined;
    if (index === undefined || !series?.show || !scale || !a.seriesId) {
      return null;
    }
    let t = a.t;
    let y = a.y;
    if (t === undefined) {
      const last = state.lastSample(a.seriesId);
      if (!last) {
        return null;
      }
      t = last.t;
      y ??= last.y;
    } else if (y === undefined) {
      const facet = facetOf(u, index);
      y = facet ? (valueNear(facet[0], facet[1], t) ?? undefined) : undefined;
    }
    if (y === undefined || typeof u.scales[scale]?.min !== 'number') {
      return null;
    }
    const x = u.valToPos(t, 'x', true);
    if (x < u.bbox.left || x > u.bbox.left + u.bbox.width) {
      return null;
    }
    const text = a.label || formatValue(y);
    return {
      colour: a.colour,
      x,
      y: u.valToPos(y, scale, true),
      text,
      w: (this.textWidth(u.ctx, text, ratio) + 2 * PAD_X) * ratio,
    };
  }

  private drawBadges(u: uPlot, state: UplotOverlayState, ratio: number): void {
    const { ctx, bbox } = u;
    const badges = state.annotations
      .filter((a) => a.kind === 'pointLabel')
      .map((a) => this.badgeOf(u, state, a, ratio))
      .filter((b): b is Badge => b !== null);
    if (badges.length === 0) {
      return;
    }
    const h = LABEL_H * ratio;
    const tops = spreadVertically(
      badges.map((b) => b.y - h / 2),
      h + 2 * ratio,
      bbox.top,
      bbox.top + bbox.height,
    );
    const right = bbox.left + bbox.width;
    badges.forEach((b, i) => {
      ctx.fillStyle = b.colour;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3 * ratio, 0, 2 * Math.PI);
      ctx.fill();
      const room = b.x + 6 * ratio + b.w <= right;
      const left = room ? b.x + 6 * ratio : b.x - 6 * ratio - b.w;
      ctx.fillRect(left, tops[i], b.w, h);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(b.text, left + PAD_X * ratio, tops[i] + h / 2);
    });
  }
}
