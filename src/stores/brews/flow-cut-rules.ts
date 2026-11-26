import moment from 'moment';

import { BrewFlow, IBrewWeightFlow } from '../../classes/brew/brewFlow';

/** A brew's times that a cut moves along with the flow profile. */
export interface FlowCutBrewTimes {
  coffee_first_drip_time?: number;
  coffee_first_drip_time_milliseconds?: number;
  coffee_blooming_time?: number;
  coffee_blooming_time_milliseconds?: number;
}

/** The cut flow profile and the brew values that change with it. */
export interface FlowCut extends FlowCutBrewTimes {
  flowProfile: BrewFlow;
  finalWeight?: number;
}

/** What the cut dialog hands back on save. */
export interface FlowCutSave extends FlowCut {
  brew_time: number;
  brew_time_milliseconds: number;
}

/** The brew fields a saved cut sets. */
export interface FlowCutBrewFields extends FlowCutBrewTimes {
  brew_time: number;
  brew_time_milliseconds: number;
  brew_beverage_quantity: number;
  brew_quantity: number;
}

interface TimedSample {
  brew_time: string;
  timestamp: string;
}

function samplesOf(flowProfile: BrewFlow): TimedSample[][] {
  return [
    flowProfile.weight,
    flowProfile.pressureFlow,
    flowProfile.temperatureFlow,
    flowProfile.weightSecond,
    flowProfile.waterFlow,
    flowProfile.realtimeFlow,
    flowProfile.realtimeFlowSecond,
    flowProfile.waterDispensed,
    flowProfile.waterDispensedFlowSecond,
    flowProfile.brewbyweight,
    ...Object.values(flowProfile.customMetrics ?? {}),
  ];
}

/**
 * The time of the last sample in seconds, the upper end of a cut. Samples
 * without a brew time get it from their timestamp, in place: older imports
 * stored timestamps but left brew_time empty, and the cut needs it.
 */
export function calculateCutBounds(flowProfile: BrewFlow | undefined): number {
  let max = 0;
  if (flowProfile) {
    const arraysToCheck = samplesOf(flowProfile);

    const firstSample = arraysToCheck.find((arr) => arr?.length > 0)?.[0];
    if (firstSample) {
      const start = moment(firstSample.timestamp, 'HH:mm:ss.SSS', true);
      const startTime = Number.parseFloat(firstSample.brew_time);
      for (const arr of arraysToCheck) {
        for (const sample of arr ?? []) {
          if (!sample.brew_time?.trim()) {
            const timestamp = moment(sample.timestamp, 'HH:mm:ss.SSS', true);
            if (!start.isValid() || !timestamp.isValid()) {
              throw new Error(
                'Cannot recover brew time from invalid timestamp',
              );
            }
            sample.brew_time = (
              timestamp.diff(start, 'seconds', true) +
              (Number.isFinite(startTime) ? startTime : 0)
            ).toFixed(3);
          }
        }
      }
    }

    for (const arr of arraysToCheck) {
      if (arr && arr.length > 0) {
        const t = parseFloat(arr[arr.length - 1].brew_time);
        if (!isNaN(t) && t > max) {
          max = t;
        }
      }
    }
  }
  return Number(max.toFixed(3));
}

/**
 * The weight the preview of a cut ending at `upper` seconds shows: the last
 * weight up to then, from the second scale when the first has none.
 */
export function cutPreviewWeight(
  flowProfile: BrewFlow | undefined,
  upper: number,
): number {
  const endWeight = (samples: IBrewWeightFlow[] | undefined) => {
    if (!samples?.length) {
      return null;
    }
    for (let i = samples.length - 1; i >= 0; i--) {
      if (parseFloat(samples[i].brew_time) <= upper) {
        return samples[i].actual_weight;
      }
    }
    return 0;
  };
  const weight =
    endWeight(flowProfile?.weight) ?? endWeight(flowProfile?.weightSecond) ?? 0;
  return Math.max(0, Number(weight.toFixed(2)));
}

/** A time in seconds and milliseconds, moved `shiftMs` earlier, not below 0. */
function shiftTime(
  seconds: number,
  milliseconds: number,
  shiftMs: number,
): [number, number] {
  if (!(seconds > 0 || milliseconds > 0)) {
    return [seconds, milliseconds];
  }
  const shifted = seconds * 1000 + milliseconds - shiftMs;
  if (shifted <= 0) {
    return [0, 0];
  }
  return [Math.floor(shifted / 1000), Math.round(shifted % 1000)];
}

/**
 * Keeps the samples from `lower` to `upper` seconds and moves them so the
 * first kept sample starts at 0. Weights keep their absolute values; first
 * drip and blooming time of `brew` move along.
 */
