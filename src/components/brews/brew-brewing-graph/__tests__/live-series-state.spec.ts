import { PreparationDeviceType } from '../../../../classes/preparationDevice';
import { Settings } from '../../../../classes/settings/settings';
import { DEFAULT_GRAPH_COLORS } from '../../../../data/defaultGraphColors';
import { PREPARATION_STYLE_TYPE } from '../../../../enums/preparations/preparationStyleTypes';
import {
  customSeriesDef,
  fixedSeriesDef,
  type FixedSeriesId,
  type SeriesDef,
  type SeriesId,
  type SeriesKind,
} from '../../graph/series-def';
import {
  awaitedLiveSeries,
  initiallyHidden,
  liveSeriesId,
  liveSeriesState,
  liveViewport,
  shownReferenceDefs,
  type ConnectedDevices,
} from '../live-series-state';

const translate = (key: string): string => `t(${key})`;

function fixed(kind: SeriesKind, ...ids: FixedSeriesId[]): SeriesDef[] {
  return ids.map((id) =>
    fixedSeriesDef(id, kind, DEFAULT_GRAPH_COLORS, translate),
  );
}

function custom(kind: SeriesKind, key: string, hidden = false): SeriesDef {
  return customSeriesDef(
    {
      key,
      name: key,
      unit: 'u',
      colorLight: '#010101',
      colorDark: '#fefefe',
      hiddenDefault: hidden,
    },
    kind,
    DEFAULT_GRAPH_COLORS,
    translate,
  );
}

describe('liveSeriesState', () => {
  it('keys the fixed series like the chip toggles, in the colours of the theme', () => {
    const defs = fixed('live', 'weight', 'flowPerSecond');
    const hidden = new Set<SeriesId>(['flowPerSecond']);

    expect(liveSeriesState(defs, hidden, false)).toEqual({
      weight: {
        visible: true,
        color: DEFAULT_GRAPH_COLORS.weight.active.light,
        name: 't(BREW_FLOW_WEIGHT)',
      },
      calc_flow: {
        visible: false,
        color: DEFAULT_GRAPH_COLORS.flowPerSecond.active.light,
        name: 't(BREW_FLOW_WEIGHT_PER_SECOND)',
      },
      custom: {},
    });
    expect(liveSeriesState(defs, hidden, true).weight.color).toBe(
      DEFAULT_GRAPH_COLORS.weight.active.dark,
    );
  });

  it('keeps a fixed series apart from a custom metric with the same key', () => {
    const defs = [
      ...fixed('live', 'waterDispensed'),
      custom('live', 'waterDispensed'),
    ];
    const state = liveSeriesState(
      defs,
      new Set<SeriesId>(['custom:waterDispensed']),
      false,
    );

    expect(state.waterDispensed.visible).toBeTrue();
    expect(state.custom['waterDispensed']).toEqual({
      visible: false,
      color: '#010101',
      name: 't(waterDispensed)',
    });
  });

  it('has no chips for references or before the graph is set up', () => {
    expect(
      liveSeriesState(fixed('reference', 'weight'), new Set(), false),
    ).toEqual({ custom: {} });
    expect(liveSeriesState([], new Set(), false)).toEqual({ custom: {} });
  });
});

describe('liveSeriesId', () => {
  it('maps a toggle key to its series and any other key to a custom metric', () => {
    expect(liveSeriesId('calc_flow')).toBe('flowPerSecond');
    expect(liveSeriesId('realtimeFlowSecond')).toBe('realtimeFlowSecond');
    expect(liveSeriesId('boiler')).toBe('custom:boiler');
    expect(liveSeriesId('toString')).toBe('custom:toString');
  });
});

describe('initiallyHidden', () => {
  it('hides what settings.graph hides and what an imported axis asks to hide', () => {
    const graph = new Settings().graph.FILTER;
    const defs = [
      ...fixed('live', 'weight', 'realtimeFlow', 'waterDispensed'),
      custom('live', 'boiler', true),
      custom('live', 'tds'),
    ];

    expect([...initiallyHidden(defs, graph)]).toEqual([
      'realtimeFlow',
      'custom:boiler',
    ]);
  });
});

