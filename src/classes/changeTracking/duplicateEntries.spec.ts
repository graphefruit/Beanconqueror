import { REFERENCE_GRAPH_TYPE } from '../../enums/brews/referenceGraphType';
import {
  countChangedEntries,
  countWithoutIdenticalCopies,
  deriveNewUuids,
  isSameEntry,
  removeDuplicateEntries,
  removeDuplicateEntriesFromData,
} from './duplicateEntries';

type Entry = Record<string, any>;

function entry(_uuid: string, _values: Entry = {}, _config: Entry = {}): Entry {
  return {
    name: 'Entry',
    note: '',
    attachments: [],
    ..._values,
    config: { uuid: _uuid, unix_timestamp: 1_600_000_000, ..._config },
  };
}

function brew(_uuid: string, _values: Entry = {}): Entry {
  return entry(_uuid, {
    bean: 'bean-a',
    mill: 'mill-a',
    method_of_preparation: 'preparation-a',
    water: '',
    flow_profile: '',
    reference_flow_profile: { type: REFERENCE_GRAPH_TYPE.NONE, uuid: '' },
    ..._values,
  });
}

function uuids(_entries: Entry[]): string[] {
  return _entries.map((_entry) => _entry.config.uuid as string);
}

/** Gives new-1, new-2, … */
function uuidSource(): () => string {
  let next = 0;
  return () => `new-${++next}`;
}

