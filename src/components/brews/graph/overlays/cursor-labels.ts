import type uPlot from 'uplot';

import { lowerBound } from '../flow-series-buffer';
import {
  facetOf,
  pixelRatio,
  scaleOfSeries,
  type UplotOverlayPlugin,
  type UplotOverlayState,
} from './uplot-plugin';

/** Spacing of the labels at the cursor. */
export const LABEL_MIN_GAP = 28;
export const LABEL_EDGE = 15;
export const LABEL_OFFSET = 55;
export const FLIP_AT = 0.7;
const CURSOR_COLOUR = '#ff3b30';
const FONT_PX = 11;
const PAD_PX = 4;

/**
 * Index of the sample nearest to `t` whose value is finite, or -1. `xs` must
 * be sorted ascending.
 */
export function nearestSample(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  t: number,
): number {
  const n = Math.min(xs.length, ys.length);
  const finite = (i: number): boolean => Number.isFinite(ys[i]);
  let right = Math.min(lowerBound(xs, t), n);
  let left = right - 1;
  while (left >= 0 && !finite(left)) {
    left--;
  }
  while (right < n && !finite(right)) {
    right++;
  }
  if (left < 0) {
    return right < n ? right : -1;
  }
  if (right >= n) {
    return left;
  }
  return t - xs[left] <= xs[right] - t ? left : right;
}

/**
 * Label centres (same order as `targets`) at least `minGap` apart, pushed
 * into [top, bottom] where possible.
 */
export function layoutLabels(
  targets: readonly number[],
  top: number,
  bottom: number,
  minGap = LABEL_MIN_GAP,
): number[] {
  const order = targets
    .map((_, i) => i)
    .sort((a, b) => targets[a] - targets[b]);
  const ys = order.map((i) => targets[i]);
  const n = ys.length;
  for (let i = 1; i < n; i++) {
    ys[i] = Math.max(ys[i], ys[i - 1] + minGap);
  }
  if (n > 0 && ys[n - 1] > bottom) {
    ys[n - 1] = bottom;
    for (let i = n - 2; i >= 0; i--) {
      ys[i] = Math.min(ys[i], ys[i + 1] - minGap);
    }
  }
  if (n > 0 && ys[0] < top) {
    ys[0] = top;
    for (let i = 1; i < n; i++) {
      ys[i] = Math.max(ys[i], ys[i - 1] + minGap);
    }
  }
  const result = new Array<number>(n);
  order.forEach((original, sorted) => (result[original] = ys[sorted]));
  return result;
}

/** Labels sit right of the cursor, left of it once it is past 70 % of the plot. */
export function labelSide(
  cursorX: number,
  plotLeft: number,
  plotWidth: number,
): 'left' | 'right' {
  return cursorX > plotLeft + plotWidth * FLIP_AT ? 'left' : 'right';
}

/** Black or white text on a background colour (#rgb, #rrggbb, rgb(a)). */
export function contrastText(
  colour: string | undefined,
): '#000000' | '#ffffff' {
  const c = (colour ?? '').trim().toLowerCase();
  let rgb: number[] | null = null;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(c);
  if (hex) {
    const h =
      hex[1].length === 3
        ? hex[1]
            .split('')
            .map((ch) => ch + ch)
            .join('')
        : hex[1];
    rgb = [0, 2, 4].map((o) => parseInt(h.slice(o, o + 2), 16));
  } else {
    const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
    if (m) {
      rgb = [m[1], m[2], m[3]].map(Number);
    }
  }
  if (!rgb) {
    return '#ffffff';
  }
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return luminance > 0.6 ? '#000000' : '#ffffff';
}

/** Time at a pointer x (CSS px from the plot's left edge), clamped to the scale. */
export function timeAtPixel(
  x: number,
  plotWidth: number,
  min: number,
  max: number,
): number {
  if (plotWidth <= 0) {
    return min;
  }
  const frac = Math.min(1, Math.max(0, x / plotWidth));
  return min + frac * (max - min);
}

export function formatLabel(
  label: string,
  value: number,
  unit: string,
): string {
  return `${label}: ${value.toFixed(1)}${unit ? ' ' + unit : ''}`;
}

export interface CursorLabelsOptions {
  /** Called with the cursor time while the user drags on the plot (detail mode). */
  onCursorDrag?: (tSec: number) => void;
}

interface Candidate {
  index: number;
  t: number;
  y: number;
  scale: string;
}

function seriesColour(u: uPlot, index: number): string {
  const stroke = u.series[index].stroke;
  const value = typeof stroke === 'function' ? stroke(u, index) : stroke;
  return typeof value === 'string' ? value : CURSOR_COLOUR;
}

/**
 * The time cursor of a saved brew: a red line and, for each shown live
 * series, its value at the cursor in a box of the series' colour. In detail
 * mode a horizontal drag on the plot moves it; vertical swipes still scroll.
 * The values are drawn on the canvas; the host gives them as text too.
 */
export class CursorLabelsPlugin implements UplotOverlayPlugin {
  private stateCursor: number | null = null;
  private cursor: number | null = null;
  private state: UplotOverlayState | null = null;

  constructor(private readonly options: CursorLabelsOptions = {}) {}

