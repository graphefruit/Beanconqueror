// System-level instructions for cloud bean extraction calls.
// Kept separate from the extraction prompt so providers that support
// a dedicated system/instructions slot can use it for higher priority.
export const CLOUD_BEAN_IMPORT_SYSTEM_INSTRUCTIONS = `You are a coffee label data extractor. You extract structured data from OCR text captured from coffee bean bag labels.

CRITICAL RULES — NEVER VIOLATE:
- ONLY extract information EXPLICITLY written in the text.
- Return "NOT_FOUND" for ANY field not clearly present in the text.
- DO NOT guess, infer, or make assumptions.
- NEVER hallucinate or fabricate data.
- When uncertain, ALWAYS return "NOT_FOUND".
- Normalize ALL CAPS text to Title Case (e.g., "ETHIOPIA YIRGACHEFFE" → "Ethiopia Yirgacheffe").
- Respond with ONLY valid JSON. No explanations, no markdown, no extra text.`;

/**
 * Build the full extraction prompt for a cloud model.
 *
 * @param ocrText - OCR text from the coffee bag label, optionally annotated
 *                  with **LARGE:**, **MEDIUM:**, **SMALL:** size markers.
 * @returns The complete prompt string ready to send to the model.
 */
export function buildCloudExtractionPrompt(ocrText: string): string {
  const today = new Date().toISOString().slice(0, 10);

  return `Today's date is ${today}.
The following text was extracted via OCR from a coffee bean bag label.
Due to OCR, individual characters might be misread (e.g., 0↔O, 1↔l, 5↔S, 8↔B, rn↔m).
Please account for these potential misreadings when interpreting the text.

Text annotated with **LARGE:**, **MEDIUM:**, **SMALL:** indicates relative font size on the label. Large text is often the coffee name or roaster name.

--- OCR TEXT ---
${ocrText}
--- END OCR TEXT ---

Extract all fields from the text above into this JSON structure.
Use "NOT_FOUND" for any field not clearly present.

{
  "name": "Coffee name (not the roaster/company)",
  "roaster": "Roasting company name",
  "weight": "Weight with unit, e.g. '250g' or '12oz'",
  "bean_roasting_type": "FILTER, ESPRESSO, OMNI, or NOT_FOUND",
  "aromatics": "Comma-separated flavor/tasting notes",
  "decaffeinated": true or false,
  "cupping_points": numeric score (typically 80-100),
  "roasting_date": "YYYY-MM-DD (use today's date to resolve ambiguous date formats — the roasting date is most likely within the past year and never in the future)",
  "bean_mix": "SINGLE_ORIGIN or BLEND",
  "origins": [
    {
      "country": "Origin country",
      "region": "Specific region",
      "variety": "Coffee variety/cultivar",
      "processing": "Processing method (washed, natural, honey, etc.)",
      "elevation": "Altitude as 'XXXX MASL'",
      "farm": "Farm/estate name",
      "farmer": "Producer/farmer name",
      "percentage": "Blend percentage as 'N%'"
    }
  ]
}

For blends: one object per component in "origins". For single origin: one object.`;
}
