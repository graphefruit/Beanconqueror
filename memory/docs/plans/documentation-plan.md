# Documentation Improvements Implementation Plan

This plan addresses findings 5.2 and 6.2 from the AI Bean Import code review to improve critical documentation in the codebase.

---

## 1. Finding 5.2: Missing Critical Architecture Documentation

### Problem Statement

The decision to extract fields sequentially (rather than in parallel) is a critical architectural choice that prevents a serious bug. This decision is mentioned in commit messages but not documented in code. Future developers attempting to "optimize" by parallelizing extraction would reintroduce event contamination bugs.

### Location for Documentation

**File:** `src/services/aiBeanImport/field-extraction.service.ts`

**Exact placement:** Above the `sendLLMMessage` method at line 363, as this is the method that uses CapgoLLM's event listeners.

### Proposed Comment

```typescript
/**
 * Send a message to the LLM and wait for response.
 *
 * IMPORTANT: Fields are extracted sequentially (not in parallel) because
 * CapgoLLM uses global event listeners. Parallel extraction causes event
 * contamination between concurrent chat sessions, where responses from one
 * prompt can be incorrectly associated with another prompt's listener.
 *
 * DO NOT attempt to parallelize field extraction (e.g., Promise.all) without
 * first refactoring CapgoLLM to use scoped event listeners per chat session.
 */
private async sendLLMMessage(prompt: string): Promise<string> {
```

### Implementation Steps

1. Open `src/services/aiBeanImport/field-extraction.service.ts`
2. Replace the existing JSDoc comment at line 362-363:
   ```typescript
   /**
    * Send a message to the LLM and wait for response.
    */
   ```
   with the expanded comment above
3. Run `npm run lint` to ensure no formatting issues
4. Run `npm test` to verify no regressions

---

## 2. Finding 6.2: normalizeAltitude Complex Regex Chain

### Problem Statement

The `normalizeAltitude` method in `text-normalization.service.ts` (lines 168-211) contains 4 complex regex patterns that are difficult to understand at a glance. The recommendation is to add one example to each comment showing input → output.

### Analysis of Each Regex Pattern

#### Pattern 1: Explicit ranges with dash/en-dash (lines 178-185)

**Current comment:** "Handle explicit ranges with dash/en-dash"

**Regex purpose:** Matches altitude ranges where two values are connected with a dash, supporting various unit formats and thousand separators.

**Example transformations:**
- `"1700-1900m"` → `"1700-1900 MASL"`
- `"1.850-2.100 meters"` → `"1850-2100 MASL"`
- `"800 – 1200 m.ü.M."` → `"800-1200 MASL"` (en-dash)

#### Pattern 2: Implicit ranges (lines 189-192)

**Current comment:** "Handle implicit ranges: two altitudes with units close together without dash"

**Regex purpose:** Detects two consecutive altitude values (with units) that form an implicit range when no dash is present.

**Example transformation:**
- `"800m 1200m"` → `"800-1200 MASL"`

#### Pattern 3: Single altitudes (lines 196-202)

**Current comment:** "Handle single altitudes (3-4 digit numbers with unit)"

**Regex purpose:** Normalizes standalone altitude values to MASL format. Uses negative lookahead to avoid matching the start of a range.

**Example transformations:**
- `"1850m"` → `"1850 MASL"`
- `"1.850 m.ü.M."` → `"1850 MASL"`
- `"2000 msnm"` → `"2000 MASL"`

#### Pattern 4: Normalize existing MASL values (lines 205-208)

**Current comment:** "Normalize thousand separators in existing MASL values"

**Regex purpose:** Cleans up MASL values that still have thousand separators after previous transformations.

**Example transformation:**
- `"1.850 MASL"` → `"1850 MASL"`

### Proposed Comment Updates

Replace lines 176-208 with the following documented version:

