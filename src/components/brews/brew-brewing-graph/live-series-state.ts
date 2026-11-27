/** What a chip of the live graph shows for one series. */
export interface LiveSeriesChip {
  readonly visible: boolean;
  readonly color: string | undefined;
  readonly name: string | undefined;
}

/**
 * Chip state per fixed series, keyed like `toggleChartLines`. Custom metrics
 * sit apart, because an imported metric may share a fixed series' key.
 */
export type LiveSeriesState = Readonly<
  Partial<Record<keyof typeof LIVE_SERIES_TRACES, LiveSeriesChip>>
> & { readonly custom: Readonly<Record<string, LiveSeriesChip>> };

export interface LiveTrace {
  visible?: unknown;
  name?: string;
  line?: { color?: string };
}

/** Toggle key of each fixed series and the trace that draws it. */
export const LIVE_SERIES_TRACES = {
  weight: 'weightTrace',
  calc_flow: 'flowPerSecondTrace',
  realtime_flow: 'realtimeFlowTrace',
  pressure: 'pressureTrace',
  temperature: 'temperatureTrace',
  weightSecond: 'weightTraceSecond',
  realtimeFlowSecond: 'realtimeFlowTraceSecond',
  waterDispensed: 'waterDispensedTrace',
  waterDispensedFlowSecond: 'waterDispensedFlowSecondTrace',
} as const;

export function liveSeriesTraceKey(toggleKey: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(LIVE_SERIES_TRACES, toggleKey)
    ? LIVE_SERIES_TRACES[toggleKey as keyof typeof LIVE_SERIES_TRACES]
    : undefined;
}

export type LiveTraces = Partial<
  Record<
    (typeof LIVE_SERIES_TRACES)[keyof typeof LIVE_SERIES_TRACES],
    LiveTrace
  >
> & { customTraces?: Record<string, LiveTrace | undefined> };

function chip(trace: LiveTrace): LiveSeriesChip {
  return {
    visible: !!trace.visible,
    color: trace.line?.color,
    name: trace.name,
  };
}

/** Series without a trace have no entry, so their chip reads as hidden. */
export function liveSeriesState(
  traces: LiveTraces | undefined,
): LiveSeriesState {
  const state: Record<string, LiveSeriesChip> = {};
  const custom: Record<string, LiveSeriesChip> = {};
  for (const [key, traceKey] of Object.entries(LIVE_SERIES_TRACES)) {
    const trace = traces?.[traceKey];
    if (trace) {
      state[key] = chip(trace);
    }
  }
  for (const [key, trace] of Object.entries(traces?.customTraces ?? {})) {
    if (trace) {
      custom[key] = chip(trace);
    }
  }
  return { ...state, custom };
}
