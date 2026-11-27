import { liveSeriesState, liveSeriesTraceKey } from '../live-series-state';

describe('liveSeriesState', () => {
  it('keys the fixed series like the chip toggles', () => {
    const state = liveSeriesState({
      weightTrace: { visible: true, name: 'Weight', line: { color: '#111' } },
      flowPerSecondTrace: { visible: false, line: { color: '#222' } },
      waterDispensedFlowSecondTrace: { visible: 'legendonly' },
    });

    expect(state).toEqual({
      weight: { visible: true, color: '#111', name: 'Weight' },
      calc_flow: { visible: false, color: '#222', name: undefined },
      waterDispensedFlowSecond: {
        visible: true,
        color: undefined,
        name: undefined,
      },
      custom: {},
    });
  });

  it('adds the custom metrics under their own key and skips empty slots', () => {
    const state = liveSeriesState({
      customTraces: {
        boiler: { visible: true, name: 'Boiler', line: { color: '#333' } },
        gone: undefined,
      },
    });

    expect(state).toEqual({
      custom: { boiler: { visible: true, color: '#333', name: 'Boiler' } },
    });
  });

  it('keeps a fixed series apart from a custom metric with the same key', () => {
    const state = liveSeriesState({
      waterDispensedTrace: { visible: true, line: { color: '#111' } },
      customTraces: {
        waterDispensed: { visible: false, line: { color: '#999' } },
      },
    });

    expect(state.waterDispensed).toEqual({
      visible: true,
      color: '#111',
      name: undefined,
    });
    expect(state.custom['waterDispensed']).toEqual({
      visible: false,
      color: '#999',
      name: undefined,
    });
  });

  it('is empty before the graph has traces', () => {
    expect(liveSeriesState(undefined)).toEqual({ custom: {} });
    expect(liveSeriesState({})).toEqual({ custom: {} });
  });
});

describe('liveSeriesTraceKey', () => {
  it('maps a toggle key to its trace and leaves custom keys alone', () => {
    expect(liveSeriesTraceKey('calc_flow')).toBe('flowPerSecondTrace');
    expect(liveSeriesTraceKey('boiler')).toBeUndefined();
    expect(liveSeriesTraceKey('toString')).toBeUndefined();
  });
});
