import { IBean } from '../../../interfaces/bean/iBean';
import { IBeanInformation } from '../../../interfaces/bean/iBeanInformation';
import {
  aloneInFrozenGroup,
  hasBeanName,
  hasSortInformation,
  needsFrozenId,
} from '../bean-form-rules';

describe('bean form rules', () => {
  describe('hasBeanName', () => {
    const cases: [string | undefined | null, boolean][] = [
      ['Kenya AA', true],
      [' x ', true],
      ['', false],
      ['   ', false],
      [undefined, false],
      [null, false],
    ];
    for (const [name, expected] of cases) {
      it(`is ${expected} for ${JSON.stringify(name)}`, () => {
        expect(hasBeanName({ name })).toBe(expected);
      });
    }
  });

  describe('needsFrozenId', () => {
    const cases: [string, string, boolean][] = [
      ['2026-11-01', '', true],
      ['2026-11-01', 'abc123', false],
      ['', '', false],
      [undefined, '', false],
    ];
    for (const [frozenDate, frozenId, expected] of cases) {
      it(`is ${expected} for frozen date ${JSON.stringify(frozenDate)} and id ${JSON.stringify(frozenId)}`, () => {
        expect(needsFrozenId({ frozenDate, frozenId })).toBe(expected);
      });
    }
  });

  describe('aloneInFrozenGroup', () => {
    const bean = (uuid: string, frozenGroupId: string) => ({
      frozenGroupId,
      config: { uuid } as IBean['config'],
    });
    const leaving = bean('a', 'g');

    const cases: [string, ReturnType<typeof bean>[], string | undefined][] = [
      ['one bean left', [leaving, bean('b', 'g'), bean('c', 'h')], 'b'],
      ['two beans left', [leaving, bean('b', 'g'), bean('c', 'g')], undefined],
      ['no bean left', [leaving, bean('c', 'h')], undefined],
      [
        'the leaving bean still in the list with the group',
        [bean('a', 'g')],
        undefined,
      ],
    ];
    for (const [name, beans, expected] of cases) {
      it(`gives ${expected ?? 'nothing'} with ${name}`, () => {
        expect(aloneInFrozenGroup(beans, 'g', 'a')?.config.uuid).toBe(expected);
      });
    }
  });

  describe('hasSortInformation', () => {
    const cases: [Partial<IBeanInformation>, boolean][] = [
      [{}, false],
      [{ country: '', region: '', percentage: 0, fob_price: 0 }, false],
      [{ country: 'Kenya' }, true],
      [{ region: 'Nyeri' }, true],
      [{ farm: 'Gatomboya' }, true],
      [{ farmer: 'Coop' }, true],
      [{ elevation: '1800' }, true],
      [{ harvest_time: '2026' }, true],
      [{ variety: 'SL28' }, true],
      [{ processing: 'washed' }, true],
      [{ certification: 'organic' }, true],
      [{ percentage: 50 }, true],
      [{ purchasing_price: 12 }, true],
      [{ fob_price: 4 }, true],
      [{ percentage: -1 }, false],
    ];
    for (const [sort, expected] of cases) {
      it(`is ${expected} for ${JSON.stringify(sort)}`, () => {
        expect(hasSortInformation(sort)).toBe(expected);
      });
    }
  });
});
