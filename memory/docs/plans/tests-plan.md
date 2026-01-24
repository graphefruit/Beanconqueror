# Test Implementation Plan for AI Bean Import Feature

## Overview

This plan addresses findings 7.1, 7.2, 7.3, 8.1, 8.2, 9.1, and 10.1 from the AI Bean Import code review. It provides a comprehensive strategy for improving test coverage, quality, and maintainability.

---

## 1. Research Findings

### 1.1 Existing Test Patterns in Beanconqueror

| Aspect | Finding |
|--------|---------|
| **Framework** | Jasmine 3.x with Karma runner |
| **Browser** | Chrome Headless (custom no-sandbox launcher) |
| **Commands** | `npm test` (headless), `npm run test:dev` (browser UI) |
| **Pattern** | AAA (Arrange-Act-Assert) - preferred over Given-When-Then |
| **Mocking** | Inline mock objects and factory functions; no spyOn patterns found |
| **Services** | `TestBed.configureTestingModule` + `TestBed.inject` |
| **Components** | `ComponentFixture` + `waitForAsync` + `CUSTOM_ELEMENTS_SCHEMA` |
| **Naming** | Nested `describe` blocks per method, `"should..."` test names |
| **Matchers** | `toBeTruthy`, `toBeFalse`, `toBeTrue`, `toBe`, `toContain`, `toBeNull`, `toBeDefined` |

### 1.2 AAA Pattern Confirmation

The codebase consistently uses the AAA (Arrange-Act-Assert) pattern. Examples from existing tests:

```typescript
// From ocr-metadata.service.spec.ts
it('should return false when blocks is empty', () => {
  // Arrange
  const result: TextDetectionResult = {
    text: 'Some text',
    blocks: [],
  };

  // Act & Assert (combined for simple cases)
  expect(service.shouldUseMetadata(result)).toBeFalse();
});
```

**Decision**: All new and refactored tests will use the AAA pattern with explicit comments for complex tests.

### 1.3 Mocking Strategy

Current approach uses:
- **Factory functions**: `createBlock()` helper to create test data
- **Mock objects**: Inline const objects like `mockExamples: MergedExamples`
- **No spy mocking**: Services are tested directly without mocking dependencies

**Recommendation for new tests**:
- Create factory functions for complex objects (`createMockBean()`, `createMockSettings()`)
- Use Jasmine spies (`spyOn`) for external dependencies like `CapgoLLM` and `Camera`
- Create a shared test utilities file for common helpers

---

## 2. Test Strategy by Service/Component

### 2.1 AIBeanImportService Tests (Finding 7.1)

**File**: `src/services/aiBeanImport/ai-bean-import.service.spec.ts`

**Dependencies to Mock**:
- `CapgoLLM` - Apple Intelligence LLM plugin
- `Camera` - Capacitor camera plugin
- `CapacitorPluginMlKitTextRecognition` - OCR plugin
- `UIImage`, `UIAlert`, `UIFileHelper`, `UILog` - UI services
- `TranslateService` - i18n
- `Platform` - Capacitor platform detection
- `FieldExtractionService`, `OcrMetadataService`, `AIImportExamplesService`

**Test Cases**:

```typescript
describe('AIBeanImportService', () => {
  describe('checkReadiness', () => {
    it('should return not ready with browser message when not on capacitor');
    it('should return not ready with Android message when on Android platform');
    it('should return ready when CapgoLLM readiness is "ready" on iOS');
    it('should return not ready when CapgoLLM readiness is not "ready"');
    it('should return not ready with Apple Intelligence message when CapgoLLM throws');
  });

  describe('detectLanguage', () => {
    // WHY: Language detection drives example selection, affecting extraction quality
    it('should return lowercase 2-letter language code when LLM returns valid code');
    it('should return null when LLM returns "unknown"');
    it('should return null when LLM returns code longer than 2 characters');
    it('should return null when LLM times out after 10 seconds');
    it('should clean up listeners after successful detection');
    it('should clean up listeners after timeout');
  });

  describe('getLanguagesToUse', () => {
    // WHY: Order matters - detected language first, then English, then UI language
    it('should return detected language first when provided');
    it('should always include English as second language');
    it('should include UI language as third option');
    it('should deduplicate when detected language equals English');
    it('should deduplicate when UI language equals detected language');
    it('should return only English and UI language when detected is null');
  });

  describe('captureAndExtractBeanData', () => {
    it('should return null and hide spinner when camera permission denied');
    it('should return null and hide spinner when no image data returned');
    it('should show no text found message when OCR returns empty text');
    it('should pass enriched text to field extraction when OCR has layout metadata');
    it('should throw detailed error with step name on failure');
  });

  describe('extractBeanDataFromImages', () => {
    // WHY: Multi-photo import has different flow from single capture
    it('should concatenate OCR text from multiple photos with section markers');
    it('should skip photos that fail to read with logging');
    it('should skip photos with suspiciously short base64 content');
    it('should show no text found message when all photos have no text');
    it('should clean up photos when not attaching and extraction fails');
    it('should return attachment paths when attachPhotos is true');
    it('should delete temp photos when attachPhotos is false');
  });

  describe('concatenateOCRResults', () => {
    it('should return single text without markers for one photo');
    it('should add "Label X of Y" markers for multiple photos');
  });
});
```

