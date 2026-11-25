import { Subject } from 'rxjs';

import type {
  StorageChanges,
  StorageChangesResult,
} from '../../../classes/storageClass';
import { StoredEntry, StoreSource } from '../collection-store';

/** A collection in memory that announces its changes like `StorageClass`. */
export class FakeStoreSource implements StoreSource {
  public entries: unknown[] = [];
  /** While set, every save fails and nothing changes. */
  public failSaves = false;
  private read = false;
  private readonly events = new Subject<unknown>();
  private settle!: { resolve: () => void; reject: () => void };
  private readonly ready = new Promise<void>((resolve, reject) => {
    this.settle = { resolve, reject };
  });

  public getRawEntries(): readonly unknown[] {
    return this.entries;
  }

  public attachOnEvent() {
    return this.events.asObservable();
  }

  public storageReady(): Promise<unknown> {
    return this.ready;
  }

  public isRead(): boolean {
    return this.read;
  }

  /** The first read of the collection, which sends no event. */
  public async load(entries: unknown[]): Promise<void> {
    this.entries = entries;
    this.read = true;
    this.settle.resolve();
    await this.ready;
  }

  /** The first read fails; the collection looks empty. */
  public async fail(): Promise<void> {
    this.entries = [];
    this.settle.reject();
    await this.ready.catch(() => undefined);
  }

  /**
   * Reads the collection anew, as `StorageClass.reinitializeStorage` does:
   * the event comes at the end, also when `entries` could not be read.
   */
  public reread(entries: unknown[] | 'unreadable'): void {
    this.read = entries !== 'unreadable';
    this.entries = this.read ? (entries as unknown[]) : [];
    this.events.next({ type: 'REINITIALIZE' });
  }

  /** A change as legacy code makes it: new array content, then the event. */
  public change(entries: unknown[]): void {
    this.entries = entries;
    this.events.next({ type: 'UPDATE' });
  }

  /** Like `StorageClass.applyChanges`, without change info and journal. */
  public applyChanges<E>(
    changes: StorageChanges<E>,
  ): Promise<StorageChangesResult<E>> {
    return Promise.resolve(this.apply(changes));
  }

  private apply<E>(changes: StorageChanges<E>): StorageChangesResult<E> {
    const copy = <V>(value: V): V => JSON.parse(JSON.stringify(value)) as V;
    const entries = [...this.entries] as StoredEntry[];
    const at = (uuid: string) =>
      entries.findIndex((entry) => entry.config.uuid === uuid);
    for (const update of (changes.update ?? []) as StoredEntry[]) {
      if (at(update.config.uuid) < 0) {
        return { saved: false, added: [] };
      }
      entries[at(update.config.uuid)] = copy(update);
    }
    for (const uuid of changes.remove ?? []) {
      if (at(uuid) >= 0) {
        entries.splice(at(uuid), 1);
      }
    }
    const added = (changes.add ?? []).map((entry) => {
      const stored = copy(entry) as E & {
        config: { uuid: string; unix_timestamp: number };
      };
      stored.config.uuid = crypto.randomUUID();
      stored.config.unix_timestamp = Math.floor(Date.now() / 1000);
      return stored;
    });
    if (this.failSaves) {
      return { saved: false, added: [] };
    }
    this.change([...entries, ...added]);
    return { saved: true, added: copy(added) };
  }
}
