// Git worktrees share one Angular build cache (in the main checkout). The patch
// of @angular/build in patches/ adds the file path to the cache key of code
// instrumented for coverage, so a worktree never gets another checkout's paths.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { JavaScriptTransformer } from '@angular/build/private';

const require = createRequire(import.meta.url);
const { initializeHash } = require(
  require
    .resolve('@angular/build/private')
    .replace(/private\.js$/, 'utils/hash.js'),
);

test('coverage instrumented from the cache keeps the path of the file', async () => {
  await initializeHash();
  const entries = new Map();
  const cache = {
    get: async (key) => entries.get(key),
    put: async (key, value) => void entries.set(key, value),
  };
  const transformer = new JavaScriptTransformer(
    { sourcemap: false, maxConcurrency: 1 },
    cache,
  );
  const code = 'export const answer = () => 42;\n';
  const transform = async (file) =>
    Buffer.from(
      await transformer.transformData(file, code, {
        instrumentForCoverage: true,
        skipLinker: true,
      }),
    ).toString();
  try {
    await transform('/checkout-a/src/answer.ts');
    assert.match(await transform('/checkout-b/src/answer.ts'), /checkout-b/);
  } finally {
    await transformer.close();
  }
});
