import {
  IBrewPressureFlow,
  IBrewRealtimeWaterFlow,
  IBrewWeightFlow,
} from '../../classes/brew/brewFlow';

/**
 * When a running espresso shot ends on its own. The rules read the measured
 * series of the brew (flow_profile_raw), never the drawn graph.
 */

export interface ShotEndByWeight {
  stopOnSteadyWeight: boolean;
  minFlow: number;
  brewTime: number;
  /** Weight the cup must have held, see shotEndMinimumWeight. */
  minimumWeight: number;
  /** Asked only when the cup never held the minimum weight. */
  endsBelowMinimumWeight: () => boolean;
}

/**
 * Without a target the dose stands for a 1:1 ratio. In barista mode the
 * blooming phase can pass the dose, so the rule waits for 90 % of the program
 * weight, or 10 g without a program weight.
 */
export function shotEndMinimumWeight(
  grindWeight: number,
  baristaMode: boolean,
  baristaTargetWeight: number | undefined,
): number {
  if (baristaMode) {
    return baristaTargetWeight !== undefined ? baristaTargetWeight * 0.9 : 10;
  }
  return grindWeight > 0 ? grindWeight : 5;
}

export function hasShotEndedByWeight(
  weights: readonly IBrewWeightFlow[],
  flows: readonly IBrewRealtimeWaterFlow[],
  rule: ShotEndByWeight,
): boolean {
  // At least 50 readings (about 5 s) and 5 s of brew time.
  if (
    rule.stopOnSteadyWeight === false ||
    weights.length < 50 ||
    rule.brewTime <= 5
  ) {
    return false;
  }
  // #875: the first 15 readings are skipped, some scales are slow to tare.
  const reached = weights.find(
    (w, i) => i >= 15 && w.actual_weight >= rule.minimumWeight,
  );
  if (
    (reached === undefined || reached.actual_weight === null) &&
    !rule.endsBelowMinimumWeight()
  ) {
    return false;
  }
  // The flow of the first 25 readings never counts.
  return (
    flows.length > 25 && flows[flows.length - 1].flow_value <= rule.minFlow
  );
}

export interface ShotEndByPressure {
  active: boolean;
  thresholdBar: number;
  brewTime: number;
}

export function hasShotEndedByPressure(
  pressures: readonly IBrewPressureFlow[],
  rule: ShotEndByPressure,
): boolean {
  if (rule.active === false || pressures.length < 100 || rule.brewTime <= 10) {
    return false;
  }
  return (
    pressures.some((p) => p.actual_pressure >= 1) &&
    pressures[pressures.length - 1].actual_pressure <= rule.thresholdBar
  );
}

/**
 * The machine finished the shot, but the timer still runs: the scale was
 * tared (cup lifted) or never weighed anything.
 */
export function scaleShowsShotEnd(
  weights: readonly IBrewWeightFlow[],
): boolean {
  if (weights.length === 0) {
    return true;
  }
  const last = weights[weights.length - 1].actual_weight;
  return weights.length > 40 && ((last >= 0 && last <= 0.5) || last <= -2);
}

/** The newest weight and flow, as the machine wants them. */
export function latestWeightAndFlow(
  weights: readonly IBrewWeightFlow[],
  flows: readonly IBrewRealtimeWaterFlow[],
): { weight: number | undefined; flow: number | undefined } {
  return {
    weight: weights[weights.length - 1]?.actual_weight,
    flow: flows[flows.length - 1]?.flow_value,
  };
}

/** A flow the machine measured replaces the flow from the weight. */
export function machineFlow(
  measuredFlow: number | null | undefined,
): number | undefined {
  return measuredFlow !== null &&
    measuredFlow !== undefined &&
    measuredFlow !== 0
    ? measuredFlow
    : undefined;
}
