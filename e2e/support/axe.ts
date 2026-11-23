import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * axe with "page-has-heading-one" checked for real. axe passes the rule
 * whenever it takes the page for a modal, and it does so for every Ionic
 * screen, whose layers fill the viewport. The rule then passed on screens
 * without any level-1 heading.
 */
const AXE_SOURCE = `${readFileSync(
  require.resolve('axe-core/axe.min.js', {
    paths: [dirname(require.resolve('@axe-core/playwright'))],
  }),
  'utf8',
)}
axe.configure({
  checks: [
    {
      id: 'page-has-heading-one',
      options: {
        selector:
          'h1:not([role], [aria-level]), :is(h1, h2, h3, h4, h5, h6):not([role])[aria-level=1], [role=heading][aria-level=1]',
        passForModal: false,
      },
    },
  ],
});`;

export function axe(page: Page): AxeBuilder {
  // The app blocks pinch zoom on purpose (see typography.spec.ts); text
  // still follows the user's text size.
  return new AxeBuilder({ page, axeSource: AXE_SOURCE }).disableRules([
    'meta-viewport',
  ]);
}
