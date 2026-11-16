import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { BEAN_SORT_AFTER } from '../../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../../enums/beans/beanSortOrder';
import { BeanUsageStore } from '../../../stores/beans/bean-usage.store';
import { UIBeanHelper } from '../../uiBeanHelper';
import { UIHelper } from '../../uiHelper';
import { BeanSortFilterHelperService } from '../bean-sort-filter-helper.service';

function bean(uuid: string, weight: number): Bean {
  const entry = new Bean();
  entry.config.uuid = uuid;
  entry.weight = weight;
  return entry;
}

function brew(beanUuid: string, beanWeightIn: number, grindWeight = 0): Brew {
  const entry = new Brew();
  entry.bean = beanUuid;
  entry.bean_weight_in = beanWeightIn;
  entry.grind_weight = grindWeight;
  return entry;
}

describe('BeanSortFilterHelperService - sort by remaining weight', () => {
  let service: BeanSortFilterHelperService;

  const brews = [
    brew('a', 200),
    brew('b', 0, 30),
    brew('c', 10),
    brew('a', 40),
    brew('deleted', 500),
  ];

  function sortedUuids(order: BEAN_SORT_ORDER): string[] {
    // remaining: a 250 - 240 = 10, b 100 - 30 = 70, c 50 - 10 = 40, d 20
    const beans = [
      bean('a', 250),
      bean('b', 100),
      bean('c', 50),
      bean('d', 20),
    ];
    return service['manageSort'](
      { sort_after: BEAN_SORT_AFTER.WEIGHT_REMAINING, sort_order: order },
      beans,
    ).map((entry: Bean) => entry.config.uuid);
  }

  beforeEach(() => {
    const beanHelper = Object.create(UIBeanHelper.prototype);
    beanHelper.allStoredBrews = [];
    beanHelper.uiBrewStorage = { getAllEntries: () => brews };

    TestBed.configureTestingModule({
      providers: [
        BeanSortFilterHelperService,
        { provide: UIBeanHelper, useValue: beanHelper },
        { provide: BeanUsageStore, useValue: {} },
        { provide: UIHelper, useValue: {} },
        { provide: ModalController, useValue: {} },
      ],
    });
    service = TestBed.inject(BeanSortFilterHelperService);
  });

  it('sorts ascending by the weight left in the bag', () => {
    expect(sortedUuids(BEAN_SORT_ORDER.ASCENDING)).toEqual([
      'a',
      'd',
      'c',
      'b',
    ]);
  });

  it('sorts descending by the weight left in the bag', () => {
    expect(sortedUuids(BEAN_SORT_ORDER.DESCENDING)).toEqual([
      'b',
      'c',
      'd',
      'a',
    ]);
  });
});
