import { collectAttachmentRefs } from './attachmentRefs';
import {
  CHANGE_INFO_FIELDS,
  CHANGE_TRACKED_COLLECTIONS,
} from './changeTracking';

/** What the cleanup did with the entries of one collection. */
export interface DuplicateCleanupResult {
  /** uuids that more than one entry carried. */
  groups: number;
  /** Entries that carried one of these uuids. */
  entries: number;
  /** Copies removed because an earlier entry with their uuid was identical. */
  removed: number;
  /** Differing copies that got a new uuid. */
  renamed: { uuid: string; new_uuid: string }[];
  /**
   * Shared uuids whose differing copies were all kept as they are, because
   * something refers to the uuid.
   */
  kept: string[];
}

function isRecord(_value: unknown): _value is Record<string, unknown> {
  return (
    typeof _value === 'object' &&
    _value !== null &&
    Object.prototype.toString.call(_value) === '[object Object]'
  );
}

function definedKeys(_value: Record<string, unknown>): string[] {
  return Object.keys(_value).filter((_key) => _value[_key] !== undefined);
}

/**
 * Deep comparison of stored values. A property set to undefined counts as
 * missing, as it is lost when the value is written as JSON. A hole in a list
 * counts as undefined. Values other than plain data (arrays, objects, dates
 * and primitives) only count as equal when they are the same object, so they
 * never make two entries look identical.
 */
function isSameValue(_a: unknown, _b: unknown): boolean {
  if (_a === _b) {
    return true;
  }
  if (typeof _a === 'number' && typeof _b === 'number') {
    return Number.isNaN(_a) && Number.isNaN(_b);
  }
  if (Array.isArray(_a) || Array.isArray(_b)) {
    if (!Array.isArray(_a) || !Array.isArray(_b) || _a.length !== _b.length) {
      return false;
    }
    // Every position, holes too: every() skips the holes of `_a` and would
    // take them for whatever `_b` holds there.
    for (let i = 0; i < _a.length; i++) {
      if (!isSameValue(_a[i], _b[i])) {
        return false;
      }
    }
    return true;
  }
  if (_a instanceof Date || _b instanceof Date) {
    return (
      _a instanceof Date && _b instanceof Date && _a.getTime() === _b.getTime()
    );
  }
  if (!isRecord(_a) || !isRecord(_b)) {
    return false;
  }
  const keys = definedKeys(_a);
  return (
    keys.length === definedKeys(_b).length &&
    keys.every((_key) => isSameValue(_a[_key], _b[_key]))
  );
}

function withoutChangeInfo(
  _entry: Record<string, unknown>,
): Record<string, unknown> {
  if (!isRecord(_entry.config)) {
    return _entry;
  }
  const config = { ..._entry.config };
  for (const field of CHANGE_INFO_FIELDS) {
    delete config[field];
  }
  return { ..._entry, config };
}

/** Entries with the same content; the change info is not compared. */
export function isSameEntry(_a: unknown, _b: unknown): boolean {
  if (_a === _b) {
    return true;
  }
  if (!isRecord(_a) || !isRecord(_b)) {
    return false;
  }
  return isSameValue(withoutChangeInfo(_a), withoutChangeInfo(_b));
}

function uuidOf(_entry: unknown): string | undefined {
  if (!isRecord(_entry) || !isRecord(_entry.config)) {
    return undefined;
  }
  const uuid = _entry.config.uuid;
  return typeof uuid === 'string' && uuid !== '' ? uuid : undefined;
}

/** Positions of the entries with a uuid, by uuid, in the stored order. */
function positionsByUuid(_entries: readonly unknown[]): Map<string, number[]> {
  const positions = new Map<string, number[]>();
  _entries.forEach((_entry, i) => {
    const uuid = uuidOf(_entry);
    if (uuid === undefined) {
      return;
    }
    const known = positions.get(uuid);
    if (known === undefined) {
      positions.set(uuid, [i]);
    } else {
      known.push(i);
    }
  });
  return positions;
}

/**
 * Splits the positions of entries sharing a uuid: the first entry and every
 * copy differing from all entries kept before it are distinct, the other
 * copies are identical to one of them.
 */
function splitIdenticalCopies(
  _entries: readonly unknown[],
  _found: readonly number[],
): { distinct: number[]; identical: number[] } {
  const distinct = [_found[0]];
  const identical: number[] = [];
  for (const position of _found.slice(1)) {
    if (
      distinct.some((_kept) => isSameEntry(_entries[_kept], _entries[position]))
    ) {
      identical.push(position);
    } else {
      distinct.push(position);
    }
  }
  return { distinct, identical };
}

