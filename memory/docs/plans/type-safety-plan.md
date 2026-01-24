# Type Safety Improvements Plan

This plan addresses finding 4.4 from the AI bean import code review: "Type Assertions with `as any` Lose Type Safety".

## Overview

The AI import feature uses `as any` type assertions in multiple places, which bypasses TypeScript's type checking and can lead to runtime errors. This plan proposes proper type definitions to eliminate these unsafe casts.

---

## 1. Inventory of `as any` Usages

### 1.1 `beanMix` Type Assertions (5 occurrences)

**File:** `src/services/aiBeanImport/field-extraction.service.ts`

| Line | Code | Issue |
|------|------|-------|
| 159 | `bean.beanMix = beanMix \|\| ('UNKNOWN' as any);` | String literal doesn't match enum |
| 806 | `bean.beanMix === ('UNKNOWN' as any)` | Comparison uses wrong type |
| 808 | `bean.beanMix = 'SINGLE_ORIGIN' as any;` | String literal doesn't match enum |
| 812 | `bean.beanMix !== ('BLEND' as any)` | Comparison uses wrong type |
| 813 | `bean.beanMix = 'BLEND' as any;` | String literal doesn't match enum |

**Root Cause:**
The LLM returns uppercase strings like `'SINGLE_ORIGIN'` and `'BLEND'`, but `BEAN_MIX_ENUM` has values:
```typescript
export enum BEAN_MIX_ENUM {
  UNKNOWN = 'Unknown',      // Not 'UNKNOWN'
  SINGLE_ORIGIN = 'Single Origin',  // Not 'SINGLE_ORIGIN'
  BLEND = 'Blend'           // Not 'BLEND'
}
```

### 1.2 Error Object Type Assertions (4 occurrences)

**File:** `src/services/aiBeanImport/ai-bean-import.service.ts`

| Line | Code | Issue |
|------|------|-------|
| 242 | `(detailedError as any).step = currentStep;` | Error type lacks `step` property |
| 243 | `(detailedError as any).originalError = error;` | Error type lacks `originalError` property |
| 415 | `(detailedError as any).step = currentStep;` | Same as line 242 |
| 416 | `(detailedError as any).originalError = error;` | Same as line 243 |

**Root Cause:**
The standard `Error` type doesn't have `step` or `originalError` properties, so the code bypasses type checking to add them.

### 1.3 Dynamic Property Assignment (1 occurrence)

**File:** `src/services/aiBeanImport/ai-bean-import.service.ts`

| Line | Code | Issue |
|------|------|-------|
| 755 | `(bean as any)[key] = value;` | Dynamic key assignment bypasses type checking |

**Root Cause:**
Iterating over `ALLOWED_PROPERTIES` array and assigning to bean dynamically requires type assertion.

### 1.4 Test File (1 occurrence - lower priority)

**File:** `src/services/aiBeanImport/ocr-metadata.service.spec.ts`

| Line | Code | Issue |
|------|------|-------|
| 34 | `blocks: undefined as any` | Creating test data with missing required property |

---

## 2. Proposed Solutions

### 2.1 Solution for `beanMix` - Create Mapping Function

**Approach:** Create a helper function that maps LLM output strings to proper `BEAN_MIX_ENUM` values.

**New File:** `src/services/aiBeanImport/type-mappings.ts`

```typescript
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';
import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';

/**
 * Maps LLM-returned string values to BEAN_MIX_ENUM values.
 * Handles both uppercase LLM output and direct enum values.
 */
export function mapToBeanMix(value: string | null | undefined): BEAN_MIX_ENUM {
  if (!value) {
    return BEAN_MIX_ENUM.UNKNOWN;
  }

  const normalized = value.toUpperCase().replace(/[\s_-]+/g, '_');

  switch (normalized) {
    case 'SINGLE_ORIGIN':
      return BEAN_MIX_ENUM.SINGLE_ORIGIN;
    case 'BLEND':
      return BEAN_MIX_ENUM.BLEND;
    case 'UNKNOWN':
    default:
      return BEAN_MIX_ENUM.UNKNOWN;
  }
}

/**
 * Maps LLM-returned string values to BEAN_ROASTING_TYPE_ENUM values.
 * Handles both uppercase LLM output and direct enum values.
 */
export function mapToRoastingType(value: string | null | undefined): BEAN_ROASTING_TYPE_ENUM {
  if (!value) {
    return BEAN_ROASTING_TYPE_ENUM.UNKNOWN;
  }

  const normalized = value.toUpperCase();

  switch (normalized) {
    case 'FILTER':
      return BEAN_ROASTING_TYPE_ENUM.FILTER;
    case 'ESPRESSO':
      return BEAN_ROASTING_TYPE_ENUM.ESPRESSO;
    case 'OMNI':
      return BEAN_ROASTING_TYPE_ENUM.OMNI;
    default:
      return BEAN_ROASTING_TYPE_ENUM.UNKNOWN;
  }
}
```

