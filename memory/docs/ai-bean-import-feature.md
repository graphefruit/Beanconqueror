# AI Bean Import Feature

> **Status:** Experimental  
> **Platform Support:** iOS only (Apple Intelligence, iOS 18.1+)  
> **Introduced:** January 2026

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
│   ├── ai-bean-import-error.ts        # Error types and factory
│   ├── field-extraction.service.ts    # Multi-step LLM extraction
│   ├── ai-import-examples.service.ts  # i18n vocabulary loading
│   ├── llm-communication.service.ts   # LLM communication utilities
│   ├── ocr-metadata.service.ts        # Layout analysis
│   ├── text-normalization.service.ts  # Text pre-processing
│   ├── ocr-correction.service.ts      # Fuzzy OCR error correction
│   ├── type-mappings.ts               # Enum mapping utilities
│   └── test-utils/                    # Test utilities
├── data/ai-import/
│   ├── ai-field-prompts.ts            # Per-field prompt configs
│   ├── ai-import-prompt.ts            # Language detection prompt
│   └── ai-import-constants.ts         # Centralized constants
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
- Delegates LLM communication to `llm-communication.service.ts`

**Key methods:**

- `checkReadiness()` - Verify Apple Intelligence availability
- `captureAndExtractBeanData()` - Single-photo flow
- `extractBeanDataFromImages()` - Multi-photo flow
- `processOcrAndExtractBean()` - Shared processing pipeline

#### `FieldExtractionService`

**Role:** Multi-step LLM field extraction

- Extracts fields in two phases: top-level fields, then origin fields
- Runs focused prompts for each bean field
- Respects user's `bean_manage_parameters` settings
- Handles SINGLE_ORIGIN vs BLEND extraction strategies
- Validates and sanitizes LLM responses
- Returns fallback bean on unexpected errors (graceful degradation)

**Key methods:**

- `extractAllFields()` - Main entry point
- `extractTopLevelFields()` - Name, roaster, weight, roasting type, aromatics, etc.
- `extractOriginFields()` - Country, region, variety, processing, elevation, etc.
- `extractField()` - Single field extraction with prompt building
- `extractNameAndRoaster()` - Combined extraction for disambiguation

#### `LLMCommunicationService` (functional module)

**Role:** Centralized LLM communication utilities

- `sendLLMPrompt()` - Send prompt with timeout, listener management, cleanup
- `isNullLikeValue()` - Check if response is null-like ("null", "NOT_FOUND", etc.)
- `extractJsonFromResponse()` - Parse JSON from markdown code blocks

**Important:** Fields are extracted sequentially (not parallel) because CapgoLLM uses global event listeners that can cause contamination between concurrent requests.

#### `AIImportExamplesService`

**Role:** Language-specific vocabulary loading

- Loads `AI_IMPORT_PROMPT_EXAMPLES` from i18n JSON files
- Merges examples from multiple languages (detected language + English + UI language)
- Case-insensitive deduplication preserving first occurrence's casing
- Provides: origins, varieties, processing methods, roasting type keywords, decaf keywords, blend/single-origin keywords, producer keywords, roast date keywords, roaster keywords

#### `OcrMetadataService`

**Role:** Layout analysis from OCR bounding boxes

- Classifies text blocks by relative height (LARGE/MEDIUM/SMALL)
- Adds markdown-style tags: `**LARGE:** Coffee Name`
- Helps LLM distinguish prominent text (names) from fine print (details)
- Handles multi-photo enrichment with section markers

**Size classification thresholds (configurable in `ai-import-constants.ts`):**

- **LARGE:** height ≥ 80% of max OR ≥ 1.5× average
- **SMALL:** height < 70% of average
- **MEDIUM:** everything else

#### `TextNormalizationService`

**Role:** Text pre-processing

- Converts ALL CAPS to Title Case (70% threshold)
- Normalizes thousand separators (1.850 → 1850, including Swiss/French formats)
- Standardizes altitude formats (m.ü.M., msnm → MASL)
- Extracts and converts weight units (kg, oz, lb → grams)
- OCR text validation for weight and elevation (anti-hallucination)

**Exported utility functions:**

- `weightExistsInOcrText()` - Validate weight appears in source
- `elevationExistsInOcrText()` - Validate elevation appears in source
- `sanitizeElevation()` - Clean and validate elevation values

#### `OCRCorrectionService`

**Role:** Fuzzy matching for OCR errors

- Corrects common OCR confusions: `0↔O`, `1↔l↔I`, `5↔S`, `8↔B`, `rn↔m`
- Matches against known vocabulary (countries, varieties, processing methods)
- Preserves correct casing from vocabulary

