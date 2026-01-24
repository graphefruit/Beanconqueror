import moment from 'moment';
import { FIELD_PROMPTS } from './ai-field-prompts';

describe('ai-field-prompts', () => {
  describe('roastingDate postProcess', () => {
    const postProcess = FIELD_PROMPTS.roastingDate.postProcess!;

    it('should return local timezone format (not UTC)', () => {
      // Use a date from 3 months ago to be within valid range
      const testDate = moment().subtract(3, 'months').format('YYYY-MM-DD');
      const result = postProcess(testDate, '');
      expect(result).toBeTruthy();
      // Should use moment().format() which includes timezone offset
      // e.g., "2025-10-15T00:00:00+02:00" not "2025-10-15T00:00:00.000Z"
      expect(result).not.toMatch(/\.000Z$/);
    });

    it('should parse ISO date format', () => {
      // Use date from 3 months ago - prompt requests ISO format (YYYY-MM-DD)
      const threeMonthsAgo = moment().subtract(3, 'months');
      const isoDate = threeMonthsAgo.format('YYYY-MM-DD');

      expect(postProcess(isoDate, '')).toBeTruthy();
    });

    it('should reject invalid dates', () => {
      expect(postProcess('not-a-date', '')).toBeNull();
      expect(postProcess('', '')).toBeNull();
    });

    it('should reject future dates', () => {
      const futureDate = moment().add(1, 'month').format('YYYY-MM-DD');
      expect(postProcess(futureDate, '')).toBeNull();
    });

    it('should reject dates older than 1 year', () => {
      const oldDate = moment().subtract(2, 'years').format('YYYY-MM-DD');
      expect(postProcess(oldDate, '')).toBeNull();
    });

    it('should accept dates within the last year', () => {
      const recentDate = moment().subtract(3, 'months').format('YYYY-MM-DD');
      expect(postProcess(recentDate, '')).toBeTruthy();
    });

    it('should preserve date without timezone shift', () => {
      // Use a date from 3 months ago to be within valid range
      const threeMonthsAgo = moment().subtract(3, 'months');
      const inputDate = threeMonthsAgo.format('YYYY-MM-DD');
      const result = postProcess(inputDate, '');
      expect(result).toBeTruthy();
      const parsedResult = moment(result);
      expect(parsedResult.date()).toBe(threeMonthsAgo.date());
      expect(parsedResult.month()).toBe(threeMonthsAgo.month());
      expect(parsedResult.year()).toBe(threeMonthsAgo.year());
    });
  });

  describe('weight postProcess', () => {
    const postProcess = FIELD_PROMPTS.weight.postProcess!;

    it('should accept weight when number matches OCR exactly', () => {
      expect(postProcess('250g', '250g coffee')).toBe('250g');
      expect(postProcess('1000g', '1000g premium')).toBe('1000g');
    });

    it('should accept weight with thousand separator when OCR is normalized', () => {
      // LLM returns "1.000g" but OCR was normalized to "1000g"
      expect(postProcess('1.000g', '1000g coffee')).toBe('1.000g');
      // Same with comma separator
      expect(postProcess('1,000g', '1000g coffee')).toBe('1,000g');
    });

    it('should accept weight when OCR contains the number', () => {
      expect(postProcess('250g', 'Premium Coffee 250g Arabica')).toBe('250g');
    });

    it('should accept decimal weights', () => {
      expect(postProcess('0.5kg', '0.5kg roasted')).toBe('0.5kg');
      expect(postProcess('1.5kg', '1.5kg beans')).toBe('1.5kg');
    });

    it('should reject hallucinated weights not in OCR', () => {
      // 500g doesn't appear anywhere in the OCR text
      expect(postProcess('500g', '250g premium coffee')).toBeNull();
    });

    it('should reject when no number found', () => {
      expect(postProcess('grams', '250g')).toBeNull();
      expect(postProcess('kg', '1kg')).toBeNull();
    });

    it('should handle partial digit matches in larger numbers', () => {
      // "250" is contained in "2500"
      expect(postProcess('250g', '2500g bulk')).toBe('250g');
    });

    it('should handle multiple numbers in OCR text', () => {
      expect(
        postProcess('250g', 'Score 85 Weight 250g Altitude 1850m'),
      ).toBe('250g');
    });
  });
});
