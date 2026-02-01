import { TestBed } from '@angular/core/testing';

import {
  normalizeAltitudeUnit,
  removeThousandSeparatorsFromInteger,
  TextNormalizationService,
} from './text-normalization.service';

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

  describe('normalizeNumbers with international formats', () => {
    it('should handle Swiss apostrophe thousand separator', () => {
      // WHY: Swiss German uses apostrophe as thousand separator (1'850 = 1850)

      expect(service.normalizeNumbers("1'850m")).toBe('1850m');
    });

    it('should handle French space thousand separator', () => {
      // WHY: French uses space as thousand separator (1 850 = 1850)

      expect(service.normalizeNumbers('1 850m')).toBe('1850m');
    });

    it('should handle thin space (U+2009) thousand separator', () => {
      // WHY: ISO 31-0 recommends thin space as thousand separator

      expect(service.normalizeNumbers('1\u2009850m')).toBe('1850m');
    });

    it('should handle narrow no-break space (U+202F) thousand separator', () => {
      // WHY: French typography often uses narrow no-break space

      expect(service.normalizeNumbers('1\u202F850m')).toBe('1850m');
    });
  });

  describe('normalizeAltitude with international formats', () => {
    it('should handle Swiss format with apostrophe', () => {
      // WHY: Swiss coffee labels may use "1'850 m.ü.M." format

      expect(service.normalizeAltitude("1'850 m.ü.M.")).toBe('1850 MASL');
    });

    it('should handle French format with narrow no-break space', () => {
      // WHY: French labels may use "1 850 msnm" with thin/narrow space

      expect(service.normalizeAltitude('1\u202F850 msnm')).toBe('1850 MASL');
    });

    it('should handle Swiss range format', () => {
      expect(service.normalizeAltitude("1'700-1'900m")).toBe('1700-1900 MASL');
    });
  });
});

// Tests for standalone exported functions
describe('removeThousandSeparatorsFromInteger', () => {
  it('should remove standard European separators (dot, comma)', () => {
    expect(removeThousandSeparatorsFromInteger('1.850')).toBe('1850');
    expect(removeThousandSeparatorsFromInteger('1,850')).toBe('1850');
  });

  it('should remove Swiss/French separators (apostrophe, spaces)', () => {
    expect(removeThousandSeparatorsFromInteger("1'850")).toBe('1850');
    expect(removeThousandSeparatorsFromInteger('1\u2019850')).toBe('1850'); // right single quote
    expect(removeThousandSeparatorsFromInteger('1 850')).toBe('1850');
    expect(removeThousandSeparatorsFromInteger('1\u2009850')).toBe('1850'); // thin space
    expect(removeThousandSeparatorsFromInteger('1\u202F850')).toBe('1850'); // narrow no-break space
  });

  it('should handle multiple separators in same number', () => {
    expect(removeThousandSeparatorsFromInteger("1'234'567")).toBe('1234567');
    expect(removeThousandSeparatorsFromInteger('1.234.567')).toBe('1234567');
  });

  it('should preserve decimals and pass through clean numbers', () => {
    expect(removeThousandSeparatorsFromInteger('1850')).toBe('1850');
    expect(removeThousandSeparatorsFromInteger('1.5')).toBe('1.5');
    expect(removeThousandSeparatorsFromInteger('1.50')).toBe('1.50');
  });

  it('should handle numbers in context and mixed formats', () => {
    expect(removeThousandSeparatorsFromInteger("altitude 1'850 MASL")).toBe(
      'altitude 1850 MASL',
    );
    expect(removeThousandSeparatorsFromInteger("1'850 to 2.100")).toBe(
      '1850 to 2100',
    );
  });
});

describe('normalizeAltitudeUnit', () => {
  it('should convert various unit notations to MASL', () => {
    expect(normalizeAltitudeUnit('1850 m.ü.M.')).toBe('1850 MASL');
    expect(normalizeAltitudeUnit('1850 M.Ü.M.')).toBe('1850 MASL');
    expect(normalizeAltitudeUnit('1850 meters')).toBe('1850 MASL');
    expect(normalizeAltitudeUnit('1850 meter')).toBe('1850 MASL');
    expect(normalizeAltitudeUnit('1850 msnm')).toBe('1850 MASL');
    expect(normalizeAltitudeUnit('1850 m')).toBe('1850 MASL');
    // Note: normalizeAltitudeUnit doesn't add space, that's handled by normalizeAltitude
    expect(normalizeAltitudeUnit('1850m')).toBe('1850MASL');
  });

  it('should handle ranges', () => {
    expect(normalizeAltitudeUnit('1700-1900m')).toBe('1700-1900MASL');
    expect(normalizeAltitudeUnit('1700-1900 meters')).toBe('1700-1900 MASL');
  });

  it('should normalize MASL case variations', () => {
    expect(normalizeAltitudeUnit('1850 MASL')).toBe('1850 MASL');
    expect(normalizeAltitudeUnit('1850 masl')).toBe('1850 MASL');
    expect(normalizeAltitudeUnit('1850 Masl')).toBe('1850 MASL');
  });
});

describe('preprocessing and postprocessing consistency', () => {
  let service: TextNormalizationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TextNormalizationService],
    });
    service = TestBed.inject(TextNormalizationService);
  });

  // Simulate what preprocessing does (via normalizeAltitude)
  const preprocess = (text: string) => {
    return service.normalizeAltitude(text);
  };

  // Simulate what postprocessing does (standalone functions)
  const postprocess = (text: string) => {
    let result = removeThousandSeparatorsFromInteger(text);
    result = normalizeAltitudeUnit(result);
    return result;
  };

  it('Swiss format "1\'850 m.ü.M." produces consistent result', () => {
    const input = "1'850 m.ü.M.";
    const preprocessed = preprocess(input);
    const postprocessed = postprocess(input);
    expect(preprocessed).toContain('1850 MASL');
    expect(postprocessed).toContain('1850 MASL');
  });

  it('French format with narrow no-break space produces consistent result', () => {
    const input = '1\u202F850 msnm';
    const preprocessed = preprocess(input);
    const postprocessed = postprocess(input);
    expect(preprocessed).toContain('1850 MASL');
    expect(postprocessed).toContain('1850 MASL');
  });

  it('German format "1.850 m.ü.M." produces consistent result', () => {
    const input = '1.850 m.ü.M.';
    const preprocessed = preprocess(input);
    const postprocessed = postprocess(input);
    expect(preprocessed).toBe('1850 MASL');
    expect(postprocessed).toBe('1850 MASL');
  });
});
