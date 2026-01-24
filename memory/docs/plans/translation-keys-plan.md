# Implementation Plan: Missing Translation Keys in AI Import Feature

## Summary

This plan addresses finding 1.3 from the code review: Missing Translation Keys in Progress Updates. The issue exists in `src/services/aiBeanImport/field-extraction.service.ts` where translation keys are used for progress messages but may be missing from i18n files.

## 1. Investigation: How ngx-translate Behaves with Missing Keys

### Finding

When a translation key is missing, `translate.instant(key)` returns **the key itself** as a string. It does **not** throw an exception, nor does it return `null` or `undefined`.

### Evidence

The TranslateModule is configured in `src/app/app.module.ts` (lines 89-95) with default settings:

```typescript
TranslateModule.forRoot({
  loader: {
    provide: TranslateLoader,
    useFactory: HttpLoaderFactory,
    deps: [HttpClient],
  },
}),
```

No `missingTranslationHandler` or `useDefaultLang` is configured, so the default behavior applies: return the key string.

### Implication

The try-catch blocks in `updateProgress()` and `updateFieldProgress()` are **unnecessary** - no exception is thrown. They should be removed to avoid masking other potential issues.

## 2. Complete List of AI Import Translation Keys Used

### Keys Used in `field-extraction.service.ts`

#### From `updateProgress(stepKey)` method (lines 841-848):

Constructs key: `AI_IMPORT_STEP_${stepKey}`

Called with:
| stepKey | Full Translation Key |
|---------|---------------------|
| `NAME_AND_ROASTER` | `AI_IMPORT_STEP_NAME_AND_ROASTER` |
| `STRUCTURE` | `AI_IMPORT_STEP_STRUCTURE` |
| `BLEND_ORIGINS` | `AI_IMPORT_STEP_BLEND_ORIGINS` |
| `VALIDATING` | `AI_IMPORT_STEP_VALIDATING` |

Also uses: `AI_IMPORT_STEP_ANALYZING` (base message)

#### From `updateFieldProgress(prefix, fieldName)` method (lines 854-871):

Constructs key: `AI_IMPORT_FIELD_${fieldName.toUpperCase()}`

Called with:
| prefix | fieldName | Full Translation Key |
|--------|-----------|---------------------|
| `TOP_LEVEL` | `weight` | `AI_IMPORT_FIELD_WEIGHT` |
| `TOP_LEVEL` | `bean_roasting_type` | `AI_IMPORT_FIELD_BEAN_ROASTING_TYPE` |
| `TOP_LEVEL` | `aromatics` | `AI_IMPORT_FIELD_AROMATICS` |
| `TOP_LEVEL` | `decaffeinated` | `AI_IMPORT_FIELD_DECAFFEINATED` |
| `TOP_LEVEL` | `cupping_points` | `AI_IMPORT_FIELD_CUPPING_POINTS` |
| `TOP_LEVEL` | `roastingDate` | `AI_IMPORT_FIELD_ROASTINGDATE` |
| `ORIGIN` | `country` | `AI_IMPORT_FIELD_COUNTRY` |
| `ORIGIN` | `region` | `AI_IMPORT_FIELD_REGION` |
| `ORIGIN` | `variety` | `AI_IMPORT_FIELD_VARIETY` |
| `ORIGIN` | `processing` | `AI_IMPORT_FIELD_PROCESSING` |
| `ORIGIN` | `elevation` | `AI_IMPORT_FIELD_ELEVATION` |
| `ORIGIN` | `farm` | `AI_IMPORT_FIELD_FARM` |
| `ORIGIN` | `farmer` | `AI_IMPORT_FIELD_FARMER` |

### Keys Used in `ai-bean-import.service.ts`

- `AI_IMPORT_STEP_CAPTURING`
- `AI_IMPORT_STEP_EXTRACTING`
- `AI_IMPORT_STEP_DETECTING_LANGUAGE`
- `AI_IMPORT_STEP_ANALYZING`

## 3. Current Translation Key Status by Language

### Languages with COMPLETE AI Import Keys:

- **en.json** (English) - All keys present (lines 655-683)
- **de.json** (German) - All keys present (lines 655-683)

### Languages MISSING AI Import Step/Field Keys:

The following 12 language files only have `AI_IMPORT_STEP_BLEND_ORIGINS` and `AI_IMPORT_PROMPT_EXAMPLES`:

- ar.json (Arabic)
- el.json (Greek)
- es.json (Spanish)
- fr.json (French)
- id.json (Indonesian)
- it.json (Italian)
- nl.json (Dutch)
- no.json (Norwegian)
- pl.json (Polish)
- pt.json (Portuguese)
- tr.json (Turkish)
- zh.json (Chinese)

## 4. Recommendation: Try-Catch Handling

### Current Code (lines 841-871):

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