### 2.2 FieldExtractionService Tests (Finding 7.1)

**File**: `src/services/aiBeanImport/field-extraction.service.spec.ts`

**Dependencies to Mock**:
- `CapgoLLM` - for `sendLLMMessage`
- `UISettingsStorage` - for user settings
- `TranslateService`, `UILog`, `UIAlert`
- `AIImportExamplesService`, `TextNormalizationService`, `OCRCorrectionService`

**Test Cases**:

```typescript
describe('FieldExtractionService', () => {
  describe('extractAllFields', () => {
    // WHY: Main entry point - must coordinate all extraction steps correctly
    it('should apply pre-processing before extraction (normalize numbers, altitude, case)');
    it('should skip disabled fields based on bean_manage_parameters settings');
    it('should always extract name, roaster, and weight regardless of settings');
    it('should detect BLEND vs SINGLE_ORIGIN structure');
    it('should use per-field extraction for single origin beans');
    it('should use JSON prompt extraction for blend components');
    it('should ensure at least one bean_information entry exists');
  });

  describe('preProcess', () => {
    it('should apply number normalization before case normalization');
    it('should apply altitude normalization before case normalization');
    it('should apply OCR correction using provided examples');
    it('should apply case normalization last to preserve corrected terms');
  });

  describe('extractField', () => {
    it('should return null when field config not found');
    it('should return null when LLM returns "null" string');
    it('should return null when LLM returns "NOT_FOUND"');
    it('should return null when validation regex fails');
    it('should apply postProcess function when provided');
    it('should return cleaned value when no postProcess defined');
  });

  describe('extractNameAndRoaster', () => {
    // WHY: Combined extraction improves disambiguation between name and roaster
    it('should parse valid JSON response with both name and roaster');
    it('should handle markdown code blocks in JSON response');
    it('should return empty strings when JSON parsing fails');
    it('should sanitize null-like values to empty strings');
    it('should apply title case normalization to extracted values');
  });

  describe('extractBlendOrigins', () => {
    it('should parse JSON array of origin objects');
    it('should wrap single object in array if not already array');
    it('should return empty origin when JSON parsing fails');
    it('should sanitize each origin object fields');
    it('should only include percentage when between 0 and 100');
  });

  describe('extractSingleOriginInfo', () => {
    // WHY: Per-field extraction respects user settings
    it('should always extract country field');
    it('should skip region when params.region is false');
    it('should skip variety when params.variety is false');
    it('should skip processing when params.processing is false');
    it('should skip elevation when params.elevation is false');
    it('should skip farm when params.farm is false');
    it('should skip farmer when params.farmer is false');
  });

  describe('validateBean', () => {
    // WHY: Cross-field validation ensures data consistency
    it('should set beanMix to SINGLE_ORIGIN when one origin and beanMix is UNKNOWN');
    it('should set beanMix to BLEND when multiple origins detected');
    it('should ensure at least one bean_information entry exists');
  });

  describe('cleanResponse', () => {
    it('should trim whitespace from response');
    it('should extract content from markdown code blocks');
    it('should remove surrounding quotes');
    it('should remove NOT_FOUND appended to valid content');
    it('should remove colons from label prefixes');
  });

  describe('sanitizeStringField', () => {
    it('should return empty string for null or undefined');
    it('should return empty string for non-string values');
    it('should return empty string for "null" string (case-insensitive)');
    it('should return empty string for "not_found" string (case-insensitive)');
    it('should return empty string for "unknown" string (case-insensitive)');
    it('should return trimmed string for valid values');
  });

  describe('sanitizeElevation', () => {
    // WHY: Prevents variety numbers like 74158 from being misinterpreted as elevation
    it('should return empty string for null or undefined');
    it('should return empty string for null-like string values');
    it('should return empty string when any number is >= 5000');
    it('should return trimmed value when all numbers are valid elevations');
  });
});
```

