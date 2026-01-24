# Implementation Plan: Import Ordering

**Finding:** 11.5 - Inconsistent Import Ordering
**Scope:** AI Bean Import feature files

---

## 1. Current State Analysis

### 1.1 Current ESLint Configuration

The project uses ESLint 9.x with flat config (`eslint.config.mjs`):
- `angular-eslint` for Angular-specific rules
- `typescript-eslint` for TypeScript rules
- `eslint-config-prettier` for Prettier integration
- **No import ordering rules are currently configured**

Prettier configuration (in `package.json`) only covers basic formatting:
```json
"prettier": {
  "singleQuote": true,
  "semi": true
}
```

### 1.2 Current Import Patterns in AI Import Files

Analysis reveals inconsistent ordering across all files:

| File | Issue |
|------|-------|
| `ai-bean-import.service.ts` | Third-party packages (`@capgo/capacitor-llm`, `@capacitor/camera`) placed after local imports |
| `field-extraction.service.ts` | `@capgo/capacitor-llm` mixed in between local service imports |
| `ai-import-photo-gallery.component.ts` | `@ngx-translate/core` placed after local services; `@capacitor/camera` at the very end |
| `ai-field-prompts.ts` | `moment` first, then local import (acceptable but no separation) |

Other services (`ocr-correction.service.ts`, `ocr-metadata.service.ts`, `text-normalization.service.ts`, `ai-import-examples.service.ts`) have simpler imports and are mostly correct.

### 1.3 Broader Codebase Patterns

The broader codebase also lacks consistent ordering:
- `uiBeanStorage.ts` has comments for sections (`/** Core */`, `/** Services */`) but mixes third-party with local
- `beans.page.ts` has completely mixed ordering

---

## 2. Proposed Import Ordering Convention

Following Angular style guide recommendations, imports should be ordered in these groups (each separated by a blank line):

1. **Angular core** - `@angular/*`
2. **Angular-related third-party** - `@ionic/*`, `@ngx-translate/*`
3. **Other third-party** - `@capacitor/*`, `@capgo/*`, `moment`, `lodash`, `rxjs/*`, etc.
4. **Local absolute paths** - Starting with `../../` or `../` going to different modules
5. **Local relative paths** - Same directory imports starting with `./`

Within each group, imports should be alphabetically sorted.

**Example (corrected `ai-bean-import.service.ts`):**
```typescript
// Angular core
import { Injectable } from '@angular/core';

// Angular-related third-party
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

// Other third-party (alphabetical)
import {
  Camera,
  CameraDirection,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition';
import { CapgoLLM } from '@capgo/capacitor-llm';

// Local - classes and data
import { Bean } from '../../classes/bean/bean';
import {
  AI_IMPORT_LANGUAGE_DETECTION_PROMPT,
  AI_IMPORT_PROMPT_TEMPLATE,
} from '../../data/ai-import/ai-import-prompt';

// Local - services (other directories)
import { UIAlert } from '../uiAlert';
import { UIFileHelper } from '../uiFileHelper';
import { UIImage } from '../uiImage';
import { UILog } from '../uiLog';

// Local - same directory
import { AIImportExamplesService } from './ai-import-examples.service';
import { FieldExtractionService } from './field-extraction.service';
import {
  OcrMetadataService,
  TextDetectionResult,
} from './ocr-metadata.service';
```

---

## 3. Files Requiring Changes

### 3.1 AI Import Feature Files (12 total)

| File | Changes Needed |
|------|----------------|
| `src/services/aiBeanImport/ai-bean-import.service.ts` | Reorder: move `@capacitor/*`, `@capgo/*`, `@pantrist/*` up before local imports |
| `src/services/aiBeanImport/field-extraction.service.ts` | Reorder: move `@capgo/capacitor-llm` up after `@ngx-translate` |
| `src/services/aiBeanImport/ai-import-examples.service.ts` | Already correct (only Angular + ngx-translate) |
| `src/services/aiBeanImport/ocr-correction.service.ts` | Already correct (only Angular + local) |
| `src/services/aiBeanImport/ocr-metadata.service.ts` | Already correct (only Angular) |
| `src/services/aiBeanImport/text-normalization.service.ts` | Already correct (only Angular) |
| `src/services/aiBeanImport/ocr-correction.service.spec.ts` | Already correct (only Angular testing + local) |
| `src/services/aiBeanImport/ocr-metadata.service.spec.ts` | Already correct (only Angular testing + local) |
| `src/services/aiBeanImport/text-normalization.service.spec.ts` | Already correct (only Angular testing + local) |
| `src/data/ai-import/ai-field-prompts.ts` | Add blank line between `moment` and local import |
| `src/data/ai-import/ai-import-prompt.ts` | No imports (only exports) - no changes needed |
| `src/components/ai-import-photo-gallery/ai-import-photo-gallery.component.ts` | Reorder: move `@ngx-translate`, `@capacitor/*` up before local services |

