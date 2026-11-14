import { Subject } from 'rxjs';

import { StoreSource } from '../collection-store';

/** A collection in memory that announces its changes like `StorageClass`. */
export class FakeStoreSource implements StoreSource {
  public entries: unknown[] = [];
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

  /** The first read of the collection, which sends no event. */
  public async load(entries: unknown[]): Promise<void> {
    this.entries = entries;
    this.settle.resolve();
    await this.ready;
  }

  public async fail(): Promise<void> {
    this.settle.reject();
    await this.ready.catch(() => undefined);
  }

  /** A change as legacy code makes it: new array content, then the event. */
  public change(entries: unknown[]): void {
    this.entries = entries;
    this.events.next({ type: 'UPDATE' });
  }
}
