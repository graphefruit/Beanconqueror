# AI Bean Import Feature

> **Status:** Experimental  
> **Platform Support:** iOS only (Apple Intelligence, iOS 18.1+)  
> **Introduced:** January 2026  
> **iOS Minimum:** iOS 16.0 (ML Kit) + iOS 18.1 (Apple Intelligence)

## Summary

The AI Bean Import feature allows users to photograph coffee bag labels and automatically extract bean information using on-device AI. The system combines OCR (Optical Character Recognition) with LLM (Large Language Model) processing to parse unstructured label text into structured bean data.

**Key capabilities:**

- Single-photo or multi-photo (up to 4) label capture
- Automatic language detection for multilingual labels
- Extraction of 15+ bean fields (name, roaster, origin, variety, processing, etc.)
- Layout-aware text analysis using OCR bounding box metadata
- Respects user's bean field customization settings

---

## General Approach

The feature implements a **multi-stage pipeline**:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Camera    │────▶│     OCR     │────▶│ Text Enrichment │────▶│   Language   │
│   Capture   │     │  (ML Kit)   │     │ & Normalization │     │  Detection   │
└─────────────┘     └─────────────┘     └─────────────────┘     └──────────────┘
                                                                        │
                                                                        ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│    Bean     │◀────│   Field     │◀────│    Per-Field    │◀────│   Prompt     │
│   Object    │     │  Validation │     │   LLM Prompts   │     │   Building   │
└─────────────┘     └─────────────┘     └─────────────────┘     └──────────────┘
```

**Design principles:**

1. **On-device processing** - No cloud API calls; uses Apple Intelligence locally
2. **Multi-step extraction** - Focused prompts per field reduce hallucinations
3. **Language-aware** - Vocabulary examples loaded from i18n based on detected language
4. **Layout-aware** - OCR bounding boxes inform text importance (large = likely name/roaster)
5. **Settings-aware** - Only extracts fields enabled in user's bean customization

---

## Features

### Single Photo Import

Quick capture of a single label image. Best for labels with all information on one side.

**Entry point:** `BEAN_IMPORT_ACTION.AI_IMPORT` → `AIBeanImportService.captureAndExtractBeanData()`

### Multi-Photo Import

Capture up to 4 photos for labels with information spread across multiple sides (front, back, etc.). Photos are processed sequentially, OCR text concatenated with section markers, then analyzed together.

**Entry point:** `BEAN_IMPORT_ACTION.AI_IMPORT_MULTI` → `AiImportPhotoGalleryComponent` → `AIBeanImportService.extractBeanDataFromImages()`

### Optional Photo Attachment

Users can choose to attach captured photos to the bean record for reference.

### Extracted Fields

| Category           | Fields                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------- |
| **Core**           | name, roaster, weight                                                                   |
| **Classification** | bean_roasting_type (FILTER/ESPRESSO/OMNI), beanMix (SINGLE_ORIGIN/BLEND), decaffeinated |
| **Quality**        | cupping_points, aromatics                                                               |
| **Origin**         | country, region, farm, farmer, elevation, variety, processing                           |
| **Dates**          | roastingDate                                                                            |

---

## Architecture

### Directory Structure

```
src/
├── services/aiBeanImport/
│   ├── ai-bean-import.service.ts      # Main orchestration
│   ├── field-extraction.service.ts    # Multi-step LLM extraction
│   ├── ai-import-examples.service.ts  # i18n vocabulary loading
│   ├── ocr-metadata.service.ts        # Layout analysis
│   ├── text-normalization.service.ts  # Text pre-processing
│   └── ocr-correction.service.ts      # Fuzzy OCR error correction
├── data/ai-import/
│   ├── ai-import-prompt.ts            # Main prompt templates
│   └── ai-field-prompts.ts            # Per-field prompt configs
├── components/ai-import-photo-gallery/
│   └── ...                            # Multi-photo capture UI
└── assets/i18n/
    └── *.json                         # AI_IMPORT_PROMPT_EXAMPLES per language
