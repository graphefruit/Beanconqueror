import { TestBed } from '@angular/core/testing';

import {
  Block,
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
    const falsyCases = [
      {
        desc: 'empty blocks',
        result: createTextDetectionResult('Some text', []),
      },
      {
        desc: 'undefined blocks',
        result: {
          text: 'Some text',
          blocks: undefined,
        } as Partial<TextDetectionResult> as TextDetectionResult,
      },
      {
        desc: 'single block (insufficient data for layout analysis)',
        result: createTextDetectionResult('Text', [
          createBlock('Text', 0, 0, 100, 50),
        ]),
      },
      {
        desc: 'similar-sized blocks (no meaningful hierarchy)',
        result: createTextDetectionResult('Line 1\nLine 2', [
          createBlock('Line 1', 0, 0, 100, 50),
          createBlock('Line 2', 0, 60, 100, 110),
        ]),
      },
    ];

    falsyCases.forEach(({ desc, result }) => {
      it(`should return false for ${desc}`, () => {
        expect(service.shouldUseMetadata(result)).toBeFalse();
      });
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
      expect(enriched.enrichedText).toContain('Coffee Name');
      expect(enriched.enrichedText).toContain('Details');
    });

    it('should classify blocks by relative height into LARGE and SMALL categories', () => {
      // WHY: Size classification helps LLM identify headers vs body text

      // Arrange
      const largeBlock = createBlock('BIG', 0, 0, 200, 100); // Height: 100
      const smallBlock = createBlock('small', 0, 120, 200, 140); // Height: 20
      const result = createTextDetectionResult('BIG\nsmall', [
        largeBlock,
        smallBlock,
      ]);

      // Act
      const enriched = service.enrichWithLayout(result);

      // Assert
      expect(enriched.enrichedText).toContain('**LARGE:**');
      expect(enriched.enrichedText).toContain('**SMALL:**');
    });

    it('should classify text sizes as LARGE, MEDIUM, and SMALL based on height variation', () => {
      // Arrange
      const result = createTextDetectionResult('Top\nMiddle\nBottom', [
        createBlock('Top', 0, 0, 100, 80), // Height: 80 (large)
        createBlock('Middle', 0, 100, 100, 150), // Height: 50 (medium)
        createBlock('Bottom', 0, 220, 100, 240), // Height: 20 (small)
      ]);

      // Act
      const enriched = service.enrichWithLayout(result);

      // Assert
      expect(enriched.enrichedText).toContain('**LARGE:**');
      expect(enriched.enrichedText).toContain('Top');
      expect(enriched.enrichedText).toContain('Middle');
      expect(enriched.enrichedText).toContain('Bottom');
    });

    it('should include all block texts in output regardless of position', () => {
      // Arrange
      const result = createTextDetectionResult('Left\nCenter\nRight', [
        createBlock('Left', 0, 0, 50, 80),
        createBlock('Center', 100, 0, 200, 80),
        createBlock('Right', 250, 0, 300, 80),
      ]);

      // Act
      const enriched = service.enrichWithLayout(result);

      // Assert
      expect(enriched.enrichedText).toContain('Left');
      expect(enriched.enrichedText).toContain('Center');
      expect(enriched.enrichedText).toContain('Right');
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

    it('should add "Label X of Y" section markers for multiple photos', () => {
      // WHY: Section markers help LLM understand text comes from separate label photos

      // Arrange
      const results: TextDetectionResult[] = [
        createTextDetectionResult('Photo 1', [
          createBlock('BIG', 0, 0, 200, 100),
          createBlock('small', 0, 120, 200, 140),
        ]),
        createTextDetectionResult('Photo 2', [
          createBlock('Another', 0, 0, 200, 100),
          createBlock('text', 0, 120, 200, 140),
        ]),
      ];

      // Act
      const enriched = service.enrichMultiplePhotos(results);

      // Assert
      expect(enriched).toContain('=== OCR WITH LAYOUT ===');
      expect(enriched).toContain('--- Label 1 of 2 ---');
      expect(enriched).toContain('--- Label 2 of 2 ---');
    });

    it('should enrich each photo independently with its own layout annotations', () => {
      // Arrange
      const results: TextDetectionResult[] = [
        createTextDetectionResult('Photo1', [
          createBlock('TITLE', 0, 0, 200, 100),
          createBlock('detail', 0, 120, 200, 140),
        ]),
        createTextDetectionResult('Photo2', [
          createBlock('ANOTHER', 0, 0, 200, 100),
          createBlock('info', 0, 120, 200, 140),
        ]),
      ];

      // Act
      const enriched = service.enrichMultiplePhotos(results);

      // Assert - both photos should have their own layout annotations
      expect(enriched).toContain('TITLE');
      expect(enriched).toContain('ANOTHER');
      // Should have at least 2 LARGE tags (one per photo)
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