describe('awaitedLiveSeries', () => {
  const none: ConnectedDevices = {
    scale: false,
    scaleTwoWeights: false,
    pressure: false,
    temperature: false,
    machine: undefined,
    style: PREPARATION_STYLE_TYPE.ESPRESSO,
  };
  const ids = (devices: Partial<ConnectedDevices>): SeriesId[] => [
    ...awaitedLiveSeries({ ...none, ...devices }),
  ];

  it('awaits weight and both flows from a scale', () => {
    expect(ids({ scale: true })).toEqual([
      'weight',
      'flowPerSecond',
      'realtimeFlow',
    ]);
    expect(ids({})).toEqual([]);
  });

  it('awaits pressure from a sensor only for espresso, temperature always', () => {
    expect(ids({ pressure: true, temperature: true })).toEqual([
      'pressure',
      'temperature',
    ]);
    expect(
      ids({ pressure: true, style: PREPARATION_STYLE_TYPE.POUR_OVER }),
    ).toEqual([]);
  });

  it('awaits what a machine and a scale with two weights deliver', () => {
    expect(ids({ machine: PreparationDeviceType.METICULOUS })).toEqual([
      'weight',
      'flowPerSecond',
      'realtimeFlow',
      'pressure',
    ]);
    expect(ids({ machine: PreparationDeviceType.SANREMO_YOU })).toEqual([
      'pressure',
      'temperature',
      'waterDispensed',
      'waterDispensedFlowSecond',
    ]);
    expect(ids({ machine: PreparationDeviceType.GAGGIMATE })).toContain(
      'waterDispensed',
    );
    expect(ids({ scaleTwoWeights: true })).toEqual([
      'weightSecond',
      'realtimeFlowSecond',
    ]);
  });
});

describe('shownReferenceDefs', () => {
  const references = [
    ...fixed(
      'reference',
      'weight',
      'flowPerSecond',
      'realtimeFlow',
      'weightSecond',
      'realtimeFlowSecond',
      'pressure',
      'temperature',
      'waterDispensed',
      'waterDispensedFlowSecond',
    ),
    custom('reference', 'boiler'),
    custom('reference', 'other'),
  ];
  const live = [...fixed('live', 'weight'), custom('live', 'boiler')];
  const ids = (defs: SeriesDef[]): SeriesId[] => defs.map((def) => def.id);

  it('shows pressure and temperature only with such a sensor, never the second scale', () => {
    expect(
      ids(
        shownReferenceDefs(references, live, {
          pressure: false,
          temperature: false,
        }),
      ),
    ).toEqual([
      'weight',
      'flowPerSecond',
      'realtimeFlow',
      'waterDispensed',
      'waterDispensedFlowSecond',
      'custom:boiler',
    ]);
    const withSensors = ids(
      shownReferenceDefs(references, live, {
        pressure: true,
        temperature: true,
      }),
    );
    expect(withSensors).toContain('pressure');
    expect(withSensors).toContain('temperature');
  });
});

describe('liveViewport', () => {
  const graphTime = new Settings().graph_time;
  graphTime.FILTER = { NORMAL_SCREEN: 120, FULL_SCREEN: 300 };
  const base = {
    graphTime,
    style: PREPARATION_STYLE_TYPE.ESPRESSO,
    maximized: false,
    timerRunning: true,
    hasSamples: true,
  };

  it('starts with graph_time of the style and grows while the timer runs', () => {
    expect(liveViewport(base)).toEqual({ mode: 'grow', startSec: 20 });
    expect(liveViewport({ ...base, maximized: true })).toEqual({
      mode: 'grow',
      startSec: 60,
    });
    expect(
      liveViewport({ ...base, style: PREPARATION_STYLE_TYPE.POUR_OVER }),
    ).toEqual({ mode: 'grow', startSec: 120 });
  });

  it('starts in the first window before anything is recorded', () => {
    expect(
      liveViewport({ ...base, timerRunning: false, hasSamples: false }),
    ).toEqual({ mode: 'grow', startSec: 20 });
  });

  it('shows a stopped brew whole, e.g. while editing it', () => {
    expect(liveViewport({ ...base, timerRunning: false })).toEqual({
      mode: 'fitAll',
    });
  });
});
