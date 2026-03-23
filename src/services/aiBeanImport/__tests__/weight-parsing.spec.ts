import { parseWeightToGrams } from '../weight-parsing';

describe('parseWeightToGrams', () => {
  it('parses grams: "250g" → 250', () => {
    expect(parseWeightToGrams('250g')).toBe(250);
  });

  it('parses kilograms: "1.5 kg" → 1500', () => {
    expect(parseWeightToGrams('1.5 kg')).toBe(1500);
  });

  it('parses ounces: "8oz" → 227', () => {
    expect(parseWeightToGrams('8oz')).toBe(227);
  });

  it('returns null for bare number: "250"', () => {
    expect(parseWeightToGrams('250')).toBeNull();
  });

  it('handles comma decimal: "1,5kg" → 1500', () => {
    expect(parseWeightToGrams('1,5kg')).toBe(1500);
  });

  it('returns null for empty string', () => {
    expect(parseWeightToGrams('')).toBeNull();
  });

  it('returns null for word numbers: "twelve ounces"', () => {
    expect(parseWeightToGrams('twelve ounces')).toBeNull();
  });

  it('extracts weight from multi-pack: "2 x 250g" → 250', () => {
    expect(parseWeightToGrams('2 x 250g')).toBe(250);
  });

  it('parses pounds: "0.5lb" → 227', () => {
    expect(parseWeightToGrams('0.5lb')).toBe(227);
  });

  it('parses pound word: "1 pound" → 454', () => {
    expect(parseWeightToGrams('1 pound')).toBe(454);
  });
});
