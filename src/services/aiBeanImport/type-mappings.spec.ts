import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';
import { beanMixToKeyString, roastingTypeToKeyString } from './type-mappings';

describe('Type Mappings', () => {
  describe('beanMixToKeyString', () => {
    it('should convert enum values to key strings', () => {
      expect(beanMixToKeyString(BEAN_MIX_ENUM.BLEND)).toBe('BLEND' as BEAN_MIX_ENUM);
      expect(beanMixToKeyString(BEAN_MIX_ENUM.SINGLE_ORIGIN)).toBe('SINGLE_ORIGIN' as BEAN_MIX_ENUM);
      expect(beanMixToKeyString(BEAN_MIX_ENUM.UNKNOWN)).toBe('UNKNOWN' as BEAN_MIX_ENUM);
    });
  });

  describe('roastingTypeToKeyString', () => {
    it('should convert enum values to key strings', () => {
      expect(roastingTypeToKeyString(BEAN_ROASTING_TYPE_ENUM.FILTER)).toBe('FILTER' as BEAN_ROASTING_TYPE_ENUM);
      expect(roastingTypeToKeyString(BEAN_ROASTING_TYPE_ENUM.ESPRESSO)).toBe('ESPRESSO' as BEAN_ROASTING_TYPE_ENUM);
      expect(roastingTypeToKeyString(BEAN_ROASTING_TYPE_ENUM.OMNI)).toBe('OMNI' as BEAN_ROASTING_TYPE_ENUM);
      expect(roastingTypeToKeyString(BEAN_ROASTING_TYPE_ENUM.UNKNOWN)).toBe('UNKNOWN' as BEAN_ROASTING_TYPE_ENUM);
    });
  });
});