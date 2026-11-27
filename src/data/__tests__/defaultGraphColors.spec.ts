import { CHART_PALETTE } from '../../components/brews/graph/uplot-renderer';
import { IGraphColors } from '../../interfaces/settings/iGraphColors';
import { contrastRatio } from '../../services/graphHelper/line-contrast';
import {
  DEFAULT_GRAPH_COLORS,
  replaceFormerDefaults,
} from '../defaultGraphColors';

/** CIE76 distance of two #rrggbb colours. */
function labDistance(a: string, b: string): number {
  const lab = (hex: string): number[] => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    const f = (t: number): number =>
      t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
    const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  };
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

function copy(colors: object): IGraphColors {
  return JSON.parse(JSON.stringify(colors)) as IGraphColors;
}

describe('DEFAULT_GRAPH_COLORS', () => {
  for (const mode of ['light', 'dark'] as const) {
    const card = CHART_PALETTE[mode].background;

    it(`stand out by 3:1 at least from the ${mode} card`, () => {
      for (const [name, setting] of Object.entries(DEFAULT_GRAPH_COLORS)) {
        for (const kind of ['active', 'reference'] as const) {
          const line = setting[kind][mode];
          expect(contrastRatio(line, card))
            .withContext(`${name} ${kind} ${line} on ${card}`)
            .toBeGreaterThanOrEqual(3);
        }
      }
    });
  }

  it('keep live lines on white at 4.5:1', () => {
    for (const [name, setting] of Object.entries(DEFAULT_GRAPH_COLORS)) {
      expect(contrastRatio(setting.active.light, '#ffffff'))
        .withContext(name)
        .toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keep the flow lines of scale and machine apart', () => {
    const { realtimeFlow, waterDispensedFlowSecond } = DEFAULT_GRAPH_COLORS;
    for (const mode of ['light', 'dark'] as const) {
      expect(
        labDistance(
          realtimeFlow.active[mode],
          waterDispensedFlowSecond.active[mode],
        ),
      )
        .withContext(mode)
        .toBeGreaterThanOrEqual(25);
    }
  });
});

describe('replaceFormerDefaults', () => {
  it('moves colours still at a former default to the current one', () => {
    const stored = copy(DEFAULT_GRAPH_COLORS);
    stored.weight.active.light = '#cdc2ac';
    stored.realtimeFlow.active.dark = '#09485D';
    // The colour picker hands back lower case.
    stored.pressure.active.light = '#05c793';

    replaceFormerDefaults(stored);

    expect(stored).toEqual(copy(DEFAULT_GRAPH_COLORS));
  });

  it('keeps colours the user chose, even a former default of another line', () => {
    const stored = copy(DEFAULT_GRAPH_COLORS);
    stored.weight.active.light = '#123456';
    stored.flowPerSecond.active.light = '#cdc2ac';
    stored.realtimeFlow.active.light = '#09485D';
    const chosen = copy(stored);

    replaceFormerDefaults(stored);

    expect(stored).toEqual(chosen);
  });

  it('leaves a stored value that is not a colour as it is', () => {
    const stored = copy(DEFAULT_GRAPH_COLORS);
    (stored.weight.active as unknown as { light: unknown }).light = 0;

    expect(() => replaceFormerDefaults(stored)).not.toThrow();
    expect(stored.weight.active.light as unknown).toBe(0);
  });

  it('passes over series an old backup does not have', () => {
    const stored = copy(DEFAULT_GRAPH_COLORS);
    Reflect.deleteProperty(stored, 'weightSecond');
    stored.weight.active.light = '#cdc2ac';

    expect(() => replaceFormerDefaults(stored)).not.toThrow();
    expect(stored.weight.active.light).toBe(
      DEFAULT_GRAPH_COLORS.weight.active.light,
    );
  });
});