#### `type-mappings.ts` (functional module)

**Role:** Type-safe enum mapping

- `mapToBeanMix()` - Convert LLM string to BEAN_MIX_ENUM
- `mapToRoastingType()` - Convert LLM string to BEAN_ROASTING_TYPE_ENUM

#### `ai-bean-import-error.ts`

**Role:** Error tracking and debugging

- `AIImportStep` type - Enum of pipeline steps for error tracking
- `AIBeanImportError` interface - Error with step context
- `createAIBeanImportError()` - Factory function

### Component

#### `AiImportPhotoGalleryComponent`

**Role:** Multi-photo capture UI

- Swiper-based gallery for reviewing captured photos
- Add/remove photos (max 4)
- Toggle for attaching photos to bean
- Keyboard navigation (arrow keys, Delete, Escape)
- Screen reader announcements via ARIA live region
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

### Step 4: Text Pre-processing

```typescript
// 1. Number normalization (international thousand separators)
"1.850m" → "1850m"
"1'234" → "1234" (Swiss format)
"1 850" → "1850" (French/ISO format)

// 2. Altitude standardization
"1850 m.ü.M." → "1850 MASL"
"1700-1900 meters" → "1700-1900 MASL"

// 3. OCR error correction (fuzzy matching)
"Ethi0pia" → "Ethiopia"  // 0→o
"Co1ombia" → "Colombia"  // 1→l

// 4. Case normalization (>70% uppercase lines only)
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

The prompt focuses on descriptive keywords (not brand names or universal terms).

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
    "ROASTING_TYPE_ESPRESSO_KEYWORDS": "Espresso, ...",
    "ROASTING_TYPE_OMNI_KEYWORDS": "Omni, Omniroast, ...",
    "DECAF_KEYWORDS": "Decaf, Entkoffeiniert, Décaféiné, ...",
    "BLEND_KEYWORDS": "Blend, House Blend, Espresso Blend, ...",
    "SINGLE_ORIGIN_KEYWORDS": "Single Origin, ...",
    "PRODUCER_KEYWORDS": "Producer, Farmer, Grower, ...",
    "ROASTDATE_KEYWORDS": "Roasted on, Roast date, ...",
    "ROASTER_KEYWORDS": "Coffee Co, Roasters, Rösterei, ..."
  }
}
```

**Supported languages (14):** Arabic (ar), German (de), Greek (el), English (en), Spanish (es), French (fr), Indonesian (id), Italian (it), Dutch (nl), Norwegian (no), Polish (pl), Portuguese (pt), Turkish (tr), Chinese (zh)

### Step 7: Multi-Step Field Extraction

`FieldExtractionService.extractAllFields()` runs focused prompts in two phases:

**Phase 1: Top-level fields**

```typescript
// Name and roaster (extracted together for disambiguation)
const { name, roaster } = await this.extractNameAndRoaster(text, examples, languages);

// Individual fields (respecting user settings)
const weight = await this.extractField('weight', text, examples, languages);
const bean_roasting_type = await this.extractField('bean_roasting_type', ...);
const aromatics = await this.extractField('aromatics', ...);
const decaffeinated = await this.extractField('decaffeinated', ...);
const cupping_points = await this.extractField('cupping_points', ...);
const roastingDate = await this.extractField('roastingDate', ...);
```

**Phase 2: Origin fields**

```typescript
// Structure detection
const beanMix = await this.extractField('beanMix', text, examples, languages);

if (beanMix === BLEND) {
  // Single JSON prompt for all blend components
  const origins = await this.extractBlendOrigins(text, examples, languages);
} else {
  // Per-field extraction for single origin
  const country = await this.extractField('country', ...);
  const region = await this.extractField('region', ...);
  // ... etc
}
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
  // ... 15+ more field configs
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

### Language Detection Prompt

Located in `ai-import-prompt.ts`, detects label language from OCR text.

### Field-Specific Prompts

Each field in `ai-field-prompts.ts` has:

| Property         | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `field`          | Bean/IBeanInformation field name         |
| `promptTemplate` | The actual prompt text with placeholders |
| `examplesKeys`   | Which vocabulary lists to include        |
| `validation`     | Regex pattern for response validation    |
| `postProcess`    | Function to clean/transform the response |

### Blend Origins Prompt

`BLEND_ORIGINS_PROMPT_TEMPLATE` extracts all components of a blend in one JSON response, allowing "Arabica" as a valid variety (useful for Arabica/Robusta distinction in blends).

---

## Hallucination Prevention

Significant effort went into preventing LLM hallucinations (fabricated data). Key techniques:

### 1. Multi-Step Focused Prompts

Instead of one large prompt asking for everything, each field has its own focused prompt. This reduces context confusion and makes it easier for the LLM to admit "NOT_FOUND".

### 2. OCR Source Validation

For fields prone to hallucination (weight, elevation, cupping_points), the extracted value is validated against the original OCR text:

```typescript
// Weight validation
if (!weightExistsInOcrText(grams, ocrText)) {
  return null; // Weight doesn't appear in source text
}

