# Implementation Plan: Code Duplication Refactoring

This plan addresses code duplication findings 3.1–3.4 from the AI Bean Import code review.

## Overview

The refactoring consolidates duplicated code patterns into shared utilities within the AI import services. No new service files are needed—utilities will be added to existing files or a single new utility file.

---

## 3.1 LLM Communication Pattern Duplicated 3x

### Problem

The same LLM communication pattern appears in three places:
1. `analyzeTextWithLLM()` in `ai-bean-import.service.ts:452-558` — **dead code**
2. `detectLanguage()` in `ai-bean-import.service.ts:563-657`
3. `sendLLMMessage()` in `field-extraction.service.ts:363-432`

Pattern includes: `setModel()` → `createChat()` → listener setup → timeout handling → cleanup.

### Solution

Extract a shared utility function `sendLLMPrompt()` into a new file `src/services/aiBeanImport/llm-communication.service.ts`.

### Interface Design

```typescript
// src/services/aiBeanImport/llm-communication.service.ts

export interface LLMCommunicationOptions {
  /** Timeout in milliseconds (default: 15000) */
  timeoutMs?: number;
  /** Logger instance for error reporting */
  logger?: { error: (msg: string) => void };
}

/**
 * Send a prompt to the LLM and return the response.
 * Handles model setup, chat creation, listeners, timeout, and cleanup.
 *
 * @param prompt The prompt to send
 * @param options Configuration options
 * @returns The LLM response text, or empty string on timeout/error
 */
export async function sendLLMPrompt(
  prompt: string,
  options?: LLMCommunicationOptions
): Promise<string>;
```

### Refactoring Steps

1. **Create new file** `src/services/aiBeanImport/llm-communication.service.ts`
2. **Implement `sendLLMPrompt()`** based on `sendLLMMessage()` pattern (most generic version)
3. **Update `field-extraction.service.ts`**:
   - Import `sendLLMPrompt` from new file
   - Replace `sendLLMMessage()` body with call to `sendLLMPrompt(prompt, { timeoutMs: 15000, logger: this.uiLog })`
   - Keep `sendLLMMessage()` as a thin wrapper (or inline the call)
4. **Update `ai-bean-import.service.ts`**:
   - Import `sendLLMPrompt`
   - Replace `detectLanguage()` LLM code with `sendLLMPrompt(prompt, { timeoutMs: 10000, logger: this.uiLog })`
   - **Delete** `analyzeTextWithLLM()` entirely (dead code)

### Locations to Modify

| File | Method | Action |
|------|--------|--------|
| `src/services/aiBeanImport/llm-communication.service.ts` | `sendLLMPrompt()` | Create new |
| `src/services/aiBeanImport/field-extraction.service.ts` | `sendLLMMessage()` | Replace body |
| `src/services/aiBeanImport/ai-bean-import.service.ts` | `analyzeTextWithLLM()` | Delete |
| `src/services/aiBeanImport/ai-bean-import.service.ts` | `detectLanguage()` | Use shared function |

---

## 3.2 JSON Response Parsing Duplicated 3x

### Problem

JSON extraction from markdown code blocks appears in three places:
1. `createBeanFromResponse()` in `ai-bean-import.service.ts:735-771` — **dead code**
2. `parseNameAndRoasterResponse()` in `field-extraction.service.ts:309-341`
3. `parseBlendOriginsResponse()` in `field-extraction.service.ts:675-704`

Pattern: extract JSON from ` ```json ``` ` blocks → parse JSON → handle errors.

### Solution

Extract shared utility function `extractJsonFromResponse()` into `llm-communication.service.ts`.

### Interface Design

```typescript
// Add to src/services/aiBeanImport/llm-communication.service.ts

/**
 * Extract JSON from an LLM response that may contain markdown code blocks.
 *
 * @param response Raw LLM response text
 * @returns Parsed JSON object, or null if parsing fails
 */
export function extractJsonFromResponse<T = unknown>(response: string): T | null;
```

### Refactoring Steps

1. **Add `extractJsonFromResponse()`** to `llm-communication.service.ts`:
   ```typescript
   export function extractJsonFromResponse<T = unknown>(response: string): T | null {
     try {
       let jsonStr = response.trim();

       // Extract JSON from markdown code blocks if present
       const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
       if (jsonMatch) {
         jsonStr = jsonMatch[1].trim();
       }

       return JSON.parse(jsonStr) as T;
     } catch {
       return null;
     }
   }
   ```

