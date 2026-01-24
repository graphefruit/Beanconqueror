# Error Handling Improvements for AI Bean Import Feature

## Executive Summary

This plan addresses findings 4.5 (Silent Error Swallowing) and 4.6 (Inconsistent Error Handling Strategy) from the AI bean import code review. After analyzing the codebase, I recommend a **layered error handling strategy** that distinguishes between critical errors (user-facing operations), recoverable errors (extraction failures), and cosmetic errors (UI updates). This approach balances consistency with pragmatic UX considerations.

## Current State Analysis

### Error Handling Patterns Found

| Pattern | Location | Behavior | Count |
|---------|----------|----------|-------|
| Throw with context | `captureAndExtractBeanData()`, `extractBeanDataFromImages()` | Re-throws with step info | 2 |
| Return null + log | `extractField()`, `detectLanguage()`, `analyzeTextWithLLM()` | Logs error, returns null | 3 |
| Silent catch | `updateProgress()`, `updateFieldProgress()` | Catches and ignores | 2 |
| Log and continue | `cleanupPhotos()` | Logs error, continues loop | 1 |
| Partial silent | `addPhoto()` | Only logs non-cancel errors | 1 |

### Identified Issues

#### 4.5 Silent Error Swallowing

1. **`updateProgress()`** (field-extraction.service.ts:841-849)
   - Silently swallows translation lookup failures
   - Risk: Missing translations go unnoticed during development

2. **`updateFieldProgress()`** (field-extraction.service.ts:854-871)
   - Same issue as above
   - Risk: Same as above

3. **`addPhoto()`** (ai-import-photo-gallery.component.ts:89-99)
   - Only logs errors whose message doesn't contain "cancel"
   - Outer catch block (lines 97-99) completely swallows errors
   - Risk: Real errors (permission issues, storage failures) go unnoticed

4. **`cleanupPhotos()`** (ai-bean-import.service.ts:438-447)
   - Logs error but continues with loop
   - **This is acceptable** - cleanup should be resilient and not interrupt user flow

#### 4.6 Inconsistent Error Handling Strategy

| Method | Strategy | Should Change? |
|--------|----------|----------------|
| `extractField()` | Returns null | No - correct for optional field extraction |
| `extractAllFields()` | Can throw (implicit) | Needs explicit error boundary |
| `captureAndExtractBeanData()` | Throws with context | No - correct for top-level orchestration |
| `detectLanguage()` | Returns null | No - correct for optional enhancement |
| `parseNameAndRoasterResponse()` | Returns empty object | No - correct for parsing fallback |
| `parseBlendOriginsResponse()` | Returns empty array | No - correct for parsing fallback |

## Recommended Strategy

### Error Categories

#### 1. **Critical Errors** (Must throw, show user feedback)
- Camera/permission failures
- Complete extraction failure (no data at all)
- Storage corruption

**Strategy**: Throw with context, catch at top level, show user-friendly message

#### 2. **Recoverable Errors** (Return null/default, log for debugging)
- Individual field extraction failures
- Language detection failures
- JSON parsing failures

**Strategy**: Log error, return null/empty, let caller decide if critical

#### 3. **Cosmetic Errors** (Log in development, silent in production)
- Translation lookup failures for progress messages
- Slider update failures

**Strategy**: Log with `console.warn` or debug flag, never interrupt user

### Harmonization Recommendation

**Yes, harmonize within categories**, but different categories should behave differently. The current inconsistency exists because different error types require different handling. What needs fixing is:

1. Silent errors that hide bugs (translation failures should log)
2. Missing error boundaries that could crash the app
3. Inconsistent logging levels (some use `this.uiLog.error`, others silent)

## Implementation Plan

### Phase 1: Add Logging to Silent Failures

#### 1.1 Update `updateProgress()` (field-extraction.service.ts)

**Current:**
```typescript
private updateProgress(stepKey: string): void {
  try {
    const stepName = this.translate.instant(`AI_IMPORT_STEP_${stepKey}`);
    const baseMessage = this.translate.instant('AI_IMPORT_STEP_ANALYZING');
    this.uiAlert.setLoadingSpinnerMessage(`${baseMessage} - ${stepName}`);
  } catch (e) {
    // Silently fail if translation not found
  }
}
```