### 2.3 AIImportExamplesService Tests (Finding 7.1)

**File**: `src/services/aiBeanImport/ai-import-examples.service.spec.ts`

**Dependencies to Mock**:
- `TranslateService` - for `getTranslation`

**Test Cases**:

```typescript
describe('AIImportExamplesService', () => {
  describe('getMergedExamples', () => {
    // WHY: Example merging affects LLM prompt quality and extraction accuracy
    it('should deduplicate language list before loading');
    it('should load examples from each unique language');
    it('should skip languages that fail to load');
    it('should return merged examples from multiple languages');
  });

  describe('loadExamplesForLanguage', () => {
    it('should return null when translation file not found');
    it('should return null when AI_IMPORT_PROMPT_EXAMPLES not in translations');
    it('should return null when AI_IMPORT_PROMPT_EXAMPLES is not an object');
    it('should parse comma-separated strings into arrays');
    it('should filter out empty strings after splitting');
    it('should return null when no valid example keys found');
  });

  describe('mergeExamples', () => {
    // WHY: Case-insensitive deduplication prevents duplicate entries
    it('should combine values from all example objects');
    it('should deduplicate values case-insensitively');
    it('should keep first occurrence casing when deduplicating');
    it('should return comma-separated string for each key');
    it('should return empty strings when no examples provided');
  });
});
```

### 2.4 Prompt Templates Tests (Finding 7.2)

**File**: `src/data/ai-import/ai-field-prompts.spec.ts`

**Test Cases**:

```typescript
describe('ai-field-prompts', () => {
  describe('buildFieldPrompt', () => {
    it('should throw error for unknown field name');
    it('should substitute example placeholders from examplesKeys');
    it('should substitute all example key placeholders even if not in examplesKeys');
    it('should substitute LANGUAGES placeholder with comma-separated list');
    it('should substitute OCR_TEXT placeholder with provided text');
    it('should preserve prompt structure after all substitutions');
  });

  describe('FIELD_PROMPTS.beanMix', () => {
    describe('postProcess', () => {
      it('should return "SINGLE_ORIGIN" for case-insensitive match');
      it('should return "BLEND" for case-insensitive match');
      it('should return null for invalid values');
    });
  });

  describe('FIELD_PROMPTS.weight', () => {
    describe('validation', () => {
      it('should match weight with grams unit');
      it('should match weight with kilograms unit');
      it('should match weight with ounces unit');
      it('should match weight with pounds unit');
      it('should match decimal weights');
    });
    describe('postProcess', () => {
      // WHY: OCR validation prevents LLM from hallucinating weights not in text
      it('should return null when number not found in value');
      it('should return null when extracted number not in OCR text');
      it('should return original value when number exists in OCR text');
    });
  });

  describe('FIELD_PROMPTS.bean_roasting_type', () => {
    describe('postProcess', () => {
      it('should return "FILTER" for case-insensitive match');
      it('should return "ESPRESSO" for case-insensitive match');
      it('should return "OMNI" for case-insensitive match');
      it('should return null for invalid values');
    });
  });

  describe('FIELD_PROMPTS.decaffeinated', () => {
    describe('postProcess', () => {
      it('should return true for "true" string');
      it('should return false for "false" string');
      it('should return null for other values');
    });
  });

  describe('FIELD_PROMPTS.cupping_points', () => {
    describe('postProcess', () => {
      // WHY: Prevents confusion with weight (e.g., "100g" is not a cupping score)
      it('should return null for scores below 80');
      it('should return null for scores 100 or above');
      it('should return null when score integer not in OCR text');
      it('should return value for valid scores between 80-99 present in OCR');
    });
  });

  describe('FIELD_PROMPTS.roastingDate', () => {
    describe('postProcess', () => {
      // WHY: Date validation prevents expiration dates from being used as roast dates
      it('should return null for unparseable dates');
      it('should return null for future dates');
      it('should return null for dates older than one year');
      it('should return ISO string for valid recent dates');
    });
  });

  describe('FIELD_PROMPTS.elevation', () => {
    describe('postProcess', () => {
      // WHY: Filters variety numbers like 74158 from being misread as altitude
      it('should remove linebreaks from value');
      it('should remove thousand separators (dots and commas)');
      it('should normalize "2300 MASL 2400 MASL" to "2300-2400 MASL" format');
      it('should return null for empty string after cleanup');
      it('should return null when any number is >= 5000');
      it('should return cleaned value for valid elevations');
    });
  });

  describe('FIELD_PROMPTS.region', () => {
    describe('postProcess', () => {
      it('should remove "Region" suffix from value (case-insensitive)');
      it('should remove "Region" prefix from value (case-insensitive)');
      it('should trim result after removal');
    });
  });
});
```

