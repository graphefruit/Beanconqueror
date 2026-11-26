import { DATA_UPDATES, isBackedUpBefore } from './data-update-rules';

describe('Data update rules', () => {
  it('backs the data up before every update from UPDATE_16 on', () => {
    expect(DATA_UPDATES.filter(isBackedUpBefore)).toEqual([
      'UPDATE_16',
      'UPDATE_17',
      'UPDATE_18',
      'UPDATE_19',
    ]);
  });

  it('backs the data up before an update added later', () => {
    expect(isBackedUpBefore('UPDATE_20')).toBeTrue();
    expect(isBackedUpBefore('UPDATE_100')).toBeTrue();
  });

  it('does not back up before the updates released earlier or an unknown name', () => {
    expect(isBackedUpBefore('UPDATE_15')).toBeFalse();
    expect(isBackedUpBefore('UPDATE_1')).toBeFalse();
    expect(isBackedUpBefore('UPDATE_16_FIX')).toBeFalse();
    expect(isBackedUpBefore('')).toBeFalse();
  });
});
