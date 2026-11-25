import { computed, signal, Signal } from '@angular/core';

import { Observable } from 'rxjs';

import type {
  StorageChanges,
  StorageChangesResult,
} from '../../classes/storageClass';
import type { UILog } from '../../services/uiLog';
import { DeepReadonly, freezeInDev } from './read-only';
import { readSettled, StoreHub } from './store-hub';

/** What a store reads from a legacy collection; every `StorageClass` has it. */
export interface StoreSource {
  /** The entries in their stored form and order, only read. */
  getRawEntries(): readonly unknown[];
  /** Emits after every change of the collection. */
  attachOnEvent(): Observable<unknown>;
  /** Settles once the collection has been read, or could not be. */
  storageReady(): Promise<unknown>;
  /** Whether the stored entries were read. */
  isRead(): boolean;
  /**
   * Saves the changes with one write. When the save fails, the entries in
   * memory are the ones from before and the user has been told.
   */
  applyChanges<E>(changes: StorageChanges<E>): Promise<StorageChangesResult<E>>;
}

/** What every stored entry has. */
export interface StoredEntry {
  readonly config: { readonly uuid: string };
}

interface Snapshot<T> {
  readonly entries: readonly DeepReadonly<T>[];
  /** `JSON.stringify` of each stored entry, in the same order. */
  readonly prints: readonly string[];
}

/**
 * The entries of one collection for new code: read-only plain data behind a
 * signal. Stored entries that are no objects are left out. The storage stays
 * the source of truth: the store writes only through it, and legacy code
 * keeps writing through the `ui*Storage` services.
 *
 * Every change of the collection, whoever made it, makes the next read
 * compare the stored entries with the previous ones by their JSON text: an
 * entry that did not change keeps its object, so `===` tells whether an
 * entry changed, and several changes before a read cost one comparison.
 */
export class CollectionStore<T extends StoredEntry> {
  private readonly version = signal(0);
  private readonly snapshot: Signal<Snapshot<T>>;
  private skipped = 0;
  private lastWrite: Promise<unknown> = Promise.resolve();

  /**
   * In stored order. Empty until the collection has been read; while it is
   * read anew, the entries read before.
   */
  public readonly entries: Signal<readonly DeepReadonly<T>[]>;

  /**
   * Emits after every change of the collection, before `entries` is read
   * again. Only for legacy code that has to act before a view shows the
   * change.
   */
  public readonly changes: Observable<unknown>;

  /**
   * @param ingest turns the JSON text of a stored entry into the entry this
   *   store hands out; the text is a copy, so nothing is shared with storage.
   * @param toStored turns an entry into the form its storage writes.
   */
  public constructor(
    private readonly source: StoreSource,
    private readonly ingest: (json: string) => T,
    private readonly uiLog: Pick<UILog, 'error'>,
    private readonly toStored: (entry: T) => unknown,
    hub: StoreHub,
  ) {
    const empty: Snapshot<T> = { entries: [], prints: [] };
    this.snapshot = readSettled(
      hub,
      source,
      this.version,
      (previous) =>
        reconcile(previous ?? empty, this.storedObjects(), this.ingest),
      empty,
    );
    this.entries = computed(() => this.snapshot().entries);
    const markStale = () => this.version.update((version) => version + 1);
    this.changes = source.attachOnEvent();
    // Stores live as long as the app, so there is nothing to unsubscribe.
    this.changes.subscribe(markStale);
    // The first read of the collection sends no event.
    source.storageReady().then(markStale, markStale);
  }

  /**
   * Stores a new entry. The storage gives it its uuid and time, as for
   * legacy code. Resolves the uuid, or undefined when it was not saved.
   */
  public add(entry: T): Promise<string | undefined> {
    return this.inTurn(async () => {
      const { saved, added } = await this.source.applyChanges({
        add: [this.toStored(entry)],
      });
      return saved ? (added[0] as StoredEntry).config.uuid : undefined;
    });
  }

  /**
   * Changes the entry with this uuid: `change` gets a copy of it as it is
   * when the writes before have ended. Resolves whether it was saved; when
   * not, nothing changed.
   */
  public update(uuid: string, change: (draft: T) => void): Promise<boolean> {
    return this.inTurn(async () => {
      const entry = this.find(uuid, 'update');
      if (!entry) {
        return false;
      }
      const draft = JSON.parse(JSON.stringify(entry)) as T;
      change(draft);
      const { saved } = await this.source.applyChanges({
        update: [this.toStored(draft)],
      });
      return saved;
    });
  }

  /** Removes the entry with this uuid. Resolves whether it was saved. */
  public remove(uuid: string): Promise<boolean> {
    return this.inTurn(async () => {
      if (!this.find(uuid, 'remove')) {
        return false;
      }
      return (await this.source.applyChanges({ remove: [uuid] })).saved;
    });
  }

  /**
   * Writes of the store run one after the other, so each one starts from
   * what the one before saved: two quick taps on a toggle end where they
   * began.
   */
  private inTurn<R>(write: () => Promise<R>): Promise<R> {
    const result = this.lastWrite.then(write);
    this.lastWrite = result.catch(() => undefined);
    return result;
  }

  private find(uuid: string, action: string): DeepReadonly<T> | undefined {
    const entry = this.entries().find((stored) => stored.config.uuid === uuid);
    if (!entry) {
      this.uiLog.error(`Store - ${action} - ${uuid} not found, nothing saved`);
    }
    return entry;
  }

  /**
   * The stored entries without those that are no objects. A broken entry
   * stays in the storage as it is; here it would make every read throw and
   * hide the whole collection.
   */
  private storedObjects(): readonly unknown[] {
    const raw = this.source.getRawEntries();
    const objects = raw.filter(
      (entry) => entry !== null && typeof entry === 'object',
    );
    const skipped = raw.length - objects.length;
    // Only when the number changes, not with every read. The entries
    // themselves are user data and stay out of the log.
    if (skipped !== this.skipped) {
      this.skipped = skipped;
      if (skipped > 0) {
        this.uiLog.error(
          `Store skipped ${skipped} stored entries that are no objects`,
        );
      }
    }
    return objects;
  }
}

/**
 * The snapshot of the stored entries `raw`, built from the previous one. Only
 * new and changed entries are ingested; an entry that is still there keeps
 * its object, also when it moved. When nothing changed, `previous` itself is
 * returned.
 */
function reconcile<T extends StoredEntry>(
  previous: Snapshot<T>,
  raw: readonly unknown[],
  ingest: (json: string) => T,
): Snapshot<T> {
  const unused = new Map<string, DeepReadonly<T>[]>();
  previous.prints.forEach((print, i) => {
    const known = unused.get(print);
    if (known) {
      known.push(previous.entries[i]);
    } else {
      unused.set(print, [previous.entries[i]]);
    }
  });

  const prints = raw.map((entry) => JSON.stringify(entry));
  const entries = prints.map(
    (print) => unused.get(print)?.shift() ?? freezeInDev(ingest(print)),
  );
  const unchanged =
    entries.length === previous.entries.length &&
    entries.every((entry, i) => entry === previous.entries[i]);
  if (unchanged) {
    return previous;
  }
  // The list is frozen as well: sorted in place, it would no longer match
  // the prints. Its entries are read-only already.
  freezeInDev(entries);
  return { entries, prints };
}