### 2.5 AiImportPhotoGalleryComponent Tests (Finding 7.3)

**File**: `src/components/ai-import-photo-gallery/ai-import-photo-gallery.component.spec.ts`

**Dependencies to Mock**:
- `ModalController` - for dismiss
- `Camera` - Capacitor camera plugin
- `UIImage`, `UIFileHelper`, `UIAlert`, `UILog`
- `TranslateService`

**Test Cases**:

```typescript
describe('AiImportPhotoGalleryComponent', () => {
  describe('initialization', () => {
    it('should create component with empty photoPaths array');
    it('should initialize attachPhotos to false');
    it('should set maxPhotos to 4');
  });

  describe('addPhoto', () => {
    // WHY: Max limit prevents memory issues and ensures reasonable processing time
    it('should not add photo when already at maxPhotos limit');
    it('should show option chooser when under limit');
    it('should capture photo when user selects TAKE option');
    it('should select from library when user selects CHOOSE option');
    it('should save base64 image to internal storage');
    it('should add saved path to photoPaths array');
    it('should log error when camera returns error (not cancel)');
    it('should silently handle user cancellation');
    it('should update slider after adding photo');
  });

  describe('removePhoto', () => {
    it('should delete file from internal storage');
    it('should remove path from photoPaths array at given index');
    it('should continue if file deletion fails');
    it('should update slider after removing photo');
  });

  describe('startAnalysis', () => {
    it('should dismiss modal with photoPaths and attachPhotos data');
    it('should dismiss with "confirm" role');
    it('should use component ID for dismiss');
  });

  describe('cancel', () => {
    // WHY: Cleanup prevents orphaned temp files from consuming storage
    it('should delete all photos in photoPaths array');
    it('should continue cleanup even if individual deletions fail');
    it('should dismiss modal with null data');
    it('should dismiss with "cancel" role');
  });

  describe('attachPhotos toggle', () => {
    it('should toggle attachPhotos property when checkbox changed');
    it('should include attachPhotos value in startAnalysis dismiss data');
  });
});
```

---

## 3. Test Refactoring Strategy

### 3.1 Fixing Test Names (Finding 8.1)

**Before → After Examples**:

| File | Before | After |
|------|--------|-------|
| `ocr-metadata.service.spec.ts` | `'should be created'` | `'should be injectable via TestBed'` |
| `ocr-correction.service.spec.ts` | `'should match exact country name'` | `'should return properly cased country when exact match found case-insensitively'` |
| `ocr-correction.service.spec.ts` | `'should correct 0/O OCR error'` | `'should match Colombia when input has zero instead of O (C0lombia → Colombia)'` |
| `text-normalization.service.spec.ts` | `'should handle altitude ranges'` | `'should convert altitude range with spaces to hyphenated MASL format (1.700 - 1.900m → 1700-1900 MASL)'` |

### 3.2 Adding Test Documentation (Finding 8.2)

**Pattern for WHY Comments**:

```typescript
describe('edge cases', () => {
  it('should handle zero height blocks gracefully', () => {
    // WHY: ML Kit sometimes returns blocks with zero height for malformed OCR
    // results or empty lines. Dividing by zero height would cause NaN.

    // Arrange
    const result: TextDetectionResult = {
      text: 'Text',
      blocks: [
        createBlock('Text', 0, 0, 100, 0), // Zero height block
        createBlock('More', 0, 10, 100, 50),
      ],
    };

    // Act
    const enriched = service.enrichWithLayout(result);

    // Assert
    expect(enriched).toBeDefined();
  });
});
```

