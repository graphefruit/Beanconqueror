# Dead Code Cleanup Implementation Plan

This plan addresses findings 1.1 and 5.1 from the AI Bean Import code review.

## Summary

The multi-step field extraction refactor made several methods obsolete but they were never removed. This plan details the safe removal of all dead code.

## Dead Code Inventory

### File: `src/services/aiBeanImport/ai-bean-import.service.ts`

| Item                       | Type     | Lines   | Description                                                            |
| -------------------------- | -------- | ------- | ---------------------------------------------------------------------- |
| `ALLOWED_PROPERTIES`       | Constant | 37-49   | Static readonly array, only referenced by `createBeanFromResponse()`   |
| `analyzeTextWithLLM()`     | Method   | 452-558 | Original single-prompt LLM analysis, replaced by multi-step extraction |
| `buildPrompt()`            | Method   | 695-730 | Builds prompt for `analyzeTextWithLLM()`, only called there            |
| `createBeanFromResponse()` | Method   | 735-771 | Parses LLM JSON response, only called within `analyzeTextWithLLM()`    |

### File: `src/data/ai-import/ai-import-prompt.ts`

| Item                        | Type   | Lines  | Description                                              |
| --------------------------- | ------ | ------ | -------------------------------------------------------- |
| `AI_IMPORT_PROMPT_TEMPLATE` | Export | 43-125 | Prompt template only used by dead `buildPrompt()` method |

### File: `src/services/aiBeanImport/ai-bean-import.service.ts` (import)

| Item                                  | Type             | Line | Description                                        |
| ------------------------------------- | ---------------- | ---- | -------------------------------------------------- |
| Import of `AI_IMPORT_PROMPT_TEMPLATE` | Import statement | 10   | Import becomes unnecessary after template deletion |

## Verification Results

Grep searches confirmed the dead code chain:

1. **`analyzeTextWithLLM`** - Only appears at its definition (line 452). Never called.
2. **`buildPrompt`** - Defined at line 695, only called at line 465 (inside `analyzeTextWithLLM`).
3. **`createBeanFromResponse`** - Defined at line 735, only called at lines 518 and 536 (inside `analyzeTextWithLLM`).
4. **`ALLOWED_PROPERTIES`** - Defined at line 37, only used at line 752 (inside `createBeanFromResponse`).
5. **`AI_IMPORT_PROMPT_TEMPLATE`** - Imported at line 10, only used at line 724 (inside `buildPrompt`).

All usages form a closed dead code cluster rooted at `analyzeTextWithLLM()`.

## Implementation Steps

### Phase 1: Pre-removal Verification

1. Run full test suite to establish baseline:

   ```bash
   npm test
   ```

2. Verify no dynamic calls via string interpolation:

   ```bash
   # Search for potential dynamic invocations
   grep -r "analyzeText" src/
   grep -r "buildPrompt" src/
   grep -r "createBean" src/
   grep -r "ALLOWED_PROPERTIES" src/
   grep -r "AI_IMPORT_PROMPT_TEMPLATE" src/
   ```

3. Check for any references in comments or documentation (to update if needed):
   ```bash
   grep -rn "analyzeTextWithLLM\|buildPrompt\|createBeanFromResponse\|ALLOWED_PROPERTIES\|AI_IMPORT_PROMPT_TEMPLATE" . --include="*.md"
   ```

### Phase 2: Remove Dead Code

**Step 2.1: Remove from `ai-bean-import.service.ts`**

1. Delete the `ALLOWED_PROPERTIES` constant (lines 37-49)
2. Delete the `analyzeTextWithLLM()` method (lines 452-558)
3. Delete the `buildPrompt()` method (lines 695-730)
4. Delete the `createBeanFromResponse()` method (lines 735-771)
5. Remove `AI_IMPORT_PROMPT_TEMPLATE` from the import statement at line 10

**Step 2.2: Remove from `ai-import-prompt.ts`**

1. Delete the `AI_IMPORT_PROMPT_TEMPLATE` export (lines 43-125)

### Phase 3: Post-removal Verification

1. Run TypeScript compilation to check for any broken references:

   ```bash
   npm run -- build --configuration 'production'
   ```

2. Run full test suite:

   ```bash
   npm test
   ```

3. Run linter to catch any issues:

   ```bash
   npm run lint
   ```

4. Verify the app still starts in dev mode:
   ```bash
   npm start
   # Manually verify AI import feature works (if device available)
   ```

## Risk Assessment

| Risk                                   | Likelihood | Mitigation                                                             |
| -------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| Hidden dynamic call to removed methods | Very Low   | Grep verification shows no string-based calls                          |
| Test failures                          | None       | No tests exist for these methods (confirmed via grep)                  |
| Runtime errors                         | Very Low   | TypeScript compilation will catch static references                    |
| Breaking multi-step extraction         | None       | Multi-step extraction uses `FieldExtractionService`, not these methods |

## Documentation Updates

The code review document (`ai-bean-import-code-review.md`) references these dead code items in findings 1.1 and 5.1. After cleanup:

- Finding 1.1 can be marked as resolved
- Finding 5.1 can be marked as resolved
- Finding 3.1 (LLM Communication Pattern Duplicated) will be simplified since one of the three duplications (`analyzeTextWithLLM`) is being removed

No other documentation in the repository references these specific methods.

## Estimated Impact

- **Lines removed:** ~190 lines of dead code
- **Files modified:** 2 files
- **Breaking changes:** None (code was never called)
- **Test changes:** None required
