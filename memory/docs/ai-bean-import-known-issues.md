# AI Bean Import - Known Issues

This document tracks known issues, gaps, and improvement opportunities for the AI Bean Import feature.

See [ai-bean-import-feature.md](ai-bean-import-feature.md) for the main feature documentation.

---

## Altitude Extraction Overlap

The altitude/elevation field has overlapping logic across three layers: preprocessing, prompt instructions, and postprocessing. This section documents the current state for future cleanup.

### Current Processing Layers

#### 1. Preprocessing (`TextNormalizationService.normalizeAltitude`)

Runs **before** text is sent to LLM:

```typescript
// Handles:
// - Explicit ranges: "1700-1900m" → "1700-1900 MASL"
// - Implicit ranges: "800m 1200m" → "800-1200 MASL"
// - Single values: "1.850 m.ü.M." → "1850 MASL"
// - Unit conversion: m, m.ü.M., meters, msnm → MASL
// - Thousand separators: dots and commas only
```

#### 2. Prompt Instructions (`ai-field-prompts.ts` → elevation)

Instructions given to the LLM:

```
FORMAT RULES (only if altitude number is found):
- Return as "XXXX MASL" format
- Remove thousand separators
- Convert: "m", "m.ü.M.", "meters", "msnm" all become "MASL"
```

#### 3. Postprocessing (`elevation.postProcess`)

Runs **after** LLM response:

```typescript
// Handles:
// - Thousand separators: dots and commas only
// - LLM quirks: "2300 MASL 2400 MASL" → "2300-2400 MASL"
// - Linebreak removal
// - Validation: altitude must be < 5000
```

### Overlap Analysis

| Task                                   | Preprocessing | Prompt | Postprocessing |
| -------------------------------------- | :-----------: | :----: | :------------: |
| Remove `.` `,` thousand separators     |      ✅       |   ✅   |       ✅       |
| Convert m/m.ü.M./meters/msnm → MASL    |      ✅       |   ✅   |       ❌       |
| Explicit ranges (1700-1900m)           |      ✅       |   ❌   |       ❌       |
| Implicit ranges (800m 1200m)           |      ✅       |   ❌   |       ❌       |
| LLM output quirk (2300 MASL 2400 MASL) |      ❌       |   ❌   |       ✅       |
| Remove linebreaks                      |      ❌       |   ❌   |       ✅       |
| Validate < 5000                        |      ❌       |   ❌   |       ✅       |

**Redundancy:** Since preprocessing already converts units and removes thousand separators, the LLM never sees formats like "1.850 m.ü.M." — it receives "1850 MASL". The prompt instructions for these conversions are therefore redundant.

**However:** The prompt instructions serve as a safety net for edge cases not handled by preprocessing (see below).

### Gap: Missing Thousand Separator Formats

The preprocessing and postprocessing only handle `.` (dot) and `,` (comma) as thousand separators:

```typescript
// Current regex in normalizeNumbers:
/(\d)[.,](\d{3})(?!\d)/g

  // Current regex in postProcess:
  .replace(/[.,]/g, '');
```

**Missing separators by locale:**

| Separator                | Example | Locale              | Handled? |
| ------------------------ | ------- | ------------------- | :------: |
| `.` (dot)                | 1.850   | Germany, most EU    |    ✅    |
| `,` (comma)              | 1,850   | US, UK              |    ✅    |
| `'` (apostrophe)         | 1'850   | **Swiss German**    |    ❌    |
| ` ` (space)              | 1 850   | **French, Polish**  |    ❌    |
| `'` (right single quote) | 1'850   | Typography variants |    ❌    |
| ` ` (thin space U+2009)  | 1 850   | **ISO standard**    |    ❌    |

**Impact:** A Swiss coffee label with "1'850 m.ü.M." would:

1. Pass through preprocessing unchanged (apostrophe not matched)
2. LLM might understand and output "1850 MASL" (prompt instructs removal)
3. Or LLM might output "1'850 MASL" which postprocessing won't fix

The prompt instructions currently act as a safety net for these cases, relying on the LLM's understanding of number formats.

### Recommended Fix

1. **Extend thousand separator handling** in both preprocessing and postprocessing:

   ```typescript
   // Preprocessing (normalizeNumbers):
   /(\d)[.,'' \u2009\u202F](\d{3})(?!\d)/g

     // Postprocessing:
     .replace(/[.,'' \u2009\u202F]/g, '');
   ```

2. **Simplify prompt** once preprocessing handles all formats — remove redundant FORMAT RULES

3. **Add test cases** for Swiss/French number formats in `text-normalization.service.spec.ts`
