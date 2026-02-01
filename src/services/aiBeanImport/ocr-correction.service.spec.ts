import { TestBed } from '@angular/core/testing';

import { MergedExamples } from './ai-import-examples.service';
import { OCRCorrectionService } from './ocr-correction.service';

describe('OCRCorrectionService', () => {
  let service: OCRCorrectionService;

  const mockExamples: MergedExamples = {
    ORIGINS: 'Colombia, Ethiopia, Kenya, Brazil, Guatemala',
    PROCESSING_METHODS: 'Washed, Natural, Honey, Anaerobic',
    VARIETIES: 'Bourbon, Gesha, SL-28, Typica, Caturra',
    ROASTING_TYPE_FILTER_KEYWORDS: 'Filter, Pour Over',
    ROASTING_TYPE_ESPRESSO_KEYWORDS: 'Espresso',
    ROASTING_TYPE_OMNI_KEYWORDS: 'Omni',
    DECAF_KEYWORDS: 'Decaf, Decaffeinated',
    BLEND_KEYWORDS: 'Blend, House Blend',
    SINGLE_ORIGIN_KEYWORDS: 'Single Origin',
    PRODUCER_KEYWORDS: 'Producer, Farmer, Cooperative',
    ROASTDATE_KEYWORDS: 'Roast date, Roasted on, Freshly roasted',
    ROASTER_KEYWORDS: 'Roastery, Coffee Roasters, Kaffeerösterei',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OCRCorrectionService],
    });
    service = TestBed.inject(OCRCorrectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generateVariants', () => {
    it('should generate variants for 0/O confusion', () => {
      const variants = service.generateVariants('C0lombia');
      expect(variants).toContain('COlombia');
    });

    it('should generate variants for 1/l/I confusion', () => {
      const variants = service.generateVariants('Co1ombia');
      expect(variants).toContain('Colombia');
    });

    it('should generate variants for 5/S confusion', () => {
      const variants = service.generateVariants('5idra');
      expect(variants).toContain('Sidra');
    });

    it('should generate variants for 6/G confusion', () => {
      const variants = service.generateVariants('6esha');
      expect(variants).toContain('Gesha');
    });

    it('should generate variants for t/l/1 confusion', () => {
      const variants = service.generateVariants('Cotombia');
      expect(variants).toContain('Colombia');
    });

    it('should generate variants for rn/m confusion', () => {
      const variants = service.generateVariants('Colornbia');
      expect(variants).toContain('Colombia');
    });
  });

  describe('fuzzyMatchCountry', () => {
    it('should match exact country name', () => {
      expect(service.fuzzyMatchCountry('Colombia', mockExamples)).toBe(
        'Colombia',
      );
    });

    it('should match case-insensitive', () => {
      expect(service.fuzzyMatchCountry('COLOMBIA', mockExamples)).toBe(
        'Colombia',
      );
    });

    it('should correct 0/O OCR error', () => {
      expect(service.fuzzyMatchCountry('C0lombia', mockExamples)).toBe(
        'Colombia',
      );
    });

    it('should correct 1/l OCR error', () => {
      expect(service.fuzzyMatchCountry('Co1ombia', mockExamples)).toBe(
        'Colombia',
      );
    });

    it('should return null for unknown country', () => {
      expect(service.fuzzyMatchCountry('Atlantis', mockExamples)).toBeNull();
    });
  });

  describe('fuzzyMatchVariety', () => {
    it('should match exact variety name', () => {
      expect(service.fuzzyMatchVariety('Bourbon', mockExamples)).toBe(
        'Bourbon',
      );
    });

    it('should correct 6/G OCR error', () => {
      expect(service.fuzzyMatchVariety('6esha', mockExamples)).toBe('Gesha');
    });

    it('should correct 8/B OCR error', () => {
      expect(service.fuzzyMatchVariety('8ourbon', mockExamples)).toBe(
        'Bourbon',
      );
    });
  });

  describe('fuzzyMatchProcessing', () => {
    it('should match exact processing method', () => {
      expect(service.fuzzyMatchProcessing('Washed', mockExamples)).toBe(
        'Washed',
      );
    });

    it('should match case-insensitive', () => {
      expect(service.fuzzyMatchProcessing('NATURAL', mockExamples)).toBe(
        'Natural',
      );
    });
  });

  describe('correctOCRErrors', () => {
    it('should correct multiple OCR errors in text', () => {
      const input = 'C0lombia 6esha Natural';
      const result = service.correctOCRErrors(input, mockExamples);
      expect(result).toContain('Colombia');
      expect(result).toContain('Gesha');
      expect(result).toContain('Natural');
    });

    it('should preserve unknown words', () => {
      const input = 'Colombia Unknown Term Here';
      const result = service.correctOCRErrors(input, mockExamples);
      expect(result).toContain('Unknown');
      expect(result).toContain('Term');
    });
  });
});
