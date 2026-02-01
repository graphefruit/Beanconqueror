import moment from 'moment';

import { MergedExamples } from '../../services/aiBeanImport/ai-import-examples.service';
import { createMockExamples } from '../../services/aiBeanImport/test-utils';

import { buildFieldPrompt, FIELD_PROMPTS } from './ai-field-prompts';

describe('ai-field-prompts', () => {
  let mockExamples: MergedExamples;

  beforeEach(() => {
    mockExamples = createMockExamples();
  });

  describe('buildFieldPrompt', () => {
    it('should throw error for unknown field name', () => {
      // Arrange & Act & Assert
      expect(() =>
        buildFieldPrompt('unknownField', 'OCR text', mockExamples, ['en']),
      ).toThrowError('Unknown field: unknownField');
    });

    it('should substitute example placeholders from examplesKeys', () => {
      // Arrange
      const ocrText = 'Ethiopia Yirgacheffe';

      // Act
      const prompt = buildFieldPrompt('country', ocrText, mockExamples, ['en']);

      // Assert - should have substituted {{ORIGINS}} placeholder
      expect(prompt).toContain('Colombia');
      expect(prompt).toContain('Ethiopia');
      expect(prompt).not.toContain('{{ORIGINS}}');
    });

    it('should substitute all example key placeholders even if not in examplesKeys', () => {
      // WHY: Some prompts reference example keys inline even without declaring them in examplesKeys

      // Arrange
      const ocrText = 'Decaf Ethiopia';

      // Act
      const prompt = buildFieldPrompt('decaffeinated', ocrText, mockExamples, [
        'en',
      ]);

      // Assert - DECAF_KEYWORDS should be substituted
      expect(prompt).toContain('Decaf');
      expect(prompt).not.toContain('{{DECAF_KEYWORDS}}');
    });

    it('should substitute LANGUAGES placeholder with comma-separated list', () => {
      // Arrange
      const ocrText = 'Some text';

      // Act
      const prompt = buildFieldPrompt('country', ocrText, mockExamples, [
        'de',
        'en',
        'es',
      ]);

      // Assert
      expect(prompt).toContain('de, en, es');
      expect(prompt).not.toContain('{{LANGUAGES}}');
    });

    it('should substitute OCR_TEXT placeholder with provided text', () => {
      // Arrange
      const ocrText = 'Square Mile Coffee Ethiopia Yirgacheffe';

      // Act
      const prompt = buildFieldPrompt('country', ocrText, mockExamples, ['en']);

      // Assert
      expect(prompt).toContain(ocrText);
      expect(prompt).not.toContain('{{OCR_TEXT}}');
    });

    it('should preserve prompt structure after all substitutions', () => {
      // Arrange
      const ocrText = 'Test OCR text';

      // Act
      const prompt = buildFieldPrompt('beanMix', ocrText, mockExamples, ['en']);

      // Assert - core prompt structure should remain
      expect(prompt).toContain('SINGLE ORIGIN');
      expect(prompt).toContain('BLEND');
      expect(prompt).toContain('RESPONSE FORMAT');
    });
  });

  describe('FIELD_PROMPTS.beanMix', () => {
    describe('postProcess', () => {
      const postProcess = FIELD_PROMPTS['beanMix'].postProcess!;

      it('should return "SINGLE_ORIGIN" for case-insensitive match', () => {
        expect(postProcess('single_origin', '')).toBe('SINGLE_ORIGIN');
        expect(postProcess('SINGLE_ORIGIN', '')).toBe('SINGLE_ORIGIN');
        expect(postProcess('Single_Origin', '')).toBe('SINGLE_ORIGIN');
      });

      it('should return "BLEND" for case-insensitive match', () => {
        expect(postProcess('blend', '')).toBe('BLEND');
        expect(postProcess('BLEND', '')).toBe('BLEND');
        expect(postProcess('Blend', '')).toBe('BLEND');
      });

      it('should return null for invalid values', () => {
        expect(postProcess('unknown', '')).toBeNull();
        expect(postProcess('mixed', '')).toBeNull();
        expect(postProcess('', '')).toBeNull();
      });
    });
  });

  describe('FIELD_PROMPTS.weight', () => {
    describe('validation', () => {
      const validation = FIELD_PROMPTS['weight'].validation!;

      it('should match weight with grams unit', () => {
        expect(validation.test('250g')).toBeTrue();
        expect(validation.test('250 g')).toBeTrue();
        expect(validation.test('1000g')).toBeTrue();
      });

      it('should match weight with kilograms unit', () => {
        expect(validation.test('1kg')).toBeTrue();
        expect(validation.test('1.5kg')).toBeTrue();
        expect(validation.test('2 kg')).toBeTrue();
      });

      it('should match weight with ounces unit', () => {
        expect(validation.test('12oz')).toBeTrue();
        expect(validation.test('16 oz')).toBeTrue();
      });

      it('should match weight with pounds unit', () => {
        expect(validation.test('1lb')).toBeTrue();
        expect(validation.test('2.5 lb')).toBeTrue();
      });

      it('should match decimal weights', () => {
        expect(validation.test('1.5kg')).toBeTrue();
        expect(validation.test('0.5lb')).toBeTrue();
        expect(validation.test('1,5kg')).toBeTrue(); // European decimal
      });
    });

    describe('postProcess', () => {
      const postProcess = FIELD_PROMPTS['weight'].postProcess!;

      it('should return null when value has no valid weight format', () => {
        // WHY: Prevents LLM from returning non-numeric responses
        expect(postProcess('unknown', 'OCR text')).toBeNull();
        expect(postProcess('250', 'Coffee 250g')).toBeNull(); // missing unit
      });

      it('should return null when weight not in OCR text', () => {
        // WHY: OCR validation prevents LLM from hallucinating weights
        expect(postProcess('500g', 'Coffee 250g Ethiopia')).toBeNull();
      });

      it('should return original value when weight exists in OCR text', () => {
        expect(postProcess('250g', 'Coffee 250g Ethiopia')).toBe('250g');
      });

      it('should handle thousand separators in OCR text', () => {
        expect(postProcess('1000g', 'Coffee 1.000g pack')).toBe('1000g');
        expect(postProcess('1000g', 'Coffee 1,000g pack')).toBe('1000g');
      });

      it('should validate kg by converting to grams', () => {
        // 1kg = 1000g, should find "1kg" or "1.000g" in OCR
        expect(postProcess('1kg', 'Coffee 1kg bag')).toBe('1kg');
        expect(postProcess('1kg', 'Coffee 1.000g bag')).toBe('1kg');
      });

      it('should reject 1kg hallucination when OCR has different weight', () => {
        // WHY: Main hallucination case this fix addresses
        expect(postProcess('1kg', 'Coffee 250g Ethiopia')).toBeNull();
      });

      it('should reject 1kg when OCR only has unrelated numbers', () => {
        // WHY: Prevents matching "1" in dates or label markers
        expect(postProcess('1kg', 'Roasted 15.01.2025')).toBeNull();
        expect(postProcess('1kg', 'Label 1 of 2')).toBeNull();
      });
    });
  });

  describe('FIELD_PROMPTS.bean_roasting_type', () => {
    describe('postProcess', () => {
      const postProcess = FIELD_PROMPTS['bean_roasting_type'].postProcess!;

      it('should return "FILTER" for case-insensitive match', () => {
        expect(postProcess('filter', '')).toBe('FILTER');
        expect(postProcess('FILTER', '')).toBe('FILTER');
        expect(postProcess('Filter', '')).toBe('FILTER');
      });

      it('should return "ESPRESSO" for case-insensitive match', () => {
        expect(postProcess('espresso', '')).toBe('ESPRESSO');
        expect(postProcess('ESPRESSO', '')).toBe('ESPRESSO');
      });

      it('should return "OMNI" for case-insensitive match', () => {
        expect(postProcess('omni', '')).toBe('OMNI');
        expect(postProcess('OMNI', '')).toBe('OMNI');
      });

      it('should return null for invalid values', () => {
        expect(postProcess('unknown', '')).toBeNull();
        expect(postProcess('light roast', '')).toBeNull();
      });
    });
  });

  describe('FIELD_PROMPTS.decaffeinated', () => {
    describe('postProcess', () => {
      const postProcess = FIELD_PROMPTS['decaffeinated'].postProcess!;

      it('should return true for "true" string', () => {
        expect(postProcess('true', '')).toBeTrue();
        expect(postProcess('TRUE', '')).toBeTrue();
      });

      it('should return false for "false" string', () => {
        expect(postProcess('false', '')).toBeFalse();
        expect(postProcess('FALSE', '')).toBeFalse();
      });

      it('should return null for other values', () => {
        expect(postProcess('yes', '')).toBeNull();
        expect(postProcess('decaf', '')).toBeNull();
        expect(postProcess('', '')).toBeNull();
      });
    });
  });

  describe('FIELD_PROMPTS.cupping_points', () => {
    describe('postProcess', () => {
      const postProcess = FIELD_PROMPTS['cupping_points'].postProcess!;

      it('should return null for scores below 80', () => {
        // WHY: SCA cupping scores range from 80-100; lower numbers are likely other data
        expect(postProcess('75', '75 points')).toBeNull();
        expect(postProcess('79', '79')).toBeNull();
      });

      it('should return null for scores 100 or above', () => {
        // WHY: Prevents confusion with weight (e.g., "100g" is not a cupping score)
        expect(postProcess('100', '100 score')).toBeNull();
        expect(postProcess('105', '105')).toBeNull();
      });

      it('should return null when score integer not in OCR text', () => {
        // WHY: Prevents LLM from hallucinating scores not present in original text
        expect(postProcess('88', 'Ethiopia Natural')).toBeNull();
      });

      it('should return value for valid scores between 80-99 present in OCR', () => {
        expect(postProcess('85', 'Score: 85 points')).toBe('85');
        expect(postProcess('88.5', 'SCA 88.5')).toBe('88.5');
        expect(postProcess('92', 'Cupping score 92')).toBe('92');
      });
    });
  });

  describe('FIELD_PROMPTS.roastingDate', () => {
    describe('postProcess', () => {
      const postProcess = FIELD_PROMPTS['roastingDate'].postProcess!;

      it('should return null for unparseable dates', () => {
        expect(postProcess('invalid date', '')).toBeNull();
        expect(postProcess('not a date', '')).toBeNull();
      });

      it('should return null for future dates', () => {
        // WHY: Date validation prevents expiration dates from being used as roast dates
        const futureDate = moment().add(1, 'month').format('YYYY-MM-DD');
        expect(postProcess(futureDate, '')).toBeNull();
      });

      it('should return null for dates older than one year', () => {
        // WHY: Roast dates older than 1 year are likely misread or expiration dates
        const oldDate = moment().subtract(2, 'years').format('YYYY-MM-DD');
        expect(postProcess(oldDate, '')).toBeNull();
      });

      it('should return ISO string for valid recent dates', () => {
        // Arrange
        const recentDate = moment().subtract(1, 'week').format('YYYY-MM-DD');

        // Act
        const result = postProcess(recentDate, '');

        // Assert - should return a valid moment format string
        expect(result).toBeTruthy();
        expect(moment(result).isValid()).toBeTrue();
      });

      it('should handle ISO date format (YYYY-MM-DD)', () => {
        // Arrange - date about 2 weeks ago
        const testDate = moment().subtract(2, 'weeks');

        // Act
        const result = postProcess(testDate.format('YYYY-MM-DD'), '');

        // Assert
        expect(result).toBeTruthy();
        expect(moment(result).isValid()).toBeTrue();
      });
    });
  });

  describe('FIELD_PROMPTS.elevation', () => {
    describe('postProcess', () => {
      const postProcess = FIELD_PROMPTS['elevation'].postProcess!;

      it('should remove linebreaks from value', () => {
        expect(postProcess('1800\nMASL', '')).toBe('1800 MASL');
      });

      it('should remove thousand separators (dots and commas)', () => {
        expect(postProcess('1.800 MASL', '')).toBe('1800 MASL');
        expect(postProcess('1,800 MASL', '')).toBe('1800 MASL');
      });

      it('should normalize "2300 MASL 2400 MASL" to "2300-2400 MASL" format', () => {
        expect(postProcess('2300 MASL 2400 MASL', '')).toBe('2300-2400 MASL');
      });

      it('should return null for empty string after cleanup', () => {
        expect(postProcess('', '')).toBeNull();
        expect(postProcess('   ', '')).toBeNull();
      });

      it('should return null when any number is >= 5000', () => {
        // WHY: Filters variety numbers like 74158 from being misread as altitude
        expect(postProcess('74158 MASL', '')).toBeNull();
        expect(postProcess('1800-5000 MASL', '')).toBeNull();
      });

      it('should return cleaned value for valid elevations', () => {
        expect(postProcess('1850 MASL', '')).toBe('1850 MASL');
        expect(postProcess('1700-1900 MASL', '')).toBe('1700-1900 MASL');
      });
    });
  });

  describe('FIELD_PROMPTS.region', () => {
    describe('postProcess', () => {
      const postProcess = FIELD_PROMPTS['region'].postProcess!;

      it('should remove "Region" suffix from value (case-insensitive)', () => {
        expect(postProcess('Yirgacheffe Region', '')).toBe('Yirgacheffe');
        expect(postProcess('Sidamo REGION', '')).toBe('Sidamo');
      });

      it('should remove "Region" prefix from value (case-insensitive)', () => {
        expect(postProcess('Region Yirgacheffe', '')).toBe('Yirgacheffe');
        expect(postProcess('region Sidamo', '')).toBe('Sidamo');
      });

      it('should trim result after removal', () => {
        expect(postProcess('  Yirgacheffe Region  ', '')).toBe('Yirgacheffe');
      });
    });
  });

  describe('FIELD_PROMPTS.name_and_roaster', () => {
    it('should have promptTemplate with required placeholders', () => {
      // Arrange
      const config = FIELD_PROMPTS['name_and_roaster'];

      // Assert
      expect(config.promptTemplate).toContain('{{LANGUAGES}}');
      expect(config.promptTemplate).toContain('{{OCR_TEXT}}');
      expect(config.promptTemplate).toContain('{{ROASTER_KEYWORDS}}');
    });
  });
});
