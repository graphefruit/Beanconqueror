/**
 * Areas of the app and the E2E specs that cover them, so a local run can stay with the specs of
 * the changed area (`pnpm e2e:affected`). CI still runs the full suite.
 *
 * The tags live here rather than in the specs: most specs have no describe block of their own,
 * and wrapping them in one would re-indent every file.
 */
export type Area =
  | '@a11y'
  | '@app'
  | '@bean'
  | '@brew'
  | '@data'
  | '@import'
  | '@info'
  | '@layout'
  | '@mill'
  | '@preparation'
  | '@profile'
  | '@settings';

export const SMOKE_SPEC = 'e2e/smoke.spec.ts';

export const SPEC_AREAS: Readonly<Record<string, readonly Area[]>> = {
  'e2e/a11y-bean-filter.spec.ts': ['@a11y', '@bean'],
  'e2e/a11y-brew-form.spec.ts': ['@a11y', '@brew'],
  'e2e/a11y-forms.spec.ts': ['@a11y', '@bean', '@brew'],
  'e2e/a11y-headings.spec.ts': ['@a11y'],
  'e2e/a11y-tabs.spec.ts': ['@a11y'],
  'e2e/a11y-texts.spec.ts': ['@a11y'],
  'e2e/accessibility.spec.ts': ['@a11y'],
  'e2e/announcements.spec.ts': ['@a11y', '@brew'],
  'e2e/bean-add.spec.ts': ['@bean'],
  'e2e/bean-archive.spec.ts': ['@bean'],
  'e2e/bean-blend.spec.ts': ['@bean'],
  'e2e/bean-delete.spec.ts': ['@bean', '@data'],
  'e2e/bean-detail.spec.ts': ['@bean'],
  'e2e/bean-edit.spec.ts': ['@bean'],
  'e2e/bean-freeze.spec.ts': ['@bean'],
  'e2e/bean-list.spec.ts': ['@bean'],
  'e2e/bean-photo.spec.ts': ['@bean'],
  'e2e/bean-search-filter-sort.spec.ts': ['@bean'],
  'e2e/bean-select.spec.ts': ['@bean'],
  'e2e/bean-varieties.spec.ts': ['@bean'],
  'e2e/brew-add-button.spec.ts': ['@brew', '@layout'],
  'e2e/brew-foreign-tools.spec.ts': ['@brew', '@preparation', '@data'],
  'e2e/brew-journey.spec.ts': ['@brew'],
  'e2e/brew-list-toolbar.spec.ts': ['@brew'],
  'e2e/brew-list.spec.ts': ['@brew'],
  'e2e/brew-parameters.spec.ts': ['@brew'],
  'e2e/brew-quick-action.spec.ts': ['@brew'],
  'e2e/brew-timer.spec.ts': ['@brew'],
  'e2e/brew-values.spec.ts': ['@brew'],
  'e2e/brews-with-missing-references.spec.ts': ['@brew', '@data'],
  'e2e/change-info.spec.ts': ['@data'],
  'e2e/delete-interrupted.spec.ts': ['@data'],
  'e2e/delete-with-brews.spec.ts': ['@bean', '@data'],
  'e2e/deletion-journal.spec.ts': ['@brew', '@data'],
  'e2e/device-identity.spec.ts': ['@data'],
  'e2e/duplicate-entries.spec.ts': ['@brew', '@data'],
  'e2e/fonts.spec.ts': ['@layout'],
  'e2e/form-controls.spec.ts': ['@a11y', '@bean', '@settings'],
  'e2e/graph-card.spec.ts': ['@brew'],
  'e2e/graph-detail.spec.ts': ['@brew'],
  'e2e/graph-library.spec.ts': ['@brew'],
  'e2e/import-backup.spec.ts': ['@import'],
  'e2e/keyboard-focus.spec.ts': ['@a11y', '@settings'],
  'e2e/language.spec.ts': ['@a11y', '@settings'],
  'e2e/list-add-button.spec.ts': ['@a11y', '@bean', '@brew'],
  'e2e/list-dialog-head.spec.ts': ['@layout', '@bean', '@brew'],
  'e2e/list-head-phone-landscape.spec.ts': [
    '@layout',
    '@a11y',
    '@bean',
    '@brew',
  ],
  'e2e/list-fields-link.spec.ts': ['@a11y', '@bean', '@brew'],
  'e2e/list-turn.spec.ts': ['@layout', '@bean', '@brew'],
  'e2e/navigation.spec.ts': ['@app', '@profile'],
  'e2e/overlay-stack-a11y.spec.ts': ['@a11y'],
  'e2e/overlays.spec.ts': ['@a11y'],
  'e2e/phone-landscape.spec.ts': ['@layout'],
  'e2e/preparation-tools.spec.ts': ['@preparation', '@data'],
  'e2e/profile.spec.ts': ['@profile'],
  'e2e/reading-order.spec.ts': ['@a11y', '@brew'],
  'e2e/sections.spec.ts': ['@profile', '@settings'],
  'e2e/sheet-close.spec.ts': ['@a11y', '@bean', '@brew'],
  'e2e/share-brew-image.spec.ts': ['@brew'],
  'e2e/share-logs.spec.ts': ['@info'],
  [SMOKE_SPEC]: ['@app'],
  'e2e/speech-settings.spec.ts': ['@a11y', '@brew', '@settings'],
  'e2e/standard-mill.spec.ts': ['@mill', '@data'],
  'e2e/suggestion-list.spec.ts': ['@bean'],
  'e2e/system-bars.spec.ts': ['@layout', '@settings'],
  'e2e/tablet.spec.ts': ['@layout'],
  'e2e/typography.spec.ts': ['@layout'],
  'e2e/update-from-8-8.spec.ts': ['@data', '@app'],
  'e2e/webview-unsupported.spec.ts': ['@app'],
};

