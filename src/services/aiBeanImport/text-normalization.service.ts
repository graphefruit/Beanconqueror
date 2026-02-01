import { Injectable } from '@angular/core';

/**
 * Regex character class for thousand separator variants.
 * Includes: . , ' (apostrophe) ' (right single quote U+2019) space, thin space (U+2009), narrow no-break space (U+202F)
 */
const THOUSAND_SEPARATOR_CHARS = "[.,''\u2019 \u2009\u202F]";

/**
 * Optional thousand separator for regex patterns.
 */
const THOUSAND_SEPARATOR_OPTIONAL = "[.,''\u2019 \u2009\u202F]?";

/**
 * Removes thousand separators from integer-like values in a string.
 * Handles international formats: dot, comma, apostrophe (Swiss), space (French/ISO).
 *
 * @example
 *   removeThousandSeparatorsFromInteger("1.850") // → "1850"
 *   removeThousandSeparatorsFromInteger("1'234'567") // → "1234567" (Swiss)
 *   removeThousandSeparatorsFromInteger("1 850") // → "1850" (French/ISO)
 */
export function removeThousandSeparatorsFromInteger(value: string): string {
  const pattern = new RegExp(
    `(\\d)${THOUSAND_SEPARATOR_CHARS}(\\d{3})(?!\\d)`,
    'g',
  );
  let result = value;
  let prev = '';
  // Iterate until no more replacements (handles 1'234'567)
  while (prev !== result) {
    prev = result;
    result = result.replace(pattern, '$1$2');
  }
  return result;
}

/**
 * Builds a regex pattern string that matches a number with optional thousand separators.
 * Only adds separators at valid positions (before groups of 3 digits from the right).
 *
 * @example
 *   buildThousandSeparatorPattern("1000") // matches: "1000", "1.000", "1,000", "1'000", "1 000"
 *   buildThousandSeparatorPattern("250")  // matches: "250" (no separator position)
 *   buildThousandSeparatorPattern("1500") // matches: "1500", "1.500", "1,500", etc.
 */
export function buildThousandSeparatorPattern(digits: string): string {
  const num = parseInt(digits, 10);
  if (isNaN(num) || num < 1000) {
    // No thousand separator possible for numbers < 1000
    return digits;
  }

  // Build pattern with optional separator before each group of 3 digits from the right
  // e.g., "1000" → "1[separators]?000"
  // e.g., "12500" → "12[separators]?500"
  let pattern = '';
  const len = digits.length;

  for (let i = 0; i < len; i++) {
    // Insert optional separator before positions that are multiples of 3 from the end
    // (but not at the very beginning)
    const posFromEnd = len - i;
    if (i > 0 && posFromEnd % 3 === 0) {
      pattern += THOUSAND_SEPARATOR_OPTIONAL;
    }
    pattern += digits[i];
  }

  return pattern;
}

/**
 * Checks if a weight value (in grams) appears in OCR text, accounting for:
 * - Thousand separators (1.000, 1,000, 1'000, 1 000)
 * - Different units (g, kg)
 *
 * @param grams The weight in grams to search for
 * @param ocrText The OCR text to search in
 * @returns true if the weight appears in the text with a weight unit
 *
 * @example
 *   weightExistsInOcrText(1000, "Coffee 1.000g") // true
 *   weightExistsInOcrText(1000, "Coffee 1kg")    // true
 *   weightExistsInOcrText(1000, "Label 1 of 2")  // false (no weight unit)
 */
export function weightExistsInOcrText(grams: number, ocrText: string): boolean {
  const gramsRounded = Math.round(grams);
  const gramsStr = gramsRounded.toString();

  // Build pattern for grams value with optional thousand separators, followed by gram unit
  const gramsPattern = buildThousandSeparatorPattern(gramsStr);
  const gramsWithUnit = new RegExp(gramsPattern + '\\s*g(?:rams?)?\\b', 'i');
  if (gramsWithUnit.test(ocrText)) {
    return true;
  }

  // Check for kg representation if weight is >= 1000g
  if (gramsRounded >= 1000) {
    const kgValue = gramsRounded / 1000;

    if (Number.isInteger(kgValue)) {
      // Integer kg (e.g., 1000g = 1kg)
      // Match: "1kg", "1 kg", "1.0kg", "1,0kg"
      const intKgPattern = new RegExp(
        `${kgValue}(?:[.,]0)?\\s*kg\\b|${kgValue}\\s*kilos?\\b|${kgValue}\\s*kilograms?\\b`,
        'i',
      );
      if (intKgPattern.test(ocrText)) {
        return true;
      }
    } else {
      // Decimal kg (e.g., 1500g = 1.5kg)
      // Convert to string and handle decimal separator variations
      const kgStr = kgValue.toFixed(1);
      const kgPatternStr = kgStr.replace('.', '[.,]');
      const decimalKgPattern = new RegExp(
        `${kgPatternStr}\\s*kg\\b|${kgPatternStr}\\s*kilos?\\b|${kgPatternStr}\\s*kilograms?\\b`,
        'i',
      );
      if (decimalKgPattern.test(ocrText)) {
        return true;
      }
    }
  }

  return false;
}