**Changes to `field-extraction.service.ts`:**

```typescript
// Add import at top
import { mapToBeanMix } from './type-mappings';

// Line 159: Replace
bean.beanMix = beanMix || ('UNKNOWN' as any);
// With:
bean.beanMix = mapToBeanMix(beanMix);

// Line 806-808: Replace
if (
  bean.bean_information.length === 1 &&
  (!bean.beanMix || bean.beanMix === ('UNKNOWN' as any))
) {
  bean.beanMix = 'SINGLE_ORIGIN' as any;
}
// With:
if (
  bean.bean_information.length === 1 &&
  (!bean.beanMix || bean.beanMix === BEAN_MIX_ENUM.UNKNOWN)
) {
  bean.beanMix = BEAN_MIX_ENUM.SINGLE_ORIGIN;
}

// Line 812-813: Replace
if (bean.bean_information.length > 1 && bean.beanMix !== ('BLEND' as any)) {
  bean.beanMix = 'BLEND' as any;
}
// With:
if (bean.bean_information.length > 1 && bean.beanMix !== BEAN_MIX_ENUM.BLEND) {
  bean.beanMix = BEAN_MIX_ENUM.BLEND;
}
```

### 2.2 Solution for Error Objects - Create Custom Error Interface

**Approach:** Create an `AIBeanImportError` interface that extends `Error` with the additional properties.

**New File:** `src/services/aiBeanImport/ai-bean-import-error.ts`

```typescript
/**
 * Steps in the AI bean import process.
 * Used for error tracking and debugging.
 */
export type AIImportStep =
  | 'init'
  | 'camera_permission'
  | 'take_photo'
  | 'ocr_setup'
  | 'ocr'
  | 'ocr_metadata'
  | 'language_detection'
  | 'multi_step_extraction';

/**
 * Custom error interface for AI bean import operations.
 * Extends standard Error with additional context for debugging.
 */
export interface AIBeanImportError extends Error {
  /** The step in the import process where the error occurred */
  step: AIImportStep;
  /** The original error that was caught, if any */
  originalError?: unknown;
}

/**
 * Creates an AIBeanImportError with proper typing.
 *
 * @param message - Error message
 * @param step - The import step where the error occurred
 * @param originalError - The original error that was caught
 * @returns A properly typed AIBeanImportError
 */
export function createAIBeanImportError(
  message: string,
  step: AIImportStep,
  originalError?: unknown
): AIBeanImportError {
  const error = new Error(message) as AIBeanImportError;
  error.step = step;
  error.originalError = originalError;
  return error;
}
```

**Changes to `ai-bean-import.service.ts`:**

```typescript
// Add import at top
import { AIImportStep, createAIBeanImportError } from './ai-bean-import-error';

// Change currentStep type declaration
let currentStep: AIImportStep = 'init';

// Lines 241-244: Replace
const detailedError = new Error(`[${currentStep}] ${errorMessage}`);
(detailedError as any).step = currentStep;
(detailedError as any).originalError = error;
throw detailedError;
// With:
throw createAIBeanImportError(
  `[${currentStep}] ${errorMessage}`,
  currentStep,
  error
);

// Lines 414-417: Apply the same pattern
throw createAIBeanImportError(
  `[${currentStep}] ${errorMessage}`,
  currentStep,
  error
);
```

### 2.3 Solution for Dynamic Property Assignment

**Approach:** Use `keyof Bean` type to ensure type safety while allowing dynamic property access.

**Changes to `ai-bean-import.service.ts`:**

