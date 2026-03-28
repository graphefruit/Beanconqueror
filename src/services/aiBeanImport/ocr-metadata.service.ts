import { Injectable } from '@angular/core';

import {
  OCR_LARGE_TEXT_AVG_MULTIPLIER,
  OCR_LARGE_TEXT_MAX_HEIGHT_RATIO,
  OCR_MIN_BLOCKS_FOR_METADATA,
  OCR_SIZE_VARIATION_THRESHOLD,
  OCR_SMALL_TEXT_AVG_MULTIPLIER,
} from '../../data/ai-import/ai-import-constants';
import { MultiPassOcrResult } from './camera-ocr.service';

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
   * Enrich a multi-pass OCR result (single photo, multiple rotation passes).
   * Classifies rotated-pass blocks using 0° pass height statistics as baseline.
   * Only appends rotated text section if rotated passes found text.
   */
  public enrichWithLayoutMultiPass(
    multiPass: MultiPassOcrResult,
  ): EnrichedOCRResult {
    // Enrich the primary (0°) pass as before
    const primaryEnriched = this.enrichWithLayout(multiPass.primary);

    // If no rotated results, return primary as-is
    if (multiPass.rotated.length === 0) {
      return primaryEnriched;
    }

    // Collect all rotated blocks
    const rotatedBlocks = multiPass.rotated.flatMap((r) => r.blocks ?? []);
    if (rotatedBlocks.length === 0) {
      return primaryEnriched;
    }

    // Classify rotated blocks using 0° pass stats as baseline
    const rotatedEnriched = this.classifyBlocksWithBaseline(
      rotatedBlocks,
      multiPass.primary.blocks,
    );

    // Format rotated blocks
    const rotatedText = this.formatRotatedText(rotatedEnriched);

    // Combine: primary text + rotated section
    const combinedText = primaryEnriched.enrichedText + '\n\n' + rotatedText;
    const combinedRawText =
      primaryEnriched.rawText +
      '\n' +
      multiPass.rotated.map((r) => r.text).join('\n');

    return {
      rawText: combinedRawText,
      enrichedText: combinedText,
      hasUsefulMetadata: true,
    };
  }

  /**
   * Process multiple multi-pass OCR results (multi-photo flow) with layout enrichment.
   */
  public enrichMultiplePhotosMultiPass(
    ocrResults: MultiPassOcrResult[],
  ): string {
    if (ocrResults.length === 0) {
      return '';
    }

    if (ocrResults.length === 1) {
      return this.enrichWithLayoutMultiPass(ocrResults[0]).enrichedText;
    }

    const enrichedTexts = ocrResults.map((result, index) => {
      const enriched = this.enrichWithLayoutMultiPass(result);
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
      return false;
    }

    if (ocrResult.blocks.length < OCR_MIN_BLOCKS_FOR_METADATA) {
      return false;
    }

    // Check if blocks have bounding boxes
    const blocksWithBoundingBox = ocrResult.blocks.filter(
      (b) => b.boundingBox && typeof b.boundingBox.bottom === 'number',
    );
    if (blocksWithBoundingBox.length < OCR_MIN_BLOCKS_FOR_METADATA) {
      return false;
    }

    // Check for size variation using representative heights (avg line height)
    const heights = blocksWithBoundingBox.map((b) =>
      this.getRepresentativeHeight(b),
    );
    const maxHeight = Math.max(...heights);
    const minHeight = Math.min(...heights);

    // If min is 0, avoid division by zero
    if (minHeight === 0) {
      return maxHeight > 0;
    }

    // If all text is similar size, metadata won't help much
    const ratio = maxHeight / minHeight;
    return ratio > OCR_SIZE_VARIATION_THRESHOLD;
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
   * Classify blocks by relative size based on representative line height.
   * Uses average line height within each block as a proxy for font size.
   * Falls back to block bounding box height when line data is unavailable.
   */
  private classifySizes(blocks: Block[]): Map<Block, TextSize> {
    const sizeMap = new Map<Block, TextSize>();

    // Calculate representative height of each block
    const heights = blocks.map((b) => ({
      block: b,
      height: this.getRepresentativeHeight(b),
    }));

    if (heights.length === 0) {
      return sizeMap;
    }

    // Find statistical thresholds
    const heightValues = heights.map((h) => h.height);
    const maxHeight = Math.max(...heightValues);
    const avgHeight =
      heightValues.reduce((a, b) => a + b, 0) / heightValues.length;

    for (const { block, height } of heights) {
      sizeMap.set(block, this.classifyHeight(height, maxHeight, avgHeight));
    }

    return sizeMap;
  }

  /**
   * Get the representative height for a block, approximating font size.
   * Uses average line height when line bounding boxes are available,
   * otherwise falls back to the block's own bounding box height.
   */
  private getRepresentativeHeight(block: Block): number {
    if (block.lines && block.lines.length > 0) {
      const lineHeights = block.lines
        .filter(
          (l) => l.boundingBox && typeof l.boundingBox.bottom === 'number',
        )
        .map((l) => Math.abs(l.boundingBox.bottom - l.boundingBox.top));

      if (lineHeights.length > 0) {
        return lineHeights.reduce((a, b) => a + b, 0) / lineHeights.length;
      }
    }

    // Fallback: use block bounding box height
    return Math.abs(block.boundingBox.bottom - block.boundingBox.top);
  }

  /**
   * Classify a single block height against statistical thresholds.
   * Large: >= OCR_LARGE_TEXT_AVG_MULTIPLIER × avg OR within OCR_LARGE_TEXT_MAX_HEIGHT_RATIO of max
   * Small: < OCR_SMALL_TEXT_AVG_MULTIPLIER × avg
   * Medium: everything else
   */
  private classifyHeight(
    height: number,
    maxHeight: number,
    avgHeight: number,
  ): TextSize {
    if (
      height >= maxHeight * OCR_LARGE_TEXT_MAX_HEIGHT_RATIO ||
      height >= avgHeight * OCR_LARGE_TEXT_AVG_MULTIPLIER
    ) {
      return 'large';
    }
    if (height < avgHeight * OCR_SMALL_TEXT_AVG_MULTIPLIER) {
      return 'small';
    }
    return 'medium';
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
   * Classify blocks using external baseline statistics (from the 0° pass).
   * Falls back to per-pass independent classification if baseline is insufficient.
   */
  private classifyBlocksWithBaseline(
    blocks: Block[],
    baselineBlocks: Block[],
  ): EnrichedTextBlock[] {
    // Compute baseline stats from 0° pass using representative heights
    const baselineHeights = (baselineBlocks ?? [])
      .filter((b) => b.boundingBox && typeof b.boundingBox.bottom === 'number')
      .map((b) => this.getRepresentativeHeight(b));

    // If baseline is insufficient, fall back to self-contained classification
    if (baselineHeights.length < OCR_MIN_BLOCKS_FOR_METADATA) {
      return this.classifyBlocks(blocks);
    }

    const maxHeight = Math.max(...baselineHeights);
    const avgHeight =
      baselineHeights.reduce((a, b) => a + b, 0) / baselineHeights.length;

    return blocks.map((block) => {
      const height = this.getRepresentativeHeight(block);
      return {
        text: block.text,
        relativeSize: this.classifyHeight(height, maxHeight, avgHeight),
      };
    });
  }

  /**
   * Format rotated text blocks with a section header.
   */
  private formatRotatedText(blocks: EnrichedTextBlock[]): string {
    if (blocks.length === 0) {
      return '';
    }

    const header = '--- Rotated text detected ---\n';
    const formattedBlocks = blocks.map((block) => {
      const sizeTag = block.relativeSize.toUpperCase();
      return `**${sizeTag}:** ${block.text}`;
    });

    return header + formattedBlocks.join('\n\n');
  }
}