import { MAX_VALID_ELEVATION_METERS } from '../../data/ai-import/ai-import-constants';

/**
 * Checks if elevation numbers appear in OCR text, accounting for thousand separators.
 * This is a simple smoke test to catch LLM hallucinations - if the number isn't on the
 * label at all, it's definitely wrong.
 *
 * @param elevation The sanitized elevation string (e.g., "1850 MASL" or "1700-1900 MASL")
 * @param ocrText The OCR text to search in
 * @returns true if all numbers from the elevation appear somewhere in the OCR text
 *
 * @example
 *   elevationExistsInOcrText("1850 MASL", "Coffee 1.850 m.ü.M.") // true
 *   elevationExistsInOcrText("1850 MASL", "Coffee 1850m")        // true
 *   elevationExistsInOcrText("1850 MASL", "Coffee 250g")         // false (1850 not in text)
 *   elevationExistsInOcrText("1700-1900 MASL", "1.700-1.900m")   // true
 */
export function elevationExistsInOcrText(
  elevation: string,
  ocrText: string,
): boolean {
  if (!elevation || !ocrText) {
    return false;
  }

  // Extract all numbers from the elevation string
  const numbers = elevation.match(/\d+/g);
  if (!numbers || numbers.length === 0) {
    return false;
  }

  // Check that each number appears in OCR text (with optional thousand separators)
  for (const numStr of numbers) {
    const pattern = buildThousandSeparatorPattern(numStr);
    const regex = new RegExp(pattern);
    if (!regex.test(ocrText)) {
      return false;
    }
  }

  return true;
}

/**
 * Normalizes altitude unit suffixes to MASL.
 * Handles: m, m.ü.M., meters, msnm (case-insensitive).
 * Works with single values and ranges.
 *
 * @example
 *   normalizeAltitudeUnit("1850 m.ü.M.") // → "1850 MASL"
 *   normalizeAltitudeUnit("1700-1900 meters") // → "1700-1900 MASL"
 *   normalizeAltitudeUnit("1850 masl") // → "1850 MASL"
 */
export function normalizeAltitudeUnit(value: string): string {
  // Pattern for altitude units (but not MASL itself)
  // m.ü.M., msnm, meters, meter, m (when followed by space, end, or dash)
  const unitPattern = /m\.?ü\.?M\.?|msnm|meters?(?![a-zA-Z])|m(?=\s|$|-)/gi;

  // Replace units with MASL
  let result = value.replace(unitPattern, 'MASL');

  // Normalize existing masl to uppercase MASL
  result = result.replace(/masl/gi, 'MASL');

  // Clean up multiple spaces and ensure single space before MASL
  result = result.replace(/\s+MASL/g, ' MASL');

  // Remove duplicate MASL (e.g., "1850 MASL MASL" → "1850 MASL")
  result = result.replace(/(MASL\s*)+/g, 'MASL');

  return result;
}

/**
 * Sanitizes and validates an elevation value from LLM response.
 * Used by both single-origin field extraction and blend JSON parsing.
 *
 * Performs:
 * 1. Null-like value rejection ("null", "NOT_FOUND", "unknown")
 * 2. Whitespace cleanup (linebreaks, extra spaces)
 * 3. Thousand separator removal (international formats)
 * 4. Unit normalization to MASL
 * 5. LLM quirk fix ("2300 MASL 2400 MASL" → "2300-2400 MASL")
 * 6. Validation: rejects if any number >= 5000 (filters variety numbers like 74158)
 *
 * @param value Raw elevation value from LLM
 * @returns Sanitized elevation string, or null if invalid/not found
 *
 * @example
 *   sanitizeElevation("1.850 m.ü.M.") // → "1850 MASL"
 *   sanitizeElevation("1800\nMASL") // → "1800 MASL"
 *   sanitizeElevation("2300 MASL 2400 MASL") // → "2300-2400 MASL"
 *   sanitizeElevation("74158 MASL") // → null (variety number, not elevation)
 *   sanitizeElevation("NOT_FOUND") // → null
 */
