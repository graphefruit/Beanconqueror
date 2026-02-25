import { TestBed } from '@angular/core/testing';

import {
  OcrMetadataService,
  TextDetectionResult,
} from './ocr-metadata.service';
import { createBlock, createTextDetectionResult } from './test-utils';

describe('OcrMetadataService', () => {
  let service: OcrMetadataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OcrMetadataService],
    });
    service = TestBed.inject(OcrMetadataService);
  });

  it('should be injectable via TestBed', () => {
    expect(service).toBeTruthy();
  });

  describe('shouldUseMetadata', () => {
    it('should return false when blocks array is empty', () => {
      // Arrange
      const result = createTextDetectionResult('Some text', []);

      // Act & Assert
      expect(service.shouldUseMetadata(result)).toBeFalse();
    });

    it('should return false when blocks is undefined', () => {
      // Arrange - Use Partial type to represent incomplete test data
      const result = {
        text: 'Some text',
        blocks: undefined,
      } as Partial<TextDetectionResult> as TextDetectionResult;

      // Act & Assert
      expect(service.shouldUseMetadata(result)).toBeFalse();
    });

    it('should return false when only one block exists (insufficient data for layout analysis)', () => {
      // WHY: Layout analysis requires multiple blocks to detect size variations

      // Arrange
      const result = createTextDetectionResult('Text', [
        createBlock('Text', 0, 0, 100, 50),
      ]);

      // Act & Assert
      expect(service.shouldUseMetadata(result)).toBeFalse();
    });

    it('should return false when all blocks have similar size (no meaningful hierarchy)', () => {
      // WHY: Similar-sized blocks indicate uniform text without headers/titles

      // Arrange
      const result = createTextDetectionResult('Line 1\nLine 2', [
        createBlock('Line 1', 0, 0, 100, 50),
        createBlock('Line 2', 0, 60, 100, 110),
      ]);

      // Act & Assert
      expect(service.shouldUseMetadata(result)).toBeFalse();
    });

    it('should return true when blocks have significant size variation (headers vs body text)', () => {
      // WHY: Size variation indicates visual hierarchy useful for field extraction

      // Arrange
      const largeTitle = createBlock('Big Title', 0, 0, 200, 100); // Height: 100
      const smallBody = createBlock('Small text', 0, 110, 200, 130); // Height: 20
      const result = createTextDetectionResult('Big Title\nSmall text', [
        largeTitle,
        smallBody,
      ]);

      // Act & Assert
      expect(service.shouldUseMetadata(result)).toBeTrue();
    });
  });

  describe('enrichWithLayout', () => {
    it('should return raw text without layout tags when metadata is not useful', () => {
      // Arrange
      const result = createTextDetectionResult('Some text', [
        createBlock('Some text', 0, 0, 100, 50),
      ]);

      // Act
      const enriched = service.enrichWithLayout(result);

      // Assert
      expect(enriched.rawText).toBe('Some text');
      expect(enriched.enrichedText).toBe('Some text');
      expect(enriched.hasUsefulMetadata).toBeFalse();
    });

    it('should add layout tags with OCR header when metadata provides hierarchy info', () => {
      // Arrange
      const result = createTextDetectionResult(
        'ROASTER NAME\nCoffee Name\nDetails',
        [
          createBlock('ROASTER NAME', 0, 0, 300, 80), // Large, top
          createBlock('Coffee Name', 0, 100, 300, 160), // Medium, top
          createBlock('Details', 0, 300, 150, 330), // Small, bottom
        ],
      );

      // Act
      const enriched = service.enrichWithLayout(result);

      // Assert
      expect(enriched.hasUsefulMetadata).toBeTrue();
      expect(enriched.enrichedText).toContain('=== OCR WITH LAYOUT ===');
      expect(enriched.enrichedText).toContain('**LARGE:**');
      expect(enriched.enrichedText).toContain('ROASTER NAME');
      expect(enriched.enrichedText).toContain('**MEDIUM:**');
      expect(enriched.enrichedText).toContain('Coffee Name');
      expect(enriched.enrichedText).toContain('**SMALL:**');
      expect(enriched.enrichedText).toContain('Details');
    });
  });

  describe('enrichMultiplePhotos', () => {
    it('should return empty string for empty array', () => {
      // Arrange & Act & Assert
      expect(service.enrichMultiplePhotos([])).toBe('');
    });

    it('should return text without section markers for single photo', () => {
      // Arrange
      const results: TextDetectionResult[] = [
        createTextDetectionResult('Single photo', [
          createBlock('Single photo', 0, 0, 100, 50),
        ]),
      ];

      // Act
      const enriched = service.enrichMultiplePhotos(results);

      // Assert - single photo without useful metadata returns raw text
      expect(enriched).toBe('Single photo');
      expect(enriched).not.toContain('Label 1 of');
    });

    it('should add section markers and enrich each photo independently', () => {
      // WHY: Section markers help LLM understand text comes from separate label photos,
      // and each photo should get its own layout annotations.

      // Arrange
      const results: TextDetectionResult[] = [
        createTextDetectionResult('Photo 1', [
          createBlock('TITLE', 0, 0, 200, 100),
          createBlock('detail', 0, 120, 200, 140),
        ]),
        createTextDetectionResult('Photo 2', [
          createBlock('ANOTHER', 0, 0, 200, 100),
          createBlock('info', 0, 120, 200, 140),
        ]),
      ];

      // Act
      const enriched = service.enrichMultiplePhotos(results);

      // Assert - section markers and header
      expect(enriched).toContain('=== OCR WITH LAYOUT ===');
      expect(enriched).toContain('--- Label 1 of 2 ---');
      expect(enriched).toContain('--- Label 2 of 2 ---');
      // Assert - both photos enriched independently with layout annotations
      expect(enriched).toContain('TITLE');
      expect(enriched).toContain('ANOTHER');
      const largeTagCount = (enriched.match(/\*\*LARGE:\*\*/g) || []).length;
      expect(largeTagCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('edge cases', () => {
    it('should handle zero height blocks gracefully without dividing by zero', () => {
      // WHY: ML Kit sometimes returns blocks with zero height for malformed OCR
      // results or empty lines. Dividing by zero height would cause NaN.

      // Arrange
      const result = createTextDetectionResult('Text', [
        createBlock('Text', 0, 0, 100, 0), // Zero height block
        createBlock('More', 0, 10, 100, 50), // Normal height
      ]);

      // Act
      const enriched = service.enrichWithLayout(result);

      // Assert - should not throw
      expect(enriched).toBeDefined();
    });

    it('should handle blocks with identical positions without errors', () => {
      // WHY: OCR may return overlapping blocks for text detected multiple times

      // Arrange
      const result = createTextDetectionResult('Overlapping', [
        createBlock('A', 0, 0, 100, 50),
        createBlock('B', 0, 0, 100, 50), // Same position
      ]);

      // Act
      const enriched = service.enrichWithLayout(result);

      // Assert - should not throw
      expect(enriched).toBeDefined();
    });
  });
});
