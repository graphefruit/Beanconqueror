import { TestBed } from '@angular/core/testing';

import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import {
  AIImportExamplesService,
  MergedExamples,
} from './ai-import-examples.service';
import { createMockTranslateService } from './test-utils';

describe('AIImportExamplesService', () => {
  let service: AIImportExamplesService;
  let mockTranslate: jasmine.SpyObj<TranslateService> & {
    currentLang: string;
    currentLoader: { getTranslation: jasmine.Spy };
  };

  beforeEach(() => {
    mockTranslate = createMockTranslateService();

    TestBed.configureTestingModule({
      providers: [
        AIImportExamplesService,
        { provide: TranslateService, useValue: mockTranslate },
      ],
    });
    service = TestBed.inject(AIImportExamplesService);
  });

  it('should be injectable via TestBed', () => {
    expect(service).toBeTruthy();
  });

  describe('getMergedExamples', () => {
    it('should deduplicate language list before loading', async () => {
      // Arrange
      mockTranslate.currentLoader.getTranslation.and.returnValue(of({}));

      // Act
      await service.getMergedExamples(['en', 'en', 'de', 'de']);

      // Assert - each unique language should be loaded only once
      expect(mockTranslate.currentLoader.getTranslation).toHaveBeenCalledTimes(
        2,
      );
      expect(mockTranslate.currentLoader.getTranslation).toHaveBeenCalledWith(
        'en',
      );
      expect(mockTranslate.currentLoader.getTranslation).toHaveBeenCalledWith(
        'de',
      );
    });

    it('should load examples from each unique language', async () => {
      // Arrange
      const enTranslations = {
        AI_IMPORT_PROMPT_EXAMPLES: {
          ORIGINS: 'Colombia, Ethiopia',
          VARIETIES: 'Bourbon, Gesha',
        },
      };
      const deTranslations = {
        AI_IMPORT_PROMPT_EXAMPLES: {
          ORIGINS: 'Kolumbien, Äthiopien',
          VARIETIES: 'Bourbon, Caturra',
        },
      };
      mockTranslate.currentLoader.getTranslation.and.callFake(
        (lang: string) => {
          if (lang === 'en') return of(enTranslations);
          if (lang === 'de') return of(deTranslations);
          return of({});
        },
      );

      // Act
      const result = await service.getMergedExamples(['en', 'de']);

      // Assert
      expect(result.ORIGINS).toContain('Colombia');
      expect(result.ORIGINS).toContain('Kolumbien');
    });

    it('should skip languages that fail to load', async () => {
      // Arrange
      const enTranslations = {
        AI_IMPORT_PROMPT_EXAMPLES: {
          ORIGINS: 'Colombia',
        },
      };
      mockTranslate.currentLoader.getTranslation.and.callFake(
        (lang: string) => {
          if (lang === 'en') return of(enTranslations);
          // 'fr' fails to load
          return throwError(() => new Error('Language not found'));
        },
      );

      // Act
      const result = await service.getMergedExamples(['en', 'fr']);

      // Assert - should still get English results
      expect(result.ORIGINS).toContain('Colombia');
    });

  });

  describe('loadExamplesForLanguage (via getMergedExamples)', () => {
    it('should return empty examples when translation file not found', async () => {
      // Arrange
      mockTranslate.currentLoader.getTranslation.and.returnValue(
        throwError(() => new Error('Not found')),
      );

      // Act
      const result = await service.getMergedExamples(['unknown']);

      // Assert - should return empty strings for all keys
      expect(result.ORIGINS).toBe('');
      expect(result.VARIETIES).toBe('');
    });

    it('should return empty examples when AI_IMPORT_PROMPT_EXAMPLES not in translations', async () => {
      // Arrange
      mockTranslate.currentLoader.getTranslation.and.returnValue(
        of({ OTHER_KEY: 'value' }),
      );

      // Act
      const result = await service.getMergedExamples(['en']);

      // Assert
      expect(result.ORIGINS).toBe('');
    });

    it('should return empty examples when AI_IMPORT_PROMPT_EXAMPLES is not an object', async () => {
      // Arrange
      mockTranslate.currentLoader.getTranslation.and.returnValue(
        of({ AI_IMPORT_PROMPT_EXAMPLES: 'string value' }),
      );

      // Act
      const result = await service.getMergedExamples(['en']);

      // Assert
      expect(result.ORIGINS).toBe('');
    });

    it('should parse comma-separated strings into arrays', async () => {
      // Arrange
      mockTranslate.currentLoader.getTranslation.and.returnValue(
        of({
          AI_IMPORT_PROMPT_EXAMPLES: {
            ORIGINS: 'Colombia, Ethiopia, Kenya',
          },
        }),
      );

      // Act
      const result = await service.getMergedExamples(['en']);

      // Assert - should be joined back to comma-separated
      expect(result.ORIGINS).toBe('Colombia, Ethiopia, Kenya');
    });

    it('should filter out empty strings after splitting', async () => {
      // Arrange - input has extra commas creating empty strings
      mockTranslate.currentLoader.getTranslation.and.returnValue(
        of({
          AI_IMPORT_PROMPT_EXAMPLES: {
            ORIGINS: 'Colombia,, Ethiopia, , Kenya',
          },
        }),
      );

      // Act
      const result = await service.getMergedExamples(['en']);

      // Assert - no empty entries in result
      expect(result.ORIGINS).toBe('Colombia, Ethiopia, Kenya');
    });
  });

  describe('getLanguageDetectionKeywords', () => {
    it('should return formatted keyword lines and examples, skipping languages without keywords or with load errors', async () => {
      // Arrange — mixed set of locales: 2 valid, 1 wrong key, 1 load error
      mockTranslate.getLangs.and.returnValue(['de', 'en', 'fr', 'es']);
      mockTranslate.currentLoader.getTranslation.and.callFake(
        (lang: string) => {
          if (lang === 'de') {
            return of({
              AI_IMPORT_LANG_DETECT: {
                KEYWORDS: 'Röstung, Aufbereitung',
                EXAMPLE: 'Röstfrisch, Herkunft: Äthiopien',
              },
            });
          }
          if (lang === 'en') {
            return of({
              AI_IMPORT_LANG_DETECT: {
                KEYWORDS: 'roasted, harvest',
                EXAMPLE: 'Freshly roasted, single origin',
              },
            });
          }
          if (lang === 'fr') {
            return of({ someOtherKey: 'foo' });
          }
          // 'es' fails to load
          return throwError(() => new Error('Language not found'));
        },
      );

      // Act
      const result = await service.getLanguageDetectionKeywords();

      // Assert
      expect(result).toBe(
        '- de: Röstung, Aufbereitung\n' +
          '- en: roasted, harvest\n' +
          '\n' +
          'EXAMPLES:\n' +
          '"Röstfrisch, Herkunft: Äthiopien" → de\n' +
          '"Freshly roasted, single origin" → en',
      );
    });
  });

  describe('mergeExamples (via getMergedExamples)', () => {
    it('should deduplicate values case-insensitively, keeping first occurrence casing', async () => {
      // WHY: Case-insensitive deduplication prevents "Natural" and "natural" from both appearing.
      //       First-occurrence casing is preserved for consistent output.

      // Arrange
      const enTranslations = {
        AI_IMPORT_PROMPT_EXAMPLES: {
          PROCESSING_METHODS: 'Natural, Washed',
        },
      };
      const deTranslations = {
        AI_IMPORT_PROMPT_EXAMPLES: {
          PROCESSING_METHODS: 'natural, WASHED, Honey',
        },
      };
      mockTranslate.currentLoader.getTranslation.and.callFake(
        (lang: string) => {
          if (lang === 'en') return of(enTranslations);
          if (lang === 'de') return of(deTranslations);
          return of({});
        },
      );

      // Act
      const result = await service.getMergedExamples(['en', 'de']);

      // Assert - exact output: duplicates removed, first-occurrence casing kept
      expect(result.PROCESSING_METHODS).toBe('Natural, Washed, Honey');
    });
  });
});
