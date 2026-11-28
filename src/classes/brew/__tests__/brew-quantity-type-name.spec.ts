import {
  BREW_QUANTITY_TYPES_ENUM,
  brewQuantityTypeName,
} from '../../../enums/brews/brewQuantityTypes';
import BaristamodeBrew from '../baristamodeBrew';
import { Brew } from '../brew';

describe('Unit of the brew quantity', () => {
  it('names a stored key and a value the barista mode stored before', () => {
    expect(brewQuantityTypeName('GR')).toBe('gr');
    expect(brewQuantityTypeName('ML')).toBe('ml');
    expect(brewQuantityTypeName('gr')).toBe('gr');
    expect(brewQuantityTypeName('ml')).toBe('ml');
  });

  it('names nothing for an unknown or missing unit', () => {
    expect(brewQuantityTypeName('oz')).toBe('');
    expect(brewQuantityTypeName(undefined)).toBe('');
  });

  for (const stored of ['GR', 'gr', 'ML']) {
    it(`shows "${stored}" in the brew and in the barista brew`, () => {
      const expected = stored.toLowerCase();
      const brew = new Brew();
      brew.brew_quantity_type = stored as BREW_QUANTITY_TYPES_ENUM;
      brew.brew_beverage_quantity_type = stored as BREW_QUANTITY_TYPES_ENUM;
      const baristaBrew = new BaristamodeBrew();
      baristaBrew.brew_beverage_quantity_type =
        stored as BREW_QUANTITY_TYPES_ENUM;

      expect(brew.getBrewQuantityTypeName()).toBe(expected);
      expect(brew.getBrewBeverageQuantityTypeName()).toBe(expected);
      expect(baristaBrew.getBrewBeverageQuantityTypeName()).toBe(expected);
    });
  }

  it('stores the key for a new brew and a new barista brew', () => {
    expect(new Brew().brew_beverage_quantity_type as string).toBe('GR');
    expect(new BaristamodeBrew().brew_beverage_quantity_type as string).toBe(
      'GR',
    );
  });
});
