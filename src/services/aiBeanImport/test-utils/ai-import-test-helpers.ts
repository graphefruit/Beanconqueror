import { MergedExamples } from '../ai-import-examples.service';
import { Block, Line, TextDetectionResult } from '../ocr-metadata.service';

interface CreateBlockOptions {
  recognizedLanguage?: string;
  lines?: Line[];
}

/**
 * Create a mock Block with specified bounding box.
 * @param text Block text content
 * @param left Left coordinate
 * @param top Top coordinate
 * @param right Right coordinate
 * @param bottom Bottom coordinate
 * @param options Optional recognized language and lines
 */
export function createBlock(
  text: string,
  left: number,
  top: number,
  right: number,
  bottom: number,
  options?: CreateBlockOptions,
): Block {
  return {
    text,
    boundingBox: { left, top, right, bottom },
    recognizedLanguage: options?.recognizedLanguage ?? 'en',
    lines: options?.lines ?? [],
  };
}

/**
 * Create a mock Line with specified bounding box.
 */
export function createLine(
  text: string,
  left: number,
  top: number,
  right: number,
  bottom: number,
): Line {
  return {
    text,
    boundingBox: { left, top, right, bottom },
    recognizedLanguage: 'en',
    elements: [],
  };
}

/**
 * Create a mock TextDetectionResult from text and blocks.
 */
export function createTextDetectionResult(
  text: string,
  blocks: Block[],
): TextDetectionResult {
  return { text, blocks };
}

/**
 * Create MergedExamples with default English values.
 * Override specific keys as needed.
 */
export function createExamples(
  overrides: Partial<MergedExamples> = {},
): MergedExamples {
  return {
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
    ...overrides,
  };
}