2. **Update `parseNameAndRoasterResponse()`** in `field-extraction.service.ts`:
   ```typescript
   private parseNameAndRoasterResponse(response: string): { name: string; roaster: string } {
     const parsed = extractJsonFromResponse<{ name?: string; roaster?: string }>(response);
     if (!parsed) {
       this.uiLog.error('Failed to parse name/roaster JSON');
       return { name: '', roaster: '' };
     }

     let name = this.sanitizeNameRoasterField(parsed.name);
     let roaster = this.sanitizeNameRoasterField(parsed.roaster);
     // ... rest of normalization
   }
   ```

3. **Update `parseBlendOriginsResponse()`** similarly

4. **Delete `createBeanFromResponse()`** in `ai-bean-import.service.ts` (dead code)

### Locations to Modify

| File | Method | Action |
|------|--------|--------|
| `src/services/aiBeanImport/llm-communication.service.ts` | `extractJsonFromResponse()` | Create new |
| `src/services/aiBeanImport/field-extraction.service.ts` | `parseNameAndRoasterResponse()` | Use shared function |
| `src/services/aiBeanImport/field-extraction.service.ts` | `parseBlendOriginsResponse()` | Use shared function |
| `src/services/aiBeanImport/ai-bean-import.service.ts` | `createBeanFromResponse()` | Delete |

---

## 3.3 Null-like Value Check Duplicated 5x

### Problem

Checks for LLM "null-like" responses appear in 5 places with inconsistent values:
1. `sanitizeStringField()` at `field-extraction.service.ts:740-746` — checks `'null' | 'not_found' | 'unknown'`
2. `sanitizeNameRoasterField()` at `field-extraction.service.ts:350-355` — checks `'null' | 'NOT_FOUND' | 'unknown'`
3. `extractField()` at `field-extraction.service.ts:244-251` — checks `'null' | 'none' | 'NOT_FOUND'`
4. `cleanResponse()` at `field-extraction.service.ts:459` — removes `NOT_FOUND` from text
5. `sanitizeElevation()` at `field-extraction.service.ts:758-761` — checks `'null' | 'not_found' | 'unknown'`

### Solution

Create a utility function `isNullLikeValue()` that consolidates all recognized null-like values.

### Interface Design

```typescript
// Add to src/services/aiBeanImport/llm-communication.service.ts

/**
 * Null-like values that LLMs return when a field is not found.
 * Comparison is case-insensitive.
 */
const NULL_LIKE_VALUES = ['null', 'not_found', 'unknown', 'none', 'n/a', ''];

/**
 * Check if an LLM response value represents "not found" / null.
 *
 * @param value The value to check
 * @returns true if the value is null-like
 */
export function isNullLikeValue(value: string | null | undefined): boolean;
```

### Implementation

```typescript
const NULL_LIKE_VALUES = new Set(['null', 'not_found', 'unknown', 'none', 'n/a', '']);

export function isNullLikeValue(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value !== 'string') return false;
  return NULL_LIKE_VALUES.has(value.trim().toLowerCase());
}
```

### Refactoring Steps

1. **Add `isNullLikeValue()`** to `llm-communication.service.ts`

2. **Update `sanitizeStringField()`**:
   ```typescript
   private sanitizeStringField(value: any): string {
     if (value === null || value === undefined) return '';
     if (typeof value !== 'string') return '';
     const trimmed = value.trim();
     if (isNullLikeValue(trimmed)) return '';
     return trimmed;
   }
   ```

3. **Update `sanitizeNameRoasterField()`** — same pattern

4. **Update `extractField()`**:
   ```typescript
   // Handle null/not found responses
   if (isNullLikeValue(cleaned)) {
     return null;
   }
   ```

5. **Update `sanitizeElevation()`** — same pattern

6. **Update `cleanResponse()`**:
   - Keep the `NOT_FOUND` removal as a separate step (it handles embedded NOT_FOUND, not equality check)
   - Or consider adding a `removeNullLikeSubstrings()` utility

### Locations to Modify

| File | Method | Action |
|------|--------|--------|
| `src/services/aiBeanImport/llm-communication.service.ts` | `isNullLikeValue()` | Create new |
| `src/services/aiBeanImport/field-extraction.service.ts` | `sanitizeStringField()` | Use shared function |
| `src/services/aiBeanImport/field-extraction.service.ts` | `sanitizeNameRoasterField()` | Use shared function |
| `src/services/aiBeanImport/field-extraction.service.ts` | `extractField()` | Use shared function |
| `src/services/aiBeanImport/field-extraction.service.ts` | `sanitizeElevation()` | Use shared function |

---

## 3.4 Empty Bean Information Creation Duplicated

### Problem

Two nearly identical methods create empty `IBeanInformation` objects:
1. `createEmptyBeanInformation()` at `field-extraction.service.ts:628-642`
2. `createEmptyOrigin()` at `field-extraction.service.ts:783-797`