// Elevation validation
if (!elevationExistsInOcrText(sanitized, ocrText)) {
  return null; // Elevation doesn't appear in source text
}

// Cupping points validation
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

| Field                | Validation                                          |
| -------------------- | --------------------------------------------------- |
| `bean_roasting_type` | Must be FILTER, ESPRESSO, or OMNI                   |
| `cupping_points`     | Must be 80-99, must exist in OCR text               |
| `weight`             | Must match pattern, value must exist in OCR         |
| `elevation`          | Must be < 5000 MASL, must exist in OCR              |
| `roastingDate`       | Must be valid date, not in future, not > 1 year old |

### 5. Graceful Degradation

If unexpected errors occur during extraction, a minimal fallback bean is returned rather than crashing:

```typescript
catch (error) {
  // Return minimal bean rather than crashing
  const fallbackBean = new Bean();
  fallbackBean.bean_information = [this.createEmptyBeanInformation()];
  return fallbackBean;
}
```

---

## Constants

All tunable constants are centralized in `ai-import-constants.ts`:

```typescript
// LLM timeouts
LLM_TIMEOUT_PER_FIELD_MS = 15000; // Per-field extraction
LLM_TIMEOUT_FULL_ANALYSIS_MS = 30000; // Full analysis
LLM_TIMEOUT_LANGUAGE_DETECTION_MS = 10000; // Language detection

// OCR metadata thresholds
OCR_SIZE_VARIATION_THRESHOLD = 1.3; // Min ratio for useful metadata
OCR_MIN_BLOCKS_FOR_METADATA = 2; // Min blocks needed
OCR_LARGE_TEXT_MAX_HEIGHT_RATIO = 0.8; // Large if >= 80% of max
OCR_LARGE_TEXT_AVG_MULTIPLIER = 1.5; // Large if >= 1.5× avg
OCR_SMALL_TEXT_AVG_MULTIPLIER = 0.7; // Small if < 70% of avg

// Validation
MAX_VALID_ELEVATION_METERS = 5000; // Filters variety numbers
MIN_CUPPING_SCORE = 80; // SCA minimum
MAX_CUPPING_SCORE = 100; // SCA maximum
MAX_BLEND_PERCENTAGE = 100; // Validation cap
```

---

## Capacitor Plugins

### `@capgo/capacitor-llm`

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

### `@pantrist/capacitor-plugin-ml-kit-text-recognition`

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

---

## Testing

Unit tests exist for services and utilities:

```
src/services/aiBeanImport/
├── ai-bean-import-error.spec.ts       # Error factory tests
├── ai-import-examples.service.spec.ts # i18n vocabulary tests
├── ocr-correction.service.spec.ts     # OCR fuzzy matching tests
├── ocr-metadata.service.spec.ts       # Layout analysis tests
├── text-normalization.service.spec.ts # Text preprocessing tests
└── type-mappings.spec.ts              # Enum mapping tests

src/data/ai-import/
└── ai-field-prompts.spec.ts           # Prompt building tests

src/components/ai-import-photo-gallery/
└── ai-import-photo-gallery.component.spec.ts  # Component tests
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
4. **Processing** → Loading spinner shows current step and field being extracted
5. **Review** → Bean add modal opens with pre-populated fields
6. **Edit & Save** → User can modify extracted data before saving

---

## Error Handling

Errors are tracked by step for debugging using `AIBeanImportError`:

```typescript
try {
  currentStep = 'ocr';
  // ... OCR processing
  currentStep = 'processing';
  // ... field extraction
} catch (error) {
  throw createAIBeanImportError(
    `[${currentStep}] ${error.message}`,
    currentStep,
    error,
  );
}
```

**Error recovery strategies:**

- **Individual field failures:** Return null, continue with other fields
- **Unexpected pipeline errors:** Return fallback bean with empty fields
- **User cancellations:** Silently handled, no error shown

Common error scenarios:

- **No text found:** OCR returned empty result
- **LLM timeout:** 15-second timeout per field
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
