import { Brew } from '../../../classes/brew/brew';
import {
  getUsedBeanWeightPerBean,
  sumUsedBeanWeight,
} from '../used-bean-weight';

function brew(bean: string, beanWeightIn: number, grindWeight: number): Brew {
  const entry = new Brew();
  entry.bean = bean;
  entry.bean_weight_in = beanWeightIn;
  entry.grind_weight = grindWeight;
  return entry;
}

// The rule as it was written in every place before it was shared.
function previousUsedWeight(brews: Brew[], beanUuid: string): number {
  let usedWeightCount = 0;
  for (const entry of brews.filter((e) => e.bean === beanUuid)) {
    if (entry.bean_weight_in > 0) {
      usedWeightCount += entry.bean_weight_in;
    } else {
      usedWeightCount += entry.grind_weight;
    }
  }
  return usedWeightCount;
}

describe('used-bean-weight', () => {
  const cases: {
    name: string;
    brews: Brew[];
    expected: Record<string, number>;
  }[] = [
    { name: 'no brews', brews: [], expected: {} },
    {
      name: 'doses of an open bag',
      brews: [brew('open', 18, 0), brew('open', 18.5, 20)],
      expected: { open: 36.5 },
    },
    {
      name: 'grind weight when no dose was entered',
      brews: [brew('open', 0, 17), brew('open', -1, 16.5)],
      expected: { open: 33.5 },
    },
    {
      name: 'decimal doses of a blend keep their summing order',
      brews: [
        brew('blend', 0.1, 0),
        brew('blend', 0.2, 0),
        brew('blend', 0.3, 0),
      ],
      expected: { blend: 0.1 + 0.2 + 0.3 },
    },
    {
      name: 'frozen and thawed portions count on their own',
      brews: [
        brew('bag', 18, 0),
        brew('frozen-portion', 15, 0),
        brew('thawed-portion', 0, 14),
        brew('bag', 17, 0),
      ],
      expected: { bag: 35, 'frozen-portion': 15, 'thawed-portion': 14 },
    },
    {
      name: 'brews of a deleted bean stay under its uuid',
      brews: [brew('deleted', 100, 0), brew('open', 18, 0)],
      expected: { deleted: 100, open: 18 },
    },
    {
      name: 'a missing grind weight stays missing',
      brews: [brew('open', 0, undefined)],
      expected: { open: NaN },
    },
  ];

  for (const testCase of cases) {
    it(`matches the previous rule: ${testCase.name}`, () => {
      const usedPerBean = getUsedBeanWeightPerBean(testCase.brews);

      expect(Object.fromEntries(usedPerBean)).toEqual(testCase.expected);
      for (const beanUuid of Object.keys(testCase.expected)) {
        const previous = previousUsedWeight(testCase.brews, beanUuid);
        expect(usedPerBean.get(beanUuid)).toEqual(previous);
        expect(
          sumUsedBeanWeight(testCase.brews.filter((e) => e.bean === beanUuid)),
        ).toEqual(previous);
      }
    });
  }

  it('sums nothing to zero', () => {
    expect(sumUsedBeanWeight([])).toBe(0);
  });
});
