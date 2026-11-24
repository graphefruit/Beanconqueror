import {
  timeParameterHintDue,
  TimeParameterHintState,
} from '../timeParameterHint';

describe('timeParameterHintDue', () => {
  const hiddenTime: TimeParameterHintState = {
    parameters: { brew_time: false },
    baristaMode: false,
    editing: false,
    hinted: false,
  };

  it('is due for a new brew without the brew time', () => {
    expect(timeParameterHintDue(hiddenTime)).toBeTrue();
  });

  it('is not due when the brew time is shown', () => {
    expect(
      timeParameterHintDue({ ...hiddenTime, parameters: { brew_time: true } }),
    ).toBeFalse();
  });

  it('is due only once per brew', () => {
    expect(timeParameterHintDue({ ...hiddenTime, hinted: true })).toBeFalse();
  });

  it('is not due in the barista mode, which keeps a timer of its own', () => {
    expect(
      timeParameterHintDue({ ...hiddenTime, baristaMode: true }),
    ).toBeFalse();
  });

  it('is not due while a brew is edited', () => {
    expect(timeParameterHintDue({ ...hiddenTime, editing: true })).toBeFalse();
  });
});