describe('duplicateEntries', () => {
  describe('isSameEntry', () => {
    it('compares the content deeply and leaves out the change info', () => {
      const first = entry('x', { values: [1, { a: 'b' }] });
      const second = entry(
        'x',
        { values: [1, { a: 'b' }] },
        { created_at: 5, updated_at: 7, rev: 3, updated_by: 'device-b' },
      );

      expect(isSameEntry(first, second)).toBeTrue();
      const changed = entry('x', { values: [1, { a: 'c' }] });
      const reordered = entry('x', { values: [{ a: 'b' }, 1] });
      expect(isSameEntry(first, changed)).toBeFalse();
      expect(isSameEntry(first, reordered)).toBeFalse();
    });

    it('treats a property set to undefined as missing', () => {
      const undefinedValue = entry('x', { extra: undefined });
      expect(isSameEntry(undefinedValue, entry('x'))).toBeTrue();
      expect(isSameEntry(entry('x', { extra: null }), entry('x'))).toBeFalse();
      expect(isSameEntry(entry('x', { extra: '' }), entry('x'))).toBeFalse();
    });

    it('compares the unix timestamp and other config values', () => {
      expect(
        isSameEntry(
          entry('x'),
          entry('x', {}, { unix_timestamp: 1_600_000_001 }),
        ),
      ).toBeFalse();
    });

    it('compares dates by time and never takes other objects as equal', () => {
      expect(
        isSameEntry(
          entry('x', { at: new Date(1000) }),
          entry('x', { at: new Date(1000) }),
        ),
      ).toBeTrue();
      expect(
        isSameEntry(
          entry('x', { at: new Date(1000) }),
          entry('x', { at: new Date(2000) }),
        ),
      ).toBeFalse();
      expect(
        isSameEntry(
          entry('x', { set: new Set([1]) }),
          entry('x', { set: new Set([2]) }),
        ),
      ).toBeFalse();
      const notANumber = entry('x', { n: NaN });
      expect(isSameEntry(notANumber, structuredClone(notANumber))).toBeTrue();
    });

    it('never takes a hole in a list for a value', () => {
      // The database keeps holes in lists.
      const values: unknown[] = [];
      values[1] = 'b';
      const withHole = entry('x', { values });
      const withValue = entry('x', { values: ['a', 'b'] });

      expect(isSameEntry(withHole, withValue)).toBeFalse();
      expect(isSameEntry(withValue, withHole)).toBeFalse();
      expect(isSameEntry(withHole, structuredClone(withHole))).toBeTrue();
      // A hole reads as undefined and is written as null, like undefined.
      expect(
        isSameEntry(withHole, entry('x', { values: [undefined, 'b'] })),
      ).toBeTrue();
      expect(
        isSameEntry(withHole, entry('x', { values: [null, 'b'] })),
      ).toBeFalse();

      const entries = [withHole, withValue];
      const result = removeDuplicateEntries('BEANS', entries, {}, uuidSource());
      expect(result.removed).toBe(0);
      expect(entries.length).toBe(2);
    });
  });

  describe('removeDuplicateEntries', () => {
    it('removes identical copies, keeps the first entry and the order', () => {
      const first = brew('brew-x');
      first.config.rev = 4;
      const entries = [
        brew('brew-a'),
        first,
        structuredClone(first),
        brew('brew-b'),
        // Copies were never updated, their change info can be older.
        { ...structuredClone(first), config: { ...first.config, rev: 0 } },
      ];

      const result = removeDuplicateEntries('BREWS', entries, {}, uuidSource());

      expect(uuids(entries)).toEqual(['brew-a', 'brew-x', 'brew-b']);
      expect(entries[1]).toBe(first);
      expect(entries[1].config.rev).toBe(4);
      expect(result).toEqual({
        groups: 1,
        entries: 3,
        removed: 2,
        renamed: [],
        kept: [],
      });
      expect(countChangedEntries(result)).toBe(2);
    });

    it('cleans every collection the same way', () => {
      const bean = entry('bean-x', { roaster: 'Roaster' });
      const entries = [bean, structuredClone(bean), entry('bean-y')];

      const result = removeDuplicateEntries('BEANS', entries, {}, uuidSource());

      expect(uuids(entries)).toEqual(['bean-x', 'bean-y']);
      expect(result.removed).toBe(1);
    });

    it('gives a differing copy a new uuid when nothing refers to the uuid', () => {
      const first = brew('brew-x', { note: 'edited later' });
      const copy = brew('brew-x', { note: 'as first stored' });
      // Copies can share their config object in memory.
      copy.config = first.config;
      const entries = [first, copy];

      const result = removeDuplicateEntries(
        'BREWS',
        entries,
        { BEANS: [entry('bean-a')], SETTINGS: [{ filter: [] }] },
        uuidSource(),
      );

      expect(entries.length).toBe(2);
      expect(first.config.uuid).toBe('brew-x');
      expect(copy.config.uuid).toBe('new-1');
      expect(copy.note).toBe('as first stored');
      expect(copy.config.unix_timestamp).toBe(first.config.unix_timestamp);
      expect(result).toEqual({
        groups: 1,
        entries: 2,
        removed: 0,
        renamed: [{ uuid: 'brew-x', new_uuid: 'new-1' }],
        kept: [],
      });
    });

    it('keeps the change info of a copy that gets a new uuid', () => {
      const changeInfo = {
        created_at: 1_600_000_000_000,
        updated_at: 0,
        rev: 0,
        updated_by: '',
      };
      const entries = [
        entry('mill-x', { name: 'A' }, changeInfo),
        entry('mill-x', { name: 'B' }, changeInfo),
      ];

      removeDuplicateEntries('MILL', entries, {}, uuidSource());

      expect(entries[1].config).toEqual({
        uuid: 'new-1',
        unix_timestamp: 1_600_000_000,
        ...changeInfo,
      });
    });

    it('gives each further differing copy its own new uuid', () => {
      const entries = [
        entry('water-x', { name: 'A' }),
        entry('water-x', { name: 'B' }),
        entry('water-x', { name: 'C' }),
      ];

      const result = removeDuplicateEntries('WATER', entries, {}, uuidSource());

      expect(uuids(entries)).toEqual(['water-x', 'new-1', 'new-2']);
      expect(result.renamed.length).toBe(2);
    });

    it('removes identical copies and renames differing ones of the same uuid', () => {
      const first = entry('bean-x', { name: 'A' });
      const later = entry('bean-x', { name: 'B' });
      const entries = [
        first,
        structuredClone(later),
        structuredClone(first),
        later,
      ];

      const result = removeDuplicateEntries('BEANS', entries, {}, uuidSource());

      expect(entries.map((_entry) => _entry.name as string)).toEqual([
        'A',
        'B',
      ]);
      expect(uuids(entries)).toEqual(['bean-x', 'new-1']);
      expect(result.removed).toBe(2);
      expect(result.renamed.length).toBe(1);
    });

    describe('keeps differing copies with the shared uuid when it is referenced', () => {
      function cleanBeans(_data: Record<string, unknown>) {
        const entries = [
          entry('bean-x', { name: 'A' }),
          entry('bean-x', { name: 'B' }),
        ];
        const result = removeDuplicateEntries(
          'BEANS',
          entries,
          _data,
          uuidSource(),
        );
        return { entries, result };
      }

      it('by a brew', () => {
        const { entries, result } = cleanBeans({
          BREWS: [brew('brew-a'), brew('brew-b', { bean: 'bean-x' })],
        });

        expect(uuids(entries)).toEqual(['bean-x', 'bean-x']);
        expect(result.kept).toEqual(['bean-x']);
        expect(result.renamed).toEqual([]);
        expect(countChangedEntries(result)).toBe(0);
      });

      it('by a barista mode brew', () => {
        const { result } = cleanBeans({
          BARISTAMODE_BREWS: [entry('barista-a', { bean: 'bean-x' })],
        });

        expect(result.kept).toEqual(['bean-x']);
      });

      it('by the settings', () => {
        const { result } = cleanBeans({
          SETTINGS: [{ brew_filter: { OPEN: { bean: ['bean-x'] } } }],
        });

        expect(result.kept).toEqual(['bean-x']);
      });

      it('by a nested value or a key', () => {
        expect(
          cleanBeans({
            GREEN_BEANS: [entry('green-a', { origins: [{ ref: 'bean-x' }] })],
          }).result.kept,
        ).toEqual(['bean-x']);
        expect(
          cleanBeans({ SETTINGS: [{ colors: { 'bean-x': '#fff' } }] }).result
            .kept,
        ).toEqual(['bean-x']);
      });

      it('by a file path', () => {
        const { result } = cleanBeans({
          BREWS: [brew('brew-a', { attachments: ['photos/bean-x_photo.jpg'] })],
        });

        expect(result.kept).toEqual(['bean-x']);
      });

      it('but not by the own uuid of another entry', () => {
        const { result } = cleanBeans({ BREWS: [brew('bean-x')] });

        expect(result.kept).toEqual([]);
        expect(result.renamed.length).toBe(1);
      });
    });

    it('keeps differing copies when a brew refers to the shared uuid as reference graph', () => {
      const entries = [
        brew('brew-x', { note: 'A' }),
        brew('brew-x', { note: 'B' }),
        brew('brew-c', {
          reference_flow_profile: {
            type: REFERENCE_GRAPH_TYPE.BREW,
            uuid: 'brew-x',
          },
        }),
      ];

      const result = removeDuplicateEntries('BREWS', entries, {}, uuidSource());

      expect(uuids(entries)).toEqual(['brew-x', 'brew-x', 'brew-c']);
      expect(result.kept).toEqual(['brew-x']);
    });

    it('keeps differing copies when a copy has a flow profile', () => {
      const withPath = [
        brew('brew-x', { note: 'A' }),
        brew('brew-x', {
          note: 'B',
          flow_profile: 'brews/brew-x_flow_profile.json',
        }),
      ];
      // Flow profiles are found by the uuid of the brew, whatever the path says.
      const otherPath = [
        brew('brew-y', { note: 'A' }),
        brew('brew-y', { note: 'B', flow_profile: 'brews/other.json' }),
      ];
      const importedGraph = [
        brew('brew-z', { note: 'A' }),
        brew('brew-z', {
          note: 'B',
          reference_flow_profile: {
            type: REFERENCE_GRAPH_TYPE.IMPORTED_GRAPH,
            uuid: 'unrelated',
          },
        }),
      ];

      for (const entries of [withPath, otherPath, importedGraph]) {
        const shared = entries[0].config.uuid;
        const result = removeDuplicateEntries(
          'BREWS',
          entries,
          {},
          uuidSource(),
        );
        expect(result.kept).withContext(shared).toEqual([shared]);
        expect(uuids(entries)).withContext(shared).toEqual([shared, shared]);
      }
    });

    it('keeps differing copies of graphs and barista mode brews with a flow profile', () => {
      for (const collection of ['GRAPH', 'BARISTAMODE_BREWS']) {
        const entries = [
          entry('x', { name: 'A' }),
          entry('x', { name: 'B', flow_profile: 'files/flow.json' }),
        ];
        const result = removeDuplicateEntries(
          collection,
          entries,
          {},
          uuidSource(),
        );
        expect(result.kept).withContext(collection).toEqual(['x']);
      }
    });

    it('lets the first entry keep its own flow profile and references', () => {
      const first = brew('brew-x', {
        note: 'A',
        flow_profile: 'brews/brew-x_flow_profile.json',
        reference_flow_profile: {
          type: REFERENCE_GRAPH_TYPE.IMPORTED_GRAPH,
          uuid: 'brew-x',
        },
      });
      const entries = [
        first,
        // An identical copy of the first entry mentions the uuid just as well.
        structuredClone(first),
        brew('brew-x', { note: 'B' }),
      ];

      const result = removeDuplicateEntries('BREWS', entries, {}, uuidSource());

      expect(uuids(entries)).toEqual(['brew-x', 'new-1']);
      expect(entries[0]).toBe(first);
      expect(result.removed).toBe(1);
      expect(result.renamed).toEqual([{ uuid: 'brew-x', new_uuid: 'new-1' }]);
    });

    it('keeps differing copies when a differing copy refers to the uuid', () => {
      const entries = [
        brew('brew-x', { note: 'A' }),
        brew('brew-x', { note: 'see brew-x' }),
      ];

      const result = removeDuplicateEntries('BREWS', entries, {}, uuidSource());

      expect(result.kept).toEqual(['brew-x']);
    });

    it('decides for each shared uuid on its own', () => {
      const entries = [
        entry('bean-x', { name: 'A' }),
        entry('bean-x', { name: 'B' }),
        entry('bean-y', { name: 'A' }),
        entry('bean-y', { name: 'B' }),
        entry('bean-z', { name: 'A' }),
        entry('bean-z', { name: 'A' }),
      ];

      const result = removeDuplicateEntries(
        'BEANS',
        entries,
        { BREWS: [brew('brew-a', { bean: 'bean-y' })] },
        uuidSource(),
      );

      expect(uuids(entries)).toEqual([
        'bean-x',
        'new-1',
        'bean-y',
        'bean-y',
        'bean-z',
      ]);
      expect(result).toEqual({
        groups: 3,
        entries: 6,
        removed: 1,
        renamed: [{ uuid: 'bean-x', new_uuid: 'new-1' }],
        kept: ['bean-y'],
      });
    });

    it('finds a shared uuid in a text that a shorter shared uuid is part of', () => {
      const entries = [
        entry('bean-1', { name: 'A' }),
        entry('bean-1', { name: 'B' }),
        entry('bean-10', { name: 'A' }),
        entry('bean-10', { name: 'B' }),
      ];

      const result = removeDuplicateEntries(
        'BEANS',
        entries,
        {
          BREWS: [
            brew('brew-a', { attachments: ['photos/bean-10_photo.jpg'] }),
          ],
        },
        uuidSource(),
      );

      expect(result.kept).toContain('bean-10');
      expect(uuids(entries).slice(2)).toEqual(['bean-10', 'bean-10']);
    });

    it('looks for references in the given entries, not in the stored copy of the collection', () => {
      const entries = [
        brew('brew-x', { note: 'A' }),
        brew('brew-x', { note: 'B' }),
      ];

      const result = removeDuplicateEntries(
        'BREWS',
        entries,
        // An outdated value for the collection itself is not read.
        { BREWS: [brew('brew-c', { note: 'brew-x' })] },
        uuidSource(),
      );

      expect(result.renamed.length).toBe(1);
    });

    it('changes nothing when it runs again', () => {
      const shared = entry('bean-x', { name: 'A' });
      const entries = [
        shared,
        structuredClone(shared),
        entry('bean-y', { name: 'A' }),
        entry('bean-y', { name: 'B' }),
        entry('bean-z', { name: 'A' }),
        entry('bean-z', { name: 'B' }),
      ];
      const data = { BREWS: [brew('brew-a', { bean: 'bean-z' })] };
      const createUuid = uuidSource();
      removeDuplicateEntries('BEANS', entries, data, createUuid);
      const afterFirstRun = structuredClone(entries);

      const result = removeDuplicateEntries('BEANS', entries, data, createUuid);

      expect(entries).toEqual(afterFirstRun);
      expect(countChangedEntries(result)).toBe(0);
      // The kept copies are reported again, nothing else.
      expect(result).toEqual({
        groups: 1,
        entries: 2,
        removed: 0,
        renamed: [],
        kept: ['bean-z'],
      });
    });

    it('changes nothing when it fails', () => {
      const shared = entry('bean-x', { name: 'A' });
      const entries = [
        shared,
        structuredClone(shared),
        entry('bean-y', { name: 'A' }),
        entry('bean-y', { name: 'B' }),
        entry('bean-z', { name: 'A' }),
        entry('bean-z', { name: 'B' }),
      ];
      const before = structuredClone(entries);
      let calls = 0;
      const failingSecondTime = () => {
        if (++calls === 2) {
          throw new Error('no uuid');
        }
        return `new-${calls}`;
      };

      expect(() =>
        removeDuplicateEntries('BEANS', entries, {}, failingSecondTime),
      ).toThrowError('no uuid');

      expect(entries).toEqual(before);
    });

    it('refuses a new uuid the collection already holds and changes nothing', () => {
      for (const taken of ['bean-y', 'new-1']) {
        const entries = [
          entry('bean-x', { name: 'A' }),
          entry('bean-x', { name: 'B' }),
          entry('bean-x', { name: 'C' }),
          entry('bean-y'),
        ];
        const before = structuredClone(entries);
        const answers = ['new-1', taken];

        expect(() =>
          removeDuplicateEntries('BEANS', entries, {}, () => answers.shift()),
        )
          .withContext(taken)
          .toThrowError(`The uuid ${taken} is already taken`);

        expect(entries).withContext(taken).toEqual(before);
      }
    });

    it('leaves entries without a uuid and other values alone', () => {
      const withoutUuid = { name: 'no uuid', config: {} };
      const entries: unknown[] = [
        withoutUuid,
        structuredClone(withoutUuid),
        null,
        'text',
        { name: 'no config' },
        entry(''),
        entry(''),
      ];
      const before = structuredClone(entries);

      const result = removeDuplicateEntries('BEANS', entries, {}, uuidSource());

      expect(entries).toEqual(before);
      expect(result.groups).toBe(0);
    });

    it('does nothing without entries', () => {
      expect(
        removeDuplicateEntries('BEANS', undefined as any, {}, uuidSource()),
      ).toEqual({ groups: 0, entries: 0, removed: 0, renamed: [], kept: [] });
    });
  });

  describe('deriveNewUuids', () => {
    const UUID_V8 =
      /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

    /** Cleans the entries up with derived uuids. */
    async function clean(_collection: string, _entries: unknown[]) {
      return removeDuplicateEntries(
        _collection,
        _entries,
        {},
        await deriveNewUuids(_collection, _entries),
      );
    }

    /** The same value with the keys of every object in reverse order. */
    function withReversedKeys<T>(_value: T): T {
      if (Array.isArray(_value)) {
        return _value.map(withReversedKeys) as T;
      }
      if (typeof _value !== 'object' || _value === null) {
        return _value;
      }
      return Object.fromEntries(
        Object.entries(_value)
          .reverse()
          .map(([_key, _item]) => [_key, withReversedKeys(_item)]),
      ) as T;
    }

    function uuidByName(_entries: Entry[]): Record<string, string> {
      return Object.fromEntries(
        _entries.map((_entry): [string, string] => [
          _entry.name as string,
          _entry.config.uuid as string,
        ]),
      );
    }

    it('gives a differing copy a uuid in the form of a version 8 uuid', async () => {
      const entries = [
        entry('shared-1', { name: 'A' }),
        entry('shared-1', { name: 'B' }),
      ];

      const result = await clean('WATER', entries);

      expect(entries[1].config.uuid).toMatch(UUID_V8);
      expect(result.renamed).toEqual([
        { uuid: 'shared-1', new_uuid: entries[1].config.uuid },
      ]);
    });

    it('gives the same uuids whatever the order of the entries and of their keys', async () => {
      const create = (): Entry[] => [
        entry('shared-1', { name: 'A', values: [1, { a: 'b', c: 'd' }] }),
        entry('other', { name: 'other' }),
        entry('shared-1', { name: 'B', values: [1, { a: 'b', c: 'd' }] }),
        entry('shared-1', { name: 'C' }),
      ];
      const entries = create();
      const [first, other, second, third] = create().map(withReversedKeys);
      // The first entry keeps the uuid; it is the one all references find.
      const reordered = [first, third, second, other];
      expect(Object.keys(reordered[2])).not.toEqual(Object.keys(entries[2]));

      await clean('WATER', entries);
      await clean('WATER', reordered);

      expect(uuidByName(reordered)).toEqual(uuidByName(entries));
      expect(new Set(uuids(entries)).size).toBe(4);
    });

    it('leaves out the change info', async () => {
      const entries = [
        entry('shared-1', { name: 'A' }),
        entry('shared-1', { name: 'B' }),
      ];
      const filled = [
        entry('shared-1', { name: 'A' }),
        entry(
          'shared-1',
          { name: 'B' },
          { created_at: 5, updated_at: 7, rev: 3, updated_by: 'device-b' },
        ),
      ];

      await clean('WATER', entries);
      await clean('WATER', filled);

      expect(filled[1].config.uuid).toBe(entries[1].config.uuid);
      expect(filled[1].config.rev).toBe(3);
    });

    it('derives the uuid from the collection, the shared uuid and the content', async () => {
      const derived = async (
        _collection: string,
        _uuid: string,
        _values: Entry,
        _config: Entry = {},
      ): Promise<string> => {
        const entries = [
          entry(_uuid, { name: 'A' }),
          entry(_uuid, { name: 'B', ..._values }, _config),
        ];
        await clean(_collection, entries);
        return entries[1].config.uuid as string;
      };

      const uuid = await derived('WATER', 'shared-1', {});

      expect(await derived('WATER', 'shared-1', {})).toBe(uuid);
      expect(await derived('MILL', 'shared-1', {})).not.toBe(uuid);
      expect(await derived('WATER', 'shared-2', {})).not.toBe(uuid);
      expect(await derived('WATER', 'shared-1', { note: 'other' })).not.toBe(
        uuid,
      );
      expect(
        await derived(
          'WATER',
          'shared-1',
          {},
          { unix_timestamp: 1_600_000_001 },
        ),
      ).not.toBe(uuid);
    });

    it('derives the same uuid from a stored entry and from a backup of it', async () => {
      const create = (): Entry[] => [
        entry('shared-1', { name: 'A' }),
        entry('shared-1', {
          name: 'B',
          weight: Number.NaN,
          opened: new Date(1_600_000_000_000),
          missing: undefined,
          values: [undefined, 1],
        }),
      ];
      const entries = create();
      const backup: Entry[] = JSON.parse(JSON.stringify(create()));

      await clean('WATER', entries);
      await clean('WATER', backup);

      expect(backup[1].config.uuid).toBe(entries[1].config.uuid);
    });

    it('counts on when two copies would get the same uuid', async () => {
      // Different entries, but alike as JSON writes them.
      const create = (): Entry[] => [
        entry('shared-1', { name: 'A' }),
        entry('shared-1', { name: 'B', values: [Number.NaN] }),
        entry('shared-1', { name: 'B', values: [null] }),
      ];
      const entries = create();
      const single = create().slice(0, 2);
      const swapped = create();
      swapped.push(swapped.splice(1, 1)[0]);

      const result = await clean('WATER', entries);
      await clean('WATER', single);
      await clean('WATER', swapped);

      expect(result.renamed.length).toBe(2);
      expect(entries.length).toBe(3);
      expect(new Set(uuids(entries)).size).toBe(3);
      expect(entries[1].config.uuid).toBe(single[1].config.uuid);
      expect(entries[2].config.uuid).toMatch(UUID_V8);
      expect(uuids(swapped)).toEqual(uuids(entries));
    });

    it('counts on when another entry already carries the derived uuid', async () => {
      const create = (): Entry[] => [
        entry('shared-1', { name: 'A' }),
        entry('shared-1', { name: 'B' }),
      ];
      const free = create();
      await clean('WATER', free);
      const derived: string = free[1].config.uuid;
      const entries = [...create(), entry(derived, { name: 'taken' })];
      const again = structuredClone(entries);

      await clean('WATER', entries);
      await clean('WATER', again);

      expect(entries.length).toBe(3);
      expect(entries[1].config.uuid).toMatch(UUID_V8);
      expect(new Set(uuids(entries)).size).toBe(3);
      expect(entries[2]).toEqual(entry(derived, { name: 'taken' }));
      expect(again).toEqual(entries);
    });

    it('changes nothing when it runs again', async () => {
      const entries = [
        entry('shared-1', { name: 'A' }),
        entry('shared-1', { name: 'B' }),
        entry('shared-1', { name: 'C' }),
      ];
      await clean('WATER', entries);
      const afterFirstRun = structuredClone(entries);

      const result = await clean('WATER', entries);

      expect(entries).toEqual(afterFirstRun);
      expect(result.groups).toBe(0);
    });

    it('changes nothing itself and gives no uuid for other entries', async () => {
      const entries = [
        entry('shared-1', { name: 'A' }),
        entry('shared-1', { name: 'B' }),
      ];
      const before = structuredClone(entries);

      const createUuid = await deriveNewUuids('WATER', entries);

      expect(entries).toEqual(before);
      expect(createUuid(entries[1])).toMatch(UUID_V8);
      expect(() => createUuid(entries[0])).toThrowError(
        'No uuid was derived for this entry',
      );
      expect(() => createUuid(structuredClone(entries[1]))).toThrowError();
      expect(() =>
        removeDuplicateEntries(
          'WATER',
          structuredClone(entries),
          {},
          createUuid,
        ),
      ).toThrowError();
      const none = await deriveNewUuids('WATER', undefined);
      expect(() => none(entries[1])).toThrowError();
    });
  });

  describe('removeDuplicateEntriesFromData', () => {
    it('cleans all change tracked collections of the data and nothing else', async () => {
      const bean = entry('bean-x');
      const brewEntry = brew('brew-x');
      const settings = { config: { uuid: 'settings' } };
      const data: Record<string, any> = {
        BEANS: [bean, structuredClone(bean)],
        BREWS: [brewEntry, structuredClone(brewEntry)],
        MILL: [entry('mill-x', { name: 'A' }), entry('mill-x', { name: 'B' })],
        SETTINGS: [settings, structuredClone(settings)],
        VERSION: 'not a list',
      };
      const createUuid = await deriveNewUuids('MILL', data.MILL);
      const derived = createUuid(data.MILL[1]);

      const results = await removeDuplicateEntriesFromData(data);

      expect(uuids(data.BEANS)).toEqual(['bean-x']);
      expect(uuids(data.BREWS)).toEqual(['brew-x']);
      expect(uuids(data.MILL)).toEqual(['mill-x', derived]);
      expect(data.SETTINGS.length).toBe(2);
      expect(Object.keys(results).sort()).toEqual(['BEANS', 'BREWS', 'MILL']);
      expect(results.BREWS.removed).toBe(1);
      expect(results.MILL.renamed.length).toBe(1);
    });

    it('looks for references in the other collections of the data', async () => {
      const data: Record<string, any> = {
        BEANS: [entry('bean-x', { name: 'A' }), entry('bean-x', { name: 'B' })],
        BREWS: [brew('brew-a', { bean: 'bean-x' })],
      };

      const results = await removeDuplicateEntriesFromData(data);

      expect(results.BEANS.kept).toEqual(['bean-x']);
      expect(uuids(data.BEANS)).toEqual(['bean-x', 'bean-x']);
    });

    it('accepts data without collections', async () => {
      expect(await removeDuplicateEntriesFromData({})).toEqual({});
      expect(await removeDuplicateEntriesFromData(null as any)).toEqual({});
    });
  });

  describe('countWithoutIdenticalCopies', () => {
    it('counts the entries the cleanup leaves, without changing them', () => {
      const shared = entry('bean-x', { name: 'A' });
      const withoutUuid = { name: 'no uuid', config: {} };
      const entries: unknown[] = [
        shared,
        structuredClone(shared),
        entry('bean-x', { name: 'B' }),
        structuredClone(shared),
        entry('bean-y'),
        withoutUuid,
        structuredClone(withoutUuid),
      ];
      const before = structuredClone(entries);

      const count = countWithoutIdenticalCopies(entries);

      expect(entries).toEqual(before);
      expect(count).toBe(5);
      removeDuplicateEntries('BEANS', entries, {}, uuidSource());
      expect(entries.length).toBe(count);
    });

    it('compares the copies as a backup file holds them', () => {
      // A backup file is JSON: NaN, Infinity and holes or undefined in a
      // list are written as null, and a date as text.
      const withHole: unknown[] = [];
      withHole[1] = 'b';
      const at = new Date(1000);
      const pairs: [Entry, Entry][] = [
        [entry('nan', { n: NaN }), entry('nan', { n: null })],
        [entry('infinity', { n: Infinity }), entry('infinity', { n: null })],
        [
          entry('hole', { values: withHole }),
          entry('hole', { values: [null, 'b'] }),
        ],
        [
          entry('undefined', { values: [undefined, 'b'] }),
          entry('undefined', { values: [null, 'b'] }),
        ],
        [entry('date', { at }), entry('date', { at: at.toISOString() })],
      ];
      const entries: Entry[] = [
        ...pairs.flat(),
        entry('differs', { n: NaN }),
        entry('differs', { n: 0 }),
      ];
      const before = structuredClone(entries);
      // As the device stores them, the copies differ from their first entry.
      for (const [first, copy] of pairs) {
        expect(isSameEntry(first, copy)).toBeFalse();
      }

      const count = countWithoutIdenticalCopies(entries);

      expect(entries).toEqual(before);
      expect(count).toBe(pairs.length + 2);
      const backup = JSON.parse(JSON.stringify(entries));
      removeDuplicateEntries('BREWS', backup, {}, uuidSource());
      expect(backup.length).toBe(count);
    });
  });
});
