#!/usr/bin/env node

import { readdirSync } from 'fs';

const iconsDir = './src/assets/custom-ion-icons';
const files = readdirSync(iconsDir).filter((f) => f.endsWith('.svg'));

const icons = files.map((file) => ({
  name: file.substring(0, file.lastIndexOf('.')),
  path: file,
}));

// Sort by path to keep git diffs clean
icons.sort((a, b) => a.path.localeCompare(b.path));

const iconEntries = icons
  .map(
    (icon) => `  {\n    name: '${icon.name}',\n    path: '${icon.path}'\n  }`,
  )
  .join(',\n');

const output = `// Auto-generated file listing all custom icons
// Regenerate using: npm run generate-icon-registry

export const beanconquerorIcons = [
${iconEntries}
];
`;

console.log(output);
