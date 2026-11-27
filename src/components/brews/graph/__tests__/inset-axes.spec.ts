import type uPlot from 'uplot';

import {
  insetAxesPlugin,
  insetColumns,
  insetRank,
  insetSide,
  labelY,
} from '../inset-axes';

interface Call {
  op: 'stroke' | 'fill';
  text: string;
  x: number;
  y: number;
  style: string;
}

/** A chart as the draw hook sees it: 200 × 100 CSS px at pixel ratio 2. */
function fakeChart(shown: Record<number, boolean>): {
  u: uPlot;
  calls: Call[];
} {
  const calls: Call[] = [];
  const ctx = {
    canvas: { width: 400 },
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    lineJoin: 'miter',
    lineWidth: 1,
    strokeStyle: '',
    fillStyle: '',
    save: () => undefined,
    restore: () => undefined,
    // Every character 6 canvas px wide.
    measureText: (text: string) => ({ width: text.length * 6 }),
    strokeText(text: string, x: number, y: number) {
      calls.push({ op: 'stroke', text, x, y, style: this.strokeStyle });
    },
    fillText(text: string, x: number, y: number) {
      calls.push({ op: 'fill', text, x, y, style: this.fillStyle });
    },
  };
  const u = {
    ctx,
    width: 200,
    bbox: { left: 20, top: 10, width: 360, height: 160 },
    axes: [0, 1, 2, 3].map((i) => ({ show: shown[i] ?? true })),
    scales: {
      weight: { min: 0, max: 100 },
      flow: { min: 0, max: 10 },
      pressure: { min: 0, max: 12 },
    },
    // Value v of any scale at 170 - v canvas px.
    valToPos: (v: number) => 170 - v,
  } as unknown as uPlot;
  return { u, calls };
}

function drawWith(
  shown: Record<number, boolean> = {},
  halo: string | null = '#ffffff',
): Call[] {
  const { plugin, values } = insetAxesPlugin({
    axes: [
      { index: 1, axisId: 'weight', colour: '#aa0000' },
      { index: 2, axisId: 'pressure', colour: '#00aa00' },
      { index: 3, axisId: 'flow', colour: '#0000aa' },
    ],
    halo,
    font: 'sans-serif',
    format: (v) => String(v),
    k: 1,
  });
  const { u, calls } = fakeChart(shown);
  expect(values(u, [0, 50, 100], 1, 0, 0)).toEqual([null, null, null]);
  values(u, [0, 6, 12], 2, 0, 0);
  values(u, [0, 5], 3, 0, 0);
  const draw = plugin.hooks.draw as (u: uPlot) => void;
  draw(u);
  return calls;
}

describe('inset axes', () => {
  it('puts weight left and the other axes right, flow at the edge', () => {
    expect(insetSide('weight')).toBe('left');
    expect(insetSide('flow')).toBe('right');
    expect(insetSide('custom:x')).toBe('right');
    expect(
      (['custom:x', 'water', 'temperature', 'pressure', 'flow'] as const)
        .slice()
        .sort((a, b) => insetRank(a) - insetRank(b)),
    ).toEqual(['flow', 'pressure', 'temperature', 'water', 'custom:x']);
  });

  it('lines the columns up from the edge inwards', () => {
    expect(insetColumns([20, 10, 30], 300, 'right', 1)).toEqual([
      296, 270, 254,
    ]);
    expect(insetColumns([20, 10], 14, 'left', 1)).toEqual([18, 44]);
    // An exported picture scales the gaps.
    expect(insetColumns([60, 30], 900, 'right', 3)).toEqual([888, 810]);
    expect(insetColumns([], 300, 'right', 1)).toEqual([]);
  });

  it('sets a value just above its grid line and keeps the top one inside', () => {
    expect(labelY(100, 10, 1)).toBe(98);
    expect(labelY(160, 10, 2)).toBe(156);
    expect(labelY(12, 10, 1)).toBe(21);
  });

  it('draws the values of the shown axes in their colour on a halo', () => {
    const calls = drawWith();

    const fills = calls.filter((c) => c.op === 'fill');
    const strokes = calls.filter((c) => c.op === 'stroke');
    expect(strokes.length).toBe(fills.length);
    expect(strokes.every((c) => c.style === '#ffffff')).toBeTrue();
    const column = (style: string): number[] => [
      ...new Set(fills.filter((c) => c.style === style).map((c) => c.x)),
    ];
    // Ratio 2: the edge 8 px in; flow ('5' 6 px wide) at the edge, pressure 12 px further.
    expect(column('#aa0000')).toEqual([28]);
    expect(column('#0000aa')).toEqual([372]);
    expect(column('#00aa00')).toEqual([372 - 6 - 12]);
    expect(fills.find((c) => c.text === '6')?.y).toBe(170 - 6 - 4);
  });

  it('draws no halo on a clear picture', () => {
    const calls = drawWith({}, null);

    expect(calls.some((c) => c.op === 'stroke')).toBeFalse();
    expect(calls.length).toBe(3 + 3 + 2);
  });

  it('leaves out a hidden axis and gives its column to the next', () => {
    const calls = drawWith({ 3: false });

    expect(calls.some((c) => c.style === '#0000aa')).toBeFalse();
    const pressure = calls.filter(
      (c) => c.op === 'fill' && c.style === '#00aa00',
    );
    expect(pressure.length).toBe(3);
    expect(pressure.every((c) => c.x === 372)).toBeTrue();
  });
});
