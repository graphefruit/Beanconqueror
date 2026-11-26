import {
  backupFormatProblem,
  NotABackupError,
  splitExportPartProblem,
} from '../backup-format-rules';

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

describe('splitExportPartProblem', () => {
  const list = (_count: number) => Array.from({ length: _count }, () => ({}));

  for (const [name, content] of [
    ['a small backup', { SETTINGS: [{}], BREWS: list(499), BEANS: list(3) }],
    ['a backup of one file with more brews', { BREWS: list(501) }],
    ['barista brews below one part', { BARISTAMODE_BREWS: list(249) }],
    ['lists that are no lists', { BREWS: { length: 500 } }],
    ['no object', null],
    ['a list', list(500)],
  ] as [string, unknown][]) {
    it(`finds nothing in ${name}`, () => {
      expect(splitExportPartProblem(content)).toBeNull();
    });
  }

  for (const [key, size] of [
    ['BREWS', 500],
    ['BEANS', 500],
    ['BARISTAMODE_BREWS', 250],
  ] as [string, number][]) {
    it(`takes ${size} ${key} for the first part of a split export`, () => {
      expect(
        splitExportPartProblem({ SETTINGS: [{}], [key]: list(size) }),
      ).toBe(
        `The list ${key} holds ${size} entries, the size of the first part of an export split into several files`,
      );
    });
  }
});

describe('NotABackupError', () => {
  it('carries the reason as its message', () => {
    const error = new NotABackupError('The zip file is empty');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('NotABackupError');
    expect(error.message).toBe('The zip file is empty');
  });
});