**Files needing changes: 4**
**Files already correct: 8**

---

## 4. Recommendation: Automated vs Manual

### Recommendation: Add ESLint Automation

**Rationale:**
1. Prevents future regressions in new code
2. Auto-fixable with `npm run lint -- --fix`
3. ESLint 9 supports `eslint-plugin-simple-import-sort` which is lightweight and works well with TypeScript/Angular
4. Only 4 files need manual fixes, but automation prevents future issues

### Alternative Considered: Manual-Only Fixes

- Pros: No new dependencies, simpler
- Cons: No enforcement for future code, relies on code review
- **Not recommended** for a project of this size

---

## 5. ESLint Configuration to Add

### 5.1 Install Plugin

```bash
npm install --save-dev eslint-plugin-simple-import-sort
```

### 5.2 Update `eslint.config.mjs`

Add the import and configuration:

```javascript
// @ts-check
import { defineConfig } from 'eslint/config';

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import simpleImportSort from 'eslint-plugin-simple-import-sort';  // ADD THIS

export default defineConfig(
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      ...angular.configs.tsRecommended,
    ],
    plugins: {
      'simple-import-sort': simpleImportSort,  // ADD THIS
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      // Import ordering rules - ADD THIS BLOCK
      'simple-import-sort/imports': [
        'warn',
        {
          groups: [
            // Angular core
            ['^@angular/'],
            // Angular-related third-party (Ionic, ngx-translate)
            ['^@ionic/', '^@ngx-translate/'],
            // Other third-party packages
            ['^@?\\w'],
            // Absolute imports from src (if any)
            ['^src/'],
            // Parent imports (../)
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            // Same-directory imports (./)
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'warn',

      // ... rest of existing rules ...
    },
  },
  // ... rest of config ...
);
```

---

## 6. Implementation Steps

### Step 1: Install the ESLint Plugin
```bash
npm install --save-dev eslint-plugin-simple-import-sort
```

### Step 2: Update ESLint Configuration
Add the plugin and rules to `eslint.config.mjs` as shown in Section 5.2.

### Step 3: Run Auto-Fix on AI Import Files
```bash
npm run lint -- --fix src/services/aiBeanImport/ src/data/ai-import/ src/components/ai-import-photo-gallery/
```

### Step 4: Verify Changes
```bash
npm run lint
npm test
```

### Step 5: Manual Review
Review the auto-fixed imports to ensure correctness, particularly for:
- Multi-line imports with destructuring
- Type-only imports (if any)

---

## 7. Expected Changes Summary

After implementation, the 4 files will have their imports reordered:

1. **`ai-bean-import.service.ts`** - `@capacitor/*`, `@capgo/*`, `@pantrist/*` moved before local imports
2. **`field-extraction.service.ts`** - `@capgo/capacitor-llm` moved after `@ngx-translate`
3. **`ai-import-photo-gallery.component.ts`** - `@ngx-translate/*`, `@capacitor/*` moved before local services
4. **`ai-field-prompts.ts`** - Blank line added between `moment` and local import

---

## 8. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Auto-fix changes unrelated files | Run only on AI import feature files initially |
| Import order breaks circular dependencies | Run `npm test` to verify; manual review if issues |
| Plugin compatibility with ESLint 9 | `eslint-plugin-simple-import-sort` v12+ supports ESLint 9 |

---

## 9. Scope Considerations

This plan focuses only on AI import feature files as specified. The broader codebase also has inconsistent import ordering but is out of scope for this task. Once the ESLint rule is added, it will flag (as warnings) import ordering issues in other files during development, allowing gradual cleanup.
