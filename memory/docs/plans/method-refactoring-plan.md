# Method Refactoring Implementation Plan

This plan addresses findings 4.1 and 6.3 from the AI Bean Import code review, focusing on breaking down God methods and eliminating code duplication.

---

## Finding 4.1: God Method - `extractAllFields` (~150 lines)

### Current Structure Analysis

**Location:** `src/services/aiBeanImport/field-extraction.service.ts`, lines 43-196

The `extractAllFields` method currently handles multiple responsibilities:

1. **Setup Phase** (lines 47-64)
   - Debug logging of raw OCR text
   - Loading user settings and bean parameters
   - Loading merged i18n examples
   - Pre-processing text with normalization

2. **Top-Level Field Extraction** (lines 66-145)
   - Name and roaster (combined extraction)
   - Weight
   - Bean roasting type
   - Aromatics
   - Decaffeinated flag
   - Cupping points
   - Roasting date

3. **Origin Field Extraction** (lines 147-186)
   - Bean mix detection (SINGLE_ORIGIN vs BLEND)
   - Conditional branching for blend vs single origin
   - Single origin: per-field extraction via `extractSingleOriginInfo`
   - Blend: bulk extraction via `extractBlendOriginsFiltered`

4. **Finalization Phase** (lines 188-196)
   - Ensure at least one `bean_information` entry
   - Final validation via `validateBean`

### Proposed Breakdown

#### New Method: `extractTopLevelFields`

```typescript
/**
 * Extract top-level bean fields (name, roaster, weight, roasting type, etc.)
 * These are fields that apply to the bean as a whole, not to individual origins.
 */
private async extractTopLevelFields(
  text: string,
  examples: MergedExamples,
  languages: string[],
  params: IBeanParameter,
): Promise<TopLevelFieldsResult> {
  // Returns: { name, roaster, weight, bean_roasting_type, aromatics, decaffeinated, cupping_points, roastingDate }
}
```

**Responsibilities:**
- Extract name and roaster (combined prompt)
- Extract weight
- Conditionally extract: bean_roasting_type, aromatics, decaffeinated, cupping_points, roastingDate
- Return a structured result object

#### New Method: `extractOriginFields`

```typescript
/**
 * Extract origin-related fields based on detected bean mix type.
 * Handles both single origin (per-field extraction) and blend (bulk JSON extraction).
 */
private async extractOriginFields(
  text: string,
  examples: MergedExamples,
  languages: string[],
  params: IBeanParameter,
): Promise<OriginFieldsResult> {
  // Returns: { beanMix, bean_information: IBeanInformation[] }
}
```

**Responsibilities:**
- Detect bean mix (SINGLE_ORIGIN vs BLEND)
- Branch to appropriate extraction method
- Return structured result with beanMix and bean_information array

#### New Method: `constructBeanFromExtractedData`

```typescript
/**
 * Construct a Bean object from extracted field data.
 * Applies cross-field validation and ensures data consistency.
 */
private constructBeanFromExtractedData(
  topLevelFields: TopLevelFieldsResult,
  originFields: OriginFieldsResult,
): Bean {
  // Creates Bean, assigns fields, validates, returns
}
```

**Responsibilities:**
- Create new Bean instance
- Assign top-level fields
- Assign origin fields
- Ensure at least one `bean_information` entry
- Call `validateBean` for cross-field validation

### New Type Definitions

```typescript
interface TopLevelFieldsResult {
  name: string;
  roaster: string;
  weight: number;
  bean_roasting_type?: any;
  aromatics?: string;
  decaffeinated?: boolean;
  cupping_points?: number;
  roastingDate?: string;
}

interface OriginFieldsResult {
  beanMix: 'SINGLE_ORIGIN' | 'BLEND' | 'UNKNOWN';
  bean_information: IBeanInformation[];
}
```

### Refactored `extractAllFields`

After refactoring, the main method becomes a clean orchestrator:

