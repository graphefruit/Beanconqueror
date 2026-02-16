import { mapToBeanMix, mapToRoastingType } from './type-mappings';

// Note: The app convention uses enum KEY strings (e.g., 'BLEND') at runtime,
// not enum VALUES (e.g., 'Blend'). The Bean constructor and UI ion-select
// options both use key strings. These tests verify that the mapping functions
// return key strings matching this convention.

describe('Type Mappings', () => {
  describe('mapToBeanMix', () => {
    it('should map valid values case-insensitively to corresponding enum key strings', () => {
      expect(mapToBeanMix('SINGLE_ORIGIN')).toBe('SINGLE_ORIGIN');
      expect(mapToBeanMix('single_origin')).toBe('SINGLE_ORIGIN');
      expect(mapToBeanMix('Single_Origin')).toBe('SINGLE_ORIGIN');
      expect(mapToBeanMix('BLEND')).toBe('BLEND');
      expect(mapToBeanMix('blend')).toBe('BLEND');
      expect(mapToBeanMix('Blend')).toBe('BLEND');
      expect(mapToBeanMix('UNKNOWN')).toBe('UNKNOWN');
    });

    it('should handle input with spaces or hyphens instead of underscores', () => {
      expect(mapToBeanMix('SINGLE ORIGIN')).toBe('SINGLE_ORIGIN');
      expect(mapToBeanMix('single origin')).toBe('SINGLE_ORIGIN');
      expect(mapToBeanMix('SINGLE-ORIGIN')).toBe('SINGLE_ORIGIN');
    });

    it('should return UNKNOWN for null, undefined, empty string, or unrecognized values', () => {
      expect(mapToBeanMix(null)).toBe('UNKNOWN');
      expect(mapToBeanMix(undefined)).toBe('UNKNOWN');
      expect(mapToBeanMix('')).toBe('UNKNOWN');
      expect(mapToBeanMix('INVALID')).toBe('UNKNOWN');
      expect(mapToBeanMix('random text')).toBe('UNKNOWN');
    });
  });

  describe('mapToRoastingType', () => {
    it('should map valid values case-insensitively to corresponding enum key strings', () => {
      expect(mapToRoastingType('FILTER')).toBe('FILTER');
      expect(mapToRoastingType('filter')).toBe('FILTER');
      expect(mapToRoastingType('Filter')).toBe('FILTER');
      expect(mapToRoastingType('ESPRESSO')).toBe('ESPRESSO');
      expect(mapToRoastingType('espresso')).toBe('ESPRESSO');
      expect(mapToRoastingType('OMNI')).toBe('OMNI');
      expect(mapToRoastingType('omni')).toBe('OMNI');
    });

    it('should return UNKNOWN for null, undefined, empty string, or unrecognized values', () => {
      expect(mapToRoastingType(null)).toBe('UNKNOWN');
      expect(mapToRoastingType(undefined)).toBe('UNKNOWN');
      expect(mapToRoastingType('')).toBe('UNKNOWN');
      expect(mapToRoastingType('INVALID')).toBe('UNKNOWN');
      expect(mapToRoastingType('light roast')).toBe('UNKNOWN');
    });
  });
});
