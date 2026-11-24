import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';

import { buildProblem, createBuildServer } from './build-server.ts';

function build(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'bq-build-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

/** Dates the given paths below `root` back to 1970, as if they had not changed since. */
function age(root: string, ...paths: string[]): void {
  for (const path of paths) {
    utimesSync(join(root, path), new Date(0), new Date(0));
  }
}

describe('createBuildServer', () => {
  const root = build({
    'index.html': '<app-root></app-root>',
    'main.js': 'boot();',
    'assets/i18n/en.json': '{}',
    'media/inter.woff2': 'font',
  });
  const server = createBuildServer(root);
  let origin = '';

  before(async () => {
    await new Promise<void>((done) => server.listen(0, 'localhost', done));
    origin = `http://localhost:${(server.address() as AddressInfo).port}`;
  });
  after(() => server.close());

  test('serves files with their content type', async () => {
    const script = await fetch(`${origin}/main.js`);
    assert.equal(script.status, 200);
    assert.equal(
      script.headers.get('content-type'),
      'text/javascript; charset=utf-8',
    );
    assert.equal(await script.text(), 'boot();');
    const font = await fetch(`${origin}/media/inter.woff2`);
    assert.equal(font.headers.get('content-type'), 'font/woff2');
    const json = await fetch(`${origin}/assets/i18n/en.json`);
    assert.equal(
      json.headers.get('content-type'),
      'application/json; charset=utf-8',
    );
  });

  test('answers app routes with index.html', async () => {
    for (const path of ['/', '/tabs/brews', '/bean-parameter']) {
      const page = await fetch(`${origin}${path}`);
      assert.equal(page.status, 200, path);
      assert.equal(await page.text(), '<app-root></app-root>', path);
    }
  });

  test('answers a missing file with 404', async () => {
    assert.equal((await fetch(`${origin}/chunk-missing.js`)).status, 404);
  });

  test('serves nothing outside the build', async () => {
    const outside = await fetch(`${origin}/..%2f..%2fetc%2fpasswd`);
    assert.equal(outside.status, 403);
  });

  test('rejects a path that cannot be decoded', async () => {
    assert.equal((await fetch(`${origin}/%E0%A4%A`)).status, 400);
  });
});

describe('buildProblem', () => {
  test('accepts a development build newer than its sources', () => {
    const sources = build({ 'app.ts': '' });
    age(sources, 'app.ts', '');
    const root = build({ 'index.html': '', 'main.js': '' });
    assert.equal(buildProblem(root, [sources, join(root, 'gone')]), undefined);
  });

  test('asks for a build when there is none', () => {
    assert.match(buildProblem(build({}), []) ?? '', /Run "pnpm run build"/);
  });

  test('refuses a production build', () => {
    const root = build({ 'index.html': '', 'main-4F2X.js': '' });
    assert.match(buildProblem(root, []) ?? '', /not a development build/);
  });

  test('refuses a build older than a source file', () => {
    const root = build({ 'index.html': '', 'main.js': '' });
    utimesSync(join(root, 'index.html'), new Date(1000), new Date(1000));
    const sources = build({ 'app/brew/brew.ts': '' });
    age(sources, 'app/brew', 'app', '');
    assert.match(
      buildProblem(root, [sources]) ?? '',
      /app\/brew\/brew\.ts changed after the build/,
    );
  });

  test('refuses a build older than a file added to or deleted from the sources', () => {
    const root = build({ 'index.html': '', 'main.js': '' });
    utimesSync(join(root, 'index.html'), new Date(1000), new Date(1000));
    const sources = build({ 'app/brew/brew.ts': '' });
    age(sources, 'app/brew/brew.ts', 'app', '');
    assert.match(
      buildProblem(root, [sources]) ?? '',
      /app\/brew changed after the build/,
    );
  });
});
