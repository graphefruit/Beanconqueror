import type uPlot from 'uplot';

import {
  pixelRatio,
  type UplotOverlayPlugin,
  type UplotOverlayState,
} from './uplot-plugin';

export const CUT_COLOUR = '#e74c3c';

export interface Band {
  x: number;
  width: number;
}

/**
 * Horizontal bands of the plot area [left, left + width] outside the cut,
 * in the unit of the inputs. Empty bands are left out.
 */
export function dimBands(
  fromPx: number,
  toPx: number,
  left: number,
  width: number,
): Band[] {
  const right = left + width;
  const a = Math.min(right, Math.max(left, Math.min(fromPx, toPx)));
  const b = Math.min(right, Math.max(left, Math.max(fromPx, toPx)));
  const bands: Band[] = [];
  if (a > left) {
    bands.push({ x: left, width: a - left });
  }
  if (b < right) {
    bands.push({ x: b, width: right - b });
  }
  return bands;
}

/**
 * Cut markers: two dashed red lines with the area outside the cut dimmed.
 * They follow the range knob of the cut dialog (setCutMarkers); dragging
 * them on the canvas is not offered, the knob stays the one control.
 */
export class CutMarkersPlugin implements UplotOverlayPlugin {
  private cut: readonly [number, number] | null = null;
  private dark = false;

  public apply(state: UplotOverlayState): void {
    this.cut = state.cut;
    this.dark = state.dark;
  }

  public hooks(): uPlot.Plugin {
    return { hooks: { draw: [(u) => this.draw(u)] } };
  }

  private draw(u: uPlot): void {
    const cut = this.cut;
    if (!cut) {
      return;
    }
    const { left, top, width, height } = u.bbox;
    const fromPx = u.valToPos(cut[0], 'x', true);
    const toPx = u.valToPos(cut[1], 'x', true);
    const ratio = pixelRatio(u);
    const ctx = u.ctx;
    ctx.save();
    ctx.fillStyle = this.dark ? 'rgba(0,0,0,0.5)' : 'rgba(128,128,128,0.3)';
    for (const band of dimBands(fromPx, toPx, left, width)) {
      ctx.fillRect(band.x, top, band.width, height);
    }
    ctx.strokeStyle = CUT_COLOUR;
    ctx.lineWidth = 2 * ratio;
    ctx.setLineDash([6 * ratio, 4 * ratio]);
    ctx.beginPath();
    for (const px of [fromPx, toPx]) {
      if (px >= left && px <= left + width) {
        const x = Math.round(px) + 0.5;
        ctx.moveTo(x, top);
        ctx.lineTo(x, top + height);
      }
    }
    ctx.stroke();
    ctx.restore();
  }
}