/**
 * Flow profiles are read from a path built from the uuid of their entry, so
 * an entry that has one cannot get a new uuid without losing it. Photos are
 * stored under their own names and do not count.
 */
function hasFilesNamedAfterUuid(_collection: string, _entry: unknown): boolean {
  return collectAttachmentRefs(_collection, _entry).some(
    (_ref) => _ref.kind !== 'photo',
  );
}

/** Adds the searched uuids that occur in a text to `_found`. */
type MentionFinder = (_text: string, _found: Set<string>) => void;

function escapeForPattern(_text: string): string {
  return _text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Finds the uuids of `_uuids` in texts: as the whole text, like an id
 * field, or within it, like a file path. One pattern search per text, so
 * the time does not grow with the number of uuids.
 */
function createMentionFinder(_uuids: ReadonlySet<string>): MentionFinder {
  // Longer uuids first: where one contains another, the longer one is found.
  const sorted = [..._uuids].sort((_a, _b) => _b.length - _a.length);
  const shortest = sorted[sorted.length - 1].length;
  const pattern = new RegExp(sorted.map(escapeForPattern).join('|'), 'g');
  return (_text, _found) => {
    if (_uuids.has(_text)) {
      _found.add(_text);
      return;
    }
    if (_text.length <= shortest) {
      return;
    }
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(_text)) !== null) {
      _found.add(match[0]);
    }
  };
}

/** Adds every searched uuid that occurs in `_value` to `_found`. */
function collectMentions(
  _value: unknown,
  _find: MentionFinder,
  _found: Set<string>,
  _skipUuidOfConfig: boolean,
): void {
  if (typeof _value === 'string') {
    _find(_value, _found);
  } else if (Array.isArray(_value)) {
    for (const item of _value) {
      collectMentions(item, _find, _found, false);
    }
  } else if (typeof _value === 'object' && _value !== null) {
    for (const [key, item] of Object.entries(_value)) {
      _find(key, _found);
      if (_skipUuidOfConfig && key === 'config' && isRecord(item)) {
        // The uuid of the entry itself is no reference to it.
        for (const [configKey, configItem] of Object.entries(item)) {
          if (configKey !== 'uuid') {
            _find(configKey, _found);
            collectMentions(configItem, _find, _found, false);
          }
        }
      } else {
        collectMentions(item, _find, _found, false);
      }
    }
  }
}

/**
 * The uuids of `_uuids` that something in `_values` refers to: an id field,
 * a file path, a key or any other text containing the uuid. The own uuid of
 * a stored entry (its config.uuid) does not count. Mentions of a uuid inside
 * an entry listed in `_ignore` under that uuid do not count either.
 */
function findReferencedUuids(
  _uuids: ReadonlySet<string>,
  _values: unknown[],
  _ignore: ReadonlyMap<unknown, string>,
): Set<string> {
  const find = createMentionFinder(_uuids);
  const referenced = new Set<string>();
  for (const value of _values) {
    if (!Array.isArray(value)) {
      collectMentions(value, find, referenced, false);
      continue;
    }
    for (const entry of value) {
      const ignored = _ignore.get(entry);
      if (ignored === undefined) {
        collectMentions(entry, find, referenced, true);
        continue;
      }
      const found = new Set<string>();
      collectMentions(entry, find, found, true);
      found.delete(ignored);
      for (const uuid of found) {
        referenced.add(uuid);
      }
    }
  }
  return referenced;
}

/**
 * Cleans up entries of one collection that share a uuid. Long used
 * installations can contain such copies, left by older app versions.
 * Everything that refers to a uuid finds the first entry carrying it, and
 * changes are always stored into that first entry.
 *
 * - A copy that is identical to an earlier entry with its uuid is removed;
 *   the first entry stays. The change info is not compared.
 * - Copies that differ are never removed. They get a new uuid, so they
 *   become entries of their own, but only when provably nothing depends on
 *   the shared uuid: apart from the first entry, which keeps the uuid and
 *   everything it refers to, the uuid occurs nowhere (not as an id, not in
 *   a file path, not in the settings, nowhere else), and no differing copy
 *   has a flow profile, as flow profiles are found by the uuid of their
 *   entry.
 * - Otherwise all copies stay as they are, and the uuid is listed in `kept`.
 *
 * `_entries` is changed in place; the order of the remaining entries stays.
 * Entries without a uuid are left alone. Nothing is written to the deletion
 * journal: the removed copies never were entries of their own. Running it
 * again on the result changes nothing.
 *
 * @param _collection storage key of the collection, for example 'BREWS'
 * @param _entries the stored entries of the collection
 * @param _data all stored data by storage key, to look for references; the
 *   value for `_collection` is not read, `_entries` is used instead
 * @param _createUuid gives the new uuid of a differing copy, see
 *   deriveNewUuids; a uuid the collection already holds is refused
 */
