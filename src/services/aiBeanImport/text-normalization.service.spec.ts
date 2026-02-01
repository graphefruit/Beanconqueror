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

  it('should be injectable via TestBed', () => {
    expect(service).toBeTruthy();
  });

  describe('normalizeCase', () => {
    it('should convert ALL CAPS text to Title Case for readability', () => {
      // Arrange
      const input = 'FINCA EL PARAÍSO';

      // Act
      const result = service.normalizeCase(input);

      // Assert
      expect(result).toBe('Finca el Paraíso');
    });

    it('should preserve mixed case text (already properly cased)', () => {
      // WHY: Properly cased brand names should not be modified

      // Arrange
      const input = 'Square Mile Coffee';

      // Act
      const result = service.normalizeCase(input);

      // Assert
      expect(result).toBe('Square Mile Coffee');
    });

    it('should handle multiple lines independently', () => {
      // Arrange
      const input = 'ETHIOPIA YIRGACHEFFE\nNATURAL PROCESS';

      // Act
      const result = service.normalizeCase(input);

      // Assert
      expect(result).toBe('Ethiopia Yirgacheffe\nNatural Process');
    });

    it('should preserve coffee grade acronyms like AA, AB, PB', () => {
      // WHY: Coffee grades are standardized acronyms that should stay uppercase

      // Arrange
      const input = 'KENYA AA';

      // Act
      const result = service.normalizeCase(input);

      // Assert
      expect(result).toBe('Kenya AA');
    });

    it('should preserve SL variety names (SL-28, SL-34)', () => {
      // WHY: SL varieties are proper acronyms (Scott Labs) that should stay uppercase

      // Arrange
      const input = 'SL-28 SL-34';

      // Act
      const result = service.normalizeCase(input);

      // Assert
      expect(result).toBe('SL-28 SL-34');
    });
  });

  describe('normalizeNumbers', () => {
    it('should remove European thousand separator (dot) from numbers', () => {
      // WHY: European notation uses dots as thousand separators (1.850 = 1850)

      // Arrange
      const input = '1.850m';

      // Act
      const result = service.normalizeNumbers(input);

      // Assert
      expect(result).toBe('1850m');
    });

    it('should remove European thousand separator (comma) from numbers', () => {
      // WHY: Some European regions use commas as thousand separators

      // Arrange
      const input = '1,900m';

      // Act
      const result = service.normalizeNumbers(input);

      // Assert
      expect(result).toBe('1900m');
    });

    it('should handle ranges with thousand separators', () => {
      // Arrange
      const input = '1.700-1.900m';

      // Act
      const result = service.normalizeNumbers(input);

      // Assert
      expect(result).toBe('1700-1900m');
    });

    it('should not affect decimal numbers (single digit after separator)', () => {
      // WHY: 1.5kg is a decimal, not a thousand separator

      // Arrange
      const input = '1.5kg';

      // Act
      const result = service.normalizeNumbers(input);

      // Assert
      expect(result).toBe('1.5kg');
    });
  });

  describe('normalizeAltitude', () => {
    it('should normalize German m.ü.M. notation to MASL', () => {
      // WHY: m.ü.M. = "Meter über Meer" (meters above sea level in German)

      // Arrange
      const input = '1.850 m.ü.M.';

      // Act
      const result = service.normalizeAltitude(input);

      // Assert
      expect(result).toBe('1850 MASL');
    });

    it('should normalize "meters" to MASL', () => {
      // Arrange
      const input = '1850 meters';

      // Act
      const result = service.normalizeAltitude(input);

      // Assert
      expect(result).toBe('1850 MASL');
    });

    it('should normalize Spanish msnm notation to MASL', () => {
      // WHY: msnm = "metros sobre el nivel del mar" (Spanish for MASL)

      // Arrange
      const input = '2000 msnm';

      // Act
      const result = service.normalizeAltitude(input);

      // Assert
      expect(result).toBe('2000 MASL');
    });

    it('should convert altitude range with spaces to hyphenated MASL format', () => {
      // WHY: Standardize various range formats to consistent "XXXX-YYYY MASL"

      // Arrange
      const input = '1.700 - 1.900m';

      // Act
      const result = service.normalizeAltitude(input);

      // Assert
      expect(result).toBe('1700-1900 MASL');
    });

    it('should preserve already normalized MASL format', () => {
      // Arrange
      const input = '1850 MASL';

      // Act
      const result = service.normalizeAltitude(input);

      // Assert
      expect(result).toBe('1850 MASL');
    });

    it('should handle 3-digit altitudes', () => {
      // WHY: Some coffees grow at lower elevations (800-900m)

      // Arrange & Act & Assert
      expect(service.normalizeAltitude('800m')).toBe('800 MASL');
      expect(service.normalizeAltitude('900 meters')).toBe('900 MASL');
    });

    it('should handle implicit ranges without dash (two altitude values)', () => {
      // WHY: Labels sometimes show "800m 1200m" without explicit range notation

      // Arrange & Act & Assert
      expect(service.normalizeAltitude('800m 1200m')).toBe('800-1200 MASL');
      expect(service.normalizeAltitude('800m 1200 MASL')).toBe('800-1200 MASL');
      expect(service.normalizeAltitude('1200m 1800m')).toBe('1200-1800 MASL');
    });

    it('should handle 3-digit ranges with dash', () => {
      // Arrange & Act & Assert
      expect(service.normalizeAltitude('800-1200m')).toBe('800-1200 MASL');
      expect(service.normalizeAltitude('800 - 1200 meters')).toBe(
        '800-1200 MASL',
      );
    });
  });

  describe('extractWeight', () => {
    it('should extract grams from various formats', () => {
      // Arrange & Act & Assert
      expect(service.extractWeight('250g')).toBe(250);
      expect(service.extractWeight('250 grams')).toBe(250);
    });

    it('should convert kilograms to grams', () => {
      // Arrange & Act & Assert
      expect(service.extractWeight('1kg')).toBe(1000);
      expect(service.extractWeight('1.5 kg')).toBe(1500);
    });

    it('should convert ounces to grams (rounded)', () => {
      // WHY: 12oz ≈ 340g (using standard 28.35g per oz, rounded)

      // Arrange
      const input = '12oz';

      // Act
      const result = service.extractWeight(input);

      // Assert
      expect(result).toBe(340);
    });

    it('should convert pounds to grams (rounded)', () => {
      // WHY: 1lb ≈ 454g (using standard 453.6g per lb, rounded)

      // Arrange
      const input = '1lb';

      // Act
      const result = service.extractWeight(input);

      // Assert
      expect(result).toBe(454);
    });

    it('should return null if no weight pattern found', () => {
      // Arrange
      const input = 'Ethiopia Yirgacheffe';

      // Act
      const result = service.extractWeight(input);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('normalizeAll', () => {
    it('should apply all normalizations in correct order', () => {
      // Arrange
      const input = 'FINCA EL PARAÍSO\n1.850 m.ü.M.\n250g';

      // Act
      const result = service.normalizeAll(input);

      // Assert
      expect(result).toContain('Finca el Paraíso');
      expect(result).toContain('1850 MASL');
    });
  });

  describe('layout tag preservation', () => {
    it('should preserve markdown size prefix and normalize only the content', () => {
      // WHY: Layout tags are added by OcrMetadataService and must be preserved

      // Arrange
      const input = '**LARGE:** COFFEE NAME';

      // Act
      const result = service.normalizeCase(input);

      // Assert
      expect(result).toBe('**LARGE:** Coffee Name');
    });

    it('should preserve section headers unchanged', () => {
      // Arrange
      const input = '=== OCR WITH LAYOUT ===';

      // Act
      const result = service.normalizeCase(input);

      // Assert
      expect(result).toBe('=== OCR WITH LAYOUT ===');
    });

    it('should preserve label markers unchanged', () => {
      // Arrange
      const input = '--- Label 1 of 2 ---';

      // Act
      const result = service.normalizeCase(input);

      // Assert
      expect(result).toBe('--- Label 1 of 2 ---');
    });

    it('should handle mixed layout tags and content correctly', () => {
      // Arrange
      const input =
        '=== OCR WITH LAYOUT ===\n\n**LARGE:** ROASTER NAME\n\n**MEDIUM:** COFFEE ORIGIN';

      // Act
      const result = service.normalizeCase(input);

      // Assert
      expect(result).toContain('=== OCR WITH LAYOUT ===');
      expect(result).toContain('**LARGE:** Roaster Name');
      expect(result).toContain('**MEDIUM:** Coffee Origin');
    });

    it('should handle all size tags (SMALL, MEDIUM, LARGE)', () => {
      // Arrange & Act & Assert
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
