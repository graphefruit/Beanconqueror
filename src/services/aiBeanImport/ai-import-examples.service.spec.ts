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
  let mockTranslate: jasmine.SpyObj<TranslateService> & { currentLang: string };

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
      mockTranslate.getTranslation.and.returnValue(of({}));

      // Act
      await service.getMergedExamples(['en', 'en', 'de', 'de']);

      // Assert - each unique language should be loaded only once
      expect(mockTranslate.getTranslation).toHaveBeenCalledTimes(2);
      expect(mockTranslate.getTranslation).toHaveBeenCalledWith('en');
      expect(mockTranslate.getTranslation).toHaveBeenCalledWith('de');
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
      mockTranslate.getTranslation.and.callFake((lang: string) => {
        if (lang === 'en') return of(enTranslations);
        if (lang === 'de') return of(deTranslations);
        return of({});
      });

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
      mockTranslate.getTranslation.and.callFake((lang: string) => {
        if (lang === 'en') return of(enTranslations);
        // 'fr' fails to load
        return throwError(() => new Error('Language not found'));
      });

      // Act
      const result = await service.getMergedExamples(['en', 'fr']);

      // Assert - should still get English results
      expect(result.ORIGINS).toContain('Colombia');
    });

    it('should return merged examples from multiple languages', async () => {
      // Arrange
      const enTranslations = {
        AI_IMPORT_PROMPT_EXAMPLES: {
          PROCESSING_METHODS: 'Washed, Natural',
        },
      };
      const esTranslations = {
        AI_IMPORT_PROMPT_EXAMPLES: {
          PROCESSING_METHODS: 'Lavado, Natural, Honey',
        },
      };
      mockTranslate.getTranslation.and.callFake((lang: string) => {
        if (lang === 'en') return of(enTranslations);
        if (lang === 'es') return of(esTranslations);
        return of({});
      });

      // Act
      const result = await service.getMergedExamples(['en', 'es']);

      // Assert - should include unique values from both languages
      expect(result.PROCESSING_METHODS).toContain('Washed');
      expect(result.PROCESSING_METHODS).toContain('Lavado');
      expect(result.PROCESSING_METHODS).toContain('Honey');
    });
  });

  describe('loadExamplesForLanguage (via getMergedExamples)', () => {
    it('should return empty examples when translation file not found', async () => {
      // Arrange
      mockTranslate.getTranslation.and.returnValue(
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
      mockTranslate.getTranslation.and.returnValue(of({ OTHER_KEY: 'value' }));

      // Act
      const result = await service.getMergedExamples(['en']);

      // Assert
      expect(result.ORIGINS).toBe('');
    });

    it('should return empty examples when AI_IMPORT_PROMPT_EXAMPLES is not an object', async () => {
      // Arrange
      mockTranslate.getTranslation.and.returnValue(
        of({ AI_IMPORT_PROMPT_EXAMPLES: 'string value' }),
      );

      // Act
      const result = await service.getMergedExamples(['en']);

      // Assert
      expect(result.ORIGINS).toBe('');
    });

    it('should parse comma-separated strings into arrays', async () => {
      // Arrange
      mockTranslate.getTranslation.and.returnValue(
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
      mockTranslate.getTranslation.and.returnValue(
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

  describe('mergeExamples (via getMergedExamples)', () => {
    it('should combine values from all example objects', async () => {
      // Arrange
      const enTranslations = {
        AI_IMPORT_PROMPT_EXAMPLES: {
          VARIETIES: 'Bourbon',
        },
      };
      const deTranslations = {
        AI_IMPORT_PROMPT_EXAMPLES: {
          VARIETIES: 'Gesha',
        },
      };
      mockTranslate.getTranslation.and.callFake((lang: string) => {
        if (lang === 'en') return of(enTranslations);
        if (lang === 'de') return of(deTranslations);
        return of({});
      });

      // Act
      const result = await service.getMergedExamples(['en', 'de']);

      // Assert
      expect(result.VARIETIES).toContain('Bourbon');
      expect(result.VARIETIES).toContain('Gesha');
    });

    it('should deduplicate values case-insensitively', async () => {
      // WHY: Case-insensitive deduplication prevents "Natural" and "natural" from both appearing

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
      mockTranslate.getTranslation.and.callFake((lang: string) => {
        if (lang === 'en') return of(enTranslations);
        if (lang === 'de') return of(deTranslations);
        return of({});
      });

      // Act
      const result = await service.getMergedExamples(['en', 'de']);

      // Assert - duplicates removed, only unique values remain
      const methods = result.PROCESSING_METHODS.split(', ');
      expect(methods.length).toBe(3); // Natural, Washed, Honey
    });

    it('should keep first occurrence casing when deduplicating', async () => {
      // WHY: Preserving first occurrence ensures consistent casing in output

      // Arrange
      const enTranslations = {
        AI_IMPORT_PROMPT_EXAMPLES: {
          VARIETIES: 'Gesha',
        },
      };
      const deTranslations = {
        AI_IMPORT_PROMPT_EXAMPLES: {
          VARIETIES: 'GESHA, gesha',
        },
      };
      mockTranslate.getTranslation.and.callFake((lang: string) => {
        if (lang === 'en') return of(enTranslations);
        if (lang === 'de') return of(deTranslations);
        return of({});
      });

      // Act
      const result = await service.getMergedExamples(['en', 'de']);

      // Assert - should keep "Gesha" (first occurrence from English)
      expect(result.VARIETIES).toBe('Gesha');
    });

    it('should return comma-separated string for each key', async () => {
      // Arrange
      mockTranslate.getTranslation.and.returnValue(
        of({
          AI_IMPORT_PROMPT_EXAMPLES: {
            ORIGINS: 'Colombia, Ethiopia, Kenya',
          },
        }),
      );

      // Act
      const result = await service.getMergedExamples(['en']);

      // Assert
      expect(typeof result.ORIGINS).toBe('string');
      expect(result.ORIGINS).toContain(', ');
    });

    it('should return empty strings when no examples provided', async () => {
      // Arrange
      mockTranslate.getTranslation.and.returnValue(of({}));

      // Act
      const result = await service.getMergedExamples(['en']);

      // Assert
      expect(result.ORIGINS).toBe('');
      expect(result.VARIETIES).toBe('');
      expect(result.PROCESSING_METHODS).toBe('');
    });
  });
});
