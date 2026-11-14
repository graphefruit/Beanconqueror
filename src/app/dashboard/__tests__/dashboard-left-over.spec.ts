import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ModalController } from '@ionic/angular';

import { Subject } from 'rxjs';

import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { BEAN_MIX_ENUM } from '../../../enums/beans/mix';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIStatistic } from '../../../services/uiStatistic';
import { UnwrappedService } from '../../../services/unwrapped/unwrapped.service';
import { DashboardPage } from '../dashboard.page';

function bean(uuid: string, weight: number, extra: Partial<Bean> = {}): Bean {
  const entry = new Bean();
  entry.config.uuid = uuid;
  entry.weight = weight;
  Object.assign(entry, extra);
  return entry;
}

function brew(beanUuid: string, beanWeightIn: number, grindWeight = 0): Brew {
  const entry = new Brew();
  entry.bean = beanUuid;
  entry.bean_weight_in = beanWeightIn;
  entry.grind_weight = grindWeight;
  return entry;
}

describe('DashboardPage - left over bean weight', () => {
  let component: DashboardPage;
  let beans: Bean[];
  let brews: Brew[];
  let brewEvents: Subject<unknown>;
  let beanEvents: Subject<unknown>;
  let preparationEvents: Subject<unknown>;
  let millEvents: Subject<unknown>;

  beforeEach(() => {
    jasmine.clock().install();
    beans = [
      // Open bag: doses plus one brew without dose that counts its grind weight.
      bean('open', 250),
      // Open blend with decimal doses.
      bean('blend', 1000, { beanMix: BEAN_MIX_ENUM.BLEND }),
      // Frozen portions: one untouched, one partly used.
      bean('frozen-untouched', 30, { frozenDate: '2026-01-01' }),
      bean('frozen-used', 40, { frozenDate: '2026-01-01' }),
      // A thawed portion counts as an open bag again.
      bean('thawed', 20, {
        frozenDate: '2026-01-01',
        unfrozenDate: '2026-02-01',
      }),
      // Finished bags and bags without weight are not counted.
      bean('finished', 500, { finished: true }),
      bean('no-weight', 0),
    ];
    brews = [
      brew('open', 18),
      brew('blend', 20.1),
      brew('open', 18.5),
      brew('open', 0, 17),
      brew('frozen-used', 15),
      brew('blend', 0.2),
      brew('thawed', 18),
      brew('finished', 18),
      brew('no-weight', 18),
      // Brews of a deleted bag are ignored.
      brew('deleted', 100),
    ];

    brewEvents = new Subject();
    beanEvents = new Subject();
    preparationEvents = new Subject();
    millEvents = new Subject();

    const brewStorage = {
      getAllEntries: () => brews,
      attachOnEvent: () => brewEvents,
    };
    // The real helper logic on top of the fake storage.
    const beanHelper = Object.create(UIBeanHelper.prototype);
    beanHelper.allStoredBrews = [];
    beanHelper.uiBrewStorage = brewStorage;

    TestBed.configureTestingModule({
      providers: [
        DashboardPage,
        { provide: UIBrewStorage, useValue: brewStorage },
        { provide: UIBeanHelper, useValue: beanHelper },
        {
          provide: UIBeanStorage,
          useValue: {
            getAllEntries: () => beans,
            attachOnEvent: () => beanEvents,
          },
        },
        {
          provide: UIPreparationStorage,
          useValue: { attachOnEvent: () => preparationEvents },
        },
        {
          provide: UIMillStorage,
          useValue: { attachOnEvent: () => millEvents },
        },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => ({}) },
        },
        {
          provide: UIStatistic,
          useValue: {
            getBeansCount: () => 0,
            getBrewsDrunk: () => 0,
            getTimePassedSinceLastBrew: () => '',
            getTimePassedSinceLastBrewMessage: () => '',
          },
        },
        {
          provide: UnwrappedService,
          useValue: { getUnwrappedData: () => null },
        },
        ...[UIBrewHelper, ChangeDetectorRef, Router, ModalController].map(
          (provide) => ({ provide, useValue: {} }),
        ),
      ],
    });
    component = TestBed.inject(DashboardPage);
    component.ngOnInit();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('sums the left over weight of open and of frozen bags', async () => {
    await component.ionViewWillEnter();

    // open 250 - 53.5, blend 1000 - 20.3, thawed 20 - 18
    expect(component.leftOverBeansWeight).toBe('1.18 kg');
    // frozen 30 - 0 and 40 - 15
    expect(component.leftOverFrozenBeansWeight).toBe('55 g');
  });

  it('shows grams with two decimals below one kilogram', async () => {
    beans = beans.filter((entry) => entry.config.uuid !== 'blend');

    await component.ionViewWillEnter();

    expect(component.leftOverBeansWeight).toBe('198.5 g');
  });

  it('recalculates when brews or beans change', () => {
    brewEvents.next(undefined);
    expect(component.leftOverBeansWeight).toBe('1.18 kg');

    brews.push(brew('open', 100));
    brewEvents.next(undefined);
    expect(component.leftOverBeansWeight).toBe('1.08 kg');

    beans = beans.filter((entry) => entry.config.uuid !== 'blend');
    beanEvents.next(undefined);
    expect(component.leftOverBeansWeight).toBe('98.5 g');
  });

  it('does not recalculate when only mills or preparations change', () => {
    brewEvents.next(undefined);
    expect(component.leftOverBeansWeight).toBe('1.18 kg');

    // Mill and preparation changes cannot change the used bean weight.
    brews[0].bean_weight_in = 118;
    millEvents.next(undefined);
    preparationEvents.next(undefined);

    expect(component.leftOverBeansWeight).toBe('1.18 kg');
  });
});
