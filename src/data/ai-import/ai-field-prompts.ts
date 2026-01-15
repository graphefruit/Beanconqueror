import moment from 'moment';
import { MergedExamples } from '../../services/aiBeanImport/ai-import-examples.service';

/**
 * Prompt for extracting all origin attributes from a BLEND in one call.
 *
 * Key difference from single-origin extraction:
 * - "Arabica" IS accepted as a variety for blends (useful for Arabica/Robusta blends)
 * - Single-origin prompt excludes "Arabica alone" as too generic, but for blends
 *   it provides meaningful distinction between blend components
 */
export const BLEND_ORIGINS_PROMPT_TEMPLATE = `
Extract origin information for this coffee BLEND.

CRITICAL RULES - NEVER VIOLATE:
- ONLY extract information EXPLICITLY written in the text
- Return null for ANY field not clearly present
- DO NOT guess, infer, or make assumptions
- NEVER hallucinate or fabricate data
- When uncertain, ALWAYS return null

For each blend component found, extract ONLY what is explicitly stated:
- country: The origin country (if identifiable)
- region: The specific region ONLY if explicitly written
- variety: The coffee variety/cultivar ONLY if explicitly stated
- processing: Processing method ONLY if explicitly stated
- elevation: Altitude ONLY if explicitly written (format: "XXXX MASL")
- farm: Farm/estate/washing station name ONLY if present
- farmer: Producer/farmer name ONLY if present
- percentage: Blend percentage ONLY if explicitly stated (e.g., "n%")

TERMINOLOGY (for recognition only - do NOT use to fill missing data):
Countries: {{ORIGINS}}
Varieties: {{VARIETIES}}
Processing: {{PROCESSING_METHODS}}

RESPONSE FORMAT:
Return a JSON array with one object per blend component.
Use null for any field not explicitly found.
Return at least one origin object, even if all fields are null.

Schema:
[
  {
    "country": string | null,
    "region": string | null,
    "variety": string | null,
    "processing": string | null,
    "elevation": string | null,
    "farm": string | null,
    "farmer": string | null,
    "percentage": number | null
  }
]

TEXT (languages: {{LANGUAGES}}):
{{OCR_TEXT}}

Respond with ONLY the JSON array. NO explanations.
`;

/**
 * Configuration for a field extraction prompt.
 */
export interface FieldPromptConfig {
  /** Field name in Bean/IBeanInformation */
  field: string;
  /** Prompt template with placeholders */
  promptTemplate: string;
  /** i18n example key(s) to include */
  examplesKeys?: (keyof MergedExamples)[];
  /** Validation regex pattern */
  validation?: RegExp;
  /** Post-processing function */
  postProcess?: (value: string) => any;
}

/**
 * All field prompt configurations.
 */