private updateFieldProgress(prefix: string, fieldName: string): void {
  try {
    const baseMessage = this.translate.instant('AI_IMPORT_STEP_ANALYZING');
    let fieldLabel = this.translate.instant(`AI_IMPORT_FIELD_${fieldName.toUpperCase()}`);
    if (fieldLabel === `AI_IMPORT_FIELD_${fieldName.toUpperCase()}`) {
      fieldLabel = fieldName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
    this.uiAlert.setLoadingSpinnerMessage(`${baseMessage} - ${fieldLabel}`);
  } catch (e) {
    // Silently fail if translation not found
  }
}
```

### Recommendation

**Remove the try-catch blocks** since `translate.instant()` never throws. The code in `updateFieldProgress` already has proper fallback logic for missing keys (lines 861-864).

For `updateProgress`, add similar fallback logic to match `updateFieldProgress`:

### Proposed Code:

```typescript
private updateProgress(stepKey: string): void {
  const baseMessage = this.translate.instant('AI_IMPORT_STEP_ANALYZING');
  let stepName = this.translate.instant(`AI_IMPORT_STEP_${stepKey}`);
  if (stepName === `AI_IMPORT_STEP_${stepKey}`) {
    // Translation not found, format the step key nicely
    stepName = stepKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  this.uiAlert.setLoadingSpinnerMessage(`${baseMessage} - ${stepName}`);
}

private updateFieldProgress(prefix: string, fieldName: string): void {
  const baseMessage = this.translate.instant('AI_IMPORT_STEP_ANALYZING');
  let fieldLabel = this.translate.instant(`AI_IMPORT_FIELD_${fieldName.toUpperCase()}`);
  if (fieldLabel === `AI_IMPORT_FIELD_${fieldName.toUpperCase()}`) {
    // Translation not found, format the field name nicely
    fieldLabel = fieldName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  this.uiAlert.setLoadingSpinnerMessage(`${baseMessage} - ${fieldLabel}`);
}
```

## 5. Translation Texts to Add

### English Translations (Reference - Already Present in en.json)

```json
"AI_IMPORT_STEP_CAPTURING": "Capturing image...",
"AI_IMPORT_STEP_EXTRACTING": "Extracting text from image...",
"AI_IMPORT_STEP_ANALYZING": "Analyzing with AI... (retry if needed)",
"AI_IMPORT_STEP_DETECTING_LANGUAGE": "Detecting label language...",
"AI_IMPORT_STEP_LANGUAGE": "Language",
"AI_IMPORT_STEP_STRUCTURE": "Structure",
"AI_IMPORT_STEP_NAME_AND_ROASTER": "Name & Roaster",
"AI_IMPORT_STEP_WEIGHT": "Weight",
"AI_IMPORT_STEP_ROAST_TYPE": "Roast Type",
"AI_IMPORT_STEP_AROMATICS": "Aromatics",
"AI_IMPORT_STEP_DECAF": "Decaf",
"AI_IMPORT_STEP_ORIGIN": "Origin",
"AI_IMPORT_STEP_VALIDATING": "Validating",
"AI_IMPORT_STEP_BLEND_ORIGINS": "Blend Origins",
"AI_IMPORT_FIELD_WEIGHT": "Weight",
"AI_IMPORT_FIELD_BEAN_ROASTING_TYPE": "Roast Type",
"AI_IMPORT_FIELD_AROMATICS": "Aromatics",
"AI_IMPORT_FIELD_DECAFFEINATED": "Decaffeinated",
"AI_IMPORT_FIELD_BEANMIX": "Bean Type",
"AI_IMPORT_FIELD_ORIGINCOUNT": "Origin Count",
"AI_IMPORT_FIELD_COUNTRY": "Country",
"AI_IMPORT_FIELD_REGION": "Region",
"AI_IMPORT_FIELD_VARIETY": "Variety",
"AI_IMPORT_FIELD_PROCESSING": "Processing",
"AI_IMPORT_FIELD_ELEVATION": "Elevation",
"AI_IMPORT_FIELD_FARM": "Farm",
"AI_IMPORT_FIELD_FARMER": "Farmer",
"AI_IMPORT_FIELD_ROASTINGDATE": "Roast Date",
"AI_IMPORT_FIELD_CUPPING_POINTS": "Cupping Points"
```

### For Other Languages

Since AI Import is a new feature primarily tested on iOS with Apple Intelligence (English-focused), we have two options:

**Option A (Recommended): Use English as fallback**
With the improved fallback logic in the code, missing translations will display formatted English keys (e.g., "Name And Roaster" instead of "AI_IMPORT_STEP_NAME_AND_ROASTER"). This is acceptable for progress spinner messages.

**Option B: Add English translations to all files**
Copy the English translations to all language files as placeholders. This ensures consistent display but adds maintenance burden.

**Recommendation:** Option A - The code fallback is sufficient for progress messages. Translations can be added later as the community contributes them.

## 6. Implementation Steps

### Step 1: Modify `field-extraction.service.ts`

- Remove try-catch blocks from `updateProgress()` and `updateFieldProgress()`
- Add fallback logic to `updateProgress()` matching `updateFieldProgress()` pattern

### Step 2: (Optional) Add Missing Translations

If Option B is chosen, copy the English AI*IMPORT_STEP*_ and AI*IMPORT_FIELD*_ keys to all 12 language files listed above.

### Step 3: Run Tests

```bash
npm test
```

### Step 4: Manual Verification

Test the AI import flow on a device to verify progress messages display correctly with and without translations.

## 7. Files to Modify

| File                                                         | Action                               |
| ------------------------------------------------------------ | ------------------------------------ |
| `src/services/aiBeanImport/field-extraction.service.ts`      | Remove try-catch, add fallback logic |
| `src/assets/i18n/{ar,el,es,fr,id,it,nl,no,pl,pt,tr,zh}.json` | (Optional) Add missing translations  |

## 8. Risk Assessment

**Low Risk:**

- The change removes defensive code that was masking a non-issue
- Fallback logic ensures graceful degradation
- No functional change to the extraction logic itself
- Progress messages are cosmetic and don't affect data extraction

## 9. Testing Checklist

- [ ] Unit tests pass (`npm test`)
- [ ] AI import works on iOS device with English locale
- [ ] AI import works on iOS device with German locale
- [ ] AI import works on iOS device with other locale (fallback displays)
- [ ] Progress spinner shows translated step names
- [ ] Progress spinner shows translated field names