export function removeDuplicateEntries(
  _collection: string,
  _entries: unknown[],
  _data: Readonly<Record<string, unknown>>,
  _createUuid: (_copy: unknown) => string,
): DuplicateCleanupResult {
  const result: DuplicateCleanupResult = {
    groups: 0,
    entries: 0,
    removed: 0,
    renamed: [],
    kept: [],
  };
  if (!Array.isArray(_entries)) {
    return result;
  }

  const removed = new Set<number>();
  /** Differing copies after the first entry, by shared uuid. */
  const differing = new Map<string, number[]>();
  /** The first entry and removed copies of each shared uuid. */
  const ignore = new Map<unknown, string>();
  const positions = positionsByUuid(_entries);
  for (const [uuid, found] of positions) {
    if (found.length < 2) {
      continue;
    }
    result.groups++;
    result.entries += found.length;
    const { distinct, identical } = splitIdenticalCopies(_entries, found);
    for (const position of identical) {
      removed.add(position);
    }
    if (distinct.length > 1) {
      differing.set(uuid, distinct.slice(1));
      ignore.set(_entries[found[0]], uuid);
      for (const position of identical) {
        ignore.set(_entries[position], uuid);
      }
    }
  }

  // Nothing is changed before every decision is made and every new uuid is
  // known, so a failure leaves the entries as they were.
  const newUuids = new Map<number, string>();
  if (differing.size > 0) {
    const taken = new Set(positions.keys());
    const values = Object.keys(_data)
      .filter((_key) => _key !== _collection)
      .map((_key) => _data[_key]);
    values.push(_entries);
    const referenced = findReferencedUuids(
      new Set(differing.keys()),
      values,
      ignore,
    );
    for (const [uuid, copies] of differing) {
      if (
        referenced.has(uuid) ||
        copies.some((_position) =>
          hasFilesNamedAfterUuid(_collection, _entries[_position]),
        )
      ) {
        result.kept.push(uuid);
        continue;
      }
      for (const position of copies) {
        const newUuid = _createUuid(_entries[position]);
        if (taken.has(newUuid)) {
          throw new Error(`The uuid ${newUuid} is already taken`);
        }
        taken.add(newUuid);
        newUuids.set(position, newUuid);
        result.renamed.push({ uuid, new_uuid: newUuid });
      }
    }
  }

  for (const [position, newUuid] of newUuids) {
    const copy = _entries[position];
    // Always true, only entries with a uuid are grouped.
    if (isRecord(copy) && isRecord(copy.config)) {
      // A copy of the config, in case the entries share their config.
      copy.config = { ...copy.config, uuid: newUuid };
    }
  }
  if (removed.size > 0) {
    let next = 0;
    for (let i = 0; i < _entries.length; i++) {
      if (!removed.has(i)) {
        _entries[next++] = _entries[i];
      }
    }
    _entries.length = next;
    result.removed = removed.size;
  }
  return result;
}

/**
 * The entry as text that is the same wherever the entry is stored: as JSON
 * writes it, so as a backup file holds it, with the keys in a fixed order.
 */
function stableJson(_value: unknown): string {
  return JSON.stringify(_value, (_key, _item: unknown) =>
    isRecord(_item)
      ? Object.fromEntries(
          Object.keys(_item)
            .sort()
            .map((_name) => [_name, _item[_name]]),
        )
      : _item,
  );
}

/**
 * A uuid made from the SHA-256 of the collection, the entry and `_attempt`.
 * It is marked as version 8 (RFC 9562), a uuid that is not random.
 */
