import { BEAN_MIX_ENUM } from '../../enums/beans/mix';
import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { mapToBeanMix, mapToRoastingType } from './type-mappings';

describe('Type Mappings', () => {
  describe('mapToBeanMix', () => {
    it('should map "SINGLE_ORIGIN" to BEAN_MIX_ENUM.SINGLE_ORIGIN', () => {
      expect(mapToBeanMix('SINGLE_ORIGIN')).toBe(BEAN_MIX_ENUM.SINGLE_ORIGIN);
    });

    it('should map "BLEND" to BEAN_MIX_ENUM.BLEND', () => {
      expect(mapToBeanMix('BLEND')).toBe(BEAN_MIX_ENUM.BLEND);
    });

    it('should map "UNKNOWN" to BEAN_MIX_ENUM.UNKNOWN', () => {
      expect(mapToBeanMix('UNKNOWN')).toBe(BEAN_MIX_ENUM.UNKNOWN);
    });

    it('should handle lowercase input', () => {
      expect(mapToBeanMix('single_origin')).toBe(BEAN_MIX_ENUM.SINGLE_ORIGIN);
      expect(mapToBeanMix('blend')).toBe(BEAN_MIX_ENUM.BLEND);
    });

    it('should handle mixed case input', () => {
      expect(mapToBeanMix('Single_Origin')).toBe(BEAN_MIX_ENUM.SINGLE_ORIGIN);
      expect(mapToBeanMix('Blend')).toBe(BEAN_MIX_ENUM.BLEND);
    });

    it('should handle input with spaces instead of underscores', () => {
      expect(mapToBeanMix('SINGLE ORIGIN')).toBe(BEAN_MIX_ENUM.SINGLE_ORIGIN);
      expect(mapToBeanMix('single origin')).toBe(BEAN_MIX_ENUM.SINGLE_ORIGIN);
    });

    it('should handle input with hyphens', () => {
      expect(mapToBeanMix('SINGLE-ORIGIN')).toBe(BEAN_MIX_ENUM.SINGLE_ORIGIN);
    });

    it('should return UNKNOWN for null', () => {
      expect(mapToBeanMix(null)).toBe(BEAN_MIX_ENUM.UNKNOWN);
    });

    it('should return UNKNOWN for undefined', () => {
      expect(mapToBeanMix(undefined)).toBe(BEAN_MIX_ENUM.UNKNOWN);
    });

    it('should return UNKNOWN for empty string', () => {
      expect(mapToBeanMix('')).toBe(BEAN_MIX_ENUM.UNKNOWN);
    });

    it('should return UNKNOWN for unrecognized values', () => {
      expect(mapToBeanMix('INVALID')).toBe(BEAN_MIX_ENUM.UNKNOWN);
      expect(mapToBeanMix('random text')).toBe(BEAN_MIX_ENUM.UNKNOWN);
    });
  });

  describe('mapToRoastingType', () => {
    it('should map "FILTER" to BEAN_ROASTING_TYPE_ENUM.FILTER', () => {
      expect(mapToRoastingType('FILTER')).toBe(BEAN_ROASTING_TYPE_ENUM.FILTER);
    });

    it('should map "ESPRESSO" to BEAN_ROASTING_TYPE_ENUM.ESPRESSO', () => {
      expect(mapToRoastingType('ESPRESSO')).toBe(
        BEAN_ROASTING_TYPE_ENUM.ESPRESSO,
      );
    });

    it('should map "OMNI" to BEAN_ROASTING_TYPE_ENUM.OMNI', () => {
      expect(mapToRoastingType('OMNI')).toBe(BEAN_ROASTING_TYPE_ENUM.OMNI);
    });

    it('should handle lowercase input', () => {
      expect(mapToRoastingType('filter')).toBe(BEAN_ROASTING_TYPE_ENUM.FILTER);
      expect(mapToRoastingType('espresso')).toBe(
        BEAN_ROASTING_TYPE_ENUM.ESPRESSO,
      );
      expect(mapToRoastingType('omni')).toBe(BEAN_ROASTING_TYPE_ENUM.OMNI);
    });

    it('should handle mixed case input', () => {
      expect(mapToRoastingType('Filter')).toBe(BEAN_ROASTING_TYPE_ENUM.FILTER);
      expect(mapToRoastingType('Espresso')).toBe(
        BEAN_ROASTING_TYPE_ENUM.ESPRESSO,
      );
    });

    it('should return UNKNOWN for null', () => {
      expect(mapToRoastingType(null)).toBe(BEAN_ROASTING_TYPE_ENUM.UNKNOWN);
    });

    it('should return UNKNOWN for undefined', () => {
      expect(mapToRoastingType(undefined)).toBe(
        BEAN_ROASTING_TYPE_ENUM.UNKNOWN,
      );
    });

    it('should return UNKNOWN for empty string', () => {
      expect(mapToRoastingType('')).toBe(BEAN_ROASTING_TYPE_ENUM.UNKNOWN);
    });

    it('should return UNKNOWN for unrecognized values', () => {
      expect(mapToRoastingType('INVALID')).toBe(
        BEAN_ROASTING_TYPE_ENUM.UNKNOWN,
      );
      expect(mapToRoastingType('light roast')).toBe(
        BEAN_ROASTING_TYPE_ENUM.UNKNOWN,
      );
    });
  });
});
