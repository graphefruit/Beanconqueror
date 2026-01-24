# Implementation Plan: Constants & Logging Cleanup

This plan addresses findings 4.2 (Magic Numbers) and 4.3 (Console.log Statements) from the AI Bean Import code review.

## Overview

The AI Bean Import feature contains magic numbers and debug logging statements that should be refactored for better maintainability and production readiness.

---

## Part 1: Magic Numbers Inventory

### 1.1 LLM Timeout Constants

| Value | Location | Purpose |
|-------|----------|---------|
| `15000` | `field-extraction.service.ts:424` | Per-field LLM timeout |
| `30000` | `ai-bean-import.service.ts:546` | Full analysis LLM timeout |
| `10000` | `ai-bean-import.service.ts:645` | Language detection LLM timeout |

### 1.2 OCR Metadata Size Thresholds

| Value | Location | Purpose |
|-------|----------|---------|
| `1.3` | `ocr-metadata.service.ts:73` | Size variation threshold (already named constant) |
| `2` | `ocr-metadata.service.ts:78` | Min blocks for metadata (already named constant) |
| `0.8` | `ocr-metadata.service.ts:236` | Large text threshold (% of max height) |
| `1.5` | `ocr-metadata.service.ts:236` | Large text threshold (multiplier of avg) |
| `0.7` | `ocr-metadata.service.ts:238` | Small text threshold (multiplier of avg) |

### 1.3 Validation Constants

| Value | Location | Purpose |
|-------|----------|---------|
| `5000` | `ai-field-prompts.ts:470-471` | Max valid elevation (meters) |
| `5000` | `field-extraction.service.ts:771` | Duplicate elevation validation |
| `80` | `ai-field-prompts.ts:277` | Min cupping score |
| `100` | `ai-field-prompts.ts:278` | Max cupping score |
| `100` | `ai-field-prompts.ts:726-727` | Max blend percentage |

---

## Part 2: Proposed Constants Structure

### 2.1 Recommendation: Single Constants File

Create a new file: `src/data/ai-import/ai-import-constants.ts`

Rationale:
- All AI import services share these constants
- Single source of truth prevents duplication (e.g., elevation validation in two places)
- Easy to find and modify during tuning
- Follows existing pattern (`src/data/` for shared data)

### 2.2 Proposed Constants

```typescript
/**
 * Constants for AI Bean Import feature.
 * Centralized for easy tuning and maintenance.
 */

// === LLM TIMEOUT CONSTANTS ===
/** Timeout for per-field LLM extraction (ms) */
export const LLM_TIMEOUT_PER_FIELD_MS = 15000;

/** Timeout for full LLM analysis (ms) */
export const LLM_TIMEOUT_FULL_ANALYSIS_MS = 30000;

/** Timeout for language detection (ms) */
export const LLM_TIMEOUT_LANGUAGE_DETECTION_MS = 10000;

// === OCR METADATA CONSTANTS ===
/** Minimum ratio of max/min text height for layout metadata to be useful */
export const OCR_SIZE_VARIATION_THRESHOLD = 1.3;

/** Minimum number of OCR blocks required for meaningful layout analysis */
export const OCR_MIN_BLOCKS_FOR_METADATA = 2;

/** Text is "large" if height >= this fraction of max height */
export const OCR_LARGE_TEXT_MAX_HEIGHT_RATIO = 0.8;

/** Text is "large" if height >= this multiplier of average height */
export const OCR_LARGE_TEXT_AVG_MULTIPLIER = 1.5;

/** Text is "small" if height < this multiplier of average height */
export const OCR_SMALL_TEXT_AVG_MULTIPLIER = 0.7;

// === VALIDATION CONSTANTS ===
/** Maximum valid coffee growing elevation in meters (filters variety numbers like 74158) */
export const MAX_VALID_ELEVATION_METERS = 5000;

/** Minimum valid SCA cupping score */
export const MIN_CUPPING_SCORE = 80;

/** Maximum valid SCA cupping score */
export const MAX_CUPPING_SCORE = 100;

/** Maximum valid blend component percentage */
export const MAX_BLEND_PERCENTAGE = 100;
```

---

## Part 3: Console.log Statements Inventory

### 3.1 field-extraction.service.ts (20 occurrences)

| Lines | Log Content | Category |
|-------|-------------|----------|
| 48-50 | `=== RAW OCR TEXT ===` | Input logging |
| 61-63 | `=== NORMALIZED TEXT ===` | Processing logging |
| 233-235 | `=== PROMPT FOR ${fieldName} ===` | LLM prompt logging |
| 241 | `${fieldName} response: "${cleaned}"` | LLM response logging |
| 287-289 | `=== PROMPT FOR name_and_roaster ===` | LLM prompt logging |
| 296 | `name_and_roaster response: "${trimmed}"` | LLM response logging |
| 479-481 | `=== BLEND ORIGINS PROMPT ===` | LLM prompt logging |
| 488-490 | `=== BLEND ORIGINS RESPONSE ===` | LLM response logging |

### 3.2 ocr-metadata.service.ts (6 occurrences)

| Lines | Log Content | Category |
|-------|-------------|----------|
| 147 | `OCR metadata: blocks is undefined/null` | Decision logging |
| 152-155 | `OCR metadata: only ${n} blocks...` | Decision logging |
| 163-166 | `OCR metadata: only ${n} blocks have bounding boxes` | Decision logging |
| 176-178 | `OCR metadata: ${n} blocks, heights min/max/ratio` | Metrics logging |
| 183-184 | `OCR metadata: useful=${useful} (minHeight=0)` | Decision logging |
| 190-193 | `OCR metadata: useful=${useful} (ratio...)` | Decision logging |