```

### Service Responsibilities

#### `AIBeanImportService`

**Role:** Main entry point and orchestration

- Checks Apple Intelligence readiness via `CapgoLLM.getReadiness()`
- Manages camera capture via Capacitor Camera plugin
- Coordinates OCR → enrichment → extraction pipeline
- Handles single-photo and multi-photo flows

#### `FieldExtractionService`

**Role:** Multi-step LLM field extraction

- Runs focused prompts for each bean field
- Respects user's `bean_manage_parameters` settings, only extracts data that the user wants to see
- Handles SINGLE_ORIGIN vs BLEND extraction strategies
- Validates and sanitizes LLM responses

#### `AIImportExamplesService`

**Role:** Language-specific vocabulary loading

- Loads `AI_IMPORT_PROMPT_EXAMPLES` from i18n JSON files
- Merges examples from multiple languages (detected language on the label + English + current UI language)
- Provides origins, varieties, processing methods, keywords for prompts

#### `OcrMetadataService`

**Role:** Layout analysis from OCR bounding boxes

- Classifies text blocks by relative height (LARGE/MEDIUM/SMALL)
- Adds markdown-style tags: `**LARGE:** Coffee Name`
- Helps LLM distinguish prominent text (names) from fine print (details)

#### `TextNormalizationService`

**Role:** Text pre-processing

- Converts ALL CAPS to Title Case
- Normalizes thousand separators (1.850 → 1850)
- Standardizes altitude formats (m.ü.M., msnm → MASL)
- Extracts and converts weight units (kg, oz, lb → grams)

#### `OCRCorrectionService`

**Role:** Fuzzy matching for OCR errors

- Corrects common OCR confusions: `0↔O`, `1↔l↔I`, `5↔S`, `rn↔m`
- Matches against known vocabulary (countries, varieties, processing methods)
- Preserves correct casing from vocabulary

### Component

#### `AiImportPhotoGalleryComponent`

**Role:** Multi-photo capture UI

- Swiper-based gallery for reviewing captured photos
- Add/remove photos (max 4)
- Toggle for attaching photos to bean
- Triggers analysis when user confirms

---

## Data Flow

### Step 1: Image Capture

```typescript
// Single photo - direct camera capture
const imageData = await Camera.getPhoto({
  resultType: CameraResultType.Base64,
  source: CameraSource.Camera,
  quality: 90,
});

// Multi-photo - via gallery component
const modal = await this.modalController.create({
  component: AiImportPhotoGalleryComponent,
});
```

### Step 2: OCR Processing

Uses Google ML Kit via `@pantrist/capacitor-plugin-ml-kit-text-recognition`:

```typescript
const ocrResult = await CapacitorPluginMlKitTextRecognition.detectText({
  base64Image: base64,
});
// Returns: { text: string, blocks: Block[] }
// Each block has: text, boundingBox, recognizedLanguage, lines[]
```

### Step 3: Layout Enrichment

`OcrMetadataService.enrichWithLayout()` analyzes bounding box heights:

```typescript
// Input blocks with heights: 100px, 50px, 20px
// Output:
"=== OCR WITH LAYOUT ===

**LARGE:** ROASTER NAME

**MEDIUM:** Coffee Name

**SMALL:** Ethiopia | Washed | 1850 MASL"
```

Size classification thresholds:

- **LARGE:** height ≥ 80% of max OR ≥ 1.5× average
- **SMALL:** height < 70% of average
- **MEDIUM:** everything else

### Step 4: Text Pre-processing

```typescript
// 1. Number normalization (thousand separators)
"1.850m" → "1850m"

// 2. Altitude standardization
"1850 m.ü.M." → "1850 MASL"
"1700-1900 meters" → "1700-1900 MASL"

// 3. OCR error correction (fuzzy matching)
"Ethi0pia" → "Ethiopia"  // 0→o
"Co1ombia" → "Colombia"  // 1→l

