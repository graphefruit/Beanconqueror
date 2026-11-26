import {
  IBrewPressureFlow,
  IBrewRealtimeWaterFlow,
  IBrewWeightFlow,
} from '../../../classes/brew/brewFlow';
import {
  hasShotEndedByPressure,
  hasShotEndedByWeight,
  latestWeightAndFlow,
  machineFlow,
  scaleShowsShotEnd,
  ShotEndByWeight,
  shotEndMinimumWeight,
} from '../shot-end-rules';

const weights = (...values: number[]) =>
  values.map((actual_weight) => ({ actual_weight }) as IBrewWeightFlow);
const flows = (...values: number[]) =>
  values.map((flow_value) => ({ flow_value }) as IBrewRealtimeWaterFlow);
const pressures = (...values: number[]) =>
  values.map((actual_pressure) => ({ actual_pressure }) as IBrewPressureFlow);
const repeat = (value: number, count: number) =>
  Array.from({ length: count }, () => value);

describe('shot end rules', () => {
  describe('shotEndMinimumWeight', () => {
    it('takes the dose for a 1:1 ratio', () => {
      expect(shotEndMinimumWeight(18, false, 40)).toBe(18);
    });

    it('takes 5 g without a dose', () => {
      expect(shotEndMinimumWeight(0, false, undefined)).toBe(5);
      expect(shotEndMinimumWeight(undefined, false, undefined)).toBe(5);
    });

    it('takes 90 % of the program weight in barista mode', () => {
      expect(shotEndMinimumWeight(18, true, 40)).toBe(36);
    });

    it('takes 10 g in barista mode without a program weight', () => {
      expect(shotEndMinimumWeight(18, true, undefined)).toBe(10);
    });
  });

  describe('hasShotEndedByWeight', () => {
    const RULE: ShotEndByWeight = {
      stopOnSteadyWeight: true,
      minFlow: 0.5,
      brewTime: 30,
      minimumWeight: 36,
      endsBelowMinimumWeight: () => false,
    };
    const shot = weights(...repeat(0, 20), ...repeat(36, 40));
    const dried = flows(...repeat(2, 59), 0.5);

    it('ends once the cup holds the minimum and the flow dried up', () => {
      expect(hasShotEndedByWeight(shot, dried, RULE)).toBeTrue();
    });

    it('keeps running while the flow is above the minimum flow', () => {
      expect(
        hasShotEndedByWeight(shot, flows(...repeat(2, 60)), RULE),
      ).toBeFalse();
    });

    it('keeps running when stopping on a steady weight is off', () => {
      expect(
        hasShotEndedByWeight(shot, dried, {
          ...RULE,
          stopOnSteadyWeight: false,
        }),
      ).toBeFalse();
    });

    it('waits for 50 readings and 5 s of brew time', () => {
      expect(hasShotEndedByWeight(shot.slice(0, 49), dried, RULE)).toBeFalse();
      expect(
        hasShotEndedByWeight(shot, dried, { ...RULE, brewTime: 5 }),
      ).toBeFalse();
    });

    it('skips the first 15 readings for the minimum weight', () => {
      const early = weights(...repeat(36, 15), ...repeat(0, 35));

      expect(hasShotEndedByWeight(early, dried, RULE)).toBeFalse();
    });

    it('asks whether it may end below the minimum weight', () => {
      const light = weights(...repeat(10, 50));
      const endsBelow = jasmine.createSpy('endsBelow').and.returnValue(true);

      expect(
        hasShotEndedByWeight(light, dried, {
          ...RULE,
          endsBelowMinimumWeight: endsBelow,
        }),
      ).toBeTrue();
      expect(hasShotEndedByWeight(light, dried, RULE)).toBeFalse();
      expect(endsBelow).toHaveBeenCalledTimes(1);
    });

    it('does not ask when the minimum weight was reached', () => {
      const endsBelow = jasmine.createSpy('endsBelow');

      hasShotEndedByWeight(shot, dried, {
        ...RULE,
        endsBelowMinimumWeight: endsBelow,
      });

      expect(endsBelow).not.toHaveBeenCalled();
    });

    it('ignores the flow of the first 25 readings', () => {
      expect(
        hasShotEndedByWeight(shot, flows(...repeat(0, 25)), RULE),
      ).toBeFalse();
      expect(
        hasShotEndedByWeight(shot, flows(...repeat(0, 26)), RULE),
      ).toBeTrue();
    });
  });

  describe('hasShotEndedByPressure', () => {
    const RULE = { active: true, thresholdBar: 2, brewTime: 30 };

    it('ends when the pressure fell to the threshold after a shot', () => {
      expect(
        hasShotEndedByPressure(pressures(...repeat(9, 99), 2), RULE),
      ).toBeTrue();
    });

    it('keeps running above the threshold', () => {
      expect(
        hasShotEndedByPressure(pressures(...repeat(9, 99), 2.1), RULE),
      ).toBeFalse();
    });

    it('keeps running when the pressure never reached 1 bar', () => {
      expect(
        hasShotEndedByPressure(pressures(...repeat(0.5, 100)), RULE),
      ).toBeFalse();
    });

    it('waits for 100 readings and 10 s of brew time', () => {
      const shot = pressures(...repeat(9, 99), 1);

      expect(hasShotEndedByPressure(shot.slice(1), RULE)).toBeFalse();
      expect(
        hasShotEndedByPressure(shot, { ...RULE, brewTime: 10 }),
      ).toBeFalse();
    });

    it('keeps running when stopping by pressure is off', () => {
      expect(
        hasShotEndedByPressure(pressures(...repeat(9, 99), 1), {
          ...RULE,
          active: false,
        }),
      ).toBeFalse();
    });
  });

  describe('scaleShowsShotEnd', () => {
    const cup = repeat(20, 41);

    it('ends without any weight', () => {
      expect(scaleShowsShotEnd([])).toBeTrue();
    });

    it('ends when the scale was tared', () => {
      expect(scaleShowsShotEnd(weights(...cup, 0))).toBeTrue();
      expect(scaleShowsShotEnd(weights(...cup, 0.5))).toBeTrue();
    });

    it('ends when the weight dropped to -2 g', () => {
      expect(scaleShowsShotEnd(weights(...cup, -2))).toBeTrue();
    });

    it('keeps running while the cup holds the shot', () => {
      expect(scaleShowsShotEnd(weights(...cup, 0.6))).toBeFalse();
      expect(scaleShowsShotEnd(weights(...cup, -1))).toBeFalse();
    });

    it('keeps running with 40 weights or fewer', () => {
      expect(scaleShowsShotEnd(weights(...repeat(20, 39), 0))).toBeFalse();
    });
  });

  describe('latestWeightAndFlow', () => {
    it('takes the newest values', () => {
      expect(latestWeightAndFlow(weights(1, 2), flows(3, 4))).toEqual({
        weight: 2,
        flow: 4,
      });
    });

    it('has no values before the first reading', () => {
      expect(latestWeightAndFlow([], [])).toEqual({
        weight: undefined,
        flow: undefined,
      });
    });
  });

  describe('machineFlow', () => {
    it('takes a measured flow', () => {
      expect(machineFlow(3.7)).toBe(3.7);
    });

    it('takes none for 0, null or undefined', () => {
      expect(machineFlow(0)).toBeUndefined();
      expect(machineFlow(null)).toBeUndefined();
      expect(machineFlow(undefined)).toBeUndefined();
    });
  });
});
