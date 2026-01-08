import { Injectable } from '@angular/core';
import { MergedExamples } from './ai-import-examples.service';

/**
 * Service for correcting common OCR errors using fuzzy matching
 * against known coffee terminology vocabularies.
 */
@Injectable({
  providedIn: 'root',
})
export class OCRCorrectionService {
  /**
   * Character substitution map for common OCR confusions.
   * Maps a character to its commonly confused alternatives.
   */
  private readonly CHAR_SUBSTITUTIONS = new Map<string, string[]>([
    ['0', ['O', 'o']],
    ['O', ['0']],
    ['o', ['0']],
    ['1', ['l', 'I', 'i', 't']],
    ['l', ['1', 'I', 't']],
    ['I', ['1', 'l', 't']],
    ['i', ['1', 'l']],
    ['t', ['1', 'l', 'I']],
    ['5', ['S', 's']],
    ['S', ['5']],
    ['s', ['5']],
    ['8', ['B']],
    ['B', ['8']],
    ['6', ['G']],
    ['G', ['6']],
  ]);

  /**
   * Correct OCR errors in text using fuzzy matching against vocabularies.
   */
  public correctOCRErrors(text: string, examples: MergedExamples): string {
    // Build vocabularies from examples
    const countryVocab = this.parseCommaSeparated(examples.ORIGINS);
    const varietyVocab = this.parseCommaSeparated(examples.VARIETIES);
    const processingVocab = this.parseCommaSeparated(
      examples.PROCESSING_METHODS,
    );

    // Attempt to correct each word that might be a known term
    const words = text.split(/(\s+)/);
    const correctedWords = words.map((word) => {
      if (!word.trim()) {
        return word;
      }

      // Try matching against each vocabulary
      const countryMatch = this.fuzzyMatchWord(word, countryVocab);
      if (countryMatch) {
        return countryMatch;
      }

      const varietyMatch = this.fuzzyMatchWord(word, varietyVocab);
      if (varietyMatch) {
        return varietyMatch;
      }

      const processingMatch = this.fuzzyMatchWord(word, processingVocab);
      if (processingMatch) {
        return processingMatch;
      }

      return word;
    });

    return correctedWords.join('');
  }

  /**
   * Fuzzy match a country name against known origins.
   */
  public fuzzyMatchCountry(
    text: string,
    examples: MergedExamples,
  ): string | null {
    const vocab = this.parseCommaSeparated(examples.ORIGINS);
    return this.fuzzyMatchWord(text, vocab);
  }

  /**
   * Fuzzy match a variety against known varieties.
   */
  public fuzzyMatchVariety(
    text: string,
    examples: MergedExamples,
  ): string | null {
    const vocab = this.parseCommaSeparated(examples.VARIETIES);
    return this.fuzzyMatchWord(text, vocab);
  }

  /**
   * Fuzzy match a processing method against known methods.
   */
  public fuzzyMatchProcessing(
    text: string,
    examples: MergedExamples,
  ): string | null {
    const vocab = this.parseCommaSeparated(examples.PROCESSING_METHODS);
    return this.fuzzyMatchWord(text, vocab);
  }

  /**
   * Attempt to match a word against a vocabulary using OCR-aware fuzzy matching.
   * Returns the matching vocabulary term if found, null otherwise.
   */
  private fuzzyMatchWord(word: string, vocabulary: string[]): string | null {
    const normalizedWord = word.toLowerCase().trim();
    if (!normalizedWord) {
      return null;
    }

    // First try exact match (case-insensitive)
    for (const term of vocabulary) {
      if (term.toLowerCase() === normalizedWord) {
        return term; // Return the properly cased version
      }
    }

    // Generate OCR variants and try matching
    const variants = this.generateVariants(normalizedWord);
    for (const variant of variants) {
      for (const term of vocabulary) {
        if (term.toLowerCase() === variant.toLowerCase()) {
          return term;
        }
      }
    }

    return null;
  }

  /**
   * Generate possible OCR variants of a word by substituting confused characters.
   */
  public generateVariants(word: string): string[] {
    const variants = new Set<string>();

    // Generate single-character substitutions
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const substitutions = this.CHAR_SUBSTITUTIONS.get(char);

      if (substitutions) {
        for (const sub of substitutions) {
          const variant = word.slice(0, i) + sub + word.slice(i + 1);
          variants.add(variant);
        }
      }
    }

    // Generate double-character substitutions for common cases
    // Handle 'rn' ↔ 'm' confusion
    const rnToM = word.replace(/rn/gi, 'm');
    if (rnToM !== word) {
      variants.add(rnToM);
    }
    const mToRn = word.replace(/m/gi, 'rn');
    if (mToRn !== word) {
      variants.add(mToRn);
    }

    return Array.from(variants);
  }

  /**
   * Parse comma-separated string into array of trimmed terms.
   */
  private parseCommaSeparated(text: string): string[] {
    if (!text) {
      return [];
    }
    return text
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
}