**Places Requiring WHY Comments**:
- Edge cases (zero values, empty arrays, null inputs)
- OCR-specific behaviors (character confusion patterns)
- Validation thresholds (why 5000m max elevation, why 80-99 cupping score range)
- Sequential extraction (why not parallel - CapgoLLM global listener collision)

### 3.3 Removing Overlapping Tests (Finding 9.1)

**Current Overlap**:

In `ocr-correction.service.spec.ts`:
- `fuzzyMatchCountry` tests: `'should correct 0/O OCR error'`, `'should correct 1/l OCR error'`
- `correctOCRErrors` test: `'should correct multiple OCR errors in text'` (uses `'C0lombia 6esha Natural'`)

**Proposed Redesign**:

```typescript
describe('OCRCorrectionService', () => {
  describe('generateVariants', () => {
    // WHY: These tests verify individual character substitution patterns work
    // Each test covers ONE specific OCR confusion pattern in isolation
    describe('character substitution patterns', () => {
      it('should generate O variant when input contains digit 0');
      it('should generate l and I variants when input contains digit 1');
      it('should generate S variant when input contains digit 5');
      it('should generate G variant when input contains digit 6');
      it('should generate B variant when input contains digit 8');
      it('should generate l and 1 variants when input contains lowercase t');
      it('should generate m variant when input contains rn sequence');
    });
  });

  describe('fuzzyMatchCountry', () => {
    // WHY: Tests verify country matching using generated variants
    // Focus on MATCHING BEHAVIOR, not variant generation (covered above)
    it('should return properly cased country for exact case-insensitive match');
    it('should return matched country when OCR-corrupted input has matching variant');
    it('should return null when no country matches any generated variant');
  });

  describe('fuzzyMatchVariety', () => {
    // Parallel structure to fuzzyMatchCountry - matching behavior only
    it('should return properly cased variety for exact case-insensitive match');
    it('should return matched variety when OCR-corrupted input has matching variant');
    it('should return null when no variety matches any generated variant');
  });

  describe('fuzzyMatchProcessing', () => {
    // Parallel structure
    it('should return properly cased processing method for exact case-insensitive match');
    it('should return null when no processing method matches');
  });

  describe('correctOCRErrors', () => {
    // WHY: Tests the composition of all correction behaviors on full text
    // Each test focuses on ONE aspect of full-text correction
    it('should apply country corrections to matching words in text');
    it('should apply variety corrections to matching words in text');
    it('should apply processing corrections to matching words in text');
    it('should preserve words that do not match any known term');
    it('should handle text with no correctable terms');
  });
});
```

### 3.4 AAA Pattern Refactoring (Finding 10.1)

**Before** (from `ocr-metadata.service.spec.ts`):

```typescript
it('should classify large text correctly', () => {
  const result: TextDetectionResult = {
    text: 'BIG\nsmall',
    blocks: [
      createBlock('BIG', 0, 0, 200, 100),
      createBlock('small', 0, 120, 200, 140),
    ],
  };

  const enriched = service.enrichWithLayout(result);

  expect(enriched.enrichedText).toContain('**LARGE:**');
  expect(enriched.enrichedText).toContain('**SMALL:**');
});
```

**After** (with explicit AAA comments):

```typescript
it('should classify blocks by relative height into LARGE and SMALL categories', () => {
  // Arrange
  const largeBlock = createBlock('BIG', 0, 0, 200, 100);    // Height: 100
  const smallBlock = createBlock('small', 0, 120, 200, 140); // Height: 20
  const result: TextDetectionResult = {
    text: 'BIG\nsmall',
    blocks: [largeBlock, smallBlock],
  };

  // Act
  const enriched = service.enrichWithLayout(result);

  // Assert
  expect(enriched.enrichedText).toContain('**LARGE:**');
  expect(enriched.enrichedText).toContain('**SMALL:**');
});
```

---

## 4. Test Utilities and Helpers

### 4.1 Proposed Shared Test Utilities

**File**: `src/services/aiBeanImport/test-utils/ai-import-test-helpers.ts`

