import { TestBed } from '@angular/core/testing';

import { MergedExamples } from './ai-import-examples.service';
import { OCRCorrectionService } from './ocr-correction.service';
import { createMockExamples } from './test-utils';

describe('OCRCorrectionService', () => {
  let service: OCRCorrectionService;
  let mockExamples: MergedExamples;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OCRCorrectionService],
    });
    service = TestBed.inject(OCRCorrectionService);
    mockExamples = createMockExamples();
  });

  it('should be injectable via TestBed', () => {
    expect(service).toBeTruthy();
  });

  describe('generateVariants', () => {
    // WHY: These tests verify individual OCR character substitution patterns work.
    // Each test covers ONE specific OCR confusion pattern in isolation.

    it('should generate O variant when input contains digit 0', () => {
      // Arrange
      const input = 'C0lombia';

      // Act
      const variants = service.generateVariants(input);

      // Assert
      expect(variants).toContain('COlombia');
    });

    it('should generate l and I variants when input contains digit 1', () => {
      // Arrange
      const input = 'Co1ombia';

      // Act
      const variants = service.generateVariants(input);

      // Assert
      expect(variants).toContain('Colombia');
      expect(variants).toContain('CoIombia');
    });

    it('should generate S variant when input contains digit 5', () => {
      // Arrange
      const input = '5idra';

      // Act
      const variants = service.generateVariants(input);

      // Assert
      expect(variants).toContain('Sidra');
    });

    it('should generate G variant when input contains digit 6', () => {
      // Arrange
      const input = '6esha';

      // Act
      const variants = service.generateVariants(input);

      // Assert
      expect(variants).toContain('Gesha');
    });

    it('should generate B variant when input contains digit 8', () => {
      // WHY: OCR often confuses digit 8 with letter B due to similar shapes

      // Arrange
      const input = '8ourbon';

      // Act
      const variants = service.generateVariants(input);

      // Assert
      expect(variants).toContain('Bourbon');
    });

    it('should generate l and 1 variants when input contains lowercase t', () => {
      // WHY: Lowercase t can be OCR'd as l or 1 depending on font

      // Arrange
      const input = 'Cotombia';

      // Act
      const variants = service.generateVariants(input);

      // Assert
      expect(variants).toContain('Colombia');
    });

    it('should generate m variant when input contains rn sequence', () => {
      // WHY: "rn" and "m" look very similar in many fonts, causing OCR confusion

      // Arrange
      const input = 'Colornbia';

      // Act
      const variants = service.generateVariants(input);

      // Assert
      expect(variants).toContain('Colombia');
    });
  });

  describe('fuzzyMatchCountry', () => {
    // WHY: Tests verify country matching using generated variants.
    // Focus on MATCHING BEHAVIOR, not variant generation (covered in generateVariants tests).

    it('should return properly cased country for exact case-insensitive match', () => {
      // Arrange
      const input = 'COLOMBIA';

      // Act
      const result = service.fuzzyMatchCountry(input, mockExamples);

      // Assert - returns the properly cased version from examples
      expect(result).toBe('Colombia');
    });

    it('should return matched country when OCR-corrupted input has matching variant', () => {
      // WHY: Main purpose - correct OCR errors using variant generation

      // Arrange - using 0 instead of O (OCR error)
      const input = 'C0lombia';

      // Act
      const result = service.fuzzyMatchCountry(input, mockExamples);

      // Assert
      expect(result).toBe('Colombia');
    });

    it('should return null when no country matches any generated variant', () => {
      // Arrange
      const input = 'Atlantis';

      // Act
      const result = service.fuzzyMatchCountry(input, mockExamples);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('fuzzyMatchVariety', () => {
    // Parallel structure to fuzzyMatchCountry - matching behavior only

    it('should return properly cased variety for exact case-insensitive match', () => {
      // Arrange
      const input = 'BOURBON';

      // Act
      const result = service.fuzzyMatchVariety(input, mockExamples);

      // Assert
      expect(result).toBe('Bourbon');
    });

    it('should return matched variety when OCR-corrupted input has matching variant', () => {
      // Arrange - using 6 instead of G (OCR error)
      const input = '6esha';

      // Act
      const result = service.fuzzyMatchVariety(input, mockExamples);

      // Assert
      expect(result).toBe('Gesha');
    });

    it('should return null when no variety matches any generated variant', () => {
      // Arrange
      const input = 'UnknownVariety';

      // Act
      const result = service.fuzzyMatchVariety(input, mockExamples);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('fuzzyMatchProcessing', () => {
    // Parallel structure to other fuzzyMatch methods

    it('should return properly cased processing method for exact case-insensitive match', () => {
      // Arrange
      const input = 'NATURAL';

      // Act
      const result = service.fuzzyMatchProcessing(input, mockExamples);

      // Assert
      expect(result).toBe('Natural');
    });

    it('should return null when no processing method matches', () => {
      // Arrange
      const input = 'UnknownProcess';

      // Act
      const result = service.fuzzyMatchProcessing(input, mockExamples);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('correctOCRErrors', () => {
    // WHY: Tests the composition of all correction behaviors on full text.
    // Each test focuses on ONE aspect of full-text correction.

    it('should apply country corrections to matching words in text', () => {
      // Arrange - C0lombia should become Colombia
      const input = 'C0lombia Natural';

      // Act
      const result = service.correctOCRErrors(input, mockExamples);

      // Assert
      expect(result).toContain('Colombia');
    });

    it('should apply variety corrections to matching words in text', () => {
      // Arrange - 6esha should become Gesha
      const input = 'Ethiopia 6esha';

      // Act
      const result = service.correctOCRErrors(input, mockExamples);

      // Assert
      expect(result).toContain('Gesha');
    });

    it('should apply processing corrections to matching words in text', () => {
      // Arrange - NATURAL should be normalized to Natural
      const input = 'NATURAL processed';

      // Act
      const result = service.correctOCRErrors(input, mockExamples);

      // Assert
      expect(result).toContain('Natural');
    });

    it('should preserve words that do not match any known term', () => {
      // Arrange
      const input = 'Colombia Unknown Term Here';

      // Act
      const result = service.correctOCRErrors(input, mockExamples);

      // Assert - unknown words should remain unchanged
      expect(result).toContain('Unknown');
      expect(result).toContain('Term');
      expect(result).toContain('Here');
    });

    it('should handle text with no correctable terms', () => {
      // Arrange
      const input = 'Random words without coffee terms';

      // Act
      const result = service.correctOCRErrors(input, mockExamples);

      // Assert - should return text unchanged (modulo whitespace normalization)
      expect(result).toContain('Random');
      expect(result).toContain('words');
    });

    it('should correct multiple OCR errors in the same text', () => {
      // WHY: Real labels often have multiple OCR issues that need correction together

      // Arrange
      const input = 'C0lombia 6esha Natural';

      // Act
      const result = service.correctOCRErrors(input, mockExamples);

      // Assert - both Colombia and Gesha should be corrected
      expect(result).toContain('Colombia');
      expect(result).toContain('Gesha');
      expect(result).toContain('Natural');
    });
  });
});