```typescript
// Change ALLOWED_PROPERTIES type and make it readonly tuple
private static readonly ALLOWED_PROPERTIES = [
  'name',
  'roaster',
  'bean_roasting_type',
  'beanMix',
  'aromatics',
  'decaffeinated',
  'weight',
  'url',
  'cupping_points',
  'note',
  'bean_information',
] as const;

// Create a type from the allowed properties
type AllowedBeanProperty = typeof AIBeanImportService.ALLOWED_PROPERTIES[number];

// Line 755: Replace loop with type-safe assignment
for (const key of AIBeanImportService.ALLOWED_PROPERTIES) {
  const value = extracted[key];
  if (value !== null && value !== undefined) {
    (bean as Record<AllowedBeanProperty, unknown>)[key] = value;
  }
}
```

**Alternative (simpler) approach** - explicitly type the key:

```typescript
for (const key of AIBeanImportService.ALLOWED_PROPERTIES) {
  const value = extracted[key];
  if (value !== null && value !== undefined) {
    bean[key as keyof Bean] = value;
  }
}
```

### 2.4 Solution for Test File (Lower Priority)

**Changes to `ocr-metadata.service.spec.ts`:**

Create a proper type for partial test data:

```typescript
// Use Partial<TextDetectionResult> for test data
const testResult: Partial<TextDetectionResult> = {
  text: 'Test text',
  // blocks intentionally omitted for this test case
};

// Or use a helper to create test data
function createTestResult(text: string, blocks?: TextBlock[]): TextDetectionResult {
  return {
    text,
    blocks: blocks ?? [],
  };
}
```

---

## 3. Implementation Steps

### Step 1: Create Type Mappings File
1. Create `src/services/aiBeanImport/type-mappings.ts`
2. Add `mapToBeanMix` function
3. Add `mapToRoastingType` function (for consistency, though no `as any` exists there)
4. Add unit tests for mapping functions

### Step 2: Create Error Interface File
1. Create `src/services/aiBeanImport/ai-bean-import-error.ts`
2. Define `AIImportStep` type
3. Define `AIBeanImportError` interface
4. Add `createAIBeanImportError` factory function
5. Add unit tests for error creation

### Step 3: Update field-extraction.service.ts
1. Import `mapToBeanMix` and `BEAN_MIX_ENUM`
2. Replace all 5 `beanMix` type assertions with proper enum usage
3. Verify no TypeScript errors
4. Run existing tests

### Step 4: Update ai-bean-import.service.ts
1. Import `AIImportStep` and `createAIBeanImportError`
2. Type `currentStep` variable as `AIImportStep`
3. Replace 4 error type assertions with factory function
4. Address dynamic property assignment
5. Verify no TypeScript errors
6. Run existing tests

### Step 5: Update Test File (Optional)
1. Update `ocr-metadata.service.spec.ts` to use proper partial types
2. Run tests to verify

### Step 6: Verification
1. Run `npm run lint` to check for any remaining type issues
2. Run `npm test` to ensure all tests pass
3. Verify no `as any` usages remain in AI import files (except test utilities if needed)

---

## 4. File Summary

### New Files to Create
| File | Purpose |
|------|---------|
| `src/services/aiBeanImport/type-mappings.ts` | LLM output to enum mapping functions |
| `src/services/aiBeanImport/ai-bean-import-error.ts` | Custom error type with step tracking |

### Files to Modify
| File | Changes |
|------|---------|
| `src/services/aiBeanImport/field-extraction.service.ts` | Replace 5 `beanMix` type assertions |
| `src/services/aiBeanImport/ai-bean-import.service.ts` | Replace 4 error type assertions, 1 dynamic assignment |
| `src/services/aiBeanImport/ocr-metadata.service.spec.ts` | Update test data typing (optional) |

---

## 5. Benefits

1. **Compile-time type checking** - TypeScript will catch mismatched enum values
2. **IDE support** - Better autocompletion and refactoring support
3. **Maintainability** - Centralized mapping logic is easier to update
4. **Documentation** - Types serve as documentation for valid values
5. **Error tracking** - Properly typed errors enable better error handling downstream

---

## 6. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Mapping function returns wrong enum | Unit tests for all mapping cases |
| Missing import step values | Comprehensive `AIImportStep` union type |
| Breaking changes to error handling | Error interface extends standard Error |
| Dynamic assignment still unsafe | `as const` tuple ensures only known keys |
