import type { BrewFlow } from '../../classes/brew/brewFlow';

function averageOfPositive(values: readonly unknown[]): number {
  const positive = values.filter(
    (value): value is number => typeof value === 'number' && value > 0,
  );
  return positive.length > 0
    ? positive.reduce((sum, value) => sum + value, 0) / positive.length
    : 0;
}

/**
 * The average flow of a brew in g/s, over the moments something flowed: the
 * flow per second of the scale, else, e.g. on the Meticulous, the realtime
 * flow. 0 without either.
 */
export function averageFlow(flow: BrewFlow | null | undefined): number {
  if (flow?.waterFlow?.length > 0) {
    return averageOfPositive(flow.waterFlow.map((entry) => entry?.value));
  }
  if (flow?.realtimeFlow?.length > 0) {
    return averageOfPositive(
      flow.realtimeFlow.map((entry) => entry?.flow_value),
    );
  }
  return 0;
}

/** The highest realtime flow of a brew in g/s, 0 without one. */
export function peakFlow(flow: BrewFlow | null | undefined): number {
  let peak = -Infinity;
  for (const entry of flow?.realtimeFlow ?? []) {
    if (Number.isFinite(entry?.flow_value) && entry.flow_value > peak) {
      peak = entry.flow_value;
    }
  }
  return Number.isFinite(peak) ? peak : 0;
}