// 4. Case normalization
"FINCA EL PARAÍSO" → "Finca El Paraíso"
```

### Step 5: Language Detection

Dedicated LLM prompt identifies label language:

```typescript
const prompt = AI_IMPORT_LANGUAGE_DETECTION_PROMPT.replace(
  '{{OCR_TEXT}}',
  rawText,
);
// Returns: "de", "en", "fr", etc. or "unknown"
```

The prompt focuses on descriptive keywords (not brand names or universal terms):

- **German:** Aufbereitung, Röstung, Herkunft, geröstet
- **French:** torréfié, origine, récolte, acidité
- **English:** roasted, harvest, acidity, flavor

### Step 6: Vocabulary Loading

`AIImportExamplesService` loads and merges examples:

```typescript
const languages = [detectedLang, 'en', userLang]; // Order matters
const examples = await this.aiImportExamples.getMergedExamples(languages);

// examples.ORIGINS = "Ethiopia, Äthiopien, Éthiopie, Colombia, ..."
// examples.PROCESSING_METHODS = "Washed, Gewaschen, Lavé, Natural, ..."
```

i18n files contain `AI_IMPORT_PROMPT_EXAMPLES`:

```json
{
  "AI_IMPORT_PROMPT_EXAMPLES": {
    "ORIGINS": "Ethiopia, Colombia, Brazil, ...",
    "PROCESSING_METHODS": "Washed, Natural, Honey, ...",
    "VARIETIES": "Typica, Bourbon, Gesha, ...",
    "ROASTING_TYPE_FILTER_KEYWORDS": "Filter, Filterkaffee, ...",
    "DECAF_KEYWORDS": "Decaf, Entkoffeiniert, Décaféiné, ..."
  }
}
```

**Supported languages (14):** Arabic (ar), German (de), Greek (el), English (en), Spanish (es), French (fr), Indonesian (id), Italian (it), Dutch (nl), Norwegian (no), Polish (pl), Portuguese (pt), Turkish (tr), Chinese (zh)

### Step 7: Multi-Step Field Extraction

`FieldExtractionService.extractAllFields()` runs focused prompts:

```typescript
// Structure detection
const beanMix = await this.extractField('beanMix', text, examples, languages);

// Name and roaster (extracted together for disambiguation)
const { name, roaster } = await this.extractNameAndRoaster(
  text,
  examples,
  languages,
);

