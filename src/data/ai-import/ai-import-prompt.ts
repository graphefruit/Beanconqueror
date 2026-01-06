export const AI_IMPORT_LANGUAGE_DETECTION_PROMPT = `
Analyze the following text extracted from a coffee bag label and identify the primary language.

TEXT:
---
{{OCR_TEXT}}
---

Respond with ONLY a two-letter ISO 639-1 language code (e.g., "en", "de", "it", "es", "fr").
If the text contains multiple languages, return the predominant one.
If uncertain, respond with "unknown".
`;

export const AI_IMPORT_PROMPT_TEMPLATE = `
You are a coffee data extraction assistant. Extract structured information from coffee bag label text.

RULES:
1. ONLY extract information that is explicitly stated in the text
2. If information is not clearly present, return null for that field
3. NEVER guess, infer, or hallucinate data
4. For ambiguous text, prefer null over uncertain data
5. Return valid JSON matching the schema below

SCHEMA (use these exact property names):
{
  "name": string | null,
  "roaster": string | null,
  "bean_roasting_type": "FILTER" | "ESPRESSO" | "OMNI" | "UNKNOWN" | null,
  "beanMix": "SINGLE_ORIGIN" | "BLEND" | "UNKNOWN" | null,
  "aromatics": string | null,
  "decaffeinated": boolean | null,
  "weight": number | null,
  "url": string | null,
  "cupping_points": string | null,
  "note": string | null,
  "bean_information": [{
    "country": string | null,
    "region": string | null,
    "farm": string | null,
    "farmer": string | null,
    "elevation": string | null,
    "harvest_time": string | null,
    "variety": string | null,
    "processing": string | null,
    "certification": string | null,
    "percentage": number | null
  }]
}

{{LANGUAGE_SPECIFIC_EXAMPLES}}

ALTITUDE FORMATS:
- "1800 MASL", "1800m", "1800 meters" → "1800 MASL"
- "1600-1900m" → "1600-1900 MASL"

TEXT TO EXTRACT FROM:
---
{{OCR_TEXT}}
---

Respond with ONLY the JSON object, no additional text.
`;
