import {
  beansRoastedFrom,
  brewsDeletedWith,
  deleteQuestion,
  StoredEntry,
  uuidsWhere,
} from '../delete-rules';

const stored = (uuid: string, fields: Record<string, unknown> = {}) =>
  ({ config: { uuid }, ...fields }) as StoredEntry;

describe('delete rules', () => {
  const beans = [
    stored('roast-1', { bean_roast_information: { bean_uuid: 'green' } }),
    stored('bought'),
    stored('older', { bean_roast_information: null }),
    stored('roast-2', { bean_roast_information: { bean_uuid: 'green' } }),
    stored('roast-other', { bean_roast_information: { bean_uuid: 'other' } }),
  ];
  const brews = [
    stored('b1', {
      bean: 'roast-1',
      mill: 'mill',
      method_of_preparation: 'v60',
    }),
    stored('b2', { bean: 'bought', mill: 'mill' }),
    stored('b3', { bean: 'roast-2', method_of_preparation: 'v60' }),
    stored('b4', { bean: 'green', mill: 'other' }),
    null,
    stored('b5', { bean: 'roast-other' }),
  ];

  it('finds the uuids of matching entries and skips holes and entries without one', () => {
    expect(
      uuidsWhere(
        [stored('a', { x: 1 }), null, { x: 1 }, stored('b')],
        (_entry) => _entry.x === 1,
      ),
    ).toEqual(['a']);
  });

  it('finds the beans roasted from a green bean', () => {
    expect(beansRoastedFrom(beans, 'green')).toEqual(['roast-1', 'roast-2']);
    expect(beansRoastedFrom(beans, 'none')).toEqual([]);
  });

  for (const [owner, uuid, expected] of [
    ['bean', 'roast-1', ['b1']],
    ['bean', 'bought', ['b2']],
    ['mill', 'mill', ['b1', 'b2']],
    ['preparation', 'v60', ['b1', 'b3']],
    // A green bean is no bean: b4 names it as one and stays.
    ['greenBean', 'green', ['b1', 'b3']],
    ['greenBean', 'other', ['b5']],
    ['mill', 'unknown', []],
  ] as const) {
    it(`deletes the brews ${JSON.stringify(expected)} with the ${owner} ${uuid}`, () => {
      expect(brewsDeletedWith(owner, uuid, { beans, brews })).toEqual([
        ...expected,
      ]);
    });
  }

  for (const [count, key] of [
    [0, 'DELETE_MILL_QUESTION_NONE'],
    [1, 'DELETE_MILL_QUESTION_ONE'],
    [2, 'DELETE_MILL_QUESTION_OTHER'],
    [30000, 'DELETE_MILL_QUESTION_OTHER'],
  ] as const) {
    it(`asks with ${key} for ${count} brews`, () => {
      expect(deleteQuestion('DELETE_MILL_QUESTION', count)).toBe(key);
    });
  }
});
