import { Injectable } from '@angular/core';

/**
 * Interfaces matching the ML Kit plugin's TypeScript definitions.
 * These are imported types from @pantrist/capacitor-plugin-ml-kit-text-recognition
 */
export interface BoundingBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface TextBase {
  text: string;
  boundingBox: BoundingBox;
  recognizedLanguage: string;
}

export type Element = TextBase;

export interface Line extends TextBase {
  elements: Element[];
}

export interface Block extends TextBase {
  lines: Line[];
}

export interface TextDetectionResult {
  text: string;
  blocks: Block[];
}

/**
 * Size classification for text blocks.
 */
export type TextSize = 'large' | 'medium' | 'small';

/**
 * Vertical position classification for text blocks.
 */
export type VerticalPosition = 'top' | 'middle' | 'bottom';

/**
 * Horizontal position classification for text blocks.
 */
export type HorizontalPosition = 'left' | 'center' | 'right';

/**
 * Enriched text block with layout metadata.
 */
export interface EnrichedTextBlock {
  text: string;
  relativeSize: TextSize;
  verticalPosition: VerticalPosition;
  horizontalPosition: HorizontalPosition;
  boundingBox: BoundingBox;
}

/**
 * Result of OCR enrichment for a single photo.
 */
export interface EnrichedOCRResult {
  /** Original raw text */
  rawText: string;
  /** Text with layout annotations */
  enrichedText: string;
  /** Whether metadata was useful enough to include */
  hasUsefulMetadata: boolean;
}

/**
 * Service for processing OCR metadata (bounding boxes, positions) to enhance
 * field extraction accuracy. Converts spatial information into text annotations
 * that help the LLM understand layout context.
 */
@Injectable({
  providedIn: 'root',
})
export class OcrMetadataService {
  /**
   * Minimum ratio of max/min height for metadata to be considered useful.
   * If all text is similar size, layout hints won't help much.
   */
  private readonly SIZE_VARIATION_THRESHOLD = 1.3;

  /**
   * Minimum number of blocks needed for meaningful layout analysis.
   */
  private readonly MIN_BLOCKS_FOR_METADATA = 2;

  /**
   * Enrich OCR result with layout metadata annotations.
   *
   * @param ocrResult Full OCR result including blocks with bounding boxes
   * @returns Enriched result with annotated text
   */
  public enrichWithLayout(ocrResult: TextDetectionResult): EnrichedOCRResult {
    // Fallback to raw text if metadata isn't useful
    if (!this.shouldUseMetadata(ocrResult)) {
      return {
        rawText: ocrResult.text,
        enrichedText: ocrResult.text,
        hasUsefulMetadata: false,
      };
    }

    // Calculate image dimensions from block positions
    const imageDimensions = this.calculateImageDimensions(ocrResult.blocks);

    // Classify each block
    const enrichedBlocks = this.classifyBlocks(
      ocrResult.blocks,
      imageDimensions,
    );

    // Format as annotated text
    const enrichedText = this.formatEnrichedText(enrichedBlocks);

    return {
      rawText: ocrResult.text,
      enrichedText,
      hasUsefulMetadata: true,
    };
  }

  /**
   * Process multiple OCR results (multi-photo flow) with layout enrichment.
   *
   * @param ocrResults Array of OCR results, one per photo
   * @returns Combined enriched text with section markers
   */
  public enrichMultiplePhotos(ocrResults: TextDetectionResult[]): string {
    if (ocrResults.length === 0) {
      return '';
    }

    if (ocrResults.length === 1) {
      const enriched = this.enrichWithLayout(ocrResults[0]);
      return enriched.enrichedText;
    }

    // Process each photo and combine with markers
    const enrichedTexts = ocrResults.map((result, index) => {
      const enriched = this.enrichWithLayout(result);
      const marker = `--- Label ${index + 1} of ${ocrResults.length} ---`;
      return `${marker}\n${enriched.enrichedText}`;
    });

    return '=== OCR WITH LAYOUT ===\n\n' + enrichedTexts.join('\n\n');
  }