```typescript
import { MergedExamples } from '../ai-import-examples.service';
import { TextDetectionResult, Block } from '../ocr-metadata.service';
import { Bean } from '../../../classes/bean/bean';
import { IBeanInformation } from '../../../interfaces/bean/iBeanInformation';
import { IBeanParameter } from '../../../interfaces/parameter/iBeanParameter';

/**
 * Create a mock Block with specified bounding box.
 * @param text Block text content
 * @param left Left coordinate
 * @param top Top coordinate
 * @param right Right coordinate
 * @param bottom Bottom coordinate
 * @param recognizedLanguage Optional language code (default: 'en')
 */
export function createBlock(
  text: string,
  left: number,
  top: number,
  right: number,
  bottom: number,
  recognizedLanguage: string = 'en',
): Block {
  return {
    text,
    boundingBox: { left, top, right, bottom },
    recognizedLanguage,
    lines: [],
  };
}

/**
 * Create a mock TextDetectionResult from text and blocks.
 */
export function createTextDetectionResult(
  text: string,
  blocks: Block[],
): TextDetectionResult {
  return { text, blocks };
}

/**
 * Create mock MergedExamples with default English values.
 * Override specific keys as needed.
 */
export function createMockExamples(
  overrides: Partial<MergedExamples> = {},
): MergedExamples {
  return {
    ORIGINS: 'Colombia, Ethiopia, Kenya, Brazil, Guatemala',
    PROCESSING_METHODS: 'Washed, Natural, Honey, Anaerobic',
    VARIETIES: 'Bourbon, Gesha, SL-28, Typica, Caturra',
    ROASTING_TYPE_FILTER_KEYWORDS: 'Filter, Pour Over',
    ROASTING_TYPE_ESPRESSO_KEYWORDS: 'Espresso',
    ROASTING_TYPE_OMNI_KEYWORDS: 'Omni',
    DECAF_KEYWORDS: 'Decaf, Decaffeinated',
    BLEND_KEYWORDS: 'Blend, House Blend',
    SINGLE_ORIGIN_KEYWORDS: 'Single Origin',
    PRODUCER_KEYWORDS: 'Producer, Farmer, Cooperative',
    ROASTDATE_KEYWORDS: 'Roast date, Roasted on, Freshly roasted',
    ROASTER_KEYWORDS: 'Roastery, Coffee Roasters, Kaffeerösterei',
    ...overrides,
  };
}

/**
 * Create a mock Bean with default values.
 * Override specific properties as needed.
 */
export function createMockBean(overrides: Partial<Bean> = {}): Bean {
  const bean = new Bean();
  Object.assign(bean, overrides);
  return bean;
}

/**
 * Create a mock IBeanInformation with empty/default values.
 */
export function createEmptyBeanInformation(): IBeanInformation {
  return {
    country: '',
    region: '',
    farm: '',
    farmer: '',
    elevation: '',
    harvest_time: '',
    variety: '',
    processing: '',
    certification: '',
    purchasing_price: 0,
    fob_price: 0,
  } as IBeanInformation;
}

/**
 * Create mock IBeanParameter with all fields enabled.
 * Override specific fields as needed.
 */
export function createMockBeanParams(
  overrides: Partial<IBeanParameter> = {},
): IBeanParameter {
  return {
    bean_information: true,
    roaster: true,
    bean_roasting_type: true,
    aromatics: true,
    decaffeinated: true,
    cupping_points: true,
    roastingDate: true,
    region: true,
    variety: true,
    processing: true,
    elevation: true,
    farm: true,
    farmer: true,
    ...overrides,
  } as IBeanParameter;
}

/**
 * Create a mock settings object with bean parameters.
 */
export function createMockSettings(params: Partial<IBeanParameter> = {}) {
  return {
    bean_manage_parameters: createMockBeanParams(params),
  };
}
```

### 4.2 Mock Service Factories

**File**: `src/services/aiBeanImport/test-utils/mock-services.ts`

