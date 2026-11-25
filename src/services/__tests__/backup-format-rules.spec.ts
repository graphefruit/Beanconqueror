import { backupFormatProblem } from '../backup-format-rules';

describe('backupFormatProblem', () => {
  for (const [name, content] of [
    ['a full backup', { SETTINGS: [{}], BEANS: [{}], BREWS: [{}], MILL: [] }],
    ['an old, small backup', { SETTINGS: [{}], BEANS: [{ name: 'A' }] }],
    ['a backup of settings alone', { SETTINGS: [{}] }],
    ['beans without settings', { BEANS: [] }],
    ['brews without settings', { BREWS: [{}] }],
  ] as [string, unknown][]) {
    it(`takes ${name} as a backup`, () => {
      expect(backupFormatProblem(content)).toBeNull();
    });
  }

  for (const content of [null, undefined, 'text', 3, [], [{ SETTINGS: [] }]]) {
    it(`refuses ${JSON.stringify(content)} as no object`, () => {
      expect(backupFormatProblem(content)).toBe(
        'The file holds no JSON object',
      );
    });
  }

  for (const [name, content] of [
    ['an empty object', {}],
    ['the file of another app', { recipes: [{}], version: 2 }],
    ['lists under other names', { settings: [{}], beans: [] }],
    ['settings that are no list', { SETTINGS: { language: 'en' } }],
  ] as [string, unknown][]) {
    it(`refuses ${name}`, () => {
      expect(backupFormatProblem(content)).toBe(
        'The file holds no list SETTINGS, BEANS, BREWS',
      );
    });
  }
});