export const FIELD_PROMPTS: Record<string, FieldPromptConfig> = {
  // Structure detection
  beanMix: {
    field: 'beanMix',
    promptTemplate: `Is this coffee a single origin or a blend?

SINGLE ORIGIN indicators: {{SINGLE_ORIGIN_KEYWORDS}}
BLEND indicators: {{BLEND_KEYWORDS}}

RULES:
- SINGLE_ORIGIN: One country mentioned, or "Field Blend" (varieties from same farm)
- BLEND: Multiple different countries, or "House Blend", "Espresso Blend"
- EXCEPTION: "Field Blend" = SINGLE_ORIGIN (not a blend!)

RESPONSE FORMAT:
- Return ONLY one of: SINGLE_ORIGIN, BLEND, NOT_FOUND
- Do NOT include explanations or sentences
- If uncertain, return: NOT_FOUND

TEXT (languages in order of likelihood: {{LANGUAGES}}):
{{OCR_TEXT}}`,
    examplesKeys: ['SINGLE_ORIGIN_KEYWORDS', 'BLEND_KEYWORDS'],
    validation: /^(SINGLE_ORIGIN|BLEND)$/i,
    postProcess: (v) => {
      const upper = v.toUpperCase();
      if (upper === 'SINGLE_ORIGIN' || upper === 'BLEND') {
        return upper;
      }
      return null;
    },
  },

  // Top-level fields
  name: {
    field: 'name',
    promptTemplate: `What is the coffee name?

LAYOUT HINTS (text is annotated with **SIZE:** tags):
- The coffee name is usually the **LARGE:** text
- If multiple large texts: the one that is NOT a company name is the coffee name

DISTINGUISHING COFFEE NAME FROM ROASTER:
- Coffee name: Place name, farm name, or descriptive title
- Roaster: Company/brand with suffixes: {{ROASTER_KEYWORDS}}

Convert ALL CAPS to Title Case.

RESPONSE FORMAT:
- Return ONLY the name, nothing else
- If not found, return exactly: NOT_FOUND
- Do NOT include explanations or sentences

TEXT (languages in order of likelihood: {{LANGUAGES}}):
{{OCR_TEXT}}`,
    examplesKeys: ['ROASTER_KEYWORDS'],
  },

  roaster: {
    field: 'roaster',
    promptTemplate: `What company roasted this coffee?

LAYOUT HINTS (text is annotated with **SIZE:** tags):
- Roaster can be any size (**LARGE:**, **MEDIUM:**, or **SMALL:**)
- Size alone does NOT indicate roaster vs coffee name

IDENTIFYING THE ROASTER:
- Look for company suffixes: {{ROASTER_KEYWORDS}}

Convert ALL CAPS to Title Case.

RESPONSE FORMAT:
- Return ONLY the roaster/company name, nothing else
- If not found, return exactly: NOT_FOUND
- Do NOT include explanations or sentences

TEXT (languages in order of likelihood: {{LANGUAGES}}):
{{OCR_TEXT}}`,
    examplesKeys: ['ROASTER_KEYWORDS'],
  },

  weight: {
    field: 'weight',
    promptTemplate: `What is the package weight?

Look for weight indicators like "250g", "1kg", "12oz", "1lb".

RESPONSE FORMAT:
- Return ONLY the number and unit as written (e.g., "250g", "12oz", "1kg")
- If not found, return exactly: NOT_FOUND
- Do NOT include explanations or sentences

TEXT (languages in order of likelihood: {{LANGUAGES}}):
{{OCR_TEXT}}`,
    validation: /^\d+(?:[.,]\d+)?\s*(?:g|kg|oz|lb)/i,
  },

  bean_roasting_type: {
    field: 'bean_roasting_type',
    promptTemplate: `What roast type is this coffee intended for?

FILTER indicators: {{ROASTING_TYPE_FILTER_KEYWORDS}}
ESPRESSO indicators: {{ROASTING_TYPE_ESPRESSO_KEYWORDS}}
OMNI indicators: {{ROASTING_TYPE_OMNI_KEYWORDS}}

RESPONSE FORMAT:
- Return ONLY one of: FILTER, ESPRESSO, OMNI, NOT_FOUND
- Do NOT include explanations or sentences
- If uncertain, return: NOT_FOUND

TEXT (languages in order of likelihood: {{LANGUAGES}}):
{{OCR_TEXT}}`,
    examplesKeys: [
      'ROASTING_TYPE_FILTER_KEYWORDS',
      'ROASTING_TYPE_ESPRESSO_KEYWORDS',
      'ROASTING_TYPE_OMNI_KEYWORDS',
    ],
    validation: /^(FILTER|ESPRESSO|OMNI)$/i,
    postProcess: (v) => {
      const upper = v.toUpperCase();
      if (upper === 'FILTER' || upper === 'ESPRESSO' || upper === 'OMNI') {
        return upper;
      }
      return null;
    },
  },

  aromatics: {
    field: 'aromatics',
    promptTemplate: `What flavor/tasting notes are listed?

Look for descriptors like fruits, chocolate, nuts, floral notes.
Extract the flavor words as written on the label.

RESPONSE FORMAT:
- Return ONLY comma-separated flavor notes, nothing else
- If not found, return exactly: NOT_FOUND
- Do NOT include explanations or sentences

TEXT (languages in order of likelihood: {{LANGUAGES}}):
{{OCR_TEXT}}`,
  },

  decaffeinated: {
    field: 'decaffeinated',
    promptTemplate: `Is this coffee decaffeinated?

DECAF indicators: {{DECAF_KEYWORDS}}

RESPONSE FORMAT:
- Return ONLY one of: true, false, NOT_FOUND
- Do NOT include explanations or sentences
- If no decaf indicator found, return: NOT_FOUND
- Only return "true" if you see an explicit decaf indicator

TEXT (languages in order of likelihood: {{LANGUAGES}}):
{{OCR_TEXT}}`,
    examplesKeys: ['DECAF_KEYWORDS'],
    validation: /^(true|false)$/i,
    postProcess: (v) => {
      const lower = v.toLowerCase();
      if (lower === 'true') {
        return true;
      }
      if (lower === 'false') {
        return false;
      }
      return null;
    },
  },

  cupping_points: {
    field: 'cupping_points',
    promptTemplate: `What is the SCA cupping score or quality score?

Look for: numbers between 80-99, often labeled as "SCA", "Score", "Points", "Cupping Score", "Quality Score".

IMPORTANT: Do NOT confuse with weight (e.g., "100g" is weight, not a score).

RESPONSE FORMAT:
- Return ONLY a found number between 80 and 99 and NOT_FOUND for other or no numbers at all
- If no number is found, you MUST return exactly: NOT_FOUND
- You MUST NOT return any number if there is none
- Do NOT include explanations or sentences

TEXT (languages in order of likelihood: {{LANGUAGES}}):
{{OCR_TEXT}}`,
    validation: /^\d+(?:[.,]\d+)?$/,
    postProcess: (v) => {
      const num = parseFloat(v.replace(',', '.'));
      if (num >= 80 && num < 100) {
        return v;
      }
      return null;
    },
  },

  roastingDate: {
    field: 'roastingDate',
    promptTemplate: `What is the roast date of this coffee?

ROAST DATE indicators:
{{ROASTDATE_KEYWORDS}}

DATE FORMAT RECOGNITION:
- European format: DD.MM.YYYY
- ISO format: YYYY-MM-DD
- American format: MM/DD/YYYY
- Written format with month names
- Short year: DD.MM.YY

IMPORTANT:
- Look for dates near roast-related keywords
- Dates labeled "best before", "use by", or "expiration" are NOT roast dates

RESPONSE FORMAT:
- Convert the date to ISO format: YYYY-MM-DD
- Return ONLY the date as written on the label
- If not found, return exactly: NOT_FOUND
- Do NOT include explanations or sentences
- EXCLUDE any prefixes

TEXT (languages: {{LANGUAGES}}):
{{OCR_TEXT}}`,
    examplesKeys: ['ROASTDATE_KEYWORDS'],
    postProcess: (v) => {
      // Try to parse with moment's flexible parsing
      const parsed = moment(v);
      if (!parsed.isValid()) {
        return null;
      }

      const now = moment();
      const oneYearAgo = moment().subtract(1, 'year');

      // Reject future dates
      if (parsed.isAfter(now)) {
        return null;
      }

      // Reject dates older than 1 year (likely misread)
      if (parsed.isBefore(oneYearAgo)) {
        return null;
      }

      // Return as ISO string for storage
      return parsed.toISOString();
    },
  },

  // Origin fields
  country: {
    field: 'country',
    promptTemplate: `What country is this coffee from?

COMMON ORIGINS (may appear in different languages):
{{ORIGINS}}

Extract the country name as written on the label.
Extract country even if not in the common list above.

RESPONSE FORMAT:
- Return ONLY the country name, nothing else
- If not found, return exactly: NOT_FOUND
- Do NOT include explanations or sentences

TEXT (languages in order of likelihood: {{LANGUAGES}}):
{{OCR_TEXT}}`,
    examplesKeys: ['ORIGINS'],
  },

  region: {
    field: 'region',
    promptTemplate: `What region or area within the country is mentioned?

CRITICAL: Only extract text that ACTUALLY APPEARS in the label below.
DO NOT guess or infer regions based on country name alone.
DO NOT make up region names.

Look for: province names, growing regions, districts, departments.

RESPONSE FORMAT:
- Return ONLY the region name as written on the label, nothing else
- If not found, return exactly: NOT_FOUND
- Do NOT include explanations or sentences

TEXT (languages in order of likelihood: {{LANGUAGES}}):
{{OCR_TEXT}}`,
  },

  variety: {
    field: 'variety',
    promptTemplate: `What coffee variety or cultivar is mentioned?

COMMON VARIETIES (may have spelling variations):
{{VARIETIES}}

NOTE: "Arabica" alone is too generic - look for specific variety names.
Multiple varieties: separate with comma.

RESPONSE FORMAT:
- Return ONLY the variety name(s), nothing else
- If not found, return exactly: NOT_FOUND
- Do NOT include explanations or sentences

TEXT (languages in order of likelihood: {{LANGUAGES}}):
{{OCR_TEXT}}`,
    examplesKeys: ['VARIETIES'],
  },

  processing: {
    field: 'processing',
    promptTemplate: `What processing method was used?

COMMON PROCESSING METHODS:
{{PROCESSING_METHODS}}

Extract the processing method as written on the label.
Extract even if not in common list - experimental methods are valid.

RESPONSE FORMAT:
- Return ONLY the processing method, nothing else
- If not found, return exactly: NOT_FOUND
- Do NOT include explanations or sentences

TEXT (languages in order of likelihood: {{LANGUAGES}}):
{{OCR_TEXT}}`,
    examplesKeys: ['PROCESSING_METHODS'],
  },

  elevation: {
    field: 'elevation',
    promptTemplate: `What is the growing elevation/altitude?

CRITICAL: Only extract altitude numbers that ACTUALLY APPEAR in the label below.
DO NOT guess typical elevations for a country or region.
DO NOT make up altitude values.

FORMAT RULES (only if altitude number is found):
- Return as "XXXX MASL" format
- Remove thousand separators
- Convert: "m", "m.ü.M.", "meters", "msnm" all become "MASL"

RESPONSE FORMAT:
- Return ONLY elevation in MASL format, nothing else
- If not found, return exactly: NOT_FOUND
- Do NOT include explanations or sentences

TEXT (languages in order of likelihood: {{LANGUAGES}}):
{{OCR_TEXT}}`,
    // No validation - postProcess handles cleanup of weird formatting
    postProcess: (v) => {
      let cleaned = v
        // Remove linebreaks
        .replace(/[\r\n]+/g, ' ')
        // Remove points and commas (thousand separators)
        .replace(/[.,]/g, '')
        // Convert "2300 MASL 2400 MASL" to "2300-2400 MASL" (spaces optional)
        .replace(/(\d+)\s*MASL\s*(\d+)\s*MASL/gi, '$1-$2 MASL')
        // Clean up extra whitespace
        .replace(/\s+/g, ' ')
        .trim();

      // Return null if empty after cleanup
      if (!cleaned || cleaned.length === 0) {
        return null;
      }

      // Validate elevation is reasonable (< 5000m) - filters out variety numbers like 74158
      // Check all numbers in the string (handles ranges like "1700-1900 MASL")
      const allNumbers = cleaned.match(/\d+/g);
      if (allNumbers) {
        for (const numStr of allNumbers) {
          const num = parseInt(numStr, 10);
          if (num >= 5000) {
            return null;
          }
        }
      }

      return cleaned;
    },
  },

  farm: {
    field: 'farm',
    promptTemplate: `What is the farm, estate, or washing station name?

KEYWORDS (may be part of the farm name):
Finca, Hacienda, Fazenda, Washing Station, Wet Mill

RESPONSE FORMAT:
- Return ONLY the farm/station name, nothing else
- If not found, return exactly: NOT_FOUND
- Do NOT include explanations or sentences

TEXT (languages in order of likelihood: {{LANGUAGES}}):
{{OCR_TEXT}}`,
  },

  farmer: {
    field: 'farmer',
    promptTemplate: `Who is the producer/farmer?

PRODUCER LABEL INDICATORS (may appear in different languages):
{{PRODUCER_KEYWORDS}}

Look for individual names, family names, or collective/cooperative names.

RESPONSE FORMAT:
- Return ONLY the producer/farmer name, nothing else
- If not found, return exactly: NOT_FOUND
- Do NOT include explanations or sentences

TEXT (languages in order of likelihood: {{LANGUAGES}}):
{{OCR_TEXT}}`,
    examplesKeys: ['PRODUCER_KEYWORDS'],
  },
};

/**
 * Get the prompt template for a field with examples substituted.
 */
export function buildFieldPrompt(
  fieldName: string,
  ocrText: string,
  examples: MergedExamples,
  languages: string[],
): string {
  const config = FIELD_PROMPTS[fieldName];
  if (!config) {
    throw new Error(`Unknown field: ${fieldName}`);
  }

  let prompt = config.promptTemplate;

  // Replace example placeholders
  if (config.examplesKeys) {
    for (const key of config.examplesKeys) {
      const placeholder = `{{${key}}}`;
      const value = examples[key] || '';
      prompt = prompt.replace(placeholder, value);
    }
  }

  // Replace all example key placeholders (even if not in examplesKeys)
  for (const key of Object.keys(examples) as (keyof MergedExamples)[]) {
    const placeholder = `{{${key}}}`;
    if (prompt.includes(placeholder)) {
      prompt = prompt.replace(placeholder, examples[key] || '');
    }
  }

  // Replace languages placeholder (ISO format)
  prompt = prompt.replace('{{LANGUAGES}}', languages.join(', '));

  // Replace OCR text placeholder
  prompt = prompt.replace('{{OCR_TEXT}}', ocrText);

  return prompt;
}

