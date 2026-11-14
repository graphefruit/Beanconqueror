import { BeanModalSelectComponent } from '../../../app/beans/bean-modal-select/bean-modal-select.component';
import { BeanPopoverFreezeComponent } from '../../../app/beans/bean-popover-freeze/bean-popover-freeze.component';
import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { BeanInformationComponent } from '../../../components/bean-information/bean-information.component';
import { UIBrewHelper } from '../../uiBrewHelper';

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
  // Resolves the bag the way a stored brew does.
  entry.getBean = () => bean(beanUuid, 0);
  return entry;
}

// An instance with only the fields the tested method reads.
function withFields<T extends object>(
  type: { prototype: T },
  fields: object,
): T {
  return Object.assign(Object.create(type.prototype) as T, fields);
}

describe('used bean weight of a single bag', () => {
  // 'open' used 18 + 17 (grind weight, no dose) + 18.5 = 53.5
  const brews = [
    brew('open', 18),
    brew('other', 30),
    brew('open', 0, 17),
    brew('open', 18.5),
    brew('deleted', 100),
  ];
  const uiBeanHelper = {
    getAllBrewsForThisBean: (uuid: string) =>
      brews.filter((entry) => entry.bean === uuid),
  };

  it('is shown in the bean information', () => {
    const component = withFields(BeanInformationComponent, {
      bean: bean('open', 250),
      uiBeanHelper,
    });

    expect(component.getUsedWeightCount()).toBe(53.5);
  });

  it('is used to freeze the rest of the bag', () => {
    const component = withFields(BeanPopoverFreezeComponent, {
      bean: bean('open', 250),
      uiBeanHelper,
    });

    expect(component.getUsedWeightCount()).toBe(53.5);
  });

  it('is shown and cached in the bean selection', () => {
    const getAllBrewsForThisBean = jasmine
      .createSpy('getAllBrewsForThisBean')
      .and.callFake(uiBeanHelper.getAllBrewsForThisBean);
    const component = withFields(BeanModalSelectComponent, {
      uiUsedWeightCountCache: {},
      uiBeanHelper: { getAllBrewsForThisBean },
    });

    expect(component.getUsedWeightCount(bean('open', 250))).toBe(53.5);
    expect(component.getUsedWeightCount(bean('open', 250))).toBe(53.5);
    expect(component.getUsedWeightCount(bean('unused', 250))).toBe(0);
    expect(getAllBrewsForThisBean).toHaveBeenCalledTimes(2);
  });

  it('marks a bag as consumed from five grams left', () => {
    const helper = withFields(UIBrewHelper, {
      uiBrewStorage: { getAllEntries: () => brews },
    });

    expect(helper.checkIfBeanPackageIsConsumed(bean('open', 58.5))).toBeTrue();
    expect(helper.checkIfBeanPackageIsConsumed(bean('open', 58.6))).toBeFalse();
    expect(helper.checkIfBeanPackageIsConsumed(bean('open', 0))).toBeFalse();
  });
});
