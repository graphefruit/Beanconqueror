import { Settings } from '../../../../classes/settings/settings';
import { PREPARATION_STYLE_TYPE } from '../../../../enums/preparations/preparationStyleTypes';
import {
  extentOf,
  fittedCustomRange,
  fittedRange,
  fittedUpperBound,
  growScale,
  growthRule,
  initialLiveRange,
  mergeExtents,
  visibleRange,
} from '../axis-scale';
import type { SeriesDef } from '../series-def';

const ESPRESSO = PREPARATION_STYLE_TYPE.ESPRESSO;
const FILTER = PREPARATION_STYLE_TYPE.POUR_OVER;

function extent(...values: number[]) {
  return extentOf(values);
}

describe('axis scales', () => {
  const settings = new Settings();

  describe('extents', () => {
    it('ignores values that are not finite', () => {
      expect(extent(3, NaN, -1, Infinity)).toEqual({ min: -1, max: 3 });
      expect(extent(NaN)).toBeNull();
      expect(extent()).toBeNull();
    });

    it('merges two extents', () => {
      expect(mergeExtents({ min: 0, max: 2 }, { min: -1, max: 1 })).toEqual({
        min: -1,
        max: 2,
      });
      expect(mergeExtents(null, { min: 1, max: 2 })).toEqual({
        min: 1,
        max: 2,
      });
      expect(mergeExtents(null, null)).toBeNull();
    });
  });

  describe('fitting', () => {
    it('keeps the default water axis until a pour outgrows it', () => {
      expect(fittedUpperBound(null, 100)).toBe(100);
      expect(fittedUpperBound(extent(0, 40), 100)).toBe(100);
      expect(fittedUpperBound(extent(0, 100), 100)).toBe(100);
      expect(fittedUpperBound(extent(0, 312), 100)).toBe(328);
    });

    it('fits a custom axis around its own values once they leave the fixed range', () => {
      expect(fittedCustomRange(null, [0, 20])).toEqual([0, 20]);
      expect(fittedCustomRange(extent(2, 20), [0, 20])).toEqual([0, 20]);
      const [lo, hi] = fittedCustomRange(extent(88, 93), [0, 20]);
      expect(lo).toBeCloseTo(87.5, 6);
      expect(hi).toBeCloseTo(93.5, 6);
      expect(fittedCustomRange(extent(30, 30), [0, 20])).toEqual([29, 31]);
    });

    it('turns an empty or reversed range into a visible one', () => {
      expect(visibleRange([1, 2])).toEqual([1, 2]);
      expect(visibleRange([2, 2])).toEqual([1, 3]);
      expect(visibleRange([3, 1])).toEqual([1, 3]);
    });

    it('fits the axes of a saved brew', () => {
      expect(fittedRange('weight', settings, extent(0, 40))).toEqual([0, 42]);
      expect(fittedRange('flow', settings, extent(-1, 3))).toEqual([-1, 3.2]);
      expect(fittedRange('weight', settings, null)).toEqual([0, 1]);
      expect(fittedRange('pressure', settings, extent(0, 9.2))).toEqual([
        0, 11,
      ]);
      expect(fittedRange('pressure', settings, null)).toEqual([0, 9]);
      expect(fittedRange('temperature', settings, extent(20, 96))).toEqual([
        0, 100,
      ]);
      expect(fittedRange('water', settings, extent(0, 312))).toEqual([0, 328]);
      expect(fittedRange('custom:x', settings, extent(-5, -5))).toEqual([
        -6, -4,
      ]);
    });

    it('starts a custom axis from the range its file asks for', () => {
      const def = { range: { min: 0, max: 100 } } as SeriesDef;
      expect(fittedRange('custom:x', settings, extent(50, 60), def)).toEqual([
        0, 100,
      ]);
    });
  });

  describe('live start ranges', () => {
    it('reads weight, flow and pressure from the settings of the style', () => {
      expect(initialLiveRange('weight', settings, ESPRESSO, null)).toEqual([
        0, 50,
      ]);
      expect(initialLiveRange('weight', settings, FILTER, null)).toEqual([
        0, 300,
      ]);
      expect(initialLiveRange('flow', settings, ESPRESSO, null)).toEqual([
        0, 2.5,
      ]);
      expect(initialLiveRange('flow', settings, undefined, null)).toEqual([
        0, 20,
      ]);
      expect(initialLiveRange('pressure', settings, ESPRESSO, null)).toEqual([
        0, 9,
      ]);
      expect(initialLiveRange('temperature', settings, ESPRESSO, null)).toEqual(
        [0, 100],
      );
    });

    it('fits water to a reference that is already there', () => {
      expect(initialLiveRange('water', settings, FILTER, null)).toEqual([
        0, 100,
      ]);
      expect(
        initialLiveRange('water', settings, FILTER, extent(0, 200)),
      ).toEqual([0, 210]);
    });

    it('keeps a live custom axis at zero unless all its values are negative', () => {
      expect(initialLiveRange('custom:x', settings, FILTER, null)).toEqual([
        0, 20,
      ]);
      const [lo, hi] = initialLiveRange(
        'custom:x',
        settings,
        FILTER,
        extent(88, 93),
      );
      expect(lo).toBe(0);
      expect(hi).toBeCloseTo(93.5, 6);
      const negative = initialLiveRange(
        'custom:x',
        settings,
        FILTER,
        extent(-10, -5),
      );
      expect(negative[0]).toBeCloseTo(-10.5, 6);
      expect(negative[1]).toBeCloseTo(-4.5, 6);
      expect(
        initialLiveRange('custom:x', settings, FILTER, extent(0, 0)),
      ).toEqual([0, 20]);
    });
  });

  describe('growth rules', () => {
    it('grows weight and flow faster for filter, with a wider tolerance', () => {
      expect(growthRule('weight', ESPRESSO)).toEqual({
        kind: 'factor',
        factor: 1.25,
        tolerance: 1,
      });
      expect(growthRule('weight', FILTER)).toEqual({
        kind: 'factor',
        factor: 1.5,
        tolerance: 10,
      });
      expect(growthRule('flow', ESPRESSO)).toEqual({
        kind: 'factor',
        factor: 1.25,
        tolerance: 0.5,
      });
      expect(growthRule('flow', FILTER)).toEqual({
        kind: 'factor',
        factor: 1.5,
        tolerance: 3,
      });
      expect(growthRule('water', FILTER)).toEqual({
        kind: 'factor',
        factor: 1.25,
        tolerance: 1,
      });
      expect(growthRule('custom:x', FILTER)).toEqual({
        kind: 'factor',
        factor: 1.5,
        tolerance: 1,
      });
      expect(growthRule('pressure', ESPRESSO)).toEqual({ kind: 'ceil' });
      expect(growthRule('temperature', ESPRESSO)).toBeNull();
    });
  });

  describe('growScale', () => {
    const espressoWeight = growthRule('weight', ESPRESSO);

    it('keeps the range while the values stay clear of the top', () => {
      const range = [0, 50] as const;
      expect(growScale(range, extent(10, 48.9), espressoWeight)).toBe(range);
      expect(growScale(range, null, espressoWeight)).toBe(range);
      expect(growScale(range, extent(500), null)).toBe(range);
    });

    it('moves the top to value × factor once a value comes within the tolerance', () => {
      expect(growScale([0, 50], extent(49), espressoWeight)).toEqual([
        0, 61.25,
      ]);
      expect(
        growScale([0, 300], extent(295), growthRule('weight', FILTER)),
      ).toEqual([0, 442.5]);
    });

    it('never shrinks', () => {
      const grown = growScale([0, 50], extent(60), espressoWeight);
      expect(growScale(grown, extent(1), espressoWeight)).toBe(grown);
    });

    it('keeps the top above a value near zero', () => {
      const [, upper] = growScale(
        [0, 0.2],
        extent(0.1),
        growthRule('flow', ESPRESSO),
      );
      expect(upper).toBeGreaterThan(0.1);
      expect(upper).toBe(0.2);
      expect(growScale([0, 0], extent(0), espressoWeight)).toEqual([0, 0]);
    });

    it('lifts pressure to the next whole bar above value + 1', () => {
      expect(growScale([0, 9], extent(9), { kind: 'ceil' })).toEqual([0, 9]);
      expect(growScale([0, 9], extent(9.3), { kind: 'ceil' })).toEqual([0, 11]);
    });

    it('lowers the bottom of a negative range and lifts its top back above zero', () => {
      const rule = growthRule('custom:x', ESPRESSO);
      expect(growScale([-10, -5], extent(-12), rule)).toEqual([-15, -5]);
      expect(growScale([-10, -5], extent(-12, 2), rule)).toEqual([-15, 2.5]);
      expect(growScale([-10, -5], extent(-5.5), rule)).toEqual([-10, -4.125]);
      expect(growScale([-10, -5], extent(-7), rule)).toEqual([-10, -5]);
    });
  });
});