export function performFlowCut(
  flowProfile: BrewFlow,
  lower: number,
  upper: number,
  brew?: FlowCutBrewTimes,
): FlowCut {
  let shiftSeconds = lower;
  let minTime = Infinity;
  for (const arr of samplesOf(flowProfile)) {
    const firstItem = arr?.find((item) => parseFloat(item.brew_time) >= lower);
    if (firstItem) {
      minTime = Math.min(minTime, parseFloat(firstItem.brew_time));
    }
  }
  if (minTime !== Infinity) {
    shiftSeconds = minTime;
  }
  const shiftMs = Math.round(shiftSeconds * 1000);

  const processArray = <T extends TimedSample>(arr: T[]): T[] => {
    if (!arr) return [];
    return arr
      .filter((item) => {
        const t = parseFloat(item.brew_time);
        return t >= lower && t <= upper;
      })
      .map((item) => ({
        ...item,
        brew_time: (parseFloat(item.brew_time) - shiftSeconds).toFixed(1),
        timestamp: moment(item.timestamp, 'HH:mm:ss.SSS')
          .subtract(shiftMs, 'milliseconds')
          .format('HH:mm:ss.SSS'),
      }));
  };

  const newProfile = new BrewFlow();
  newProfile.weight = processArray(flowProfile.weight);
  newProfile.weightSecond = processArray(flowProfile.weightSecond);
  newProfile.waterFlow = processArray(flowProfile.waterFlow);
  newProfile.realtimeFlow = processArray(flowProfile.realtimeFlow);
  newProfile.realtimeFlowSecond = processArray(flowProfile.realtimeFlowSecond);
  newProfile.pressureFlow = processArray(flowProfile.pressureFlow);
  newProfile.temperatureFlow = processArray(flowProfile.temperatureFlow);
  newProfile.waterDispensed = processArray(flowProfile.waterDispensed);
  newProfile.waterDispensedFlowSecond = processArray(
    flowProfile.waterDispensedFlowSecond,
  );
  newProfile.brewbyweight = processArray(flowProfile.brewbyweight);
  for (const [key, val] of Object.entries(flowProfile.customMetrics ?? {})) {
    newProfile.customMetrics[key] = processArray(val);
  }
  newProfile.customAxes = flowProfile.customAxes || [];

  const lastWeight = newProfile.weight.length
    ? newProfile.weight
    : newProfile.weightSecond;
  const finalWeight = lastWeight.length
    ? lastWeight[lastWeight.length - 1].actual_weight
    : 0;

  const [coffee_first_drip_time, coffee_first_drip_time_milliseconds] =
    shiftTime(
      brew?.coffee_first_drip_time ?? 0,
      brew?.coffee_first_drip_time_milliseconds ?? 0,
      shiftMs,
    );
  const [coffee_blooming_time, coffee_blooming_time_milliseconds] = shiftTime(
    brew?.coffee_blooming_time ?? 0,
    brew?.coffee_blooming_time_milliseconds ?? 0,
    shiftMs,
  );

  return {
    flowProfile: newProfile,
    finalWeight,
    coffee_first_drip_time,
    coffee_first_drip_time_milliseconds,
    coffee_blooming_time,
    coffee_blooming_time_milliseconds,
  };
}

/**
 * Sets the brew values of a saved cut on `brew`. A quantity that was not
 * entered stays empty.
 */
export function applyFlowCut(brew: FlowCutBrewFields, cut: FlowCutSave): void {
  brew.brew_time = cut.brew_time;
  brew.brew_time_milliseconds = cut.brew_time_milliseconds;
  if (cut.finalWeight !== undefined) {
    if (brew.brew_beverage_quantity > 0) {
      brew.brew_beverage_quantity = cut.finalWeight;
    }
    if (brew.brew_quantity > 0) {
      brew.brew_quantity = cut.finalWeight;
    }
  }
  if (cut.coffee_first_drip_time !== undefined) {
    brew.coffee_first_drip_time = cut.coffee_first_drip_time;
    brew.coffee_first_drip_time_milliseconds =
      cut.coffee_first_drip_time_milliseconds;
  }
  if (cut.coffee_blooming_time !== undefined) {
    brew.coffee_blooming_time = cut.coffee_blooming_time;
    brew.coffee_blooming_time_milliseconds =
      cut.coffee_blooming_time_milliseconds;
  }
}

/**
 * Where the flow profile from before the last cut is kept, one per brew:
 * `brews/<uuid>_flow_profile.json` → `brews/<uuid>_flow_profile.before-cut.json`.
 */
export function beforeCutPathOf(flowProfilePath: string): string {
  return flowProfilePath.replace(/(\.json)?$/, '.before-cut.json');
}
