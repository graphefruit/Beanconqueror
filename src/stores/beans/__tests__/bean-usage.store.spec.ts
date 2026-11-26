import { TestBed } from '@angular/core/testing';

import { Brew } from '../../../classes/brew/brew';
import { IBrew } from '../../../interfaces/brew/iBrew';
import { sumUsedBeanWeight } from '../../../services/beanUsage/used-bean-weight';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { FakeStoreSource } from '../../core/__tests__/fake-store-source';
import { BeanUsageStore, buildBeanUsage, NO_USAGE } from '../bean-usage.store';

function storedBrew(fields: Partial<IBrew>, at?: number): object {
  const brew = new Brew();
  Object.assign(brew, fields);
  if (at !== undefined) {
    brew.config.unix_timestamp = at;
  }
  return JSON.parse(JSON.stringify(brew)) as object;
}

/** What legacy code computes for a bean from brew instances. */
function legacyUsage(stored: readonly object[], bean: string) {
  const brews = stored
    .map((entry) => {
      const brew = new Brew();
      brew.initializeByObject(JSON.parse(JSON.stringify(entry)) as IBrew);
      return brew;
    })
    .filter((brew) => brew.bean === bean);
  return {
    brews: brews.length,
    grams: sumUsedBeanWeight(brews),
    lastBrewAt:
      brews.length > 0
        ? UIBrewHelper.sortBrews(brews)[0].config.unix_timestamp
        : undefined,
  };
}

describe('buildBeanUsage', () => {
  const stored = [
    storedBrew({ bean: 'a', bean_weight_in: 18, grind_weight: 17 }, 300),
    storedBrew({ bean: 'b', bean_weight_in: 0, grind_weight: 20 }, 100),
    storedBrew({ bean: 'a', bean_weight_in: 0, grind_weight: 16.5 }, 500),
    storedBrew({ bean: 'a', bean_weight_in: 18.25, grind_weight: 0 }, 400),
    // A copy of a brew counts again, as for legacy code.
    storedBrew({ bean: 'b', bean_weight_in: 0, grind_weight: 20 }, 100),
    // Fields missing, as in brews of older versions.
    { bean: 'c', config: { uuid: 'x', unix_timestamp: 50 } },
    { bean: 'c', bean_weight_in: 7 },
    { config: { uuid: 'y', unix_timestamp: 1 }, grind_weight: 3 },
    // A dose stored as text.
    { bean: 'd', bean_weight_in: '18', config: { unix_timestamp: 1 } },
    { bean: 'd', bean_weight_in: '17', config: { unix_timestamp: 2 } },
    // A field that is stored as null is not a missing one: the brew belongs
    // to no bean, and a weight of null adds nothing.
    { bean: null, grind_weight: 4, config: { unix_timestamp: 900 } },
    { bean: 'e', bean_weight_in: null, grind_weight: 6, config: {} },
    { bean: 'e', bean_weight_in: 0, grind_weight: null, config: {} },
    // The only brew of a bean has no time: it counts with time 0.
    { bean: 'f', grind_weight: 5 },
  ];

  for (const bean of ['a', 'b', 'c', 'd', 'e', 'f', '']) {
    it(`matches legacy code for bean "${bean}"`, () => {
      const usage = buildBeanUsage(stored).get(bean);

      expect(usage).toEqual(legacyUsage(stored, bean));
    });
  }

  it('has no entry for a bean without brews', () => {
    expect(buildBeanUsage(stored).get('unused')).toBeUndefined();
    expect(NO_USAGE).toEqual({ brews: 0, grams: 0, lastBrewAt: undefined });
  });

  it('deviates on purpose: a brew without a time does not count as the last use', () => {
    // Legacy code takes whatever the sort leaves in front.
    const brews = [
      { bean: 'a', config: { uuid: '1' } },
      { bean: 'a', config: { uuid: '2', unix_timestamp: 200 } },
      { bean: 'a', config: null },
    ];

    expect(buildBeanUsage(brews).get('a')).toEqual({
      brews: 3,
      grams: 0,
      lastBrewAt: 200,
    });
    for (const config of [{ uuid: '1' }, null]) {
      expect(
        buildBeanUsage([{ bean: 'a', config }]).get('a')?.lastBrewAt,
      ).toBeUndefined();
    }
  });

  it('reads 15,000 brews without building brew instances or serializing them', () => {
    const brews = Array.from({ length: 15_000 }, (_, i) =>
      storedBrew({ bean: `bean-${i % 1000}`, grind_weight: 15 }, i),
    );
    const stringify = spyOn(JSON, 'stringify').and.callThrough();
    const initialize = spyOn(
      Brew.prototype,
      'initializeByObject',
    ).and.callThrough();

    const usage = buildBeanUsage(brews);

    expect(usage.size).toBe(1000);
    expect(usage.get('bean-7')).toEqual({
      brews: 15,
      grams: 225,
      lastBrewAt: 14_007,
    });
    expect(stringify).not.toHaveBeenCalled();
    expect(initialize).not.toHaveBeenCalled();
  });
});

describe('BeanUsageStore', () => {
  let source: FakeStoreSource;

  beforeEach(() => {
    source = new FakeStoreSource();
    TestBed.configureTestingModule({
      providers: [{ provide: UIBrewStorage, useValue: source }],
    });
  });

  it('follows the brews and reads them once per change', async () => {
    const store = TestBed.inject(BeanUsageStore);
    const read = spyOn(source, 'getRawEntries').and.callThrough();

    expect(store.usage().size).toBe(0);
    await source.load([storedBrew({ bean: 'a', grind_weight: 10 }, 1)]);

    expect(store.usage().get('a')?.brews).toBe(1);
    expect(store.usage().get('a')?.grams).toBe(10);

    source.change([
      storedBrew({ bean: 'a', grind_weight: 10 }, 1),
      storedBrew({ bean: 'a', grind_weight: 12 }, 2),
    ]);

    expect(store.usage().get('a')).toEqual({
      brews: 2,
      grams: 22,
      lastBrewAt: 2,
    });
    expect(store.usage().get('a')).toBe(store.usage().get('a'));
    // Not before the brews were read: they are not known to be none.
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('shows no usage when the brews could not be read', async () => {
    const store = TestBed.inject(BeanUsageStore);

    await source.fail();

    expect(store.usage().size).toBe(0);
  });

  it('keeps the usage when the brews could not be read anew', async () => {
    const store = TestBed.inject(BeanUsageStore);
    await source.load([storedBrew({ bean: 'a', grind_weight: 10 }, 1)]);
    const before = store.usage();

    source.reread('unreadable');

    expect(store.usage()).toBe(before);
  });
});
