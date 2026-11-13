import { IConfig } from '../../interfaces/objectConfig/iObjectConfig';

/**
 * Collections whose entries carry change info (created_at, updated_at, rev,
 * updated_by).
 *
 * SETTINGS is left out on purpose: it is written all the time for filters and
 * sorting. VERSION is the local migration state of this installation.
 */
export const CHANGE_TRACKED_COLLECTIONS: readonly string[] = [
  'BEANS',
  'BREWS',
  'MILL',
  'PREPARATION',
  'WATER',
  'GREEN_BEANS',
  'ROASTING_MACHINES',
  'GRAPH',
  'BARISTAMODE_BREWS',
];

/** The change info fields of a config, see IConfig. */
export type ChangeInfo = Pick<
  IConfig,
  'created_at' | 'updated_at' | 'rev' | 'updated_by'
>;

const CHANGE_INFO_FIELDS: ReadonlyArray<keyof ChangeInfo> = [
  'created_at',
  'updated_at',
  'rev',
  'updated_by',
];

/** Timestamps below this value are taken as seconds, above as milliseconds. */
const SECONDS_LIMIT = 1e11;

export function isChangeTrackedCollection(_collection: string): boolean {
  return CHANGE_TRACKED_COLLECTIONS.includes(_collection);
}

/**
 * Estimates a creation time in milliseconds from a stored unix timestamp.
 * Seconds are converted, milliseconds are kept, anything else gives 0
 * (unknown).
 */
export function estimateCreatedAt(_unixTimestamp: unknown): number {
  const value = Number(_unixTimestamp);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return value < SECONDS_LIMIT ? value * 1000 : value;
}

/**
 * Copies the change info of a config, so it survives when the config object
 * is replaced or shared with the incoming entry.
 */
export function copyChangeInfo(
  _config: Partial<IConfig> | null | undefined,
): ChangeInfo {
  const copy: ChangeInfo = {};
  if (_config === null || _config === undefined) {
    return copy;
  }
  for (const field of CHANGE_INFO_FIELDS) {
    if (_config[field] !== undefined) {
      (copy as any)[field] = _config[field];
    }
  }
  return copy;
}

/**
 * Stamps a newly added entry. Values copied from a cloned or repeated entry
 * are overwritten.
 */
export function stampAdded(
  _config: IConfig,
  _now: number,
  _deviceId: string,
): void {
  _config.created_at = _now;
  _config.updated_at = _now;
  _config.rev = 1;
  _config.updated_by = _deviceId;
}

/** A revision as a number; missing or invalid values count as 0. */
function toRev(_rev: unknown): number {
  const value = Number(_rev);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/**
 * Stamps an updated entry.
 *
 * `_previous` is a copy of the change info of the stored entry, taken before
 * the stored entry is replaced. With `_touch` the revision always counts up
 * from the highest known value, even when the caller holds an outdated
 * object. Without `_touch` (system writes such as migrations) nothing counts
 * up and no undefined fields are created.
 */
export function stampUpdated(
  _previous: ChangeInfo,
  _config: IConfig,
  _now: number,
  _deviceId: string,
  _touch: boolean,
): void {
  if (_touch) {
    _config.created_at =
      _previous.created_at ??
      _config.created_at ??
      estimateCreatedAt(_config.unix_timestamp);
    _config.updated_at = _now;
    _config.rev = Math.max(toRev(_previous.rev), toRev(_config.rev)) + 1;
    _config.updated_by = _deviceId;
    return;
  }
  for (const field of CHANGE_INFO_FIELDS) {
    const value = _previous[field] ?? _config[field];
    if (value !== undefined) {
      (_config as any)[field] = value;
    }
  }
}

/** Counts kept by fillMissingChangeInfo for the caller's log. */
export interface FillChangeInfoStats {
  /** Entries left as they are because they have no config object. */
  skipped: number;
}

function isConfigObject(_value: unknown): _value is IConfig {
  return (
    typeof _value === 'object' && _value !== null && !Array.isArray(_value)
  );
}

function isValidTime(_value: unknown): boolean {
  return typeof _value === 'number' && Number.isFinite(_value) && _value >= 0;
}

/**
 * Fills in the change info of entries that do not carry it yet, for example
 * data stored before change tracking existed, or entries added by an older
 * app version.
 *
 * Only missing values (or values of the wrong type) are filled in, values
 * that are already there are never changed. Running it again on the same
 * entries therefore changes nothing.
 *
 * updated_at = 0 means the entry was last changed before change tracking
 * began, so it counts as older than any later change. rev = 0 and
 * updated_by = '' likewise mean "unknown". created_at is estimated from the
 * unix timestamp of the entry (0 when there is none).
 *
 * Entries are changed in place. Entries without a config object are left
 * alone and counted in `_stats.skipped`. Entries that share a uuid are each
 * filled the same way. Returns the number of changed entries.
 */
export function fillMissingChangeInfo(
  _entries: unknown[],
  _stats?: FillChangeInfoStats,
): number {
  if (!Array.isArray(_entries)) {
    return 0;
  }
  let changed = 0;
  for (const entry of _entries) {
    const config: unknown = isConfigObject(entry)
      ? (entry as { config?: unknown }).config
      : undefined;
    if (!isConfigObject(config)) {
      if (_stats) {
        _stats.skipped++;
      }
      continue;
    }
    let entryChanged = false;
    if (!isValidTime(config.created_at)) {
      config.created_at = estimateCreatedAt(config.unix_timestamp);
      entryChanged = true;
    }
    if (!isValidTime(config.updated_at)) {
      config.updated_at = 0;
      entryChanged = true;
    }
    if (!isValidTime(config.rev)) {
      config.rev = 0;
      entryChanged = true;
    }
    if (typeof config.updated_by !== 'string') {
      config.updated_by = '';
      entryChanged = true;
    }
    if (entryChanged) {
      changed++;
    }
  }
  return changed;
}