// Individual fields
const weight = await this.extractField('weight', text, examples, languages);
const aromatics = await this.extractField(
  'aromatics',
  text,
  examples,
  languages,
);
// ... etc for each enabled field
```

Each field has a dedicated prompt in `ai-field-prompts.ts`:

```typescript
export const FIELD_PROMPTS: Record<string, FieldPromptConfig> = {
  country: {
    field: 'country',
    promptTemplate: `What country is this coffee from?

COMMON ORIGINS (may appear in different languages):
{{ORIGINS}}

RESPONSE FORMAT:
- Return ONLY the country name, nothing else
- If not found, return exactly: NOT_FOUND

TEXT (languages: {{LANGUAGES}}):
{{OCR_TEXT}}`,
    examplesKeys: ['ORIGINS'],
  },
  // ... 12+ more field configs
};
```

### Step 8: Bean Population

Extracted values populate a `Bean` object:

```typescript
const bean = new Bean();
bean.name = nameAndRoaster.name;
bean.roaster = nameAndRoaster.roaster;
bean.weight = this.textNorm.extractWeight(weightStr);
bean.bean_roasting_type = roastingType;
bean.beanMix = beanMix;
bean.bean_information = [{ country, region, variety, processing, ... }];
```

For **blends**, a single JSON prompt extracts all origin components:

```typescript
const origins = await this.extractBlendOrigins(text, examples, languages);
// Returns array: [{ country: "Ethiopia", percentage: 60 }, { country: "Colombia", percentage: 40 }]
```

---

## Prompts

### Main Prompt Template

Located in `ai-import-prompt.ts`, the main template includes:

1. **Critical rules** - Never hallucinate, return null for missing data
2. **Classification logic** - SINGLE_ORIGIN vs BLEND detection
3. **Normalization rules** - Title case, altitude format
4. **Schema definition** - JSON structure for extraction
5. **Terminology reference** - Language-specific examples injected at runtime

### Field-Specific Prompts

Each field in `ai-field-prompts.ts` has:

| Property         | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `promptTemplate` | The actual prompt text with placeholders |
| `examplesKeys`   | Which vocabulary lists to include        |
| `validation`     | Regex pattern for response validation    |
| `postProcess`    | Function to clean/transform the response |

Example validation chain:

```typescript
// 1. LLM returns: "FILTER"
// 2. Validation: /^(FILTER|ESPRESSO|OMNI)$/i → passes
// 3. postProcess: v.toUpperCase() → "FILTER"
// 4. Result stored in bean.bean_roasting_type
```

---

## Hallucination Prevention

Significant effort went into preventing LLM hallucinations (fabricated data). Key techniques:

### 1. Multi-Step Focused Prompts

Instead of one large prompt asking for everything, each field has its own focused prompt. This reduces context confusion and makes it easier for the LLM to admit "NOT_FOUND".

### 2. OCR Source Validation

For fields prone to hallucination (weight, cupping_points), the extracted value is validated against the original OCR text:

```typescript
// In postProcess for cupping_points:
const intPart = Math.floor(num).toString();
if (!ocrText.includes(intPart)) {
  return null; // Number doesn't appear in source text
}
```

### 3. Strict Null Rules

Prompts emphasize returning null over guessing:

- "ONLY extract information EXPLICITLY written in the text"
- "Return null for ANY field not clearly present"
- "DO NOT guess, infer, or make assumptions"
- "NEVER hallucinate or fabricate data"

### 4. Post-Processing Validation

Each field can have validation regex and post-processing:

| Field                | Validation                                               |
| -------------------- | -------------------------------------------------------- |
| `bean_roasting_type` | Must be FILTER, ESPRESSO, or OMNI                        |
| `cupping_points`     | Must be 80-99, must exist in OCR text                    |
| `weight`             | Must match pattern like "250g", number must exist in OCR |
| `elevation`          | Must be < 5000 (filters out variety numbers like 74158)  |
| `roastingDate`       | Must be valid date, not in future, not > 1 year old      |

### 5. Commonly Hallucinated Fields Warning

The main prompt explicitly warns about fields that LLMs tend to fabricate:

- `processing` - Only if explicitly labeled
- `variety` - "Arabica" alone is too generic
- `region` - Only if explicitly stated, not inferred from country

---

## Known Issues

Known issues, gaps, and improvement opportunities are tracked in a separate file:

➡️ **[ai-bean-import-known-issues.md](ai-bean-import-known-issues.md)**

---

## Capacitor Plugins

### `@capgo/capacitor-llm` (v7.2.15)

Provides access to on-device LLM capabilities.

**iOS:** Uses Apple Intelligence (requires iOS 18.1+, compatible device, Apple Intelligence enabled)

**Key API:**

```typescript
import { CapgoLLM } from '@capgo/capacitor-llm';

// Check readiness
const { readiness } = await CapgoLLM.getReadiness();
// readiness: "ready" | "not_ready" | "not_available"

// Set model
await CapgoLLM.setModel({ path: 'Apple Intelligence' });

// Create chat and send message
const { id: chatId } = await CapgoLLM.createChat();
await CapgoLLM.sendMessage({ chatId, message: prompt });

// Listen for streaming response
CapgoLLM.addListener('textFromAi', (event) => {
  /* snapshot text */
});
CapgoLLM.addListener('aiFinished', () => {
  /* completion */
});
```

### `@pantrist/capacitor-plugin-ml-kit-text-recognition` (v7.0.0)

Google ML Kit wrapper for OCR.

**Platforms:** iOS and Android

**Key API:**

```typescript
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition';

