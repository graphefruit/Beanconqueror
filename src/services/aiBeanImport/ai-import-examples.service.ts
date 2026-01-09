import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export interface MergedExamples {
  ORIGINS: string;
  PROCESSING_METHODS: string;
  VARIETIES: string;
  ROASTING_TYPE_FILTER_KEYWORDS: string;
  ROASTING_TYPE_ESPRESSO_KEYWORDS: string;
  ROASTING_TYPE_OMNI_KEYWORDS: string;
  DECAF_KEYWORDS: string;
  BLEND_KEYWORDS: string;
  SINGLE_ORIGIN_KEYWORDS: string;
  PRODUCER_KEYWORDS: string;
  ROASTDATE_KEYWORDS: string;
}

const EXAMPLE_KEYS: (keyof MergedExamples)[] = [
  'ORIGINS',
  'PROCESSING_METHODS',
  'VARIETIES',
  'ROASTING_TYPE_FILTER_KEYWORDS',
  'ROASTING_TYPE_ESPRESSO_KEYWORDS',
  'ROASTING_TYPE_OMNI_KEYWORDS',
  'DECAF_KEYWORDS',
  'BLEND_KEYWORDS',
  'SINGLE_ORIGIN_KEYWORDS',
  'PRODUCER_KEYWORDS',
  'ROASTDATE_KEYWORDS',
];

@Injectable({
  providedIn: 'root',
})
export class AIImportExamplesService {
  constructor(private readonly translate: TranslateService) {}

  /**
   * Load and merge examples for the given languages.
   * Loads from i18n files via TranslateService, deduplicates results.
   */
  public async getMergedExamples(languages: string[]): Promise<MergedExamples> {
    // Deduplicate language list
    const uniqueLanguages = [...new Set(languages)];

    // Load examples from each language
    const allExamples: Record<string, string[]>[] = [];
    for (const lang of uniqueLanguages) {
      const examples = await this.loadExamplesForLanguage(lang);
      if (examples) {
        allExamples.push(examples);
      }
    }

    // Merge and deduplicate
    return this.mergeExamples(allExamples);
  }

  /**
   * Load AI_IMPORT_PROMPT_EXAMPLES from a language's i18n file
   */
  private async loadExamplesForLanguage(
    lang: string,
  ): Promise<Record<string, string[]> | null> {
    try {
      const translations = await this.translate
        .getTranslation(lang)
        .toPromise();
      const examples = translations?.['AI_IMPORT_PROMPT_EXAMPLES'];

      if (!examples || typeof examples !== 'object') {
        return null;
      }

      // Parse comma-separated strings into arrays
      const parsed: Record<string, string[]> = {};
      for (const key of EXAMPLE_KEYS) {
        if (examples[key] && typeof examples[key] === 'string') {
          parsed[key] = examples[key]
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);
        }
      }

      return Object.keys(parsed).length > 0 ? parsed : null;
    } catch {
      // Language file doesn't exist or couldn't be loaded
      return null;
    }
  }

  /**
   * Merge examples from multiple languages, deduplicate case-insensitively
   */
  private mergeExamples(
    allExamples: Record<string, string[]>[],
  ): MergedExamples {
    const merged: MergedExamples = {
      ORIGINS: '',
      PROCESSING_METHODS: '',
      VARIETIES: '',
      ROASTING_TYPE_FILTER_KEYWORDS: '',
      ROASTING_TYPE_ESPRESSO_KEYWORDS: '',
      ROASTING_TYPE_OMNI_KEYWORDS: '',
      DECAF_KEYWORDS: '',
      BLEND_KEYWORDS: '',
      SINGLE_ORIGIN_KEYWORDS: '',
      PRODUCER_KEYWORDS: '',
      ROASTDATE_KEYWORDS: '',
    };

    for (const key of EXAMPLE_KEYS) {
      const allValues: string[] = [];

      for (const examples of allExamples) {
        if (examples[key]) {
          allValues.push(...examples[key]);
        }
      }

      // Deduplicate (case-insensitive, keep first occurrence's casing)
      const seen = new Set<string>();
      const unique: string[] = [];

      for (const value of allValues) {
        const lowerValue = value.toLowerCase();
        if (!seen.has(lowerValue)) {
          seen.add(lowerValue);
          unique.push(value);
        }
      }

      merged[key] = unique.join(', ');
    }

    return merged;
  }
}