**Proposed:**
```typescript
private updateProgress(stepKey: string): void {
  try {
    const stepName = this.translate.instant(`AI_IMPORT_STEP_${stepKey}`);
    const baseMessage = this.translate.instant('AI_IMPORT_STEP_ANALYZING');
    this.uiAlert.setLoadingSpinnerMessage(`${baseMessage} - ${stepName}`);
  } catch (e) {
    // Log in development to catch missing translations early
    console.warn(`Translation missing for AI_IMPORT_STEP_${stepKey}: ${e}`);
  }
}
```

**Rationale**: Using `console.warn` instead of `this.uiLog.error` since this is a cosmetic issue, not a data issue. Developers will see it in Xcode/browser console, but it won't pollute user-visible logs.

#### 1.2 Update `updateFieldProgress()` (field-extraction.service.ts)

**Current:**
```typescript
private updateFieldProgress(prefix: string, fieldName: string): void {
  try {
    // ... translation logic ...
  } catch (e) {
    // Silently fail if translation not found
  }
}
```

**Proposed:**
```typescript
private updateFieldProgress(prefix: string, fieldName: string): void {
  try {
    // ... translation logic ...
  } catch (e) {
    // Log in development to catch missing translations early
    console.warn(`Translation missing for AI_IMPORT_FIELD_${fieldName.toUpperCase()}: ${e}`);
  }
}
```

#### 1.3 Update `addPhoto()` (ai-import-photo-gallery.component.ts)

**Current (inner catch):**
```typescript
} catch (e: any) {
  // User cancelled - check if it's actually an error
  if (e?.message && !e.message.includes('cancel')) {
    this.uiLog.error(`AI Import Gallery: Camera error: ${e}`);
  }
}
```

**Current (outer catch):**
```typescript
} catch (e) {
  // User cancelled option chooser - do nothing
}
```

**Proposed:**
```typescript
} catch (e: any) {
  // User cancellation is expected behavior, log actual errors
  const isCancellation =
    e?.message?.toLowerCase().includes('cancel') ||
    e?.message?.toLowerCase().includes('user denied') ||
    e?.code === 'USER_CANCELLED';

  if (!isCancellation) {
    this.uiLog.error(`AI Import Gallery: Camera error: ${e?.message || e}`);
  }
}
// ...
} catch (e: any) {
  // Option chooser dismissal - only log unexpected errors
  if (e?.message && !e.message.toLowerCase().includes('dismiss')) {
    this.uiLog.error(`AI Import Gallery: Option chooser error: ${e?.message || e}`);
  }
}
```

**Rationale**: The current code conflates "user cancelled" with "no logging needed". We should only skip logging for known cancellation patterns.

### Phase 2: Add Explicit Error Boundaries

#### 2.1 Add try-catch boundary in `extractAllFields()` (field-extraction.service.ts)

**Current:** Method has no top-level try-catch, relies on individual field extraction to handle errors.

**Proposed:** Add defensive boundary for unexpected failures:

```typescript
public async extractAllFields(
  ocrText: string,
  languages: string[],
): Promise<Bean> {
  try {
    // ... existing code ...
  } catch (error: any) {
    // Unexpected error in extraction pipeline
    this.uiLog.error(`Field extraction failed unexpectedly: ${error?.message || error}`);

    // Return minimal bean rather than crashing
    const fallbackBean = new Bean();
    fallbackBean.bean_information = [this.createEmptyBeanInformation()];
    return fallbackBean;
  }
}
```

**Alternative option:** Re-throw with context like `captureAndExtractBeanData()` does:

```typescript
catch (error: any) {
  this.uiLog.error(`Field extraction failed unexpectedly: ${error?.message || error}`);
  throw new Error(`Field extraction failed: ${error?.message || 'Unknown error'}`);
}
```

