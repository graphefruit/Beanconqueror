import {
  brewsLeftWithoutStandardMill,
  StandardMillBrew,
  StandardMillEntry,
} from './standard-mill';

function mill(
  _uuid: unknown,
  _name = 'Standard',
  _created: unknown = 100,
): StandardMillEntry {
  return { name: _name, config: { uuid: _uuid, unix_timestamp: _created } };
}

function brew(
  _mill: unknown,
  _created: unknown = 50,
  _imported?: object,
): StandardMillBrew {
  return {
    mill: _mill,
    config: { unix_timestamp: _created },
    customInformation: _imported ? { imported: _imported } : {},
  };
}

describe('brewsLeftWithoutStandardMill', () => {
  it('chooses the brews with an empty grinder created up to the grinder Standard', () => {
    const before = brew('', 50);
    const same = brew('', 100);
    const result = brewsLeftWithoutStandardMill(
      [before, same, brew('', 101)],
      [mill('own', 'Comandante'), mill('standard')],
    );

    expect(result.mill).toBe('standard');
    expect(result.brews).toEqual([before, same]);
    expect(result.standardMills).toBe(1);
  });

  it('leaves brews with a grinder, also a grinder that is not stored', () => {
    const result = brewsLeftWithoutStandardMill(
      [brew('own'), brew('gone')],
      [mill('standard'), mill('own', 'Comandante')],
    );

    expect(result.brews).toEqual([]);
  });

  it('leaves brews added after the grinder Standard whose date was set back', () => {
    const estimated = {
      ...brew('', 50),
      config: { unix_timestamp: 50, created_at: 50_000 },
    };
    const sameSecond = {
      ...brew('', 50),
      config: { unix_timestamp: 50, created_at: 100_000 },
    };
    const result = brewsLeftWithoutStandardMill(
      [
        estimated,
        sameSecond,
        {
          ...brew('', 50),
          config: { unix_timestamp: 50, created_at: 100_001 },
        },
      ],
      [mill('standard')],
    );

    expect(result.brews).toEqual([estimated, sameSecond]);
  });

  it('leaves brews handed over from another app', () => {
    const result = brewsLeftWithoutStandardMill(
      [brew('', 50, { source: 'other app' })],
      [mill('standard')],
    );

    expect(result.brews).toEqual([]);
  });

  it('leaves brews without a grinder field or a time of creation', () => {
    const result = brewsLeftWithoutStandardMill(
      [
        brew(undefined),
        brew(null),
        { mill: '' },
        brew('', null),
        brew('', '50'),
        null,
      ],
      [mill('standard')],
    );

    expect(result.brews).toEqual([]);
  });

  it('chooses nothing without a grinder Standard', () => {
    const result = brewsLeftWithoutStandardMill(
      [brew('')],
      [mill('own', 'Comandante'), mill('renamed', 'standard')],
    );

    expect(result).toEqual({ mill: '', brews: [], standardMills: 0 });
  });

  it('chooses nothing when several grinders are named Standard', () => {
    const result = brewsLeftWithoutStandardMill(
      [brew('')],
      [mill('first'), mill('second')],
    );

    expect(result).toEqual({ mill: '', brews: [], standardMills: 2 });
  });

  it('chooses nothing when the grinder Standard has no uuid or no time of creation', () => {
    for (const standard of [
      mill(''),
      mill(undefined),
      mill('standard', 'Standard', null),
      { name: 'Standard' },
    ]) {
      expect(brewsLeftWithoutStandardMill([brew('')], [standard]).brews)
        .withContext(JSON.stringify(standard))
        .toEqual([]);
    }
  });
});
