import { CHART_PALETTE } from '../../components/brews/graph/uplot-renderer';
import { IGraphColors } from '../../interfaces/settings/iGraphColors';
import { contrastRatio } from '../../services/graphHelper/line-contrast';
import {
  DEFAULT_GRAPH_COLORS,
  replaceFormerDefaults,
} from '../defaultGraphColors';

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

  it('keep live lines on white at 4.5:1, apart from their references', () => {
    for (const [name, setting] of Object.entries(DEFAULT_GRAPH_COLORS)) {
      expect(contrastRatio(setting.active.light, '#ffffff'))
        .withContext(name)
        .toBeGreaterThanOrEqual(4.5);
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
