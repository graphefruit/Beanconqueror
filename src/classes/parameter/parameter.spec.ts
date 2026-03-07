import { BeanListViewParameter } from './beanListViewParameter';
import { BeanManageParameter } from './beanManageParameter';
import { DefaultBrewParameter } from './defaultBrewParameter';
import { ListViewBrewParameter } from './listViewBrewParameter';
import { ManageBrewParameter } from './manageBrewParameter';
import { OrderBrewParameter } from './orderBrewParameter';
import { RepeatBrewParameter } from './repeatBrewParameter';

describe('Parameter classes', () => {
  it('DefaultBrewParameter sets defaults', () => {
    const param = new DefaultBrewParameter();
    expect(param.brew_time).toBe(true);
    expect(param.grind_weight).toBe(true);
    expect(param.pressure_profile).toBe(false);
  });

  it('ListViewBrewParameter sets defaults', () => {
    const param = new ListViewBrewParameter();
    expect(param.brew_time).toBe(true);
    expect(param.bean_age_by_brew_date).toBe(false);
    expect(param.tds).toBe(true);
  });

  it('ManageBrewParameter sets defaults', () => {
    const param = new ManageBrewParameter();
    expect(param.note).toBe(true);
    expect(param.set_custom_brew_time).toBe(true);
    expect(param.attachments).toBe(false);
  });

  it('OrderBrewParameter maps labels', () => {
    const param = new OrderBrewParameter();
    expect(param.before.bean_type).toBe(1);
    expect(param.getLabel('brew_temperature_time')).toBe(
      'BREW_DATA_TEMPERATURE_TIME',
    );
    expect(param.getLabel('unknown_key')).toBe('unknown_key');
  });

  it('RepeatBrewParameter sets defaults', () => {
    const param = new RepeatBrewParameter();
    expect(param.repeat_coffee_active).toBe(true);
    expect(param.method_of_preparation_tool).toBe(true);
  });

  it('BeanManageParameter activateAll enables flags', () => {
    const param = new BeanManageParameter();
    param.activateAll();
    expect(param.buyDate).toBe(true);
    expect(param.cupping_points).toBe(true);
    expect(param.co2e_kg).toBe(true);
  });

  it('BeanListViewParameter activateAll enables flags', () => {
    const param = new BeanListViewParameter();
    param.activateAll();
    expect(param.buyDate).toBe(true);
    expect(param.cupping_points).toBe(true);
    expect(param.co2e_kg).toBe(true);
  });
});
