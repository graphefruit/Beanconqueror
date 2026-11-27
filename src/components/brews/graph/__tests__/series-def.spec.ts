import { BrewFlow } from '../../../../classes/brew/brewFlow';
import { Settings } from '../../../../classes/settings/settings';
import { DEFAULT_GRAPH_COLORS } from '../../../../data/defaultGraphColors';
import { PREPARATION_STYLE_TYPE } from '../../../../enums/preparations/preparationStyleTypes';
import type { IGraphColors } from '../../../../interfaces/settings/iGraphColors';
import { FlowSeriesBuffer } from '../flow-series-buffer';
import {
  customAxisName,
  customSeriesDef,
  FIXED_SERIES_IDS,
  fixedSeriesDef,
  graphSettingsFor,
  initiallyVisible,
  seriesColour,
  SeriesDef,
  seriesDefsFor,
} from '../series-def';

const TEXTS: Record<string, string> = {
  BREW_FLOW_WEIGHT: 'Weight',
  BREW_FLOW_WEIGHT_REALTIME: 'Flow (Realtime)',
  BREW_IMPORT_METRIC_TARGET: 'Target',
  BREW_FLOW_WATER_DISPENSED_VOLUME: 'Water dispensed',
};
const translate = (key: string): string => TEXTS[key] ?? key;

function colors(): IGraphColors {
  const own = JSON.parse(JSON.stringify(DEFAULT_GRAPH_COLORS)) as IGraphColors;
  own.weight = {
    active: { light: '#a1a1a1', dark: '#a2a2a2' },
    reference: { light: '#b1b1b1', dark: '#b2b2b2' },
  };
  return own;
}

function def(overrides: Partial<SeriesDef>): SeriesDef {
  return {
    ...fixedSeriesDef('weight', 'live', colors(), translate),
    ...overrides,
  };
}

