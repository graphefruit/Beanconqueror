import type { IManageBrewParameter } from '../../interfaces/parameter/iManageBrewParameter';

/** What decides whether the brew form explains the hidden brew time. */
export interface TimeParameterHintState {
  /**
   * The switches the brew form follows: those of the preparation when it
   * uses custom parameters, the global ones otherwise.
   */
  parameters: Pick<IManageBrewParameter, 'brew_time'>;
  baristaMode: boolean;
  editing: boolean;
  hinted: boolean;
}

/**
 * Connected devices (scale, pressure and temperature sensor, machine) start
 * and stop a brew through the timer of the brew time parameter, so while it
 * is hidden they are ignored. A new brew says so once. The barista mode keeps
 * a hidden timer of its own, and an edited brew has been brewed already.
 */
export function timeParameterHintDue(_state: TimeParameterHintState): boolean {
  return (
    !_state.parameters.brew_time &&
    !_state.baristaMode &&
    !_state.editing &&
    !_state.hinted
  );
}
