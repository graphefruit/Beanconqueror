import { computed, linkedSignal, signal, Signal } from '@angular/core';

import { Observable } from 'rxjs';

import { DeepReadonly, freezeInDev } from './read-only';

/** What a store reads from a legacy collection; every `StorageClass` has it. */
export interface StoreSource {
  /** The entries in their stored form and order, only read. */
  getRawEntries(): readonly unknown[];
  /** Emits after every change of the collection. */
  attachOnEvent(): Observable<unknown>;
  /** Settles once the collection has been read, or could not be. */
  storageReady(): Promise<unknown>;
}

interface Snapshot<T> {
  readonly entries: readonly DeepReadonly<T>[];
  /** `JSON.stringify` of each stored entry, in the same order. */
  readonly prints: readonly string[];
}

/**
 * The entries of one collection for new code: read-only plain data behind a
 * signal. The storage stays the source of truth; the store only reads, and
 * legacy code keeps writing through the `ui*Storage` services.
 *
 * Every change of the collection, whoever made it, makes the next read
 * compare the stored entries with the previous ones by their JSON text: an
 * entry that did not change keeps its object, so `===` tells whether an
 * entry changed, and several changes before a read cost one comparison.
 */
export class CollectionStore<T> {
  private readonly version = signal(0);
  private readonly snapshot = linkedSignal<number, Snapshot<T>>({
    source: this.version,
    computation: (_version, previous) =>
      reconcile(
        previous?.value ?? { entries: [], prints: [] },
        this.source.getRawEntries(),
        this.ingest,
      ),
  });

  /** In stored order. Empty until the collection has been read. */
  public readonly entries: Signal<readonly DeepReadonly<T>[]> = computed(
    () => this.snapshot().entries,
  );

  /**
   * Emits after every change of the collection, before `entries` is read
   * again. Only for legacy code that has to act before a view shows the
   * change.
   */
  public readonly changes: Observable<unknown>;

  /**
   * @param ingest turns the JSON text of a stored entry into the entry this
   *   store hands out; the text is a copy, so nothing is shared with storage.
   */
  public constructor(
    private readonly source: StoreSource,
    private readonly ingest: (json: string) => T,
  ) {
    const markStale = () => this.version.update((version) => version + 1);
    this.changes = source.attachOnEvent();
    // Stores live as long as the app, so there is nothing to unsubscribe.
    this.changes.subscribe(markStale);
    // The first read of the collection sends no event.
    source.storageReady().then(markStale, markStale);
  }
}

/**
 * The snapshot of the stored entries `raw`, built from the previous one. Only
 * new and changed entries are ingested; an entry that is still there keeps
 * its object, also when it moved. When nothing changed, `previous` itself is
 * returned.
 */
function reconcile<T>(
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