async function deriveUuid(
  _collection: string,
  _entry: Record<string, unknown>,
  _attempt: number,
): Promise<string> {
  const text = stableJson([_collection, withoutChangeInfo(_entry), _attempt]);
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes.subarray(0, 16), (_byte) =>
    _byte.toString(16).padStart(2, '0'),
  ).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Derives the new uuids removeDuplicateEntries gives the differing copies
 * in `_entries`, and resolves to its `_createUuid`. Two devices that clean
 * up the same data give the same copy the same uuid that way, so a later
 * sync does not take it for two entries.
 *
 * The uuid is derived from the collection and the content of the copy with
 * the shared uuid, whatever the order of its keys. The change info is left
 * out: an import cleans up before it is filled in, the update at start
 * after, and both must give the same uuid. A derived uuid that the
 * collection already holds, or that another copy got, is derived again with
 * a counter, so no two entries end up with the same uuid.
 *
 * Nothing is changed and this never rejects. The returned function throws
 * for an entry that was not a differing copy when this ran, or whose uuid
 * could not be derived.
 */
export async function deriveNewUuids(
  _collection: string,
  _entries: readonly unknown[],
): Promise<(_copy: unknown) => string> {
  const newUuids = new Map<unknown, string>();
  let failure = new Error('No uuid was derived for this entry');
  try {
    const positions = positionsByUuid(Array.isArray(_entries) ? _entries : []);
    const taken = new Set(positions.keys());
    for (const found of positions.values()) {
      if (found.length < 2) {
        continue;
      }
      const { distinct } = splitIdenticalCopies(_entries, found);
      for (const position of distinct.slice(1)) {
        const copy: unknown = _entries[position];
        // Always true, only entries with a uuid are grouped.
        if (!isRecord(copy)) {
          continue;
        }
        let attempt = 0;
        let uuid = await deriveUuid(_collection, copy, attempt);
        while (taken.has(uuid)) {
          uuid = await deriveUuid(_collection, copy, ++attempt);
        }
        taken.add(uuid);
        newUuids.set(copy, uuid);
      }
    }
  } catch (ex) {
    // Only fails the cleanup when a copy needs a new uuid: most copies are
    // removed or kept, which works without.
    failure = ex instanceof Error ? ex : new Error(String(ex));
  }
  return (_copy) => {
    const uuid = newUuids.get(_copy);
    if (uuid === undefined) {
      throw failure;
    }
    return uuid;
  };
}

/**
 * Runs removeDuplicateEntries for every change tracked collection in
 * `_data`, for example a backup that is imported. References are looked for
 * in all of `_data`. The collections are changed in place. Returns the
 * results of the collections that contain entries sharing a uuid.
 */
export async function removeDuplicateEntriesFromData(
  _data: Record<string, unknown>,
): Promise<Record<string, DuplicateCleanupResult>> {
  const results: Record<string, DuplicateCleanupResult> = {};
  if (typeof _data !== 'object' || _data === null) {
    return results;
  }
  for (const collection of CHANGE_TRACKED_COLLECTIONS) {
    const entries = _data[collection];
    if (!Array.isArray(entries)) {
      continue;
    }
    const result = removeDuplicateEntries(
      collection,
      entries,
      _data,
      await deriveNewUuids(collection, entries),
    );
    if (result.groups > 0) {
      results[collection] = result;
    }
  }
  return results;
}

/** Number of changed entries: removed copies and copies with a new uuid. */
export function countChangedEntries(_result: DuplicateCleanupResult): number {
  return _result.removed + _result.renamed.length;
}

/**
 * The entries at `_positions` as a backup file holds them: written as JSON
 * and read back. JSON writes NaN, Infinity and holes or undefined in a list
 * as null, and a date as text.
 */
function asInBackupFile(
  _entries: readonly unknown[],
  _positions: readonly number[],
): unknown[] {
  const copies: unknown[] = JSON.parse(
    JSON.stringify(_positions.map((_position) => _entries[_position])),
  );
  return copies;
}

/**
 * Number of entries a backup of `_entries` keeps once an import removed the
 * identical copies with removeDuplicateEntries: differing copies and entries
 * without a uuid count, they are never removed. Copies are compared as the
 * backup file holds them, so a copy that only differs in a value JSON writes
 * alike counts as identical, as it does in the backup. Stored entries and a
 * backup of them are counted alike that way. Only the entries sharing a uuid
 * are written as JSON; when one cannot be, this throws, as writing a backup
 * of it does. `_entries` is not changed, and references are not looked for,
 * as they only decide about new uuids.
 */
export function countWithoutIdenticalCopies(
  _entries: readonly unknown[],
): number {
  let identical = 0;
  for (const found of positionsByUuid(_entries).values()) {
    if (found.length > 1) {
      const copies = asInBackupFile(_entries, found);
      identical += splitIdenticalCopies(copies, [...copies.keys()]).identical
        .length;
    }
  }
  return _entries.length - identical;
}
