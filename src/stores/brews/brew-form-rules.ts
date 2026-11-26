/**
 * Whether a brew form holds input of the user. The form fills itself while
 * it opens (last brew, preparation device, graph), so its state once loaded
 * is the start. Coordinates arrive later from GPS and are no input.
 */
export interface BrewFormState {
  readonly data: string;
  readonly flowPoints: number;
}

interface FlowProfile {
  readonly weight?: readonly unknown[];
  readonly pressureFlow?: readonly unknown[];
  readonly temperatureFlow?: readonly unknown[];
}

/** How many values the brew graph holds. */
export function flowPoints(flow?: FlowProfile): number {
  return (
    (flow?.weight?.length ?? 0) +
    (flow?.pressureFlow?.length ?? 0) +
    (flow?.temperatureFlow?.length ?? 0)
  );
}

export function brewFormState(brew: object, flow?: FlowProfile): BrewFormState {
  return {
    data: JSON.stringify({ ...brew, coordinates: undefined }),
    flowPoints: flowPoints(flow),
  };
}

export interface BrewFormActivity {
  readonly timerRunning: boolean;
  /** The user typed or chose something before the form had loaded. */
  readonly enteredWhileLoading: boolean;
}

/**
 * Input made while the form still loads is part of the start state, so it
 * counts by itself. A running timer is input even before its first second.
 */
export function brewFormChanged(
  start: BrewFormState | undefined,
  now: BrewFormState,
  activity: BrewFormActivity,
): boolean {
  if (activity.timerRunning || activity.enteredWhileLoading) {
    return true;
  }
  return (
    start !== undefined &&
    (start.data !== now.data || start.flowPoints !== now.flowPoints)
  );
}
