import {
  magicTapAction,
  MagicTapTimer,
  spokenGrams,
  spokenStopTime,
} from '../magic-tap-rules';

const UNUSED: MagicTapTimer = {
  running: false,
  seconds: 0,
  milliseconds: 0,
  flowPoints: 0,
};

describe('magic tap rules', () => {
  it('stops a running brew', () => {
    expect(magicTapAction({ ...UNUSED, running: true, seconds: 42 })).toBe(
      'stop',
    );
  });

  const cases: [string, Partial<MagicTapTimer>, string][] = [
    ['starts an unused timer', {}, 'start'],
    [
      'stops a running timer before its first second',
      { running: true },
      'stop',
    ],
    ['resets a stopped timer first', { seconds: 42 }, 'resetAndStart'],
    [
      'resets a timer with milliseconds only',
      { milliseconds: 250 },
      'resetAndStart',
    ],
    ['resets a graph that holds values', { flowPoints: 3 }, 'resetAndStart'],
  ];
  cases.forEach(([name, timer, action]) =>
    it(name, () => {
      expect(magicTapAction({ ...UNUSED, ...timer })).toBe(action);
    }),
  );

  it('says the time as minutes and seconds', () => {
    expect(spokenStopTime(0)).toBe('0:00');
    expect(spokenStopTime(42)).toBe('0:42');
    expect(spokenStopTime(65)).toBe('1:05');
    expect(spokenStopTime(605)).toBe('10:05');
  });

  it('says grams with tenths in the app language', () => {
    expect(spokenGrams(18.34, 'de')).toBe('18,3');
    expect(spokenGrams(18.34, 'en')).toBe('18.3');
    expect(spokenGrams(18, 'en')).toBe('18');
    expect(spokenGrams(1234.5, 'en')).toBe('1234.5');
  });
});