```typescript
public async extractAllFields(
  ocrText: string,
  languages: string[],
): Promise<Bean> {
  // Debug logging
  this.logRawOcrText(ocrText);

  // Setup
  const settings = this.uiSettingsStorage.getSettings();
  const params = settings.bean_manage_parameters;
  const examples = await this.aiImportExamples.getMergedExamples(languages);
  const text = this.preProcess(ocrText, examples);

  this.logNormalizedText(text);

  // Extract fields in two phases
  const topLevelFields = await this.extractTopLevelFields(text, examples, languages, params);
  const originFields = await this.extractOriginFields(text, examples, languages, params);

  // Construct and return final bean
  return this.constructBeanFromExtractedData(topLevelFields, originFields);
}
```

---

## Finding 6.3: Overlapping Logic in `captureAndExtractBeanData` and `extractBeanDataFromImages`

### Current Structure Analysis

**Location:** `src/services/aiBeanImport/ai-bean-import.service.ts`

#### `captureAndExtractBeanData` (lines 113-246)
Entry point for single-photo capture via camera.

Flow:
1. Check camera permission
2. Capture photo via Camera API → get base64
3. Run OCR on base64 image
4. Enrich OCR result with layout metadata
5. Detect language on raw text
6. Get languages to use (detected + en + user lang)
7. Call `fieldExtraction.extractAllFields`
8. Return bean

#### `extractBeanDataFromImages` (lines 256-419)
Entry point for multi-photo import from file paths.

Flow:
1. Loop through photo paths
2. Read each file as base64
3. Run OCR on each image
4. Enrich all OCR results with layout metadata
5. Detect language on combined raw text
6. Get languages to use
7. Call `fieldExtraction.extractAllFields`
8. Handle photo attachments (keep or cleanup)
9. Return bean with optional attachment paths

### Shared Logic Identified

Both methods share the following pipeline after obtaining OCR results:

```
OCR Result(s) → Enrich with Layout → Detect Language → Get Languages → Extract Fields
```

The differences are:
- **Input acquisition:** Camera capture vs file reading
- **OCR cardinality:** Single result vs array of results
- **Layout enrichment:** `enrichWithLayout` vs `enrichMultiplePhotos`
- **Output:** Bean only vs Bean + optional attachments

### Proposed Refactoring

#### New Method: `processOcrAndExtractBean`

```typescript
/**
 * Shared pipeline for OCR post-processing and field extraction.
 * Takes OCR result(s), enriches with layout, detects language, and extracts fields.
 */
private async processOcrAndExtractBean(
  ocrResults: TextDetectionResult[],
  rawTexts: string[],
): Promise<Bean> {
  // Step 1: Enrich with layout metadata
  const enrichedText = ocrResults.length === 1
    ? this.ocrMetadata.enrichWithLayout(ocrResults[0]).enrichedText
    : this.ocrMetadata.enrichMultiplePhotos(ocrResults);

  // Step 2: Prepare raw text for language detection
  const combinedRawText = this.concatenateOCRResults(rawTexts);

  // Step 3: Detect language
  this.uiAlert.setLoadingSpinnerMessage(
    this.translate.instant('AI_IMPORT_STEP_DETECTING_LANGUAGE'),
  );
  const detectedLanguage = await this.detectLanguage(combinedRawText);
  this.uiLog.log('Detected language: ' + detectedLanguage);

  // Step 4: Get languages for examples
  const userLanguage = this.translate.currentLang;
  const languagesToUse = this.getLanguagesToUse(detectedLanguage, userLanguage);
  this.uiLog.log('Using languages for examples: ' + languagesToUse.join(', '));

  // Step 5: Extract fields
  this.uiAlert.setLoadingSpinnerMessage(
    this.translate.instant('AI_IMPORT_STEP_ANALYZING'),
  );
  const bean = await this.fieldExtraction.extractAllFields(
    enrichedText,
    languagesToUse,
  );

  if (!bean) {
    throw new Error('Field extraction returned null - check logs for details');
  }

  return bean;
}
```

### Refactored Methods

#### `captureAndExtractBeanData` (simplified)

