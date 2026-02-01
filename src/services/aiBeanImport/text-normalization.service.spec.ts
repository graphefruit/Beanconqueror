import { TestBed } from '@angular/core/testing';

import { TextNormalizationService } from './text-normalization.service';

describe('TextNormalizationService', () => {
  let service: TextNormalizationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TextNormalizationService],
    });
    service = TestBed.inject(TextNormalizationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('normalizeCase', () => {
    it('should convert ALL CAPS to Title Case', () => {
      expect(service.normalizeCase('FINCA EL PARAÍSO')).toBe(
        'Finca el Paraíso',
      );
    });

    it('should preserve mixed case text', () => {
      expect(service.normalizeCase('Square Mile Coffee')).toBe(
        'Square Mile Coffee',
      );
    });

    it('should handle multiple lines', () => {
      const input = 'ETHIOPIA YIRGACHEFFE\nNATURAL PROCESS';
      const expected = 'Ethiopia Yirgacheffe\nNatural Process';
      expect(service.normalizeCase(input)).toBe(expected);
    });

    it('should preserve coffee acronyms', () => {
      expect(service.normalizeCase('KENYA AA')).toBe('Kenya AA');
    });

    it('should preserve SL-28 and SL-34 varieties', () => {
      expect(service.normalizeCase('SL-28 SL-34')).toBe('SL-28 SL-34');
    });
  });

  describe('normalizeNumbers', () => {
    it('should remove European thousand separator (dot)', () => {
      expect(service.normalizeNumbers('1.850m')).toBe('1850m');
    });

    it('should remove European thousand separator (comma)', () => {
      expect(service.normalizeNumbers('1,900m')).toBe('1900m');
    });

    it('should handle ranges', () => {
      expect(service.normalizeNumbers('1.700-1.900m')).toBe('1700-1900m');
    });

    it('should not affect decimal numbers', () => {
      expect(service.normalizeNumbers('1.5kg')).toBe('1.5kg');
    });
  });

  describe('normalizeAltitude', () => {
    it('should normalize m.ü.M. to MASL', () => {
      expect(service.normalizeAltitude('1.850 m.ü.M.')).toBe('1850 MASL');
    });

    it('should normalize meters to MASL', () => {
      expect(service.normalizeAltitude('1850 meters')).toBe('1850 MASL');
    });

    it('should normalize msnm to MASL', () => {
      expect(service.normalizeAltitude('2000 msnm')).toBe('2000 MASL');
    });

    it('should handle altitude ranges', () => {
      expect(service.normalizeAltitude('1.700 - 1.900m')).toBe(
        '1700-1900 MASL',
      );
    });

    it('should handle already MASL format', () => {
      expect(service.normalizeAltitude('1850 MASL')).toBe('1850 MASL');
    });

    it('should handle 3-digit altitudes', () => {
      expect(service.normalizeAltitude('800m')).toBe('800 MASL');
      expect(service.normalizeAltitude('900 meters')).toBe('900 MASL');
    });

    it('should handle implicit ranges without dash', () => {
      expect(service.normalizeAltitude('800m 1200m')).toBe('800-1200 MASL');
      expect(service.normalizeAltitude('800m 1200 MASL')).toBe('800-1200 MASL');
      expect(service.normalizeAltitude('1200m 1800m')).toBe('1200-1800 MASL');
    });

    it('should handle 3-digit ranges with dash', () => {
      expect(service.normalizeAltitude('800-1200m')).toBe('800-1200 MASL');
      expect(service.normalizeAltitude('800 - 1200 meters')).toBe(
        '800-1200 MASL',
      );
    });
  });

  describe('extractWeight', () => {
    it('should extract grams', () => {
      expect(service.extractWeight('250g')).toBe(250);
      expect(service.extractWeight('250 grams')).toBe(250);
    });

    it('should convert kilograms to grams', () => {
      expect(service.extractWeight('1kg')).toBe(1000);
      expect(service.extractWeight('1.5 kg')).toBe(1500);
    });

    it('should convert ounces to grams', () => {
      expect(service.extractWeight('12oz')).toBe(340);
    });

    it('should convert pounds to grams', () => {
      expect(service.extractWeight('1lb')).toBe(454);
    });

    it('should return null if no weight found', () => {
      expect(service.extractWeight('Ethiopia Yirgacheffe')).toBeNull();
    });
  });

  describe('normalizeAll', () => {
    it('should apply all normalizations', () => {
      const input = 'FINCA EL PARAÍSO\n1.850 m.ü.M.\n250g';
      const result = service.normalizeAll(input);
      expect(result).toContain('Finca el Paraíso');
      expect(result).toContain('1850 MASL');
    });
  });

  describe('layout tag preservation', () => {
    it('should preserve markdown size prefix and normalize content', () => {
      const input = '**LARGE:** COFFEE NAME';
      const result = service.normalizeCase(input);
      expect(result).toBe('**LARGE:** Coffee Name');
    });

    it('should preserve section headers', () => {
      const input = '=== OCR WITH LAYOUT ===';
      const result = service.normalizeCase(input);
      expect(result).toBe('=== OCR WITH LAYOUT ===');
    });

    it('should preserve label markers', () => {
      const input = '--- Label 1 of 2 ---';
      const result = service.normalizeCase(input);
      expect(result).toBe('--- Label 1 of 2 ---');
    });

    it('should handle mixed layout and content with markdown format', () => {
      const input =
        '=== OCR WITH LAYOUT ===\n\n**LARGE:** ROASTER NAME\n\n**MEDIUM:** COFFEE ORIGIN';
      const result = service.normalizeCase(input);
      expect(result).toContain('=== OCR WITH LAYOUT ===');
      expect(result).toContain('**LARGE:** Roaster Name');
      expect(result).toContain('**MEDIUM:** Coffee Origin');
    });

    it('should handle all size tags', () => {
      expect(service.normalizeCase('**SMALL:** DETAILS')).toBe(
        '**SMALL:** Details',
      );
      expect(service.normalizeCase('**MEDIUM:** VARIETY')).toBe(
        '**MEDIUM:** Variety',
      );
      expect(service.normalizeCase('**LARGE:** TITLE')).toBe(
        '**LARGE:** Title',
      );
    });
  });
});
