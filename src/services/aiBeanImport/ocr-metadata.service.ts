import { Injectable, isDevMode } from '@angular/core';

import {
  OCR_LARGE_TEXT_AVG_MULTIPLIER,
  OCR_LARGE_TEXT_MAX_HEIGHT_RATIO,
  OCR_MIN_BLOCKS_FOR_METADATA,
  OCR_SIZE_VARIATION_THRESHOLD,
  OCR_SMALL_TEXT_AVG_MULTIPLIER,
} from '../../data/ai-import/ai-import-constants';

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
 * Enriched text block with size metadata.
 */
export interface EnrichedTextBlock {
  text: string;
  relativeSize: TextSize;
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

    // Classify each block by size
    const enrichedBlocks = this.classifyBlocks(ocrResult.blocks);

    // Format as annotated text using markdown
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
      // Strip header from individual results to avoid duplication
      const textWithoutHeader = enriched.enrichedText.replace(
        /^=== OCR WITH LAYOUT ===\n\n/,
        '',
      );
      const marker = `--- Label ${index + 1} of ${ocrResults.length} ---`;
      return `${marker}\n${textWithoutHeader}`;
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
      this.debugLog('blocks is undefined/null');
      return false;
    }

    if (ocrResult.blocks.length < OCR_MIN_BLOCKS_FOR_METADATA) {
      this.debugLog(
        `only ${ocrResult.blocks.length} blocks, need at least ${OCR_MIN_BLOCKS_FOR_METADATA}`,
      );
      return false;
    }

    // Check if blocks have bounding boxes
    const blocksWithBoundingBox = ocrResult.blocks.filter(
      (b) => b.boundingBox && typeof b.boundingBox.bottom === 'number',
    );
    if (blocksWithBoundingBox.length < OCR_MIN_BLOCKS_FOR_METADATA) {
      this.debugLog(
        `only ${blocksWithBoundingBox.length} blocks have bounding boxes`,
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
    this.debugLog(
      `${blocksWithBoundingBox.length} blocks, heights min=${minHeight} max=${maxHeight} ratio=${minHeight > 0 ? (maxHeight / minHeight).toFixed(2) : 'N/A'}`,
    );

    // If min is 0, avoid division by zero
    if (minHeight === 0) {
      const useful = maxHeight > 0;
      this.debugLog(`useful=${useful} (minHeight=0)`);
      return useful;
    }

    // If all text is similar size, metadata won't help much
    const ratio = maxHeight / minHeight;
    const useful = ratio > OCR_SIZE_VARIATION_THRESHOLD;
    this.debugLog(
      `useful=${useful} (ratio ${ratio.toFixed(2)} ${useful ? '>' : '<='} threshold ${OCR_SIZE_VARIATION_THRESHOLD})`,
    );
    return useful;
  }

  /**
   * Classify all blocks by relative size.
   */
  private classifyBlocks(blocks: Block[]): EnrichedTextBlock[] {
    const sizeMap = this.classifySizes(blocks);

    return blocks.map((block) => ({
      text: block.text,
      relativeSize: sizeMap.get(block) || 'medium',
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
    // Large: >= OCR_LARGE_TEXT_AVG_MULTIPLIER * average OR within OCR_LARGE_TEXT_MAX_HEIGHT_RATIO of max
    // Small: < OCR_SMALL_TEXT_AVG_MULTIPLIER * average
    // Medium: everything else
    for (const { block, height } of heights) {
      if (
        height >= maxHeight * OCR_LARGE_TEXT_MAX_HEIGHT_RATIO ||
        height >= avgHeight * OCR_LARGE_TEXT_AVG_MULTIPLIER
      ) {
        sizeMap.set(block, 'large');
      } else if (height < avgHeight * OCR_SMALL_TEXT_AVG_MULTIPLIER) {
        sizeMap.set(block, 'small');
      } else {
        sizeMap.set(block, 'medium');
      }
    }

    return sizeMap;
  }

  /**
   * Format enriched blocks as annotated text using markdown.
   * Each block is prefixed with **SIZE:** tag.
   */
  private formatEnrichedText(blocks: EnrichedTextBlock[]): string {
    if (blocks.length === 0) {
      return '';
    }

    const header = '=== OCR WITH LAYOUT ===\n\n';

    const formattedBlocks = blocks.map((block) => {
      const sizeTag = block.relativeSize.toUpperCase();
      return `**${sizeTag}:** ${block.text}`;
    });

    return header + formattedBlocks.join('\n\n');
  }

  /**
   * Debug logging helper - only logs in development mode.
   */
  private debugLog(message: string): void {
    if (isDevMode()) {
      console.log(`OCR metadata: ${message}`);
    }
  }
}