export function sanitizeElevation(
  value: string | null | undefined,
): string | null {
  // Reject null/undefined
  if (value === null || value === undefined) {
    return null;
  }

  // Reject non-strings
  if (typeof value !== 'string') {
    return null;
  }

  // Reject null-like values
  const trimmed = value.trim().toLowerCase();
  if (
    trimmed === '' ||
    trimmed === 'null' ||
    trimmed === 'not_found' ||
    trimmed === 'unknown' ||
    trimmed === 'none' ||
    trimmed === 'n/a'
  ) {
    return null;
  }

  // Clean up whitespace
  let cleaned = value
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Normalize thousand separators
  cleaned = removeThousandSeparatorsFromInteger(cleaned);

  // Normalize altitude units to MASL
  cleaned = normalizeAltitudeUnit(cleaned);

  // Handle LLM quirk: "2300 MASL 2400 MASL" → "2300-2400 MASL"
  cleaned = cleaned.replace(/(\d+)\s*MASL\s*(\d+)\s*MASL/gi, '$1-$2 MASL');

  // Return null if empty after cleanup
  if (!cleaned || cleaned.length === 0) {
    return null;
  }

  // Validate elevation is reasonable - filters out variety numbers like 74158
  const allNumbers = cleaned.match(/\d+/g);
  if (allNumbers) {
    for (const numStr of allNumbers) {
      const num = parseInt(numStr, 10);
      if (num >= MAX_VALID_ELEVATION_METERS) {
        return null;
      }
    }
  }

  return cleaned;
}

/**
 * Service for normalizing OCR text before LLM processing.
 * Handles case normalization, number formatting, and altitude standardization.
 */
@Injectable({
  providedIn: 'root',
})
export class TextNormalizationService {
  /**
   * Normalize ALL CAPS text to Title Case.
   * Preserves mixed case text and handles common coffee terms.
   */
  public normalizeCase(text: string): string {
    return text
      .split('\n')
      .map((line) => this.normalizeLineCasing(line))
      .join('\n');
  }

  /**
   * Normalize a single line's casing.
   * Only converts if the line is predominantly uppercase.
   * Preserves OCR layout tags and markdown size prefixes.
   */
  private normalizeLineCasing(line: string): string {
    const trimmed = line.trim();
    if (!trimmed) {
      return line;
    }

    // Preserve OCR layout metadata tags
    if (this.isLayoutTag(trimmed)) {
      return line;
    }

    // Handle markdown size prefix: **LARGE:** text → **LARGE:** Normalized Text
    const markdownMatch = /^(\*\*(?:LARGE|MEDIUM|SMALL):\*\*)\s*(.+)$/i.exec(
      trimmed,
    );
    if (markdownMatch) {
      const prefix = markdownMatch[1].toUpperCase();
      const content = markdownMatch[2];
      return `${prefix} ${this.normalizeLineCasingContent(content)}`;
    }

    return this.normalizeLineCasingContent(trimmed);
  }

  /**
   * Normalize the casing of text content (without layout prefixes).
   */
  private normalizeLineCasingContent(text: string): string {
    // Count uppercase vs lowercase letters
    const letters = text.replace(/[^a-zA-Z]/g, '');
    if (!letters) {
      return text;
    }

    const upperCount = (letters.match(/[A-Z]/g) || []).length;

    // Only convert if more than 70% uppercase (likely ALL CAPS)
    if (upperCount > 0 && upperCount / letters.length > 0.7) {
      return this.toTitleCase(text);
    }

    return text;
  }

  /**
   * Check if a line is an OCR layout metadata element that should be preserved.
   * Includes:
   * - Section headers: === OCR WITH LAYOUT ===
   * - Label markers: --- Label 1 of 2 ---
   */
  private isLayoutTag(line: string): boolean {
    // Section headers: === TEXT ===
    if (/^===.*===$/.test(line)) {
      return true;
    }
    // Label markers: --- Label N of M ---
    if (/^---.*---$/.test(line)) {
      return true;
    }
    return false;
  }