describe('series definitions', () => {
  it('takes the colour of a series from the settings, live and reference in both themes', () => {
    const live = fixedSeriesDef('weight', 'live', colors(), translate);
    const reference = fixedSeriesDef(
      'weight',
      'reference',
      colors(),
      translate,
    );

    expect(seriesColour(live, false)).toBe('#a1a1a1');
    expect(seriesColour(live, true)).toBe('#a2a2a2');
    expect(seriesColour(reference, false)).toBe('#b1b1b1');
    expect(seriesColour(reference, true)).toBe('#b2b2b2');
  });

  it('names, units and axes every fixed series as the brew graph does', () => {
    const defs = FIXED_SERIES_IDS.map((id) =>
      fixedSeriesDef(id, 'live', colors(), translate),
    );

    expect(defs.map((d) => [d.id, d.label, d.unit, d.axisId])).toEqual([
      ['weight', 'Weight', 'g', 'weight'],
      ['weightSecond', 'BREW_FLOW_WEIGHT_SECOND', 'g', 'weight'],
      ['flowPerSecond', 'BREW_FLOW_WEIGHT_PER_SECOND', 'g/s', 'flow'],
      ['realtimeFlow', 'Flow (Realtime)', 'g/s', 'flow'],
      ['realtimeFlowSecond', 'BREW_FLOW_WEIGHT_REALTIME_SECOND', 'g/s', 'flow'],
      ['pressure', 'BREW_PRESSURE_FLOW', 'bar', 'pressure'],
      ['temperature', 'BREW_TEMPERATURE_REALTIME', '°C', 'temperature'],
      ['waterDispensed', 'Water dispensed', 'ml', 'water'],
      [
        'waterDispensedFlowSecond',
        'BREW_FLOW_WATER_DISPENSED_REALTIME',
        'ml/s',
        'flow',
      ],
    ]);
  });

  it('names an imported axis "prefix: name" and keeps the sender name verbatim', () => {
    expect(
      customAxisName(
        {
          key: 'targetTemperature',
          namePrefix: 'BREW_IMPORT_METRIC_TARGET',
          name: 'BREW_FLOW_WEIGHT',
          unit: '°C',
          colorLight: '#000000',
          colorDark: '#ffffff',
        },
        translate,
      ),
    ).toBe('Target: BREW_FLOW_WEIGHT');
    expect(
      customAxisName(
        {
          key: 'w',
          name: 'BREW_FLOW_WEIGHT',
          unit: '',
          colorLight: '',
          colorDark: '',
        },
        translate,
      ),
    ).toBe('Weight');
  });

  it('gives a custom series the axis colours live and the settings reference colour as reference', () => {
    const axis = {
      key: 'tds',
      name: 'TDS',
      unit: '%',
      colorLight: '#123456',
      colorDark: '#abcdef',
      yAxisRangeMin: 0,
      yAxisRangeMax: 100,
      hiddenDefault: true,
    };
    const live = customSeriesDef(axis, 'live', colors(), translate);
    const reference = customSeriesDef(axis, 'reference', colors(), translate);

    expect(live.id).toBe('custom:tds');
    expect(live.axisId).toBe('custom:tds');
    expect(live.colour).toEqual({ light: '#123456', dark: '#abcdef' });
    expect(reference.colour).toEqual(
      DEFAULT_GRAPH_COLORS.customTrace.reference,
    );
    expect(live.range).toEqual({ min: 0, max: 100 });
    expect(live.hiddenByDefault).toBeTrue();
    expect(
      customSeriesDef(
        { ...axis, yAxisRangeMin: undefined, yAxisRangeMax: undefined },
        'live',
        colors(),
        translate,
      ).range,
    ).toBeUndefined();
  });

  it('defines every series of a loaded brew in graph order', () => {
    const flow = new BrewFlow();
    const sample = { timestamp: '00:00:00.000', brew_time: '0' };
    flow.customMetrics = {
      targetTemperature: [{ ...sample, value: 93 }],
      waterDispensed: [{ ...sample, value: 3 }],
      unnamed: [{ ...sample, value: 1 }],
    };
    flow.customAxes = [
      {
        key: 'targetTemperature',
        namePrefix: 'BREW_IMPORT_METRIC_TARGET',
        name: 'Temperature',
        unit: '°C',
        colorLight: '#123456',
        colorDark: null,
      },
    ];
    flow.pressureFlow = [{ ...sample, actual_pressure: 9, old_pressure: 0 }];
    const buffer = new FlowSeriesBuffer();
    buffer.load(flow);

    const defs = seriesDefsFor(buffer, 'live', colors(), translate);

    expect(defs.map((d) => d.id)).toEqual([
      'pressure',
      'custom:targetTemperature',
      'custom:waterDispensed',
      'custom:unnamed',
    ]);
    expect(defs[1].label).toBe('Target: Temperature');
    expect(defs[1].colour).toEqual({
      light: '#123456',
      dark: DEFAULT_GRAPH_COLORS.customTrace.active.dark,
    });
    expect(defs[2]).toEqual(
      jasmine.objectContaining({
        label: 'Water dispensed',
        unit: 'ml',
        colour: DEFAULT_GRAPH_COLORS.waterDispensed.active,
      }),
    );
    expect(defs[3]).toEqual(
      jasmine.objectContaining({
        label: 'unnamed',
        unit: '',
        colour: DEFAULT_GRAPH_COLORS.customTrace.active,
      }),
    );
  });

  it('reads the start visibility of the preparation style', () => {
    const settings = new Settings();
    const filter = graphSettingsFor(
      settings.graph,
      PREPARATION_STYLE_TYPE.POUR_OVER,
    );
    const espresso = graphSettingsFor(
      settings.graph,
      PREPARATION_STYLE_TYPE.ESPRESSO,
    );
    const realtime = def({ id: 'realtimeFlow', axisId: 'flow' });

    expect(filter).toBe(settings.graph.FILTER);
    expect(espresso).toBe(settings.graph.ESPRESSO);
    expect(graphSettingsFor(settings.graph, undefined)).toBe(
      settings.graph.FILTER,
    );
    expect(initiallyVisible(realtime, filter)).toBeFalse();
    expect(initiallyVisible(realtime, espresso)).toBeTrue();
    expect(initiallyVisible(realtime, null)).toBeTrue();
    expect(
      initiallyVisible(def({ id: 'waterDispensed', axisId: 'water' }), filter),
    ).toBeTrue();
    expect(
      initiallyVisible(def({ id: 'custom:tds', axisId: 'custom:tds' }), filter),
    ).toBeTrue();
    expect(
      initiallyVisible(def({ id: 'custom:tds', hiddenByDefault: true }), null),
    ).toBeFalse();
  });
});