/** Source paths that belong to one area. A path not listed here or below runs the full suite. */
export const SOURCE_AREAS: Readonly<Record<string, readonly Area[]>> = {
  'e2e/accessibility-baseline.json': ['@a11y'],
  'src/app/app.component.html': ['@app'],
  'src/app/app.component.ts': ['@app'],
  'src/app/app.routes.ts': ['@app'],
  'src/app/baristamode/': ['@app'],
  'src/app/bean-parameter/': ['@bean'],
  'src/app/beans/': ['@bean'],
  'src/app/brew-parameter/': ['@brew'],
  'src/app/brew/': ['@brew'],
  'src/app/dashboard/': ['@app'],
  'src/app/graph-section/': ['@app'],
  'src/app/helper/': ['@app'],
  'src/app/home/': ['@app'],
  'src/app/info/': ['@info'],
  'src/app/mill/': ['@mill'],
  'src/app/preparation/': ['@preparation'],
  'src/app/profile/': ['@profile'],
  'src/app/roasting-section/': ['@app', '@bean'],
  'src/app/settings/': ['@settings'],
  'src/app/statistic/': ['@app'],
  'src/app/unwrapped/': ['@app'],
  'src/app/water-section/': ['@app', '@profile'],
  'src/brew-session/': ['@brew'],
  'src/classes/bean/': ['@bean'],
  'src/classes/brew/': ['@brew'],
  'src/classes/changeTracking/': ['@data'],
  'src/classes/mill/': ['@mill'],
  'src/classes/preparation/': ['@preparation'],
  'src/classes/preparationDevice/': ['@preparation'],
  'src/classes/settings/': ['@settings'],
  'src/components/bean-information/': ['@bean'],
  'src/components/beans/': ['@bean'],
  'src/components/brew-information/': ['@brew'],
  'src/components/brew-ratio-card/': ['@brew'],
  'src/components/brew-timer/': ['@brew'],
  'src/components/brews/': ['@brew'],
  'src/components/mill-information-card/': ['@mill'],
  'src/components/preparation-information-card/': ['@preparation'],
  'src/directive/bean-overlay.directive.ts': ['@bean'],
  'src/directive/mill-overlay.directive.ts': ['@mill'],
  'src/directive/preparation-overlay.directive.ts': ['@preparation'],
  'src/mapper/bean/': ['@bean'],
  'src/models/bean/': ['@bean'],
  'src/pipes/bean/': ['@bean'],
  'src/pipes/brew/': ['@brew'],
  'src/pipes/mill/': ['@mill'],
  'src/pipes/preparation/': ['@preparation'],
  'src/pipes/setting/': ['@settings'],
  'src/services/a11y/': ['@a11y'],
  'src/services/changeTracking/': ['@data'],
  'src/services/deletionJournal/': ['@data'],
  'src/services/discardGuard/': ['@bean', '@brew'],
  'src/services/deviceIdentity/': ['@data'],
  'src/services/preImportBackup/': ['@import'],
  'src/services/textToSpeech/': ['@brew', '@settings'],
  'src/stores/beans/': ['@bean'],
  'src/stores/brews/': ['@brew'],
  'src/stores/core/': ['@data'],
  'src/stores/delete-commands.ts': ['@data'],
};

/** Paths that the browser E2E specs do not exercise. */
const WITHOUT_E2E = [
  '.github/',
  'android/',
  'demo/',
  'docs/',
  'e2e/device/',
  'e2e/perf/',
  'e2e/tools/affected.ts',
  'e2e/tools/areas.ts',
  'fastlane/',
  'ios/',
  'playwright.device.config.ts',
  'playwright.perf.config.ts',
  'resources/',
  'store_screens/',
  'tools/',
];

/** The areas a changed file belongs to: none for files without E2E, undefined when unknown. */
export function areasOf(path: string): readonly Area[] | undefined {
  if (
    WITHOUT_E2E.some((prefix) => path.startsWith(prefix)) ||
    path.endsWith('.md') ||
    path.endsWith('.check.ts') ||
    (path.startsWith('src/') &&
      (path.includes('/__tests__/') || path.endsWith('.spec.ts')))
  ) {
    return [];
  }
  const prefix = Object.keys(SOURCE_AREAS)
    .filter((source) => path.startsWith(source))
    .sort((a, b) => b.length - a.length)[0];
  return prefix === undefined ? undefined : SOURCE_AREAS[prefix];
}

export type Selection =
  | { readonly all: true; readonly cause: string }
  | { readonly all: false; readonly specs: readonly string[] };

/**
 * The specs to run for the changed files: the changed specs, the specs of the changed areas and
 * the smoke test. A file of no known area selects the full suite.
 */
export function selectSpecs(
  changed: readonly string[],
  specs: readonly string[],
): Selection {
  const selected = new Set([SMOKE_SPEC]);
  const areas = new Set<Area>();
  for (const path of changed) {
    if (/^e2e\/[^/]+\.spec\.ts$/.test(path)) {
      // A deleted spec is gone from the list and has nothing left to run.
      if (specs.includes(path)) {
        selected.add(path);
      }
      continue;
    }
    const found = areasOf(path);
    if (found === undefined) {
      return { all: true, cause: path };
    }
    found.forEach((area) => areas.add(area));
  }
  for (const spec of specs) {
    if (SPEC_AREAS[spec]?.some((area) => areas.has(area))) {
      selected.add(spec);
    }
  }
  return { all: false, specs: [...selected].sort() };
}