  /**
   * Determine if OCR metadata would be useful for this result.
   * Metadata is useful when there are multiple blocks with varied sizes.
   */
  public shouldUseMetadata(ocrResult: TextDetectionResult): boolean {
    // Need blocks array
    if (!ocrResult.blocks) {
      console.log('OCR metadata: blocks is undefined/null');
      return false;
    }

    if (ocrResult.blocks.length < this.MIN_BLOCKS_FOR_METADATA) {
      console.log(
        `OCR metadata: only ${ocrResult.blocks.length} blocks, need at least ${this.MIN_BLOCKS_FOR_METADATA}`,
      );
      return false;
    }

    // Check if blocks have bounding boxes
    const blocksWithBoundingBox = ocrResult.blocks.filter(
      (b) => b.boundingBox && typeof b.boundingBox.bottom === 'number',
    );
    if (blocksWithBoundingBox.length < this.MIN_BLOCKS_FOR_METADATA) {
      console.log(
        `OCR metadata: only ${blocksWithBoundingBox.length} blocks have bounding boxes`,
      );
      return false;
    }

    // Check for size variation
    // Use absolute value since coordinate system may have Y origin at bottom (top > bottom)
    const heights = blocksWithBoundingBox.map((b) =>
      Math.abs(b.boundingBox.bottom - b.boundingBox.top),
    );
    const maxHeight = Math.max(...heights);
    const minHeight = Math.min(...heights);
    console.log(
      `OCR metadata: ${blocksWithBoundingBox.length} blocks, heights min=${minHeight} max=${maxHeight} ratio=${minHeight > 0 ? (maxHeight / minHeight).toFixed(2) : 'N/A'}`,
    );

    // If min is 0, avoid division by zero
    if (minHeight === 0) {
      const useful = maxHeight > 0;
      console.log(`OCR metadata: useful=${useful} (minHeight=0)`);
      return useful;
    }

    // If all text is similar size, metadata won't help much
    const ratio = maxHeight / minHeight;
    const useful = ratio > this.SIZE_VARIATION_THRESHOLD;
    console.log(
      `OCR metadata: useful=${useful} (ratio ${ratio.toFixed(2)} ${useful ? '>' : '<='} threshold ${this.SIZE_VARIATION_THRESHOLD})`,
    );
    return useful;
  }

  /**
   * Calculate image dimensions from block positions.
   * Uses the extent of all blocks as a proxy for image size.
   * Handles both coordinate systems (Y origin at top or bottom).
   */
  private calculateImageDimensions(blocks: Block[]): {
    width: number;
    height: number;
    yOriginAtBottom: boolean;
  } {
    let maxRight = 0;
    let maxY = 0;
    let minY = Infinity;

    for (const block of blocks) {
      if (block.boundingBox.right > maxRight) {
        maxRight = block.boundingBox.right;
      }
      // Track both top and bottom to handle either coordinate system
      const yTop = block.boundingBox.top;
      const yBottom = block.boundingBox.bottom;
      maxY = Math.max(maxY, yTop, yBottom);
      minY = Math.min(minY, yTop, yBottom);
    }

    // Detect if Y origin is at bottom (top > bottom means Y increases upward)
    const firstBlock = blocks[0];
    const yOriginAtBottom =
      firstBlock && firstBlock.boundingBox.top > firstBlock.boundingBox.bottom;

    return {
      width: maxRight,
      height: maxY - (minY === Infinity ? 0 : minY),
      yOriginAtBottom,
    };
  }