```typescript
    // Pattern 1: Explicit ranges with dash/en-dash
    // e.g., "1700-1900m" → "1700-1900 MASL", "1.850-2.100 meters" → "1850-2100 MASL"
    // Supports 3-4 digit altitudes (up to 4999)
    result = result.replace(
      /(\d{1,2})?[.,]?(\d{3})\s*[-–]\s*(\d{1,2})?[.,]?(\d{3})\s*(?:m\.?ü\.?M\.?|msnm|m(?:eters?)?(?![a-zA-Z])|m(?=\s|$))/gi,
      (_, p1, p2, p3, p4) => {
        const low = (p1 || '') + p2;
        const high = (p3 || '') + p4;
        return `${low}-${high} MASL`;
      },
    );

    // Pattern 2: Implicit ranges - two altitudes with units close together without dash
    // e.g., "800m 1200m" → "800-1200 MASL"
    result = result.replace(
      /(\d{3,4})\s*(?:m\.?ü\.?M\.?|msnm|m(?:eters?)?(?![a-zA-Z])|m(?=\s))\s+(\d{3,4})\s*(?:m\.?ü\.?M\.?|msnm|m(?:eters?)?(?![a-zA-Z])|m(?=\s|$)|MASL)/gi,
      '$1-$2 MASL',
    );

    // Pattern 3: Single altitudes (3-4 digit numbers with unit)
    // e.g., "1850m" → "1850 MASL", "1.850 m.ü.M." → "1850 MASL", "2000 msnm" → "2000 MASL"
    // Negative lookahead prevents matching the start of an explicit range
    result = result.replace(
      /(\d{1,2})?[.,]?(\d{3})\s*(?:m\.?ü\.?M\.?|msnm|m(?:eters?)?(?![a-zA-Z])|m(?=\s|$))(?!\s*[-–]\s*\d)/gi,
      (_, p1, p2) => {
        const altitude = (p1 || '') + p2;
        return `${altitude} MASL`;
      },
    );

    // Pattern 4: Normalize thousand separators in existing MASL values
    // e.g., "1.850 MASL" → "1850 MASL"
    result = result.replace(/(\d{1,2})?[.,](\d{3})\s*MASL/gi, (_, p1, p2) => {
      const altitude = (p1 || '') + p2;
      return `${altitude} MASL`;
    });
```

### Implementation Steps

1. Open `src/services/aiBeanImport/text-normalization.service.ts`
2. Replace lines 176-208 with the documented version above
3. Run `npm run lint` to ensure no formatting issues
4. Run `npm test` to verify existing tests still pass

---

## 3. Other Undocumented Architectural Decisions (Identified During Review)

### 3.1 Sequential Processing Order in `preProcess`

**Location:** `field-extraction.service.ts`, lines 199-213

The order of normalization steps matters:
1. Number normalization (before case normalization to preserve numeric patterns)
2. Altitude normalization (must come before case normalization)
3. OCR correction (uses vocabulary matching - before case normalization)
4. Case normalization (last, to preserve known terms during correction)

**Recommended documentation:** Add inline comments explaining why order matters.

### 3.2 Blend vs Single Origin Extraction Strategy

**Location:** `field-extraction.service.ts`, lines 162-186

Blends use a single JSON prompt (to get complete context), while single origins use per-field extraction (for better accuracy). This is a deliberate choice.

**Recommendation:** Consider documenting this in the existing method comment for `extractBlendOriginsFiltered`.

---

## 4. Implementation Checklist

- [ ] Add architecture documentation to `sendLLMMessage` method (5.2)
- [ ] Add examples to `normalizeAltitude` regex patterns (6.2)
- [ ] Run `npm run lint` after changes
- [ ] Run `npm test` to verify no regressions
- [ ] Create commit with message describing documentation improvements

---

## 5. Testing Plan

After implementing the documentation changes:

1. **Lint check:** `npm run lint` - ensure no formatting issues
2. **Unit tests:** `npm test` - all existing tests should pass (documentation-only changes)
3. **Manual review:** Verify comments are clear and accurate

---

## 6. Files to Modify

| File | Lines | Change Type |
|------|-------|-------------|
| `src/services/aiBeanImport/field-extraction.service.ts` | 362-363 | Expand JSDoc comment |
| `src/services/aiBeanImport/text-normalization.service.ts` | 176-208 | Add example comments |

---

## 7. Risk Assessment

**Risk Level:** Low

- Changes are documentation-only
- No functional code modifications
- Existing tests will validate no accidental changes
- Improves long-term maintainability