  /**
   * Convert text to Title Case.
   * Handles special cases for coffee terminology.
   */
  private toTitleCase(text: string): string {
    // Words that should stay lowercase (articles, prepositions)
    const lowercaseWords = new Set([
      'a',
      'an',
      'the',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'de',
      'del',
      'la',
      'el',
      'von',
      'und',
    ]);

    // Words/acronyms that should stay uppercase
    const uppercaseWords = new Set([
      'AA',
      'AB',
      'SL-28',
      'SL-34',
      'SL28',
      'SL34',
      'MASL',
      'SHB',
      'SHG',
      'EP',
      'FAQ',
    ]);

    return text
      .toLowerCase()
      .split(/(\s+)/)
      .map((word, index) => {
        const upperWord = word.toUpperCase();
        if (uppercaseWords.has(upperWord)) {
          return upperWord;
        }
        if (index > 0 && lowercaseWords.has(word)) {
          return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join('');
  }

  /**
   * Normalize international number formats.
   * Removes thousand separators (dots, commas, apostrophes, spaces).
   * Examples: "1.850" → "1850", "1,900" → "1900", "1'850" → "1850", "1 850" → "1850"
   */
  public normalizeNumbers(text: string): string {
    return removeThousandSeparatorsFromInteger(text);
  }

  /**
   * Normalize altitude values to MASL format.
   * Examples:
   * - "1.850 m.ü.M." → "1850 MASL"
   * - "1,700 - 1,900 meters" → "1700-1900 MASL"
   * - "2000 msnm" → "2000 MASL"
   * - "800m 1200m" → "800-1200 MASL" (implicit range)
   * - "1'850 m.ü.M." → "1850 MASL" (Swiss format)
   */
  public normalizeAltitude(text: string): string {
    // First, normalize all thousand separators (including Swiss/French formats)
    let result = removeThousandSeparatorsFromInteger(text);

    // Pattern 1: Explicit ranges with dash/en-dash
    // e.g., "1700-1900m" → "1700-1900 MASL"
    result = result.replace(
      /(\d{3,4})\s*[-–]\s*(\d{3,4})\s*(?:m\.?ü\.?M\.?|msnm|meters?(?![a-zA-Z])|m(?=\s|$))/gi,
      '$1-$2 MASL',
    );

    // Pattern 2: Implicit ranges - two altitudes with units close together without dash
    // e.g., "800m 1200m" → "800-1200 MASL"
    result = result.replace(
      /(\d{3,4})\s*(?:m\.?ü\.?M\.?|msnm|meters?(?![a-zA-Z])|m(?=\s))\s+(\d{3,4})\s*(?:m\.?ü\.?M\.?|msnm|meters?(?![a-zA-Z])|m(?=\s|$)|MASL)/gi,
      '$1-$2 MASL',
    );

    // Pattern 3: Single altitudes (3-4 digit numbers with unit)
    // e.g., "1850m" → "1850 MASL", "1850 m.ü.M." → "1850 MASL", "2000 msnm" → "2000 MASL"
    // Negative lookahead prevents matching the start of an explicit range
    result = result.replace(
      /(\d{3,4})\s*(?:m\.?ü\.?M\.?|msnm|meters?(?![a-zA-Z])|m(?=\s|$))(?!\s*[-–]\s*\d)/gi,
      '$1 MASL',
    );

    // Normalize any remaining masl case variations
    result = result.replace(/masl/gi, 'MASL');

    return result;
  }

  /**
   * Extract weight in grams from text.
   * Handles various formats: "250g", "1kg", "12oz", "1lb"
   */
  public extractWeight(text: string): number | null {
    // Match weight patterns
    const patterns = [
      // Grams: "250g", "250 g", "250 grams"
      /(\d+(?:[.,]\d+)?)\s*(?:g(?:rams?)?)\b/i,
      // Kilograms: "1kg", "1.5 kg"
      /(\d+(?:[.,]\d+)?)\s*(?:kg|kilo(?:gram)?s?)\b/i,
      // Ounces: "12oz", "12 oz"
      /(\d+(?:[.,]\d+)?)\s*(?:oz|ounces?)\b/i,
      // Pounds: "1lb", "1 lb"
      /(\d+(?:[.,]\d+)?)\s*(?:lb|lbs?|pounds?)\b/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        const unit = match[0].toLowerCase();

        if (unit.includes('kg') || unit.includes('kilo')) {
          return Math.round(value * 1000);
        } else if (unit.includes('oz') || unit.includes('ounce')) {
          return Math.round(value * 28.3495);
        } else if (
          unit.includes('lb') ||
          unit.includes('pound') ||
          unit.includes('lbs')
        ) {
          return Math.round(value * 453.592);
        } else {
          // Grams
          return Math.round(value);
        }
      }
    }

    return null;
  }

  /**
   * Apply all normalizations to OCR text.
   */
  public normalizeAll(text: string): string {
    let result = text;
    result = this.normalizeNumbers(result);
    result = this.normalizeAltitude(result);
    result = this.normalizeCase(result);
    return result;
  }
}
