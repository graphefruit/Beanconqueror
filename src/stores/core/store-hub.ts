import { computed, linkedSignal, Service, Signal, signal } from '@angular/core';

export type StoreLoadState = 'ready' | 'reloading';

/**
 * What the stores share. While an import reads all collections anew, every
 * store keeps what it showed before, and all of them change together once
 * the reload has ended, also when it failed.
 */
@Service()
export class StoreHub {
  private readonly reloads = signal(0);

  public readonly loadState: Signal<StoreLoadState> = computed(() =>
    this.reloads() > 0 ? 'reloading' : 'ready',
  );

  /** Runs `work`, which replaces the stored data and reads it anew. */
  public async reload<R>(work: () => Promise<R>): Promise<R> {
    this.reloads.update((reloads) => reloads + 1);
    try {
      return await work();
    } finally {
      this.reloads.update((reloads) => reloads - 1);
    }
  }
}

/**
 * `read` once after each `version` of a collection. While the stores reload,
 * and while the collection is not read, the last value stays: a collection
 * that is being read, or could not be read, is not an empty one.
 */
export function readSettled<V>(
  hub: StoreHub,
  collection: { isRead(): boolean },
  version: Signal<number>,
  read: (previous: V | undefined) => V,
  initial: V,
): Signal<V> {
  return linkedSignal<unknown, V>({
    source: () => [version(), hub.loadState()],
    computation: (_source, previous) =>
      hub.loadState() === 'ready' && collection.isRead()
        ? read(previous?.value)
        : (previous?.value ?? initial),
  });
}
