/** The data updates, in the order they run at the start. */
export const DATA_UPDATES: readonly string[] = [
  'UPDATE_1',
  'UPDATE_2',
  'UPDATE_3',
  'UPDATE_4',
  'UPDATE_5',
  'UPDATE_6',
  'UPDATE_7',
  'UPDATE_8',
  'UPDATE_9',
  'UPDATE_10',
  'UPDATE_11',
  'UPDATE_12',
  'UPDATE_13',
  'UPDATE_14',
  'UPDATE_15',
  'UPDATE_16',
  'UPDATE_17',
  'UPDATE_18',
  'UPDATE_19',
];

/** The updates before it were released before the backup existed. */
const FIRST_UPDATE_BACKED_UP_BEFORE = 16;

/**
 * Whether the current data is written into a backup file before `_update`
 * runs: every update from UPDATE_16 on, also each one added later, so a new
 * update can never run without one.
 */
export function isBackedUpBefore(_update: string): boolean {
  const match = /^UPDATE_(\d+)$/.exec(_update);
  return match !== null && Number(match[1]) >= FIRST_UPDATE_BACKED_UP_BEFORE;
}

/**
 * The data update that stayed open at the last starts in a row, stored on
 * this installation only.
 */
export interface FailedDataUpdate {
  update: string;
  starts: number;
}

/**
 * What is stored after a start at which `_failed` stayed open, undefined
 * when every update finished. `_previous` is what was stored before, of
 * any shape.
 */
export function nextFailedDataUpdate(
  _previous: unknown,
  _failed: string | undefined,
): FailedDataUpdate | undefined {
  if (_failed === undefined) {
    return undefined;
  }
  const previous = _previous as Partial<FailedDataUpdate> | null | undefined;
  const starts = previous?.starts;
  return {
    update: _failed,
    starts:
      previous?.update === _failed && Number.isInteger(starts)
        ? Number(starts) + 1
        : 1,
  };
}

/**
 * The hint shows once, at the second start in a row at which the same
 * update stayed open: one start can fail for a passing reason, such as
 * the app being closed.
 */
export function showsFailedDataUpdateHint(
  _failed: FailedDataUpdate | undefined,
): boolean {
  return _failed?.starts === 2;
}