const result = await CapacitorPluginMlKitTextRecognition.detectText({
  base64Image: base64String,
});
// Returns: { text: string, blocks: Block[] }
```

---

## Platform Support

### Current: iOS Only

The feature currently requires:

- **iOS 18.1+**
- **Apple Intelligence enabled** on device
- **Compatible hardware** (iPhone 15 Pro or later, or recent iPads with M-series chips)

Readiness check in `AIBeanImportService.checkReadiness()`:

```typescript
if (!this.platform.is('capacitor')) {
  return { ready: false, message: 'AI_IMPORT_NOT_AVAILABLE_BROWSER' };
}
if (this.platform.is('android')) {
  return { ready: false, message: 'AI_IMPORT_NOT_AVAILABLE_ANDROID' };
}
const result = await CapgoLLM.getReadiness();
if (result.readiness !== 'ready') {
  return { ready: false, message: 'AI_IMPORT_REQUIRES_APPLE_INTELLIGENCE' };
}
```

### Future: Android Extension

The underlying plugins support Android, making future extension possible:

**OCR:** Already cross-platform via ML Kit plugin.

**LLM:** The `@capgo/capacitor-llm` plugin supports on-device model download for Android using the MLC LLM framework.

#### Resources for Android Implementation

| Resource                    | URL                                                                      |
| --------------------------- | ------------------------------------------------------------------------ |
| @capgo/capacitor-llm GitHub | https://github.com/Cap-go/capacitor-llm                                  |
| @capgo/capacitor-llm npm    | https://www.npmjs.com/package/@capgo/capacitor-llm                       |
| MLC LLM (Android backend)   | https://llm.mlc.ai/                                                      |
| ML Kit Text Recognition     | https://github.com/Pantrist-dev/capacitor-plugin-ml-kit-text-recognition |

**Android implementation would require:**

1. Model selection and download management (e.g., Phi-3, Llama variants)
2. Storage management for downloaded models (~2-4 GB)
3. Performance tuning for various Android devices
4. Modified readiness check to handle model download state

---

## Testing

Unit tests exist for the pre-processing services:

```
src/services/aiBeanImport/
├── ocr-correction.service.spec.ts
├── ocr-metadata.service.spec.ts
└── text-normalization.service.spec.ts
```

Run tests:

```bash
npm test
```

---

## Usage Flow (User Perspective)

1. **Beans page** → Import button → Select "AI Import" or "AI Import (Multi)"
2. **Readiness check** → Shows error if Apple Intelligence unavailable
3. **Capture** → Camera opens (single) or gallery modal (multi)
4. **Processing** → Loading spinner shows current step
5. **Review** → Bean add modal opens with pre-populated fields
6. **Edit & Save** → User can modify extracted data before saving

---

## Error Handling

Errors are tracked by step for debugging:

```typescript
try {
  currentStep = 'ocr';
  // ... OCR processing
  currentStep = 'language_detection';
  // ... language detection
} catch (error) {
  throw new Error(`[${currentStep}] ${error.message}`);
}
```

Common error scenarios:

- **No text found:** OCR returned empty result
- **LLM timeout:** 15-second timeout per field, 30-second for full analysis
- **Parse error:** LLM response not valid JSON

---

## Related Files

| File                                         | Purpose                                       |
| -------------------------------------------- | --------------------------------------------- |
| `src/app/beans/beans.page.ts`                | Integration point for import actions          |
| `src/enums/beans/beanImportAction.ts`        | `AI_IMPORT` and `AI_IMPORT_MULTI` enum values |
| `src/classes/bean/bean.ts`                   | Bean data model                               |
| `src/interfaces/bean/iBeanInformation.ts`    | Origin info interface                         |
| `src/interfaces/parameter/iBeanParameter.ts` | User's field customization settings           |

---

## Development History

This feature was developed iteratively over January 2026 with AI assistance.

### Key Milestones

| Date       | Commit     | Description                                               |
| ---------- | ---------- | --------------------------------------------------------- |
| 2026-01-05 | `db570de2` | Initial implementation: OCR + Apple Intelligence pipeline |
| 2026-01-06 | `665d035d` | Multi-language support with language detection            |
| 2026-01-07 | `686b45f3` | Multi-step field extraction architecture                  |
| 2026-01-08 | `0bfd6f8b` | Multi-photo support (up to 4 images)                      |
| 2026-01-08 | `28e7713c` | OCR layout metadata for name/roaster extraction           |
| 2026-01-09 | `c462280c` | OCR validation to prevent hallucinations                  |

### Credits

All feature commits include:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

This represents a collaborative AI-assisted development effort between the Beanconqueror maintainers and Claude Code.
