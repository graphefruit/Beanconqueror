import { TestBed } from '@angular/core/testing';
import {
  OcrMetadataService,
  TextDetectionResult,
  Block,
} from './ocr-metadata.service';

describe('OcrMetadataService', () => {
  let service: OcrMetadataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OcrMetadataService],
    });
    service = TestBed.inject(OcrMetadataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('shouldUseMetadata', () => {
    it('should return false when blocks is empty', () => {
      const result: TextDetectionResult = {
        text: 'Some text',
        blocks: [],
      };
      expect(service.shouldUseMetadata(result)).toBeFalse();
    });

    it('should return false when blocks is undefined', () => {
      const result: TextDetectionResult = {
        text: 'Some text',
        blocks: undefined as any,
      };
      expect(service.shouldUseMetadata(result)).toBeFalse();
    });

    it('should return false when only one block', () => {
      const result: TextDetectionResult = {
        text: 'Some text',
        blocks: [createBlock('Text', 0, 0, 100, 50)],
      };
      expect(service.shouldUseMetadata(result)).toBeFalse();
    });

    it('should return false when all blocks have similar size', () => {
      const result: TextDetectionResult = {
        text: 'Line 1\nLine 2',
        blocks: [
          createBlock('Line 1', 0, 0, 100, 50),
          createBlock('Line 2', 0, 60, 100, 110),
        ],
      };
      expect(service.shouldUseMetadata(result)).toBeFalse();
    });

    it('should return true when blocks have varied sizes', () => {
      const result: TextDetectionResult = {
        text: 'Big Title\nSmall text',
        blocks: [
          createBlock('Big Title', 0, 0, 200, 100), // Height: 100
          createBlock('Small text', 0, 110, 200, 130), // Height: 20
        ],
      };
      expect(service.shouldUseMetadata(result)).toBeTrue();
    });
  });

  describe('enrichWithLayout', () => {
    it('should return raw text when metadata is not useful', () => {
      const result: TextDetectionResult = {
        text: 'Some text',
        blocks: [createBlock('Some text', 0, 0, 100, 50)],
      };

      const enriched = service.enrichWithLayout(result);

      expect(enriched.rawText).toBe('Some text');
      expect(enriched.enrichedText).toBe('Some text');
      expect(enriched.hasUsefulMetadata).toBeFalse();
    });

    it('should add layout tags when metadata is useful', () => {
      const result: TextDetectionResult = {
        text: 'ROASTER NAME\nCoffee Name\nDetails',
        blocks: [
          createBlock('ROASTER NAME', 0, 0, 300, 80), // Large, top
          createBlock('Coffee Name', 0, 100, 300, 160), // Medium, top
          createBlock('Details', 0, 300, 150, 330), // Small, bottom
        ],
      };

      const enriched = service.enrichWithLayout(result);

      expect(enriched.hasUsefulMetadata).toBeTrue();
      expect(enriched.enrichedText).toContain('=== OCR WITH LAYOUT ===');
      expect(enriched.enrichedText).toContain('[LARGE |');
      expect(enriched.enrichedText).toContain('ROASTER NAME');
      expect(enriched.enrichedText).toContain('Coffee Name');
      expect(enriched.enrichedText).toContain('Details');
    });

    it('should classify large text correctly', () => {
      const result: TextDetectionResult = {
        text: 'BIG\nsmall',
        blocks: [
          createBlock('BIG', 0, 0, 200, 100), // Height: 100 (large)
          createBlock('small', 0, 120, 200, 140), // Height: 20 (small)
        ],
      };

      const enriched = service.enrichWithLayout(result);

      expect(enriched.enrichedText).toContain('[LARGE |');
      expect(enriched.enrichedText).toContain('[SMALL |');
    });

    it('should classify vertical position correctly', () => {
      const result: TextDetectionResult = {
        text: 'Top\nMiddle\nBottom',
        blocks: [
          createBlock('Top', 0, 0, 100, 80), // Top third (center at 40/300 = 0.13)
          createBlock('Middle', 0, 100, 100, 200), // Middle third (center at 150/300 = 0.5)
          createBlock('Bottom', 0, 220, 100, 300), // Bottom third (center at 260/300 = 0.87)
        ],
      };

      const enriched = service.enrichWithLayout(result);

      expect(enriched.enrichedText).toContain('| TOP |');
      expect(enriched.enrichedText).toContain('| MIDDLE |');
      expect(enriched.enrichedText).toContain('| BOTTOM |');
    });

    it('should classify horizontal position correctly', () => {
      const result: TextDetectionResult = {
        text: 'Left\nCenter\nRight',
        blocks: [
          createBlock('Left', 0, 0, 50, 80), // Left third (center at 25/300 = 0.08)
          createBlock('Center', 100, 0, 200, 80), // Center third (center at 150/300 = 0.5)
          createBlock('Right', 250, 0, 300, 80), // Right third (center at 275/300 = 0.92)
        ],
      };

      const enriched = service.enrichWithLayout(result);

      expect(enriched.enrichedText).toContain('| LEFT]');
      expect(enriched.enrichedText).toContain('| CENTER]');
      expect(enriched.enrichedText).toContain('| RIGHT]');
    });
  });

  describe('enrichMultiplePhotos', () => {
    it('should return empty string for empty array', () => {
      expect(service.enrichMultiplePhotos([])).toBe('');
    });

    it('should handle single photo without markers', () => {
      const results: TextDetectionResult[] = [
        {
          text: 'Single photo',
          blocks: [createBlock('Single photo', 0, 0, 100, 50)],
        },
      ];

      const enriched = service.enrichMultiplePhotos(results);

      // Single photo without useful metadata should just return raw text
      expect(enriched).toBe('Single photo');
    });

    it('should add section markers for multiple photos', () => {
      const results: TextDetectionResult[] = [
        {
          text: 'Photo 1',
          blocks: [
            createBlock('BIG', 0, 0, 200, 100),
            createBlock('small', 0, 120, 200, 140),
          ],
        },
        {
          text: 'Photo 2',
          blocks: [
            createBlock('Another', 0, 0, 200, 100),
            createBlock('text', 0, 120, 200, 140),
          ],
        },
      ];

      const enriched = service.enrichMultiplePhotos(results);

      expect(enriched).toContain('=== OCR WITH LAYOUT ===');
      expect(enriched).toContain('--- Label 1 of 2 ---');
      expect(enriched).toContain('--- Label 2 of 2 ---');
    });

    it('should enrich each photo independently', () => {
      const results: TextDetectionResult[] = [
        {
          text: 'Photo1',
          blocks: [
            createBlock('TITLE', 0, 0, 200, 100),
            createBlock('detail', 0, 120, 200, 140),
          ],
        },
        {
          text: 'Photo2',
          blocks: [
            createBlock('ANOTHER', 0, 0, 200, 100),
            createBlock('info', 0, 120, 200, 140),
          ],
        },
      ];

      const enriched = service.enrichMultiplePhotos(results);

      // Both photos should have their own layout annotations
      expect(enriched).toContain('TITLE');
      expect(enriched).toContain('ANOTHER');
      expect(enriched.match(/\[LARGE/g)?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('edge cases', () => {
    it('should handle zero height blocks gracefully', () => {
      const result: TextDetectionResult = {
        text: 'Text',
        blocks: [
          createBlock('Text', 0, 0, 100, 0), // Zero height
          createBlock('More', 0, 10, 100, 50), // Normal height
        ],
      };

      // Should not throw
      const enriched = service.enrichWithLayout(result);
      expect(enriched).toBeDefined();
    });

    it('should handle blocks with identical positions', () => {
      const result: TextDetectionResult = {
        text: 'Overlapping',
        blocks: [
          createBlock('A', 0, 0, 100, 50),
          createBlock('B', 0, 0, 100, 50), // Same position
        ],
      };

      // Should not throw
      const enriched = service.enrichWithLayout(result);
      expect(enriched).toBeDefined();
    });
  });
});

/**
 * Helper to create a Block with specified bounding box.
 */
function createBlock(
  text: string,
  left: number,
  top: number,
  right: number,
  bottom: number,
): Block {
  return {
    text,
    boundingBox: { left, top, right, bottom },
    recognizedLanguage: 'en',
    lines: [],
  };
}