**Recommendation:** Use the fallback approach. Since individual field extraction already returns null on failure, a top-level crash would only happen for truly unexpected issues. Returning an empty bean allows the user to manually fill in fields rather than losing their photos entirely.

### Phase 3: Normalize Logging Practices

#### 3.1 Create consistent error logging helper

Consider adding a helper method to standardize error logging across the AI import feature:

**File:** `src/services/aiBeanImport/ai-import-logger.ts` (new file)

```typescript
import { Injectable } from '@angular/core';
import { UILog } from '../uiLog';

@Injectable({
  providedIn: 'root',
})
export class AIImportLogger {
  constructor(private readonly uiLog: UILog) {}

  /**
   * Log an error with consistent formatting.
   * @param context The operation that failed (e.g., 'extractField', 'detectLanguage')
   * @param error The error object or message
   */
  error(context: string, error: any): void {
    const message = error?.message || error?.toString() || 'Unknown error';
    this.uiLog.error(`[AI Import] ${context}: ${message}`);
  }

  /**
   * Log a debug message (development only).
   */
  debug(context: string, message: string): void {
    console.log(`[AI Import Debug] ${context}: ${message}`);
  }

  /**
   * Log a cosmetic issue (missing translation, UI update failure).
   */
  cosmetic(context: string, issue: string): void {
    console.warn(`[AI Import] ${context}: ${issue}`);
  }
}
```

**Alternative:** Keep using existing `UILog` directly with consistent prefixes. The helper adds abstraction but may be overkill for this feature's scope.

### Phase 4: Document Error Handling Conventions

Add JSDoc comments to clarify expected behavior:

```typescript
/**
 * Extract a single field using LLM.
 *
 * Error handling: Returns null if extraction fails. Caller should
 * treat null as "field not found in OCR text" and continue with
 * other fields. Errors are logged for debugging but do not
 * interrupt the extraction pipeline.
 */
private async extractField(...)
```

## Summary of Changes

| File | Change | Effort |
|------|--------|--------|
| `field-extraction.service.ts` | Add `console.warn` to progress updates | Low |
| `field-extraction.service.ts` | Add try-catch boundary to `extractAllFields()` | Low |
| `ai-import-photo-gallery.component.ts` | Improve cancel detection in `addPhoto()` | Low |
| (Optional) New logger service | Create `AIImportLogger` helper | Medium |
| All AI import files | Add JSDoc for error handling conventions | Low |

## User Experience Impact

### Before Changes
- Silent failures could cause confusion (photo not added, no feedback)
- Unexpected crashes could lose user's captured photos
- Developers unaware of missing translations

### After Changes
- Camera errors that aren't cancellations will be logged for debugging
- If extraction pipeline fails unexpectedly, user gets empty bean form instead of crash
- Missing translations flagged during development via `console.warn`
- No change to happy-path UX

## Testing Recommendations

1. **Test cancel flows**: Ensure cancellation still works silently (no error logs)
2. **Test permission denial**: Verify proper error logging when camera permission denied
3. **Test OCR failures**: Simulate OCR returning empty/malformed data
4. **Test translation edge cases**: Temporarily remove a translation key, verify warning appears
5. **Test extraction resilience**: Mock LLM to return invalid JSON, verify fallback behavior

## Decision Points for Implementation

1. **Should `extractAllFields()` return fallback bean or throw?**
   - Recommendation: Return fallback bean (better UX)
   - Alternative: Throw with context (more explicit error handling)

2. **Create dedicated AIImportLogger or use UILog directly?**
   - Recommendation: Use UILog directly with consistent `[AI Import]` prefix
   - Alternative: Create logger service for more structured output

3. **Should `console.warn` be conditional on development mode?**
   - Recommendation: No, `console.warn` is already filtered in production builds
   - Alternative: Add `if (isDevMode())` check

## Files to Modify

1. `src/services/aiBeanImport/field-extraction.service.ts`
2. `src/components/ai-import-photo-gallery/ai-import-photo-gallery.component.ts`
3. (Optional) `src/services/aiBeanImport/ai-import-logger.ts` (new file)