```typescript
public async captureAndExtractBeanData(): Promise<Bean | null> {
  let currentStep = 'init';
  try {
    // Step 1: Camera capture
    currentStep = 'camera_permission';
    await this.uiAlert.showLoadingSpinner('AI_IMPORT_STEP_CAPTURING', true);

    const hasPermission = await this.uiImage.checkCameraPermission();
    if (!hasPermission) {
      await this.uiAlert.hideLoadingSpinner();
      return null;
    }

    currentStep = 'take_photo';
    const imageData = await Camera.getPhoto({ /* options */ });
    if (!imageData?.base64String) {
      await this.uiAlert.hideLoadingSpinner();
      return null;
    }

    // Step 2: OCR
    currentStep = 'ocr';
    this.uiAlert.setLoadingSpinnerMessage(
      this.translate.instant('AI_IMPORT_STEP_EXTRACTING'),
    );
    const ocrResult = await CapacitorPluginMlKitTextRecognition.detectText({
      base64Image: imageData.base64String,
    }) as TextDetectionResult;

    if (!ocrResult.text?.trim()) {
      await this.uiAlert.hideLoadingSpinner();
      await this.uiAlert.showMessage('AI_IMPORT_NO_TEXT_FOUND', /* ... */);
      return null;
    }

    // Step 3: Shared processing pipeline
    currentStep = 'processing';
    const bean = await this.processOcrAndExtractBean(
      [ocrResult],
      [ocrResult.text],
    );

    await this.uiAlert.hideLoadingSpinner();
    return bean;
  } catch (error: any) {
    // Error handling...
  }
}
```

#### `extractBeanDataFromImages` (simplified)

```typescript
public async extractBeanDataFromImages(
  photoPaths: string[],
  attachPhotos: boolean,
): Promise<{ bean: Bean; attachmentPaths?: string[] } | null> {
  let currentStep = 'init';
  try {
    // Step 1: OCR all photos
    currentStep = 'ocr';
    const { ocrResults, rawTexts } = await this.runOcrOnPhotos(photoPaths);

    if (ocrResults.length === 0) {
      await this.uiAlert.hideLoadingSpinner();
      await this.uiAlert.showMessage('AI_IMPORT_NO_TEXT_FOUND', /* ... */);
      if (!attachPhotos) await this.cleanupPhotos(photoPaths);
      return null;
    }

    // Step 2: Shared processing pipeline
    currentStep = 'processing';
    const bean = await this.processOcrAndExtractBean(ocrResults, rawTexts);

    // Step 3: Handle attachments
    if (!attachPhotos) {
      await this.cleanupPhotos(photoPaths);
      return { bean };
    }
    return { bean, attachmentPaths: photoPaths };
  } catch (error: any) {
    // Error handling...
  }
}
```

#### New Helper Method: `runOcrOnPhotos`

```typescript
/**
 * Run OCR on multiple photos and collect results.
 * Handles errors gracefully, skipping failed photos.
 */
private async runOcrOnPhotos(
  photoPaths: string[],
): Promise<{ ocrResults: TextDetectionResult[]; rawTexts: string[] }> {
  const ocrResults: TextDetectionResult[] = [];
  const rawTexts: string[] = [];

  for (let i = 0; i < photoPaths.length; i++) {
    this.uiAlert.setLoadingSpinnerMessage(
      this.translate.instant('AI_IMPORT_MULTI_PROCESSING_PHOTO', {
        current: i + 1,
        total: photoPaths.length,
      }),
    );

    // Read file, run OCR, collect results (existing logic)
    // Skip on error, continue with remaining photos
  }

  return { ocrResults, rawTexts };
}
```

---

## Step-by-Step Refactoring Approach

### Phase 1: Finding 4.1 - Break Down `extractAllFields`

1. **Define types** (TopLevelFieldsResult, OriginFieldsResult)
   - Add interfaces at top of field-extraction.service.ts

2. **Extract `extractTopLevelFields` method**
   - Move lines 67-145 (top-level extraction logic)
   - Update progress calls to use new method
   - Return structured result object