Both return the same structure with identical field defaults.

### Solution

Keep only `createEmptyBeanInformation()` and delete `createEmptyOrigin()`.

### Refactoring Steps

1. **Update `parseBlendOriginsResponse()`** to use `createEmptyBeanInformation()`:
   ```typescript
   // Before:
   return results.length > 0 ? results : [this.createEmptyOrigin()];

   // After:
   return results.length > 0 ? results : [this.createEmptyBeanInformation()];
   ```

2. **Delete `createEmptyOrigin()`** method entirely

### Locations to Modify

| File | Method | Action |
|------|--------|--------|
| `src/services/aiBeanImport/field-extraction.service.ts` | `parseBlendOriginsResponse()` | Use `createEmptyBeanInformation()` |
| `src/services/aiBeanImport/field-extraction.service.ts` | `createEmptyOrigin()` | Delete |

---

## New File Structure

### `src/services/aiBeanImport/llm-communication.service.ts`

```typescript
import { CapgoLLM } from '@capgo/capacitor-llm';

export interface LLMCommunicationOptions {
  timeoutMs?: number;
  logger?: { error: (msg: string) => void };
}

const NULL_LIKE_VALUES = new Set(['null', 'not_found', 'unknown', 'none', 'n/a', '']);

/**
 * Check if an LLM response value represents "not found" / null.
 */
export function isNullLikeValue(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value !== 'string') return false;
  return NULL_LIKE_VALUES.has(value.trim().toLowerCase());
}

/**
 * Extract JSON from an LLM response that may contain markdown code blocks.
 */
export function extractJsonFromResponse<T = unknown>(response: string): T | null {
  try {
    let jsonStr = response.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

/**
 * Send a prompt to the LLM and return the response.
 */
export async function sendLLMPrompt(
  prompt: string,
  options: LLMCommunicationOptions = {}
): Promise<string> {
  const { timeoutMs = 15000, logger } = options;

  // Implementation follows sendLLMMessage() pattern...
  await CapgoLLM.setModel({ path: 'Apple Intelligence' });
  const { id: chatId } = await CapgoLLM.createChat();

  let latestSnapshot = '';
  let resolved = false;

  return new Promise<string>(async (resolve) => {
    const cleanup = async (textListener: any, finishedListener: any) => {
      try {
        await textListener?.remove();
        await finishedListener?.remove();
      } catch (e) {
        logger?.error('Error cleaning up listeners: ' + e);
      }
    };

    const resolveOnce = async (
      value: string,
      textListener: any,
      finishedListener: any
    ) => {
      if (!resolved) {
        resolved = true;
        await cleanup(textListener, finishedListener);
        resolve(value);
      }
    };

    const textListener = await CapgoLLM.addListener('textFromAi', (event: any) => {
      if (event.text) {
        latestSnapshot = event.text;
      }
    });

    const finishedListener = await CapgoLLM.addListener('aiFinished', async () => {
      await resolveOnce(latestSnapshot, textListener, finishedListener);
    });

    setTimeout(async () => {
      if (!resolved) {
        logger?.error('LLM timeout, using latest snapshot');
        await resolveOnce(latestSnapshot || '', textListener, finishedListener);
      }
    }, timeoutMs);

    await CapgoLLM.sendMessage({ chatId, message: prompt });
  });
}
```

---

## Summary of Changes

| Change Type | File | Description |
|-------------|------|-------------|
| **New file** | `llm-communication.service.ts` | Shared LLM utilities |
| **Delete method** | `ai-bean-import.service.ts` | `analyzeTextWithLLM()` (dead code) |
| **Delete method** | `ai-bean-import.service.ts` | `createBeanFromResponse()` (dead code) |
| **Delete method** | `field-extraction.service.ts` | `createEmptyOrigin()` |
| **Refactor** | `ai-bean-import.service.ts` | `detectLanguage()` uses shared LLM function |
| **Refactor** | `field-extraction.service.ts` | `sendLLMMessage()` uses shared LLM function |
| **Refactor** | `field-extraction.service.ts` | JSON parsing uses shared function |
| **Refactor** | `field-extraction.service.ts` | Null checks use shared function |

---

## Testing Checklist

After implementation, verify:

- [ ] `npm test` passes
- [ ] AI import from single photo works correctly
- [ ] AI import from multiple photos works correctly
- [ ] Language detection returns valid language codes
- [ ] Name/roaster extraction parses JSON correctly
- [ ] Blend origins extraction parses JSON correctly
- [ ] Null-like values ("null", "NOT_FOUND", "unknown", etc.) are handled consistently
- [ ] Timeouts work correctly (15s for field extraction, 10s for language detection)
