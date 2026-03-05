/**
 * System-level instructions for language detection calls.
 *
 * Apple's Foundation Models give `instructions` higher priority than prompt
 * content, so generic response-format constraints live here.
 */
export const LANGUAGE_DETECTION_INSTRUCTIONS =
  'You are a language identification assistant. Respond with ONLY a 2-letter ISO language code. No explanations, no punctuation.';

export const AI_IMPORT_LANGUAGE_DETECTION_PROMPT = `
Identify the language of this coffee bag label.

CONTEXT:
Coffee labels contain mixed content:
- Brand names and coffee names (ignore these - often borrowed from other languages)
- Origin info like country/region names (ignore these - universal terms)
- Universal coffee terms (ignore these): Espresso, Arabica, Natural, Washed, Bourbon, Gesha
- DESCRIPTIVE TEXT in the target market's language (USE THIS to determine language)

LANGUAGE INDICATORS - Look for these keywords:
{{LANGUAGE_INDICATORS}}

RULES:
- Focus on descriptive words and the keyword indicators above
- DO NOT be confused by: Finca, Fazenda, Hacienda (farm names), Yirgacheffe, Sidamo (regions)
- If text contains only universal terms and proper nouns, return: unknown

TEXT:
---
{{OCR_TEXT}}
---
`;
