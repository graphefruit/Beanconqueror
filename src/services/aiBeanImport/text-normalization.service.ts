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
   */
  private normalizeLineCasing(line: string): string {
    const trimmed = line.trim();
    if (!trimmed) {
      return line;
    }

    // Count uppercase vs lowercase letters
    const letters = trimmed.replace(/[^a-zA-Z]/g, '');
    if (!letters) {
      return line;
    }

    const upperCount = (letters.match(/[A-Z]/g) || []).length;

    // Only convert if more than 70% uppercase (likely ALL CAPS)
    if (upperCount > 0 && upperCount / letters.length > 0.7) {
      return this.toTitleCase(trimmed);
    }

    return line;
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
   */
  public normalizeAltitude(text: string): string {
    let result = text;

    // Handle ranges first
    result = result.replace(
      /(\d)[.,]?(\d{3})\s*[-–]\s*(\d)[.,]?(\d{3})\s*(?:m\.?ü\.?M\.?|m(?:eters?)?|msnm)/gi,
      '$1$2-$3$4 MASL',
    );

    // Handle single altitudes
    result = result.replace(
      /(\d)[.,]?(\d{3})\s*(?:m\.?ü\.?M\.?|m(?:eters?)?|msnm)/gi,
      '$1$2 MASL',
    );

    // Handle already MASL without thousand separator normalization
    result = result.replace(/(\d)[.,](\d{3})\s*MASL/gi, '$1$2 MASL');

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
