import { fileURLToPath } from 'node:url';

import { buildProblem, createBuildServer } from './build-server.ts';

// The web server of `pnpm e2e`: serves the build of `pnpm run build` instead of compiling the app
// again for every run.
const repo = fileURLToPath(new URL('../..', import.meta.url));
const root = `${repo}www/browser`;
const port = Number(process.env['E2E_PORT'] ?? 4300);

const problem = buildProblem(root, [
  `${repo}src`,
  `${repo}angular.json`,
  `${repo}package.json`,
]);
if (problem) {
  console.error(problem);
  process.exit(1);
}
createBuildServer(root).listen(port, 'localhost');
