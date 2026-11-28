import { pendingEspressoJump, type PendingJump } from '../espresso-weight-jump';

describe('pendingEspressoJump', () => {
  const cases: {
    name: string;
    last: number;
    weight: number;
    pending: PendingJump | undefined;
    expected: PendingJump | undefined;
  }[] = [
    {
      name: 'records a rise within the bound',
      last: 20,
      weight: 30,
      pending: undefined,
      expected: undefined,
    },
    {
      name: 'records a falling weight',
      last: 20,
      weight: 5,
      pending: undefined,
      expected: undefined,
    },
    {
      name: 'holds back the first reading of a jump',
      last: 25.8,
      weight: 259,
      pending: undefined,
      expected: { weight: 259, readings: 1 },
    },
    {
      name: 'holds back the second reading of the same jump',
      last: 20,
      weight: 45,
      pending: { weight: 40, readings: 1 },
      expected: { weight: 45, readings: 2 },
    },
    {
      name: 'records the jump once it held for three readings',
      last: 20,
      weight: 41,
      pending: { weight: 40, readings: 2 },
      expected: undefined,
    },
    {
      name: 'starts over when the next reading is a different jump',
      last: 20,
      weight: 259,
      pending: { weight: 40, readings: 2 },
      expected: { weight: 259, readings: 1 },
    },
    {
      name: 'forgets the jump when the weight comes back',
      last: 20,
      weight: 21,
      pending: { weight: 259, readings: 2 },
      expected: undefined,
    },
  ];

  for (const { name, last, weight, pending, expected } of cases) {
    it(name, () => {
      expect(pendingEspressoJump(last, weight, 10, pending)).toEqual(expected);
    });
  }
});
