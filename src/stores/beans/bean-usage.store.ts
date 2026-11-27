import { inject, Service, signal } from '@angular/core';

import { usedBeanWeight } from '../../services/beanUsage/used-bean-weight';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { readSettled, StoreHub } from '../core/store-hub';

/** What the brews of one bean add up to. */
export interface BeanUsage {
  readonly brews: number;
  /** Grams used, by the rule of `usedBeanWeight`. */
  readonly grams: number;
  /**
   * The latest `config.unix_timestamp` of the brews, in seconds; undefined
   * when no brew has one that is a number.
   */
  readonly lastBrewAt: number | undefined;
}

export const NO_USAGE: BeanUsage = {
  brews: 0,
  grams: 0,
  lastBrewAt: undefined,
};

/**
 * The usage of every bean that has brews, keyed by bean uuid, in one pass
 * over the brews in their stored form. A field a stored brew does not have
 * counts with its default in `new Brew()`, as for the brew instances of
 * legacy code: no bean, no weights, time 0.
 */
export function buildBeanUsage(
  storedBrews: readonly unknown[],
): ReadonlyMap<string, BeanUsage> {
  const usage = new Map<string, Mutable<BeanUsage>>();
  for (const entry of storedBrews) {
    const brew = entry as Record<string, unknown>;
    const bean = field(brew, 'bean', '') as string;
    let sum = usage.get(bean);
    if (!sum) {
      sum = { ...NO_USAGE };
      usage.set(bean, sum);
    }
    sum.brews++;
    sum.grams += usedBeanWeight({
      bean_weight_in: field(brew, 'bean_weight_in', 0) as number,
      grind_weight: field(brew, 'grind_weight', 0) as number,
    });
    const config = field(brew, 'config', { unix_timestamp: 0 }) as {
      unix_timestamp?: unknown;
    } | null;
    const at = config?.unix_timestamp;
    if (
      typeof at === 'number' &&
      Number.isFinite(at) &&
      (sum.lastBrewAt === undefined || at > sum.lastBrewAt)
    ) {
      sum.lastBrewAt = at;
    }
  }
  return usage;
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** A field of a stored brew, or `missing` when the brew does not have it. */
export function field(
  brew: Record<string, unknown>,
  key: string,
  missing: unknown,
): unknown {
  return Object.hasOwn(brew, key) ? brew[key] : missing;
}

/**
 * Brew count, grams used and last brew of every bean for new code, from the
 * stored brews without building brew instances. Recomputed once after each
 * change of the brews, when it is read next.
 */
@Service()
export class BeanUsageStore {
  private readonly brews = inject(UIBrewStorage);
  private readonly version = signal(0);

  public readonly usage = readSettled(
    inject(StoreHub),
    this.brews,
    this.version,
    () => buildBeanUsage(this.brews.getRawEntries()),
    new Map<string, BeanUsage>(),
  );

  public constructor() {
    const markStale = () => this.version.update((version) => version + 1);
    // Stores live as long as the app, so there is nothing to unsubscribe.
    this.brews.attachOnEvent().subscribe(markStale);
    // The first read of the brews sends no event.
    this.brews.storageReady().then(markStale, markStale);
  }
}
