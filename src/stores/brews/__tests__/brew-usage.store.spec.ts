import { TestBed } from '@angular/core/testing';

import { Brew } from '../../../classes/brew/brew';
import { IBrew } from '../../../interfaces/brew/iBrew';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { FakeStoreSource } from '../../core/__tests__/fake-store-source';
import { BrewUsageStore, buildEquipmentUsage } from '../brew-usage.store';

function storedBrew(fields: Partial<IBrew>, at = 0): object {
  const brew = new Brew();
  Object.assign(brew, fields);
  brew.config.unix_timestamp = at;
  return JSON.parse(JSON.stringify(brew)) as object;
}

/** What the cards computed from brew instances before. */
function legacyUsage(
  stored: readonly object[],
  key: 'mill' | 'method_of_preparation',
  uuid: string,
) {
  const brews = stored
    .map((entry) => {
      const brew = new Brew();
      brew.initializeByObject(entry as IBrew);
      return brew;
    })
    .filter((brew) => brew[key] === uuid);
  let grindWeight = 0;
  let quantity = 0;
  for (const brew of brews) {
    grindWeight += brew.grind_weight;
    quantity +=
      brew.brew_beverage_quantity > 0
        ? brew.brew_beverage_quantity
        : brew.brew_quantity;
  }
  return {
    brews: brews.length,
    grindWeight,
    quantity,
    beans: brews.filter(
      (brew, i, all) =>
        all.indexOf(all.find((t) => t.bean === brew.bean)) === i,
    ).length,
    lastBrew: UIBrewHelper.sortBrews(brews)[0].config.uuid,
  };
}

describe('buildEquipmentUsage', () => {
  const stored = [
    storedBrew({ mill: 'm1', method_of_preparation: 'p1', bean: 'a' }, 300),
    storedBrew(
      {
        mill: 'm2',
        method_of_preparation: 'p1',
        bean: 'b',
        grind_weight: 0.1,
        brew_quantity: 250,
      },
      100,
    ),
    storedBrew(
      {
        mill: 'm1',
        method_of_preparation: 'p2',
        bean: 'a',
        grind_weight: 0.2,
        brew_quantity: 300,
        brew_beverage_quantity: 36.4,
      },
      500,
    ),
    // The latest time a second time: the brew stored first stays the last.
    storedBrew(
      { mill: 'm1', method_of_preparation: 'p2', bean: 'c', grind_weight: 18 },
      500,
    ),
    storedBrew(
      { mill: 'm2', method_of_preparation: 'p1', bean: 'b', grind_weight: 7.7 },
      100,
    ),
    // Fields missing, as in brews of older versions.
    { mill: 'm3', config: { uuid: 'x', unix_timestamp: 50 } },
    { mill: 'm3', bean: 'a', grind_weight: 3, config: { uuid: 'y' } },
    { method_of_preparation: 'p3', brew_quantity: 20, config: { uuid: 'z' } },
  ];

  for (const [key, uuids] of [
    ['mill', ['m1', 'm2', 'm3', '']],
    ['method_of_preparation', ['p1', 'p2', 'p3', '']],
  ] as const) {
    for (const uuid of uuids) {
      it(`matches the cards of before for ${key} "${uuid}"`, () => {
        const usage = buildEquipmentUsage(stored, key).get(uuid);

        expect({
          brews: usage.brews,
          grindWeight: usage.grindWeight,
          quantity: usage.quantity,
          beans: usage.beans.size,
          lastBrew: (usage.lastBrew.config as { uuid: string }).uuid,
        }).toEqual(legacyUsage(stored, key, uuid));
      });
    }
  }

  it('has no entry for a grinder without brews', () => {
    expect(buildEquipmentUsage(stored, 'mill').get('unused')).toBeUndefined();
  });

  it('survives a brew whose config is null', () => {
    const usage = buildEquipmentUsage(
      [{ mill: 'm', config: null }, storedBrew({ mill: 'm', bean: 'a' }, 7)],
      'mill',
    ).get('m');

    expect(usage.brews).toBe(2);
    expect(usage.lastBrew.config as { unix_timestamp: number }).toBeNull();
  });
});

describe('BrewUsageStore', () => {
  let source: FakeStoreSource;

  beforeEach(() => {
    source = new FakeStoreSource();
    TestBed.configureTestingModule({
      providers: [{ provide: UIBrewStorage, useValue: source }],
    });
  });

  it('follows the brews and reads them once per change and kind', async () => {
    const store = TestBed.inject(BrewUsageStore);
    const read = spyOn(source, 'getRawEntries').and.callThrough();

    expect(store.byMill().size).toBe(0);
    await source.load([storedBrew({ mill: 'm', method_of_preparation: 'p' })]);

    expect(store.byMill().get('m')?.brews).toBe(1);
    expect(store.byPreparation().get('p')?.brews).toBe(1);

    source.change([
      storedBrew({ mill: 'm', method_of_preparation: 'p' }),
      storedBrew({ mill: 'm', method_of_preparation: 'q' }),
    ]);
    read.calls.reset();

    expect(store.byMill().get('m')?.brews).toBe(2);
    expect(store.byMill().get('m')?.brews).toBe(2);
    expect(store.byPreparation().get('q')?.brews).toBe(1);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('reads the brews again when they could not be read at first', async () => {
    const store = TestBed.inject(BrewUsageStore);
    expect(store.byMill().size).toBe(0);

    await source.fail();
    expect(store.byMill().size).toBe(0);

    source.reread([storedBrew({ mill: 'm' })]);

    expect(store.byMill().get('m')?.brews).toBe(1);
  });
});
