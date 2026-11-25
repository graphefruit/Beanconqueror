import { BREW_QUANTITY_TYPES_ENUM } from '../../../enums/brews/brewQuantityTypes';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Preparation } from '../../preparation/preparation';
import { Settings } from '../../settings/settings';
import { Brew } from '../brew';

/**
 * The values the brew form shows next to its fields: the brew ratio with the
 * grams per litre in the label of the amount of water (or of the beverage
 * quantity for espresso), and the coffee brew time after the first drip.
 */
describe('Brew values shown in the brew form', () => {
  let preparation: Preparation;
  let settings: Settings;

  beforeEach(() => {
    preparation = new Preparation();
    settings = new Settings();
    spyOn(UISettingsStorage, 'getInstance').and.returnValue({
      getSettings: () => settings,
    } as UISettingsStorage);
  });

  function brew(values: Partial<Brew>): Brew {
    const created = Object.assign(new Brew(), values);
    spyOn(created, 'getPreparation').and.returnValue(preparation);
    return created;
  }

  /** The label part as the form shows it: "(1 / 16.67 , 60 g/l)". */
  function ratioLabel(shown: Brew): string {
    return `(${shown.getBrewRatio()} , ${shown.getGramsPerLiter()})`;
  }

  it('starts a new brew with an empty dose, amount of water and grind setting', () => {
    const created = new Brew();

    expect(created.grind_weight).toBe(0);
    expect(created.brew_quantity).toBe(0);
    expect(created.grind_size).toBe('');
    expect(created.brew_time).toBe(0);
  });

  it('shows question marks until dose and amount of water are given', () => {
    expect(ratioLabel(brew({}))).toBe('(1 / ? , ? g/l)');
    expect(ratioLabel(brew({ grind_weight: 15 }))).toBe('(1 / ? , ? g/l)');
    expect(ratioLabel(brew({ brew_quantity: 250 }))).toBe('(1 / ? , ? g/l)');
  });

  it('divides the amount of water by the dose for a filter method', () => {
    expect(ratioLabel(brew({ grind_weight: 15, brew_quantity: 250 }))).toBe(
      '(1 / 16.67 , 60 g/l)',
    );
    expect(ratioLabel(brew({ grind_weight: 16.5, brew_quantity: 250 }))).toBe(
      '(1 / 15.15 , 66 g/l)',
    );
    expect(ratioLabel(brew({ grind_weight: 18, brew_quantity: 300 }))).toBe(
      '(1 / 16.67 , 60 g/l)',
    );
    expect(ratioLabel(brew({ grind_weight: 20, brew_quantity: 300 }))).toBe(
      '(1 / 15.00 , 66.67 g/l)',
    );
  });

  it('ignores the unit of the amount of water', () => {
    const inMillilitres = brew({
      grind_weight: 16.5,
      brew_quantity: 250,
      brew_quantity_type: 'ML' as BREW_QUANTITY_TYPES_ENUM,
    });

    expect(ratioLabel(inMillilitres)).toBe('(1 / 15.15 , 66 g/l)');
  });

  it('divides the beverage quantity by the dose for espresso', () => {
    preparation.style_type = PREPARATION_STYLE_TYPE.ESPRESSO;

    expect(
      ratioLabel(
        brew({
          grind_weight: 18,
          brew_beverage_quantity: 36,
          brew_quantity: 300,
        }),
      ),
    ).toBe('(1 / 2.00 , 500 g/l)');
  });

  it('shows the coffee brew time as the brew time after the first drip, with hours', () => {
    expect(
      brew({
        brew_time: 30,
        coffee_first_drip_time: 8,
      }).getFormattedCoffeeBrewTime(),
    ).toBe('00:00:22');
    expect(
      brew({
        brew_time: 3725,
        coffee_first_drip_time: 5,
      }).getFormattedCoffeeBrewTime(),
    ).toBe('01:02:00');
  });

  it('shows the whole brew time as coffee brew time without a first drip', () => {
    expect(brew({ brew_time: 30 }).getFormattedCoffeeBrewTime()).toBe(
      '00:00:30',
    );
  });
});
