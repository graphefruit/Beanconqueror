import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

import { selectSpecs } from './areas.ts';

// `pnpm e2e:affected [playwright options]`: runs the specs of the areas this branch changed,
// committed or not, compared with the branch it starts from.
const BASE = 'origin/feature/relaunch';

function git(...args: string[]): string[] {
  return execFileSync('git', args, { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

const changed = new Set([
  ...git('diff', '--name-only', `${BASE}...HEAD`),
  ...git('diff', '--name-only', 'HEAD'),
  ...git('ls-files', '--others', '--exclude-standard'),
]);
const specs = readdirSync('e2e')
  .filter((file) => file.endsWith('.spec.ts'))
  .map((file) => `e2e/${file}`);

const selection = selectSpecs([...changed], specs);
console.log(
  selection.all
    ? `Full suite: ${selection.cause} belongs to no area (e2e/tools/areas.ts).`
    : `Specs of the changed areas:\n  ${selection.specs.join('\n  ')}`,
);
const run = spawnSync(
  'pnpm',
  [
    'exec',
    'playwright',
    'test',
    ...(selection.all ? [] : selection.specs),
    ...process.argv.slice(2),
  ],
  { stdio: 'inherit' },
);
process.exit(run.status ?? 1);
