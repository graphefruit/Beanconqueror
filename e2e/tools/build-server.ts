import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

/**
 * Serves the app build in `root` as `ng serve` does: files as they are, every other path without
 * a file extension as `index.html`, so the router can open it.
 */
export function createBuildServer(root: string): Server {
  const base = resolve(root);
  return createServer((request, response) => {
    let pathname: string;
    try {
      pathname = decodeURIComponent(
        new URL(request.url ?? '/', 'http://localhost').pathname,
      );
    } catch {
      response.writeHead(400).end();
      return;
    }
    const requested = resolve(join(base, pathname));
    if (requested !== base && !requested.startsWith(base + sep)) {
      response.writeHead(403).end();
      return;
    }
    let file = requested;
    if (!isFile(file)) {
      if (extname(pathname)) {
        response.writeHead(404).end();
        return;
      }
      file = join(base, 'index.html');
    }
    response.writeHead(200, {
      'Content-Type':
        CONTENT_TYPES[extname(file).toLowerCase()] ??
        'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    createReadStream(file).pipe(response);
  });
}

function changedAfter(path: string, time: number): string | undefined {
  const stat = statSync(path);
  // A directory changes when a file in it is added or deleted.
  if (stat.mtimeMs > time) {
    return path;
  }
  if (!stat.isDirectory()) {
    return undefined;
  }
  for (const entry of readdirSync(path)) {
    const changed = changedAfter(join(path, entry), time);
    if (changed) {
      return changed;
    }
  }
  return undefined;
}

/**
 * Why the build in `root` must not be tested, or undefined when it can be. Tests reach into the
 * app through Angular's development hooks (`ng.getComponent`), which a production build lacks,
 * and a build older than its sources would test code that is no longer there.
 */
export function buildProblem(
  root: string,
  sources: readonly string[],
): string | undefined {
  const index = join(root, 'index.html');
  if (!isFile(index)) {
    return `No app build in ${root}. Run "pnpm run build" first.`;
  }
  // The production configuration hashes file names; the development build keeps main.js.
  if (!isFile(join(root, 'main.js'))) {
    return `The build in ${root} is not a development build. Run "pnpm run build".`;
  }
  const built = statSync(index).mtimeMs;
  const stale = sources
    .filter((source) => existsSync(source))
    .map((source) => changedAfter(source, built))
    .find(Boolean);
  if (stale) {
    return `${stale} changed after the build in ${root}. Run "pnpm run build" again.`;
  }
  return undefined;
}
