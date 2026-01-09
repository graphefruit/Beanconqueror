import { MergedExamples } from '../../services/aiBeanImport/ai-import-examples.service';

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

  originCount: {
    field: 'originCount',
    promptTemplate: `How many different coffee origins are in this blend?

Count the number of distinct countries mentioned.
Examples:
- "Ethiopia + Brazil" = 2
- "60% Colombia, 40% Guatemala" = 2
- "House Blend" (no countries) = 1 (assume single origin components)

RESPONSE FORMAT:
- Return ONLY a number (1, 2, 3, etc.) or NOT_FOUND
- Do NOT include explanations or sentences

TEXT (languages in order of likelihood: {{LANGUAGES}}):
{{OCR_TEXT}}`,
    validation: /^\d+$/,
    postProcess: (v) => parseInt(v, 10) || 1,
  },

  // Top-level fields
  name: {
    field: 'name',
    promptTemplate: `What is the coffee name?

Look for the most prominent/distinctive text - often a place name, farm name, or descriptive title.
Convert ALL CAPS to Title Case.

RESPONSE FORMAT:
- Return ONLY the name, nothing else
- If not found, return exactly: NOT_FOUND
- Do NOT include explanations or sentences

TEXT (languages in order of likelihood: {{LANGUAGES}}):
{{OCR_TEXT}}`,
  },

  roaster: {
    field: 'roaster',
    promptTemplate: `What company roasted this coffee?

Look for roaster names, often at bottom of label or with "roasted by", company logos.
Convert ALL CAPS to Title Case.

RESPONSE FORMAT:
- Return ONLY the roaster/company name, nothing else
- If not found, return exactly: NOT_FOUND
- Do NOT include explanations or sentences

TEXT (languages in order of likelihood: {{LANGUAGES}}):
{{OCR_TEXT}}`,
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

RECOGNITION HINTS:
- "Finca", "Hacienda" (Spanish) = farm/estate
- "Fazenda" (Portuguese) = farm
- "Washing Station", "Wet Mill" (common in Ethiopia, Kenya, Rwanda)
- Cooperative names that process coffee

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

/**
 * List of top-level bean fields (not in bean_information array).
 */
export const TOP_LEVEL_FIELDS = [
  'name',
  'roaster',
  'weight',
  'bean_roasting_type',
  'aromatics',
  'decaffeinated',
  'cupping_points',
];

/**
 * List of origin/bean_information fields.
 */
export const ORIGIN_FIELDS = [
  'country',
  'region',
  'variety',
  'processing',
  'elevation',
  'farm',
  'farmer',
];

/**
 * Fields that should always be extracted regardless of user settings.
 */
export const ESSENTIAL_FIELDS = ['name', 'country', 'weight'];
