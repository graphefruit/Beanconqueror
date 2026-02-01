import { Injectable } from '@angular/core';

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
    const markdownMatch = trimmed.match(
      /^(\*\*(?:LARGE|MEDIUM|SMALL):\*\*)\s*(.+)$/i,
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
   * Normalize European number formats.
   * Removes thousand separators (dots/commas used as such).
   * Examples: "1.850" → "1850", "1,900" → "1900"
   */
  public normalizeNumbers(text: string): string {
    // Pattern: digit(s) followed by dot/comma followed by exactly 3 digits
    // This identifies thousand separators (1.850 or 1,900)
    return text.replace(/(\d)[.,](\d{3})(?!\d)/g, '$1$2');
  }

  /**
   * Normalize altitude values to MASL format.
   * Examples:
   * - "1.850 m.ü.M." → "1850 MASL"
   * - "1,700 - 1,900 meters" → "1700-1900 MASL"
   * - "2000 msnm" → "2000 MASL"
   * - "800m 1200m" → "800-1200 MASL" (implicit range)
   */
  public normalizeAltitude(text: string): string {
    let result = text;

    // Altitude unit pattern: m.ü.M., meters, msnm, or standalone m (but not MASL)
    // Using word boundary or end assertion to avoid partial matches
    const altitudeUnitPattern =
      /m\.?ü\.?M\.?|msnm|m(?:eters?)?(?![a-zA-Z])|m(?=\s|$|-)/i;

    // Pattern 1: Explicit ranges with dash/en-dash
    // e.g., "1700-1900m" → "1700-1900 MASL", "1.850-2.100 meters" → "1850-2100 MASL"
    // Supports 3-4 digit altitudes (up to 4999)
    result = result.replace(
      /(\d{1,2})?[.,]?(\d{3})\s*[-–]\s*(\d{1,2})?[.,]?(\d{3})\s*(?:m\.?ü\.?M\.?|msnm|m(?:eters?)?(?![a-zA-Z])|m(?=\s|$))/gi,
      (_, p1, p2, p3, p4) => {
        const low = (p1 || '') + p2;
        const high = (p3 || '') + p4;
        return `${low}-${high} MASL`;
      },
    );

    // Pattern 2: Implicit ranges - two altitudes with units close together without dash
    // e.g., "800m 1200m" → "800-1200 MASL"
    result = result.replace(
      /(\d{3,4})\s*(?:m\.?ü\.?M\.?|msnm|m(?:eters?)?(?![a-zA-Z])|m(?=\s))\s+(\d{3,4})\s*(?:m\.?ü\.?M\.?|msnm|m(?:eters?)?(?![a-zA-Z])|m(?=\s|$)|MASL)/gi,
      '$1-$2 MASL',
    );

    // Pattern 3: Single altitudes (3-4 digit numbers with unit)
    // e.g., "1850m" → "1850 MASL", "1.850 m.ü.M." → "1850 MASL", "2000 msnm" → "2000 MASL"
    // Negative lookahead prevents matching the start of an explicit range
    result = result.replace(
      /(\d{1,2})?[.,]?(\d{3})\s*(?:m\.?ü\.?M\.?|msnm|m(?:eters?)?(?![a-zA-Z])|m(?=\s|$))(?!\s*[-–]\s*\d)/gi,
      (_, p1, p2) => {
        const altitude = (p1 || '') + p2;
        return `${altitude} MASL`;
      },
    );

    // Pattern 4: Normalize thousand separators in existing MASL values
    // e.g., "1.850 MASL" → "1850 MASL"
    result = result.replace(/(\d{1,2})?[.,](\d{3})\s*MASL/gi, (_, p1, p2) => {
      const altitude = (p1 || '') + p2;
      return `${altitude} MASL`;
    });

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