3. **Extract `extractOriginFields` method**
   - Move lines 147-186 (origin detection and extraction)
   - Include beanMix detection
   - Return structured result object

4. **Create `constructBeanFromExtractedData` method**
   - Move bean construction and validation logic
   - Handle empty bean_information array
   - Call existing `validateBean`

5. **Refactor `extractAllFields` to use new methods**
   - Should become ~20 lines of orchestration
   - Debug logging can stay or move to helper

6. **Add debug logging helpers** (optional)
   - `logRawOcrText(text: string)`
   - `logNormalizedText(text: string)`

7. **Run tests** to verify behavior unchanged

### Phase 2: Finding 6.3 - Eliminate Duplication

1. **Create `processOcrAndExtractBean` method**
   - Extract shared pipeline (enrich → detect → languages → extract)
   - Handle both single and multiple OCR results

2. **Create `runOcrOnPhotos` helper**
   - Extract OCR loop from `extractBeanDataFromImages`
   - Return structured result

3. **Refactor `captureAndExtractBeanData`**
   - Keep camera capture logic
   - Replace steps 3-6 with `processOcrAndExtractBean` call

4. **Refactor `extractBeanDataFromImages`**
   - Keep file reading/OCR loop (or use new helper)
   - Replace language/extraction steps with `processOcrAndExtractBean`

5. **Run tests** to verify behavior unchanged

### Phase 3: Cleanup

1. **Update error handling** to include new step names
2. **Review console.log statements** (related to finding 4.3)
3. **Add JSDoc comments** to new methods
4. **Run full test suite**

---

## Maintaining Existing Behavior

### Critical Considerations

1. **Sequential LLM calls must remain sequential**
   - The code review notes that CapgoLLM uses global event listeners
   - Parallel extraction causes event contamination
   - New structure maintains sequential extraction

2. **Settings-based field filtering must be preserved**
   - `params` (IBeanParameter) controls which fields are extracted
   - Refactored methods must pass params through the call chain

3. **Layout enrichment differences**
   - Single photo: `enrichWithLayout()`
   - Multiple photos: `enrichMultiplePhotos()`
   - New `processOcrAndExtractBean` handles both cases

4. **Progress indicator updates**
   - `updateProgress()` and `updateFieldProgress()` calls must remain
   - User sees extraction progress in loading spinner

5. **Error context preservation**
   - Current `currentStep` tracking for detailed error messages
   - Must be maintained in refactored methods

### Testing Strategy

1. **Unit tests for new methods**
   - `extractTopLevelFields` with various params configurations
   - `extractOriginFields` for SINGLE_ORIGIN and BLEND paths
   - `constructBeanFromExtractedData` for edge cases
   - `processOcrAndExtractBean` with single and multiple OCR results

2. **Integration tests**
   - Full flow from OCR text → Bean
   - Both entry points produce identical beans for same input

3. **Regression tests**
   - Existing OCR correction tests should pass
   - Existing metadata enrichment tests should pass

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/aiBeanImport/field-extraction.service.ts` | Add types, extract methods, refactor `extractAllFields` |
| `src/services/aiBeanImport/ai-bean-import.service.ts` | Add `processOcrAndExtractBean`, `runOcrOnPhotos`, refactor both entry points |

---

## Estimated Method Sizes After Refactoring

| Method | Before | After |
|--------|--------|-------|
| `extractAllFields` | ~150 lines | ~20 lines |
| `extractTopLevelFields` | N/A | ~60 lines |
| `extractOriginFields` | N/A | ~40 lines |
| `constructBeanFromExtractedData` | N/A | ~25 lines |
| `captureAndExtractBeanData` | ~130 lines | ~50 lines |
| `extractBeanDataFromImages` | ~160 lines | ~40 lines |
| `processOcrAndExtractBean` | N/A | ~40 lines |
| `runOcrOnPhotos` | N/A | ~50 lines |

Total new code is roughly equivalent to removed code, but responsibilities are now clearly separated.
