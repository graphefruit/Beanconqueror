import { REFERENCE_GRAPH_TYPE } from '../../enums/brews/referenceGraphType';
import {
  countChangedEntries,
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

  describe('removeDuplicateEntriesFromData', () => {
    it('cleans all change tracked collections of the data and nothing else', () => {
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

      const results = removeDuplicateEntriesFromData(data, uuidSource());

      expect(uuids(data.BEANS)).toEqual(['bean-x']);
      expect(uuids(data.BREWS)).toEqual(['brew-x']);
      expect(uuids(data.MILL)).toEqual(['mill-x', 'new-1']);
      expect(data.SETTINGS.length).toBe(2);
      expect(Object.keys(results).sort()).toEqual(['BEANS', 'BREWS', 'MILL']);
      expect(results.BREWS.removed).toBe(1);
      expect(results.MILL.renamed.length).toBe(1);
    });

    it('looks for references in the other collections of the data', () => {
      const data: Record<string, any> = {
        BEANS: [entry('bean-x', { name: 'A' }), entry('bean-x', { name: 'B' })],
        BREWS: [brew('brew-a', { bean: 'bean-x' })],
      };

      const results = removeDuplicateEntriesFromData(data, uuidSource());

      expect(results.BEANS.kept).toEqual(['bean-x']);
      expect(uuids(data.BEANS)).toEqual(['bean-x', 'bean-x']);
    });

    it('accepts data without collections', () => {
      expect(removeDuplicateEntriesFromData({}, uuidSource())).toEqual({});
      expect(removeDuplicateEntriesFromData(null as any, uuidSource())).toEqual(
        {},
      );
    });
  });
});
