export const AI_IMPORT_LANGUAGE_DETECTION_PROMPT = `
Identify the language of this coffee bag label.

CONTEXT:
Coffee labels contain mixed content:
- Brand names and coffee names (ignore these - often borrowed from other languages)
- Origin info like country/region names (ignore these - universal terms)
- Universal coffee terms (ignore these): Espresso, Arabica, Natural, Washed, Bourbon, Gesha
- DESCRIPTIVE TEXT in the target market's language (USE THIS to determine language)

LANGUAGE INDICATORS - Look for these keywords:
- GERMAN: Aufbereitung, Röstung, Herkunft, geröstet, Geschmack, Säure, Bohnen, frisch
- FRENCH: torréfié, origine, récolte, acidité, grains, saveur, fraîchement
- ITALIAN: tostato, raccolto, acidità, chicchi, sapore, fresco
- SPANISH: tostado, cosecha, acidez, granos, sabor, tueste
- PORTUGUESE: torrado, colheita, acidez, grãos, sabor, torra
- ENGLISH: roasted, harvest, acidity, beans, flavor, freshly

EXAMPLES:
"Röstfrisch, Herkunft: Äthiopien, Aufbereitung: gewaschen" → de
"Torréfié artisanalement, origine unique, notes florales" → fr
"Caffè tostato fresco, acidità vivace, gusto intenso" → it
"Tueste artesanal, origen único, notas de chocolate" → es
"Freshly roasted, single origin, tasting notes: berry, citrus" → en
"Café torrado na hora, origem única, notas frutadas" → pt

RULES:
- Focus on descriptive words and the keyword indicators above
- DO NOT be confused by: Finca, Fazenda, Hacienda (farm names), Yirgacheffe, Sidamo (regions)

RESPONSE FORMAT:
- Return ONLY a 2-letter ISO language code (de, fr, it, es, pt, en, etc.)
- Do NOT include explanations or sentences
- Do NOT include punctuation
- If text contains only universal terms and proper nouns, return exactly: unknown

TEXT:
---
{{OCR_TEXT}}
---
`;