```typescript
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

/**
 * Create a mock TranslateService for testing.
 */
export function createMockTranslateService(
  translations: Record<string, any> = {},
): jasmine.SpyObj<TranslateService> {
  const spy = jasmine.createSpyObj('TranslateService', [
    'instant',
    'getTranslation',
  ]);

  spy.instant.and.callFake((key: string) => translations[key] || key);
  spy.getTranslation.and.callFake((lang: string) => {
    return of(translations[lang] || {});
  });
  spy.currentLang = 'en';

  return spy;
}

/**
 * Create a mock UILog that captures log calls.
 */
export function createMockUILog(): jasmine.SpyObj<any> & { logs: string[]; errors: string[] } {
  const logs: string[] = [];
  const errors: string[] = [];

  const spy = jasmine.createSpyObj('UILog', ['log', 'error']);
  spy.log.and.callFake((msg: string) => logs.push(msg));
  spy.error.and.callFake((msg: string) => errors.push(msg));

  return Object.assign(spy, { logs, errors });
}

/**
 * Create a mock CapgoLLM for testing.
 */
export function createMockCapgoLLM(response: string): any {
  return {
    setModel: jasmine.createSpy('setModel').and.returnValue(Promise.resolve()),
    createChat: jasmine.createSpy('createChat').and.returnValue(Promise.resolve({ id: 'test-chat' })),
    sendMessage: jasmine.createSpy('sendMessage').and.returnValue(Promise.resolve()),
    addListener: jasmine.createSpy('addListener').and.callFake(
      (event: string, callback: Function) => {
        if (event === 'textFromAi') {
          setTimeout(() => callback({ text: response }), 10);
        } else if (event === 'aiFinished') {
          setTimeout(() => callback({}), 20);
        }
        return Promise.resolve({ remove: jasmine.createSpy('remove') });
      }
    ),
  };
}
```

---

## 5. Implementation Order

### Phase 1: Test Infrastructure (Day 1)
1. Create `src/services/aiBeanImport/test-utils/ai-import-test-helpers.ts`
2. Create `src/services/aiBeanImport/test-utils/mock-services.ts`
3. Export utilities from `src/services/aiBeanImport/test-utils/index.ts`

### Phase 2: Core Service Tests (Days 2-4)
1. `ai-import-examples.service.spec.ts` (smallest, easiest to start)
2. `ai-field-prompts.spec.ts` (pure functions, no DI complexity)
3. `field-extraction.service.spec.ts` (complex but critical)
4. `ai-bean-import.service.spec.ts` (most complex, many dependencies)

### Phase 3: Component Tests (Day 5)
1. `ai-import-photo-gallery.component.spec.ts`

### Phase 4: Refactor Existing Tests (Day 6)
1. Refactor `ocr-correction.service.spec.ts` to remove overlaps
2. Refactor `ocr-metadata.service.spec.ts` with AAA comments
3. Refactor `text-normalization.service.spec.ts` with AAA comments
4. Update all test names to be more descriptive

### Phase 5: Documentation (Day 7)
1. Add WHY comments to all edge case tests
2. Add architectural comments explaining sequential extraction
3. Review and finalize all test documentation

---

## 6. Success Criteria

- [ ] All new test files pass `npm test`
- [ ] No test overlaps between `generateVariants`, `fuzzyMatch*`, and `correctOCRErrors`
- [ ] All tests follow AAA pattern with explicit comments
- [ ] All test names are descriptive (no generic "should be created")
- [ ] All edge case tests have WHY comments explaining the scenario
- [ ] Test utilities are reusable across all test files
- [ ] Coverage for critical services: AIBeanImportService, FieldExtractionService, AIImportExamplesService
- [ ] Coverage for prompt templates: buildFieldPrompt, FIELD_PROMPTS postProcess functions
- [ ] Coverage for component: AiImportPhotoGalleryComponent

---

## 7. Notes on Mocking Strategy

### External Plugins (CapgoLLM, Camera, MLKit)

These plugins use global singletons that are difficult to mock via Angular DI. Recommended approach:

1. Create wrapper methods in services that call the plugins
2. In tests, spy on the wrapper methods instead of the plugins directly
3. For integration-level tests, use the mock factories in `mock-services.ts`

### Settings Integration

The `UISettingsStorage.getSettings()` call affects which fields are extracted. Tests should:
1. Mock `UISettingsStorage` to return controlled `bean_manage_parameters`
2. Test both enabled and disabled field scenarios
3. Verify that disabled fields are not extracted even when present in OCR text

### Async LLM Communication

The `sendLLMMessage` method uses listeners and timeouts. Tests should:
1. Mock the listener pattern to immediately resolve
2. Test timeout scenarios by delaying mock responses
3. Verify cleanup of listeners in success and failure paths
