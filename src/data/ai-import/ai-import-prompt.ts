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
- If text contains only universal terms and proper nouns, respond: unknown

TEXT:
---
{{OCR_TEXT}}
---

Language code (2 letters only):
`;

export const AI_IMPORT_PROMPT_TEMPLATE = `
You are a coffee data extraction assistant. Extract structured information from coffee bag label text.

CRITICAL RULES - NEVER VIOLATE:
- ONLY extract information EXPLICITLY written in the text
- Return null for ANY field not clearly present
- DO NOT guess, infer, or make assumptions
- NEVER hallucinate or fabricate data
- NEVER return "UNKNOWN" as a value - ALWAYS use null instead
- When uncertain, ALWAYS return null

SINGLE ORIGIN vs BLEND CLASSIFICATION:
- SINGLE_ORIGIN: One country mentioned, "Field Blend" (exception!), or large region + specific country (e.g., "Africa, Ethiopia, Guji")
- BLEND: Multiple countries, "House Blend"/"Espresso Blend"/etc., or large region alone (e.g., just "Africa")
- "Blend" IS usually a blend indicator, EXCEPT "Field Blend" = SINGLE_ORIGIN

TEXT NORMALIZATION:
- Convert ALL CAPS to Title Case (e.g., "FINCA EL PARAÍSO" → "Finca El Paraíso")
- Convert processing methods to Title Case (e.g., "WASHED" → "Washed")

ALTITUDE NORMALIZATION:
- Remove commas and periods from numbers (e.g., "1.850m" → "1850 MASL", "1,900m" → "1900 MASL")
- Normalize format to number + "MASL" (e.g., "1850 m.ü.M." → "1850 MASL")
- For ranges use hyphen: "1.700-1.900m" → "1700-1900 MASL"

FARM IDENTIFICATION (extract to "farm" field):
- "Finca", "Hacienda" (Spanish) = farm/estate
- "Fazenda" (Portuguese/Brazil) = farm
- Washing stations, wet mills, dry mills (common in Ethiopia, Kenya, Rwanda)
- Cooperatives that process coffee
- Estate names

FARMER/PRODUCER IDENTIFICATION (extract to "farmer" field):
- Individual names (look for Spanish, Ethiopian, Kenyan names)
- Family operations ("Family", "Brothers", "Hermanos")
- Collectives ("Cooperative", "Coop", "Association", "Smallholders")
- Labels like "Produced by", "Grown by", "Producer:", "Farmer:"

SCHEMA (NEVER use "UNKNOWN" - use null instead):
{
  "name": string | null,
  "roaster": string | null,
  "bean_roasting_type": "FILTER" | "ESPRESSO" | "OMNI" | null,
  "beanMix": "SINGLE_ORIGIN" | "BLEND" | null,
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

LABEL TEXT:
---
{{OCR_TEXT}}
---

Respond with ONLY the JSON. NO explanations.
`;