  /**
   * Classify all blocks by size and position.
   */
  private classifyBlocks(
    blocks: Block[],
    imageDimensions: { width: number; height: number; yOriginAtBottom: boolean },
  ): EnrichedTextBlock[] {
    // Calculate size classifications
    const sizeMap = this.classifySizes(blocks);

    return blocks.map((block) => ({
      text: block.text,
      relativeSize: sizeMap.get(block) || 'medium',
      verticalPosition: this.classifyVerticalPosition(
        block,
        imageDimensions.height,
        imageDimensions.yOriginAtBottom,
      ),
      horizontalPosition: this.classifyHorizontalPosition(
        block,
        imageDimensions.width,
      ),
      boundingBox: block.boundingBox,
    }));
  }

  /**
   * Classify blocks by relative size based on height.
   * Uses statistical thresholds relative to average and max.
   */
  private classifySizes(blocks: Block[]): Map<Block, TextSize> {
    const sizeMap = new Map<Block, TextSize>();

    // Calculate height of each block (use abs since Y origin may be at bottom)
    const heights = blocks.map((b) => ({
      block: b,
      height: Math.abs(b.boundingBox.bottom - b.boundingBox.top),
    }));

    if (heights.length === 0) {
      return sizeMap;
    }

    // Find statistical thresholds
    const heightValues = heights.map((h) => h.height);
    const maxHeight = Math.max(...heightValues);
    const avgHeight =
      heightValues.reduce((a, b) => a + b, 0) / heightValues.length;

    // Classify each block
    // Large: > 1.5x average OR within 80% of max
    // Small: < 0.7x average
    // Medium: everything else
    for (const { block, height } of heights) {
      if (height >= maxHeight * 0.8 || height >= avgHeight * 1.5) {
        sizeMap.set(block, 'large');
      } else if (height < avgHeight * 0.7) {
        sizeMap.set(block, 'small');
      } else {
        sizeMap.set(block, 'medium');
      }
    }

    return sizeMap;
  }

  /**
   * Classify vertical position based on Y coordinate.
   * Divides image into thirds: top, middle, bottom.
   * Handles both coordinate systems (Y origin at top or bottom).
   */
  private classifyVerticalPosition(
    block: Block,
    imageHeight: number,
    yOriginAtBottom: boolean,
  ): VerticalPosition {
    if (imageHeight === 0) {
      return 'middle';
    }

    const centerY = (block.boundingBox.top + block.boundingBox.bottom) / 2;
    const relativePosition = centerY / imageHeight;

    if (yOriginAtBottom) {
      // Y origin at bottom: higher Y = top of image
      if (relativePosition > 0.66) {
        return 'top';
      }
      if (relativePosition < 0.33) {
        return 'bottom';
      }
    } else {
      // Y origin at top (standard screen coords): lower Y = top of image
      if (relativePosition < 0.33) {
        return 'top';
      }
      if (relativePosition > 0.66) {
        return 'bottom';
      }
    }
    return 'middle';
  }

  /**
   * Classify horizontal position based on X coordinate.
   * Divides image into thirds: left, center, right.
   */
  private classifyHorizontalPosition(
    block: Block,
    imageWidth: number,
  ): HorizontalPosition {
    if (imageWidth === 0) {
      return 'center';
    }

    const centerX = (block.boundingBox.left + block.boundingBox.right) / 2;
    const relativePosition = centerX / imageWidth;

    if (relativePosition < 0.33) {
      return 'left';
    }
    if (relativePosition > 0.66) {
      return 'right';
    }
    return 'center';
  }

  /**
   * Format enriched blocks as annotated text.
   * Each block is prefixed with [SIZE | VERTICAL | HORIZONTAL] tags.
   */
  private formatEnrichedText(blocks: EnrichedTextBlock[]): string {
    if (blocks.length === 0) {
      return '';
    }

    const header = '=== OCR WITH LAYOUT ===\n\n';

    const formattedBlocks = blocks.map((block) => {
      const sizeTag = block.relativeSize.toUpperCase();
      const vertTag = block.verticalPosition.toUpperCase();
      const horzTag = block.horizontalPosition.toUpperCase();

      return `[${sizeTag} | ${vertTag} | ${horzTag}]\n${block.text}`;
    });

    return header + formattedBlocks.join('\n\n');
  }
}
