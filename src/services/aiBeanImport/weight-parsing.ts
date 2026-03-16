/**
 * Shared weight-string-to-grams conversion for cloud and text-normalization services.
 */
export function parseWeightToGrams(weightStr: string): number | null {
  const str = weightStr.toLowerCase().trim();
  const patterns: [RegExp, number][] = [
    [/(\d+(?:[.,]\d+)?)\s*(?:kg|kilo(?:gram)?s?)\b/, 1000],
    [/(\d+(?:[.,]\d+)?)\s*(?:oz|ounces?)\b/, 28.3495],
    [/(\d+(?:[.,]\d+)?)\s*(?:lb|lbs?|pounds?)\b/, 453.592],
    [/(\d+(?:[.,]\d+)?)\s*g(?:rams?)?\b/, 1],
  ];
  for (const [pattern, factor] of patterns) {
    const match = pattern.exec(str);
    if (match) {
      return Math.round(parseFloat(match[1].replace(',', '.')) * factor);
    }
  }
  return null;
}
