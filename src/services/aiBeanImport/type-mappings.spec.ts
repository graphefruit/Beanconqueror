import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';
import { mapToBeanMix, mapToRoastingType } from './type-mappings';

describe('Type Mappings', () => {
  describe('mapToBeanMix', () => {
    it('should map valid values case-insensitively to corresponding enum values', () => {
      expect(mapToBeanMix('SINGLE_ORIGIN')).toBe(BEAN_MIX_ENUM.SINGLE_ORIGIN);
      expect(mapToBeanMix('single_origin')).toBe(BEAN_MIX_ENUM.SINGLE_ORIGIN);
      expect(mapToBeanMix('Single_Origin')).toBe(BEAN_MIX_ENUM.SINGLE_ORIGIN);
      expect(mapToBeanMix('BLEND')).toBe(BEAN_MIX_ENUM.BLEND);
      expect(mapToBeanMix('blend')).toBe(BEAN_MIX_ENUM.BLEND);
      expect(mapToBeanMix('Blend')).toBe(BEAN_MIX_ENUM.BLEND);
      expect(mapToBeanMix('UNKNOWN')).toBe(BEAN_MIX_ENUM.UNKNOWN);
    });

    it('should handle input with spaces or hyphens instead of underscores', () => {
      expect(mapToBeanMix('SINGLE ORIGIN')).toBe(BEAN_MIX_ENUM.SINGLE_ORIGIN);
      expect(mapToBeanMix('single origin')).toBe(BEAN_MIX_ENUM.SINGLE_ORIGIN);
      expect(mapToBeanMix('SINGLE-ORIGIN')).toBe(BEAN_MIX_ENUM.SINGLE_ORIGIN);
    });

    it('should return UNKNOWN for null, undefined, empty string, or unrecognized values', () => {
      expect(mapToBeanMix(null)).toBe(BEAN_MIX_ENUM.UNKNOWN);
      expect(mapToBeanMix(undefined)).toBe(BEAN_MIX_ENUM.UNKNOWN);
      expect(mapToBeanMix('')).toBe(BEAN_MIX_ENUM.UNKNOWN);
      expect(mapToBeanMix('INVALID')).toBe(BEAN_MIX_ENUM.UNKNOWN);
      expect(mapToBeanMix('random text')).toBe(BEAN_MIX_ENUM.UNKNOWN);
    });
  });

  describe('mapToRoastingType', () => {
    it('should map valid values case-insensitively to corresponding enum values', () => {
      expect(mapToRoastingType('FILTER')).toBe(BEAN_ROASTING_TYPE_ENUM.FILTER);
      expect(mapToRoastingType('filter')).toBe(BEAN_ROASTING_TYPE_ENUM.FILTER);
      expect(mapToRoastingType('Filter')).toBe(BEAN_ROASTING_TYPE_ENUM.FILTER);
      expect(mapToRoastingType('ESPRESSO')).toBe(
        BEAN_ROASTING_TYPE_ENUM.ESPRESSO,
      );
      expect(mapToRoastingType('espresso')).toBe(
        BEAN_ROASTING_TYPE_ENUM.ESPRESSO,
      );
      expect(mapToRoastingType('OMNI')).toBe(BEAN_ROASTING_TYPE_ENUM.OMNI);
      expect(mapToRoastingType('omni')).toBe(BEAN_ROASTING_TYPE_ENUM.OMNI);
    });

    it('should return UNKNOWN for null, undefined, empty string, or unrecognized values', () => {
      expect(mapToRoastingType(null)).toBe(BEAN_ROASTING_TYPE_ENUM.UNKNOWN);
      expect(mapToRoastingType(undefined)).toBe(
        BEAN_ROASTING_TYPE_ENUM.UNKNOWN,
      );
      expect(mapToRoastingType('')).toBe(BEAN_ROASTING_TYPE_ENUM.UNKNOWN);
      expect(mapToRoastingType('INVALID')).toBe(
        BEAN_ROASTING_TYPE_ENUM.UNKNOWN,
      );
      expect(mapToRoastingType('light roast')).toBe(
        BEAN_ROASTING_TYPE_ENUM.UNKNOWN,
      );
    });
  });
});
