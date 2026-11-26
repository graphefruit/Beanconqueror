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
