import { Brew } from '../../../classes/brew/brew';
import { brewFormChanged, brewFormState } from '../brew-form-rules';

const IDLE = { timerRunning: false, enteredWhileLoading: false };
const TIMER = { timerRunning: true, enteredWhileLoading: false };

describe('brew form rules', () => {
  const loaded = () => {
    const brew = new Brew();
    brew.grind_weight = 18;
    return brew;
  };

  it('counts nothing as input before the form has loaded', () => {
    const brew = loaded();
    brew.grind_weight = 17;

    expect(brewFormChanged(undefined, brewFormState(brew), IDLE)).toBeFalse();
  });

  it('counts the values the form filled in itself as no input', () => {
    const brew = loaded();
    const start = brewFormState(brew);

    expect(brewFormChanged(start, brewFormState(brew), IDLE)).toBeFalse();
  });

  it('counts a changed value as input', () => {
    const brew = loaded();
    const start = brewFormState(brew);
    brew.grind_weight = 17;

    expect(brewFormChanged(start, brewFormState(brew), IDLE)).toBeTrue();
  });

  it('ignores coordinates that arrive after loading', () => {
    const brew = loaded();
    const start = brewFormState(brew);
    brew.coordinates = { ...brew.coordinates, latitude: 52.5 };

    expect(brewFormChanged(start, brewFormState(brew), IDLE)).toBeFalse();
  });

  it('counts a running timer as input, also before the form has loaded', () => {
    const brew = loaded();
    const start = brewFormState(brew);

    expect(brewFormChanged(start, brewFormState(brew), TIMER)).toBeTrue();
    expect(brewFormChanged(undefined, brewFormState(brew), TIMER)).toBeTrue();
  });

  it('counts input made before the form had loaded', () => {
    const brew = loaded();
    const start = brewFormState(brew);

    expect(
      brewFormChanged(start, brewFormState(brew), {
        timerRunning: false,
        enteredWhileLoading: true,
      }),
    ).toBeTrue();
  });

  it('counts new points of the flow profile as input', () => {
    const brew = loaded();
    const flow = { weight: [], pressureFlow: [], temperatureFlow: [] };
    const start = brewFormState(brew, flow);

    flow.pressureFlow.push({ value: 9 });

    expect(brewFormChanged(start, brewFormState(brew, flow), IDLE)).toBeTrue();
  });

  it('counts a flow profile that was there on loading as no input', () => {
    const brew = loaded();
    const flow = { weight: [{ value: 1 }], temperatureFlow: [{ value: 93 }] };

    expect(
      brewFormChanged(
        brewFormState(brew, flow),
        brewFormState(brew, flow),
        IDLE,
      ),
    ).toBeFalse();
  });
});