  public apply(state: UplotOverlayState): void {
    // A drag moves the cursor locally; the renderer's value wins once it changes.
    if (state.cursor !== this.stateCursor) {
      this.stateCursor = state.cursor;
      this.cursor = state.cursor;
    }
    this.state = state;
  }

  public hooks(): uPlot.Plugin {
    let detach: (() => void) | null = null;
    return {
      hooks: {
        init: [
          (u) => {
            detach = this.attachPointer(u);
          },
        ],
        draw: [(u) => this.draw(u)],
        destroy: [
          () => {
            detach?.();
            detach = null;
          },
        ],
      },
    };
  }

  private attachPointer(u: uPlot): () => void {
    const over = u.over;
    let dragging: number | null = null;
    const move = (e: PointerEvent): void => {
      const { min, max } = u.scales.x;
      if (typeof min !== 'number' || typeof max !== 'number') {
        return;
      }
      const rect = over.getBoundingClientRect();
      const t = timeAtPixel(e.clientX - rect.left, rect.width, min, max);
      this.cursor = t;
      u.redraw(false, false);
      this.options.onCursorDrag?.(t);
    };
    const down = (e: PointerEvent): void => {
      if (this.state?.mode !== 'detail' || dragging !== null) {
        return;
      }
      dragging = e.pointerId;
      over.setPointerCapture?.(e.pointerId);
      move(e);
    };
    const drag = (e: PointerEvent): void => {
      if (dragging === e.pointerId) {
        move(e);
      }
    };
    const up = (e: PointerEvent): void => {
      if (dragging === e.pointerId) {
        dragging = null;
        over.releasePointerCapture?.(e.pointerId);
      }
    };
    over.style.touchAction = 'pan-y';
    over.addEventListener('pointerdown', down);
    over.addEventListener('pointermove', drag);
    over.addEventListener('pointerup', up);
    over.addEventListener('pointercancel', up);
    return () => {
      over.removeEventListener('pointerdown', down);
      over.removeEventListener('pointermove', drag);
      over.removeEventListener('pointerup', up);
      over.removeEventListener('pointercancel', up);
    };
  }

  private candidates(u: uPlot, t: number): Candidate[] {
    const result: Candidate[] = [];
    u.series.forEach((series, index) => {
      const def = this.state?.defAt(index);
      const facet = facetOf(u, index);
      const scale = scaleOfSeries(series);
      if (
        def?.kind !== 'live' ||
        series.show === false ||
        !facet ||
        !scale ||
        !(scale in u.scales)
      ) {
        return;
      }
      const i = nearestSample(facet[0], facet[1], t);
      if (i >= 0) {
        result.push({ index, t: facet[0][i], y: facet[1][i], scale });
      }
    });
    return result;
  }

  private draw(u: uPlot): void {
    const t = this.cursor;
    const { min, max } = u.scales.x;
    if (
      t === null ||
      typeof min !== 'number' ||
      typeof max !== 'number' ||
      t < min ||
      t > max
    ) {
      return;
    }
    const ctx = u.ctx;
    const ratio = pixelRatio(u);
    const { left, top, width, height } = u.bbox;
    const cx = Math.round(u.valToPos(t, 'x', true));

    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, width, height);
    ctx.clip();
    ctx.strokeStyle = CURSOR_COLOUR;
    ctx.lineWidth = 1.5 * ratio;
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(cx, top + height);
    ctx.stroke();

    const candidates = this.candidates(u, t);
    const pointYs = candidates.map((c) => u.valToPos(c.y, c.scale, true));
    const edge = LABEL_EDGE * ratio;
    const labelYs = layoutLabels(
      pointYs,
      top + edge,
      top + height - edge,
      LABEL_MIN_GAP * ratio,
    );
    const side = labelSide(cx, left, width);
    const dir = side === 'right' ? 1 : -1;
    const pad = PAD_PX * ratio;
    const boxH = FONT_PX * ratio + 2 * pad;
    ctx.font = `${FONT_PX * ratio}px Inter, sans-serif`;
    ctx.textBaseline = 'middle';
    // uPlot leaves the alignment of the last axis it drew on the context.
    ctx.textAlign = 'left';

    candidates.forEach((c, i) => {
      const def = this.state?.defAt(c.index);
      const colour = seriesColour(u, c.index);
      const textColour = contrastText(colour);
      const px = u.valToPos(c.t, 'x', true);
      const py = pointYs[i];
      const ly = labelYs[i];
      const text = formatLabel(def?.label ?? '', c.y, def?.unit ?? '');
      const boxW = ctx.measureText(text).width + 2 * pad;
      const anchorX = px + dir * LABEL_OFFSET * ratio;
      const boxX = side === 'right' ? anchorX : anchorX - boxW;

      ctx.strokeStyle = colour;
      ctx.fillStyle = colour;
      ctx.lineWidth = ratio;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(anchorX, ly);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, 3 * ratio, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillRect(boxX, ly - boxH / 2, boxW, boxH);
      ctx.strokeStyle = textColour;
      ctx.strokeRect(boxX, ly - boxH / 2, boxW, boxH);
      ctx.fillStyle = textColour;
      ctx.fillText(text, boxX + pad, ly);
    });
    ctx.restore();
  }
}
