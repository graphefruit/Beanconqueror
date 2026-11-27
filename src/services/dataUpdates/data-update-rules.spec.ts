import {
  DATA_UPDATES,
  dataUpdateSignal,
  isBackedUpBefore,
  nextFailedDataUpdate,
  showsFailedDataUpdateHint,
} from './data-update-rules';

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

  it('counts the starts in a row at which the same update stayed open', () => {
    const first = nextFailedDataUpdate(null, 'UPDATE_16');
    const second = nextFailedDataUpdate(first, 'UPDATE_16');
    const third = nextFailedDataUpdate(second, 'UPDATE_16');

    expect([first, second, third]).toEqual([
      { update: 'UPDATE_16', starts: 1 },
      { update: 'UPDATE_16', starts: 2 },
      { update: 'UPDATE_16', starts: 3 },
    ]);
    expect([first, second, third].map(showsFailedDataUpdateHint)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('starts counting again for another update and forgets once all finished', () => {
    expect(
      nextFailedDataUpdate({ update: 'UPDATE_16', starts: 2 }, 'UPDATE_17'),
    ).toEqual({ update: 'UPDATE_17', starts: 1 });
    expect(
      nextFailedDataUpdate({ update: 'UPDATE_16', starts: 2 }, undefined),
    ).toBeUndefined();
    expect(showsFailedDataUpdateHint(undefined)).toBeFalse();
  });

  it('starts counting again when what was stored has another shape', () => {
    for (const stored of [undefined, 'UPDATE_16', { update: 'UPDATE_16' }]) {
      expect(nextFailedDataUpdate(stored, 'UPDATE_16'))
        .withContext(JSON.stringify(stored))
        .toEqual({ update: 'UPDATE_16', starts: 1 });
    }
  });

  it('reports the outcome of a start with an update open on existing data', () => {
    expect(dataUpdateSignal(true, true, undefined)).toBe('done');
    expect(dataUpdateSignal(true, true, 'UPDATE_17')).toBe('open:UPDATE_17');
    expect(dataUpdateSignal(true, false, 'UPDATE_16')).toBe('backup_failed');
  });

  it('reports nothing for a start without an open update', () => {
    expect(dataUpdateSignal(false, true, undefined)).toBeUndefined();
    expect(dataUpdateSignal(false, true, 'UPDATE_18')).toBeUndefined();
  });
});
