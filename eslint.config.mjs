// @ts-check
import { defineConfig } from 'eslint/config';

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';

export default defineConfig(
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      ...angular.configs.tsRecommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      // Block for overrides that ENABLE non-default rules.
      eqeqeq: ['error'], // prefer '===' over '=='
      // End of overrides that ENABLE non-default rules.

      // Block for overrides that DISABLE default rules.
      // This is used for rules that cause too many linter errors in the current
      // codebase. If a higher degree of safety is desired, these will have to
      // be enabled step by step again when most of the errors are fixed.
      '@typescript-eslint/no-explicit-any': ['off'],
      '@typescript-eslint/no-unsafe-argument': ['off'],
      '@typescript-eslint/no-unsafe-assignment': ['off'],
      '@typescript-eslint/no-unsafe-call': ['off'],
      '@typescript-eslint/no-unsafe-member-access': ['off'],
      '@typescript-eslint/prefer-nullish-coalescing': ['off'],
      // End of overrides that DISABLE default rules

      // Block for overrides that DOWNGRADE default rules to warnings.
      // This is used for linter errors that are stylistic issues and that are
      // (mostly) easily fixable, which is why we want to see them. Yet we don't
      // want to see them as errors, as 'real' errors are too hard to spot when
      // every file is full of errors.
      '@angular-eslint/directive-selector': [
        'warn', // downgrade to warning for Beanconqueror
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'warn', // downgrade to warning for Beanconqueror
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/component-class-suffix': ['warn'],

      // Must be fixed in bulk if desired.
      // See the following references and issue #1006:
      // - https://github.com/angular-eslint/angular-eslint/blob/main/packages/eslint-plugin/docs/rules/prefer-inject.md
      // - https://angular.dev/reference/migrations/inject-function
      // - https://angular.dev/guide/di#injecting-dependencies-with-inject
      '@angular-eslint/prefer-inject': ['warn'],

      '@typescript-eslint/array-type': ['warn'],
      '@typescript-eslint/dot-notation': ['warn'],
      '@typescript-eslint/no-inferrable-types': ['warn'],
      '@typescript-eslint/no-unused-vars': ['warn'],
      '@typescript-eslint/prefer-includes': ['warn'],
      '@typescript-eslint/prefer-optional-chain': ['warn'],
      '@typescript-eslint/require-await': ['warn'],
      // End of overrides that DOWNGRADE default rules to warnings

      // Block for overrides that CHANGE the OPTIONS of default rules
      // End of overrides that CHANGE the OPTIONS of default rules
    },
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      // jasmine assertions return lots of floating promises, which is fine
      // in test code
      '@typescript-eslint/no-floating-promises': ['off'],
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  },
);
