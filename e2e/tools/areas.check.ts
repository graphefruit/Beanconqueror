import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  areasOf,
  selectSpecs,
  SMOKE_SPEC,
  SOURCE_AREAS,
  SPEC_AREAS,
} from './areas.ts';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const specsOnDisk = readdirSync(`${repo}e2e`)
  .filter((file) => file.endsWith('.spec.ts'))
  .map((file) => `e2e/${file}`);

function specsFor(...changed: string[]): readonly string[] {
  const selection = selectSpecs(changed, specsOnDisk);
  assert.equal(selection.all, false);
  return selection.all ? [] : selection.specs;
}

describe('the area map', () => {
  test('gives every spec at least one area', () => {
    const untagged = specsOnDisk.filter(
      (spec) => (SPEC_AREAS[spec]?.length ?? 0) === 0,
    );
    assert.deepEqual(untagged, [], 'add these specs to SPEC_AREAS');
  });

  test('lists no spec that is gone', () => {
    const gone = Object.keys(SPEC_AREAS).filter(
      (spec) => !specsOnDisk.includes(spec),
    );
    assert.deepEqual(gone, []);
  });

  test('lists no source path that is gone', () => {
    const gone = Object.keys(SOURCE_AREAS).filter(
      (source) => !existsSync(`${repo}${source}`),
    );
    assert.deepEqual(gone, [], 'moved or deleted: update SOURCE_AREAS');
  });

  test('covers every area of a source path by a spec', () => {
    const covered = new Set(Object.values(SPEC_AREAS).flat());
    const uncovered = Object.values(SOURCE_AREAS)
      .flat()
      .filter((area) => !covered.has(area));
    assert.deepEqual(uncovered, []);
  });
});

describe('areasOf', () => {
  test('finds the area of a file in an area folder', () => {
    assert.deepEqual(areasOf('src/app/brew/brew-add/brew-add.component.ts'), [
      '@brew',
    ]);
    assert.deepEqual(areasOf('src/app/brew-parameter/brew-parameter.page.ts'), [
      '@brew',
    ]);
    assert.deepEqual(areasOf('src/stores/beans/bean.store.ts'), ['@bean']);
  });

  test('gives no area to files without E2E', () => {
    for (const path of [
      'android/app/build.gradle',
      'ios/App/App/Info.plist',
      'docs/ARCHITECTURE.md',
      'README.md',
      'src/app/brew/__tests__/brew-add.spec.ts',
      'src/services/uiHelper/uiHelper.spec.ts',
      'e2e/perf/large-data.perf.ts',
      'e2e/tools/areas.check.ts',
    ]) {
      assert.deepEqual(areasOf(path), [], path);
    }
  });

  test('knows no area of shared code', () => {
    for (const path of [
      'src/global.scss',
      'src/assets/i18n/en.json',
      'src/components/header/header.component.ts',
      'e2e/fixtures.ts',
      'e2e/support/seed.ts',
      'e2e/tools/build-server.ts',
      'playwright.config.ts',
      'package.json',
    ]) {
      assert.equal(areasOf(path), undefined, path);
    }
  });
});

describe('selectSpecs', () => {
  test('a brew change runs the brew specs and the smoke test only', () => {
    const specs = specsFor('src/app/brew/brew-add/brew-add.component.html');
    assert.ok(specs.includes(SMOKE_SPEC));
    assert.ok(specs.includes('e2e/brew-journey.spec.ts'));
    assert.ok(specs.includes('e2e/reading-order.spec.ts'));
    assert.ok(!specs.includes('e2e/bean-add.spec.ts'));
    assert.ok(!specs.includes('e2e/tablet.spec.ts'));
    assert.ok(
      specs.every(
        (spec) => spec === SMOKE_SPEC || SPEC_AREAS[spec]?.includes('@brew'),
      ),
    );
  });

  test('a changed spec runs itself', () => {
    assert.deepEqual(specsFor('e2e/tablet.spec.ts', 'docs/TESTING.md'), [
      SMOKE_SPEC,
      'e2e/tablet.spec.ts',
    ]);
  });

  test('a deleted spec is not run', () => {
    assert.deepEqual(specsFor('e2e/removed.spec.ts'), [SMOKE_SPEC]);
  });

  test('a change without E2E runs the smoke test only', () => {
    assert.deepEqual(specsFor('ios/App/Podfile', 'README.md'), [SMOKE_SPEC]);
    assert.deepEqual(specsFor(), [SMOKE_SPEC]);
  });

  test('a file of no known area runs the full suite', () => {
    assert.deepEqual(
      selectSpecs(['src/app/beans/beans.page.ts', 'src/global.scss'], []),
      { all: true, cause: 'src/global.scss' },
    );
  });
});
