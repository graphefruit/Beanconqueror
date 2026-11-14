import { TestBed } from '@angular/core/testing';

import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { UIAlert } from '../../../services/uiAlert';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UILog } from '../../../services/uiLog';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UIStorage } from '../../../services/uiStorage';
import { UIWaterStorage } from '../../../services/uiWaterStorage';
import {
  createMockTranslateService,
  createMockUIAlert,
  createMockUILog,
} from '../../../test-utils';
import BaristamodeBrew from '../baristamodeBrew';
import { Brew, BrewInstanceHelper } from '../brew';

describe('BrewInstanceHelper', () => {
  let database: Map<string, unknown>;
  let beans: UIBeanStorage;
  let mills: UIMillStorage;
  let preparations: UIPreparationStorage;
  let waters: UIWaterStorage;
  let brews: UIBrewStorage;
  let subscriptions: Subscription[];

  const raw = (uuid: string, name: string) => ({
    config: { uuid, unix_timestamp: 1 },
    name,
    finished: false,
  });

  const brewOf = (bean: string, uuid = 'brew-' + bean): Brew => {
    const brew = new Brew();
    brew.config.uuid = uuid;
    brew.bean = bean;
    brew.mill = 'mill-1';
    brew.method_of_preparation = 'preparation-1';
    brew.water = 'water-1';
    return brew;
  };

  const create = <T>(factory: () => T): T =>
    TestBed.runInInjectionContext(factory);

  beforeEach(async () => {
    database = new Map<string, unknown>([
      ['BEANS', [raw('bean-1', 'Ethiopia'), raw('bean-2', 'Kenya')]],
      ['MILL', [raw('mill-1', 'Hand grinder')]],
      ['PREPARATION', [raw('preparation-1', 'V60')]],
      ['WATER', [raw('water-1', 'Tap')]],
      ['BREWS', [raw('brew-x', 'Brew')]],
    ]);
    const uiStorage = {
      getOrFail: (_key: string) => Promise.resolve(database.get(_key)),
      set: (_key: string, _value: unknown) => {
        database.set(_key, _value);
        return Promise.resolve(true);
      },
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: UIStorage, useValue: uiStorage },
        { provide: UILog, useValue: createMockUILog() },
        { provide: TranslateService, useValue: createMockTranslateService() },
      ],
    });
    spyOn(UIAlert, 'getInstance').and.returnValue(createMockUIAlert());

    beans = create(() => new UIBeanStorage());
    mills = create(() => new UIMillStorage());
    preparations = create(() => new UIPreparationStorage());
    waters = create(() => new UIWaterStorage());
    brews = create(() => new UIBrewStorage());
    for (const storage of [beans, mills, preparations, waters, brews]) {
      await storage.initializeStorage();
    }
    (UIBeanStorage as any).instance = beans;
    UIMillStorage.instance = mills;
    UIPreparationStorage.instance = preparations;
    UIWaterStorage.instance = waters;

    BrewInstanceHelper.setEntryAmountBackToZero();
    subscriptions = [
      BrewInstanceHelper.forgetOnChange(beans, 'beans'),
      BrewInstanceHelper.forgetOnChange(mills, 'mills'),
      BrewInstanceHelper.forgetOnChange(preparations, 'preparations'),
      BrewInstanceHelper.forgetOnChange(waters, 'waters'),
    ];
  });

  afterEach(() => {
    subscriptions.forEach((_subscription) => _subscription.unsubscribe());
    (UIBeanStorage as any).instance = undefined;
    UIMillStorage.instance = undefined;
    UIPreparationStorage.instance = undefined;
    UIWaterStorage.instance = undefined;
    BrewInstanceHelper.setEntryAmountBackToZero();
  });

  it('creates one bean for all brews of that bean', () => {
    const lookup = spyOn(beans, 'getByUUID').and.callThrough();
    const list = Array.from({ length: 300 }, (_v, i) =>
      brewOf('bean-1', 'brew-' + i),
    );

    const found = list.map((_brew) => _brew.getBean());

    expect(found.every((_bean) => _bean === found[0])).toBeTrue();
    expect(found[0].name).toBe('Ethiopia');
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('shows the bean a brew was changed to', () => {
    const brew = brewOf('bean-1');
    expect(brew.getBean().name).toBe('Ethiopia');

    brew.bean = 'bean-2';

    expect(brew.getBean().name).toBe('Kenya');
  });

  it('shows the new values of a changed bean, mill, preparation and water', async () => {
    const brew = brewOf('bean-1');
    const other = brewOf('bean-2').getBean();
    expect(brew.getBean().name).toBe('Ethiopia');
    expect(brew.getMill().name).toBe('Hand grinder');
    expect(brew.getPreparation().name).toBe('V60');
    expect(brew.getWater().name).toBe('Tap');

    const bean = beans.getEntryByUUID('bean-1');
    bean.name = 'Ethiopia washed';
    expect(await beans.update(bean)).toBeTrue();
    expect(
      await mills.update({ ...raw('mill-1', 'Electric grinder') }),
    ).toBeTrue();
    expect(
      await preparations.update({ ...raw('preparation-1', 'Chemex') }),
    ).toBeTrue();
    expect(await waters.update({ ...raw('water-1', 'Bottled') })).toBeTrue();

    expect(brew.getBean().name).toBe('Ethiopia washed');
    expect(brew.getMill().name).toBe('Electric grinder');
    expect(brew.getPreparation().name).toBe('Chemex');
    expect(brew.getWater().name).toBe('Bottled');
    // A change of one bean leaves the other beans as they are.
    expect(brewOf('bean-2').getBean()).toBe(other);
  });

  it('shows a bean archived from its detail page on the brews of that bean', async () => {
    const brew = brewOf('bean-1');
    expect(brew.getBean().finished).toBeFalse();

    const bean = beans.getEntryByUUID('bean-1');
    bean.finished = true;
    expect(await beans.update(bean)).toBeTrue();

    expect(brew.getBean().finished).toBeTrue();
  });

  it('forgets the whole collection on events without an entry', async () => {
    const brew = brewOf('bean-1');
    const before = brew.getBean();

    await beans.add(raw('', 'Brazil'));
    expect(brew.getBean()).toBe(before);

    await beans.removeByUUID('bean-2');
    expect(brew.getBean()).not.toBe(before);
    expect(brew.getBean().name).toBe('Ethiopia');

    const reread = brew.getBean();
    database.set('BEANS', [raw('bean-1', 'Ethiopia imported')]);
    await beans.reinitializeStorage();
    expect(brew.getBean()).not.toBe(reread);
    expect(brew.getBean().name).toBe('Ethiopia imported');
  });

  it('keeps the related entries when only brews change', async () => {
    const brew = brewOf('bean-1');
    const bean = brew.getBean();
    const mill = brew.getMill();
    const preparation = brew.getPreparation();
    const water = brew.getWater();

    const changed = brews.getEntryByUUID('brew-x');
    changed.note = 'changed';
    expect(await brews.update(changed)).toBeTrue();

    expect(brew.getBean()).toBe(bean);
    expect(brew.getMill()).toBe(mill);
    expect(brew.getPreparation()).toBe(preparation);
    expect(brew.getWater()).toBe(water);
  });

  it('shows the new preparation on barista mode brews', async () => {
    const brew = new BaristamodeBrew();
    brew.method_of_preparation = 'preparation-1';
    expect(brew.getPreparation().name).toBe('V60');

    expect(
      await preparations.update({ ...raw('preparation-1', 'Espresso') }),
    ).toBeTrue();

    expect(brew.getPreparation().name).toBe('Espresso');
  });

  it('forgets everything when reset', () => {
    const brew = brewOf('bean-1');
    const bean = brew.getBean();

    BrewInstanceHelper.setEntryAmountBackToZero();

    expect(brew.getBean()).not.toBe(bean);
  });
});
