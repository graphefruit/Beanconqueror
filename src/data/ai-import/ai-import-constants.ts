/**
 * Constants for AI Bean Import feature.
 * Centralized for easy tuning and maintenance.
 */

// === LLM TIMEOUT CONSTANTS ===
/** Timeout for per-field LLM extraction (ms) */
export const LLM_TIMEOUT_PER_FIELD_MS = 15000;

/** Timeout for full LLM analysis (ms) */
export const LLM_TIMEOUT_FULL_ANALYSIS_MS = 30000;

/** Timeout for language detection (ms) */
export const LLM_TIMEOUT_LANGUAGE_DETECTION_MS = 10000;

// === OCR METADATA CONSTANTS ===
/** Minimum ratio of max/min text height for layout metadata to be useful */
export const OCR_SIZE_VARIATION_THRESHOLD = 1.3;

/** Minimum number of OCR blocks required for meaningful layout analysis */
export const OCR_MIN_BLOCKS_FOR_METADATA = 2;

/** Text is "large" if height >= this fraction of max height */
export const OCR_LARGE_TEXT_MAX_HEIGHT_RATIO = 0.8;

/** Text is "large" if height >= this multiplier of average height */
export const OCR_LARGE_TEXT_AVG_MULTIPLIER = 1.5;

/** Text is "small" if height < this multiplier of average height */
export const OCR_SMALL_TEXT_AVG_MULTIPLIER = 0.7;

// === VALIDATION CONSTANTS ===
/** Maximum valid coffee growing elevation in meters (filters variety numbers like 74158) */
export const MAX_VALID_ELEVATION_METERS = 5000;

/** Minimum valid SCA cupping score */
export const MIN_CUPPING_SCORE = 80;

/** Maximum valid SCA cupping score */
export const MAX_CUPPING_SCORE = 100;

/** Maximum valid blend component percentage */
export const MAX_BLEND_PERCENTAGE = 100;
