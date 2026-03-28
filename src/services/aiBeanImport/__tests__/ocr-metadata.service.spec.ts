import { TestBed } from '@angular/core/testing';

import { MultiPassOcrResult } from '../camera-ocr.service';
import {
  Block,
  OcrMetadataService,
  TextDetectionResult,
} from '../ocr-metadata.service';
import {
  createBlock,
  createLine,
  createTextDetectionResult,
} from '../test-utils';

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

  describe('enrichWithLayoutMultiPass', () => {
    it('should return output identical to enrichWithLayout when no rotated results', () => {
      // Arrange
      const primary = createTextDetectionResult('Roaster\nCoffee Name', [
        createBlock('Roaster', 0, 0, 200, 80),
        createBlock('Coffee Name', 0, 100, 200, 140),
      ]);
      const multiPass: MultiPassOcrResult = { primary, rotated: [] };

      // Act
      const multiPassResult = service.enrichWithLayoutMultiPass(multiPass);
      const singlePassResult = service.enrichWithLayout(primary);

      // Assert
      expect(multiPassResult.enrichedText).toBe(singlePassResult.enrichedText);
      expect(multiPassResult.rawText).toBe(singlePassResult.rawText);
    });

    it('should append "--- Rotated text detected ---" section when rotated results have text', () => {
      // Arrange
      const primary = createTextDetectionResult('Front Label', [
        createBlock('BIG ROASTER', 0, 0, 300, 100), // Height: 100
        createBlock('small details', 0, 120, 300, 140), // Height: 20
      ]);
      const rotated90 = createTextDetectionResult('Side Text', [
        createBlock('Side Text', 0, 0, 200, 60),
      ]);
      const multiPass: MultiPassOcrResult = {
        primary,
        rotated: [rotated90],
      };

      // Act
      const result = service.enrichWithLayoutMultiPass(multiPass);

      // Assert
      expect(result.enrichedText).toContain('--- Rotated text detected ---');
      expect(result.enrichedText).toContain('Side Text');
      expect(result.hasUsefulMetadata).toBeTrue();
    });

    // 0° pass: avg height ~60, max height 100
    const classificationCases = [
      {
        height: 90,
        expected: 'LARGE',
        label: 'Big Rotated',
        reason: '≥ 0.8 × 100 = 80',
      },
      {
        height: 30,
        expected: 'SMALL',
        label: 'Espresso',
        reason: '< 0.7 × 60 = 42',
      },
      {
        height: 55,
        expected: 'MEDIUM',
        label: 'Filter',
        reason: 'between thresholds',
      },
    ];
    classificationCases.forEach(({ height, expected, label, reason }) => {
      it(`should classify rotated text (h=${height}) as ${expected} using 0° pass stats (${reason})`, () => {
        // Arrange
        const primary = createTextDetectionResult('Front', [
          createBlock('Title', 0, 0, 300, 100), // Height: 100
          createBlock('Body', 0, 120, 300, 140), // Height: 20
        ]);
        const rotated = createTextDetectionResult(label, [
          createBlock(label, 0, 0, 200, height),
        ]);
        const multiPass: MultiPassOcrResult = {
          primary,
          rotated: [rotated],
        };

        // Act
        const result = service.enrichWithLayoutMultiPass(multiPass);

        // Assert
        const rotatedSection = result.enrichedText.split(
          '--- Rotated text detected ---',
        )[1];
        expect(rotatedSection).toContain(`**${expected}:** ${label}`);
      });
    });

    it('should fall back to independent classification when baseline has too few blocks', () => {
      // Arrange: primary has only 1 block (below OCR_MIN_BLOCKS_FOR_METADATA)
      const primary = createTextDetectionResult('Only', [
        createBlock('Only', 0, 0, 100, 50),
      ]);
      const rotated = createTextDetectionResult('Rotated', [
        createBlock('Big', 0, 0, 200, 100),
        createBlock('Small', 0, 120, 200, 130),
      ]);
      const multiPass: MultiPassOcrResult = {
        primary,
        rotated: [rotated],
      };

      // Act
      const result = service.enrichWithLayoutMultiPass(multiPass);

      // Assert - should not throw and should have rotated section
      expect(result.enrichedText).toContain('--- Rotated text detected ---');
      expect(result.enrichedText).toContain('Big');
      expect(result.enrichedText).toContain('Small');
    });

    it('should not append rotated section when rotated results have empty blocks', () => {
      // Arrange
      const primary = createTextDetectionResult('Front', [
        createBlock('Title', 0, 0, 300, 100),
        createBlock('Body', 0, 120, 300, 140),
      ]);
      const rotated = createTextDetectionResult('', []);
      const multiPass: MultiPassOcrResult = {
        primary,
        rotated: [rotated],
      };

      // Act
      const result = service.enrichWithLayoutMultiPass(multiPass);

      // Assert
      expect(result.enrichedText).not.toContain(
        '--- Rotated text detected ---',
      );
    });
  });

  describe('enrichMultiplePhotosMultiPass', () => {
    it('should add "Label N of M" markers for multiple results with rotated sections', () => {
      // Arrange
      const photo1Primary = createTextDetectionResult('Photo1', [
        createBlock('Roaster A', 0, 0, 300, 100),
        createBlock('details', 0, 120, 300, 140),
      ]);
      const photo1Rotated = createTextDetectionResult('Side A', [
        createBlock('Side A', 0, 0, 200, 60),
      ]);
      const photo1: MultiPassOcrResult = {
        primary: photo1Primary,
        rotated: [photo1Rotated],
      };

      const photo2Primary = createTextDetectionResult('Photo2', [
        createBlock('Roaster B', 0, 0, 300, 100),
        createBlock('info', 0, 120, 300, 140),
      ]);
      const photo2: MultiPassOcrResult = {
        primary: photo2Primary,
        rotated: [],
      };

      // Act
      const result = service.enrichMultiplePhotosMultiPass([photo1, photo2]);

      // Assert
      expect(result).toContain('=== OCR WITH LAYOUT ===');
      expect(result).toContain('--- Label 1 of 2 ---');
      expect(result).toContain('--- Label 2 of 2 ---');
      expect(result).toContain('--- Rotated text detected ---');
      expect(result).toContain('Side A');
      expect(result).toContain('Roaster B');
    });
  });

  describe('line-height-based classification', () => {
    it('should classify a multi-line block by average line height, not total block height', () => {
      // WHY: A description paragraph has many small-font lines but a tall bounding box.
      // Using block height would misclassify it as LARGE.

      // Arrange
      const heading = createBlock('NATURAL BLEND', 0, 0, 400, 80, 'en', [
        createLine('NATURAL BLEND', 0, 0, 400, 80),
      ]);

      // 6 lines of small font (line height ~15 each), total block height = 90
      const description = createBlock(
        'Unser Natural Blend ist eine Mischung aus natürlich aufbereiteten Kaffees',
        0,
        100,
        400,
        190,
        'en',
        [
          createLine('Unser Natural Blend', 0, 100, 400, 115),
          createLine('ist eine Mischung aus', 0, 115, 400, 130),
          createLine('natürlich aufbe-', 0, 130, 400, 145),
          createLine('reiteten Kaffees', 0, 145, 400, 160),
          createLine('aus Brasilien und', 0, 160, 400, 175),
          createLine('Äthiopien.', 0, 175, 400, 190),
        ],
      );

      const result = createTextDetectionResult('', [heading, description]);

      // Act
      const enriched = service.enrichWithLayout(result);

      // Assert — heading is large font, description is small font
      expect(enriched.enrichedText).toContain('**LARGE:** NATURAL BLEND');
      expect(enriched.enrichedText).not.toContain(
        '**LARGE:** Unser Natural Blend',
      );
    });

    it('should fall back to block height when block has no lines', () => {
      // WHY: Backward compatibility — blocks without line data (e.g., from test helpers)
      // should still classify based on block bounding box height.

      // Arrange
      const largeBlock = createBlock('BIG', 0, 0, 200, 100); // Height: 100, no lines
      const smallBlock = createBlock('small', 0, 120, 200, 140); // Height: 20, no lines
      const result = createTextDetectionResult('', [largeBlock, smallBlock]);

      // Act
      const enriched = service.enrichWithLayout(result);

      // Assert
      expect(enriched.enrichedText).toContain('**LARGE:** BIG');
      expect(enriched.enrichedText).toContain('**SMALL:** small');
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
