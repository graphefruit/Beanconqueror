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
      boiler: { visible: true, color: '#333', name: 'Boiler' },
    });
  });

  it('is empty before the graph has traces', () => {
    expect(liveSeriesState(undefined)).toEqual({});
    expect(liveSeriesState({})).toEqual({});
  });
});

describe('liveSeriesTraceKey', () => {
  it('maps a toggle key to its trace and leaves custom keys alone', () => {
    expect(liveSeriesTraceKey('calc_flow')).toBe('flowPerSecondTrace');
    expect(liveSeriesTraceKey('boiler')).toBeUndefined();
    expect(liveSeriesTraceKey('toString')).toBeUndefined();
  });
});