### 3.3 ai-bean-import.service.ts (3 occurrences)

| Lines | Log Content | Category |
|-------|-------------|----------|
| 211 | `=== STARTING FIELD EXTRACTION ===` | Flow logging |
| 212 | `extractedText:` | Input logging |
| 213 | `languagesToUse:` | Config logging |

---

## Part 4: Debug Logging Implementation

### 4.1 Option A: Use Existing UILog Service (Recommended)

The `UILog` service already provides conditional logging via its `disabled` flag. However, it currently logs to console when enabled.

**Approach:**
1. Replace all `console.log` with `this.uiLog.debug()` calls
2. The logs will be stored in memory and visible in app debug logs
3. Console output controlled by `uiLog.disabled` flag

**Pros:**
- No new infrastructure needed
- Logs accessible via existing debug log viewer
- Consistent with rest of app

**Cons:**
- All-or-nothing logging (can't enable just AI import logs)
- Console logging tied to global flag

### 4.2 Option B: AI Import Debug Flag in Settings

Add a new setting specifically for AI import verbose logging.

**Changes Required:**
1. Add to `Settings` class: `ai_import_debug_logging: boolean`
2. Add to `ISettings` interface
3. Create helper method in services to check flag before logging

**Example Implementation:**
```typescript
// In field-extraction.service.ts
private debugLog(message: string, ...args: any[]): void {
  const settings = this.uiSettingsStorage.getSettings();
  if (settings.ai_import_debug_logging) {
    this.uiLog.debug(`[AI Import] ${message}`, ...args);
  }
}
```

**Pros:**
- Granular control for AI import debugging
- Can enable in production for troubleshooting
- User can toggle without affecting other logs

**Cons:**
- Requires Settings migration
- Adds UI complexity (settings toggle)
- More code to maintain

### 4.3 Recommendation: Hybrid Approach

1. **For production builds:** Remove all verbose logging (prompts, responses, raw text)
2. **For essential logging:** Use `this.uiLog.log()` for key decision points
3. **For verbose debug:** Wrap in environment check or build flag

**Minimal Change Implementation:**
```typescript
// Create a simple flag at module level or use Angular's isDevMode()
import { isDevMode } from '@angular/core';

// In service
private debugLog(message: string, data?: any): void {
  if (isDevMode()) {
    console.log(`[AI Import] ${message}`, data ?? '');
  }
  // Always log to UILog for debug viewer
  this.uiLog.debug(`[AI Import] ${message}`);
}
```

---

## Part 5: Implementation Steps

### Phase 1: Create Constants File
1. Create `src/data/ai-import/ai-import-constants.ts`
2. Define all constants with JSDoc comments
3. Export all constants

### Phase 2: Update Services to Use Constants
1. **ocr-metadata.service.ts**
   - Replace inline `SIZE_VARIATION_THRESHOLD` and `MIN_BLOCKS_FOR_METADATA` with imports
   - Replace inline `0.8`, `1.5`, `0.7` with named constants

2. **field-extraction.service.ts**
   - Replace `15000` timeout with `LLM_TIMEOUT_PER_FIELD_MS`
   - Replace `5000` elevation check with `MAX_VALID_ELEVATION_METERS`

3. **ai-bean-import.service.ts**
   - Replace `30000` with `LLM_TIMEOUT_FULL_ANALYSIS_MS`
   - Replace `10000` with `LLM_TIMEOUT_LANGUAGE_DETECTION_MS`

4. **ai-field-prompts.ts**
   - Replace `5000` elevation check with `MAX_VALID_ELEVATION_METERS`
   - Replace `80`, `100` cupping with `MIN_CUPPING_SCORE`, `MAX_CUPPING_SCORE`
   - Replace `100` blend percentage with `MAX_BLEND_PERCENTAGE`

### Phase 3: Replace Console.log Statements
1. Create private `debugLog()` helper method in each service
2. Replace all `console.log` calls with `debugLog()` or `this.uiLog.log()`
3. For verbose output (full prompts/responses), use conditional check

### Phase 4: Testing
1. Run `npm test` to ensure no regressions
2. Test AI import flow on device to verify logging behavior
3. Verify UILog captures essential debug info

---

## Part 6: Files to Modify

| File | Changes |
|------|---------|
| `src/data/ai-import/ai-import-constants.ts` | **NEW** - Create constants file |
| `src/services/aiBeanImport/field-extraction.service.ts` | Import constants, replace magic numbers, replace console.log |
| `src/services/aiBeanImport/ai-bean-import.service.ts` | Import constants, replace magic numbers, replace console.log |
| `src/services/aiBeanImport/ocr-metadata.service.ts` | Import constants, replace inline constants, replace console.log |
| `src/data/ai-import/ai-field-prompts.ts` | Import constants, replace magic numbers |

---

## Part 7: Risk Assessment

| Risk | Mitigation |
|------|------------|
| Incorrect constant values | Use exact same values as currently hardcoded |
| Logging removal hides issues | Keep essential logs via UILog, only remove verbose output |
| Build/environment detection issues | Use Angular's `isDevMode()` which is well-tested |

---

## Summary

This plan consolidates 11+ magic numbers into a single constants file and removes/replaces 29 `console.log` statements across 3 files. The changes improve code maintainability without changing runtime behavior.

**Estimated effort:** 2-3 hours for full implementation and testing.
