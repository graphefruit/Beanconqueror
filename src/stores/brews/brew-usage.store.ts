import { inject, Service, Signal, signal } from '@angular/core';

import { UIBrewStorage } from '../../services/uiBrewStorage';
import { field } from '../beans/bean-usage.store';
import { readSettled, StoreHub } from '../core/store-hub';

/** What the brews made with one grinder or one preparation method add up to. */
export interface EquipmentUsage {
  readonly brews: number;
  /** Sum of `grind_weight`, in grams. */
  readonly grindWeight: number;
  /** Sum of the beverage quantity, of the brew quantity where there is none. */
  readonly quantity: number;
  /** The different `bean` values of the brews. */
  readonly beans: ReadonlySet<unknown>;
  /**
   * The stored brew with the latest `config.unix_timestamp`; of several
   * with that time the one stored first, as a stable sort leaves it in front.
   */
  readonly lastBrew: Record<string, unknown>;
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * The usage of every grinder (`mill`) or preparation method
 * (`method_of_preparation`) that has brews, keyed by its uuid, in one pass
 * over the brews in their stored form. A field a stored brew does not have
 * counts with its default in `new Brew()`, as for the brew instances of
 * legacy code.
 */
export function buildEquipmentUsage(
  storedBrews: readonly unknown[],
  key: 'mill' | 'method_of_preparation',
): ReadonlyMap<string, EquipmentUsage> {
  const usage = new Map<
    string,
    Mutable<EquipmentUsage> & { beans: Set<unknown>; lastAt: unknown }
  >();
  for (const entry of storedBrews) {
    const brew = entry as Record<string, unknown>;
    const at = (
      field(brew, 'config', { unix_timestamp: 0 }) as {
        unix_timestamp?: unknown;
      } | null
    )?.unix_timestamp;
    const uuid = field(brew, key, '') as string;
    let sum = usage.get(uuid);
    if (!sum) {
      sum = {
        brews: 0,
        grindWeight: 0,
        quantity: 0,
        beans: new Set(),
        lastBrew: brew,
        lastAt: at,
      };
      usage.set(uuid, sum);
    } else if ((at as number) > (sum.lastAt as number)) {
      sum.lastBrew = brew;
      sum.lastAt = at;
    }
    sum.brews++;
    sum.grindWeight += field(brew, 'grind_weight', 0) as number;
    const beverage = field(brew, 'brew_beverage_quantity', 0) as number;
    sum.quantity +=
      beverage > 0 ? beverage : (field(brew, 'brew_quantity', 0) as number);
    sum.beans.add(field(brew, 'bean', ''));
  }
  return usage;
}

/**
 * Brew count, weights, beans and last brew of every grinder and preparation
 * method for their cards, from the stored brews without building brew
 * instances. Recomputed once after each change of the brews, when it is read
 * next.
 */
@Service()
export class BrewUsageStore {
  private readonly brews = inject(UIBrewStorage);
  private readonly hub = inject(StoreHub);
  private readonly version = signal(0);

  public readonly byMill = this.usageBy('mill');
  public readonly byPreparation = this.usageBy('method_of_preparation');

  public constructor() {
    const markStale = () => this.version.update((version) => version + 1);
    // Stores live as long as the app, so there is nothing to unsubscribe.
    this.brews.attachOnEvent().subscribe(markStale);
    // The first read of the brews sends no event.
    this.brews.storageReady().then(markStale, markStale);
  }

  private usageBy(
    key: 'mill' | 'method_of_preparation',
  ): Signal<ReadonlyMap<string, EquipmentUsage>> {
    return readSettled(
      this.hub,
      this.brews,
      this.version,
      () => buildEquipmentUsage(this.brews.getRawEntries(), key),
      new Map<string, EquipmentUsage>(),
    );
  }
}
