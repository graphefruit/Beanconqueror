import {
  anchorAt,
  anchorOffset,
  ListAnchor,
  reveal,
  runAround,
  withIndexes,
} from '../virtual-list-anchor';

// Three rows below a toolbar of 50 px.
const rows = [
  { key: 'a', start: 50, end: 250 },
  { key: 'b', start: 250, end: 310 },
  { key: 'c', start: 310, end: 510 },
];

describe('virtual list anchor', () => {
  describe('anchorAt', () => {
    it('takes the row at the top edge and the part of it scrolled past', () => {
      expect(anchorAt(rows, 280)).toEqual({
        key: 'b',
        offsetInRow: 30,
        offset: 280,
      });
    });

    it('takes the next row when the edge lies on the end of one', () => {
      expect(anchorAt(rows, 250)).toEqual({
        key: 'b',
        offsetInRow: 0,
        offset: 250,
      });
    });

    it('keeps the distance to the first row above the list', () => {
      expect(anchorAt(rows, 0)).toEqual({
        key: 'a',
        offsetInRow: -50,
        offset: 0,
      });
    });

    it('takes the last row when scrolled past all rows', () => {
      expect(anchorAt(rows, 600)?.key).toBe('c');
    });

    it('has no anchor without rows', () => {
      expect(anchorAt([], 100)).toBeNull();
    });
  });

  describe('anchorOffset', () => {
    const anchor: ListAnchor = { key: 'b', offsetInRow: 30, offset: 280 };

    it('goes to the same place in the row where it starts now', () => {
      expect(anchorOffset(anchor, 400, 1000)).toBe(430);
    });

    it('stays at the old position when the row is gone', () => {
      expect(anchorOffset(anchor, undefined, 1000)).toBe(280);
    });

    it('stays within the scroll range', () => {
      expect(anchorOffset(anchor, 990, 1000)).toBe(1000);
      expect(anchorOffset(anchor, undefined, 100)).toBe(100);
      expect(
        anchorOffset({ key: 'a', offsetInRow: -50, offset: 0 }, 20, 1000),
      ).toBe(0);
    });

    it('goes to the top without an anchor', () => {
      expect(anchorOffset(null, 400, 1000)).toBe(0);
    });
  });

  describe('withIndexes', () => {
    it('adds indexes before, after or between the others in order', () => {
      expect(withIndexes([30, 31, 32], [5, 6])).toEqual([5, 6, 30, 31, 32]);
      expect(withIndexes([30, 31, 32], [90, 5])).toEqual([5, 30, 31, 32, 90]);
      expect(withIndexes([], [4, 4])).toEqual([4]);
    });

    it('leaves the indexes as they are with the others among them', () => {
      const indexes = [30, 31, 32];
      expect(withIndexes(indexes, [31, 32])).toBe(indexes);
      expect(withIndexes(indexes, [])).toBe(indexes);
    });
  });

  describe('runAround', () => {
    it('finds the consecutive indexes around one', () => {
      expect(runAround([3, 4, 30, 31, 32, 60], 31)).toEqual({
        first: 2,
        end: 5,
      });
      expect(runAround([3, 4, 30, 31, 32, 60], 3)).toEqual({
        first: 0,
        end: 2,
      });
      expect(runAround([3, 4, 30, 31, 32, 60], 60)).toEqual({
        first: 5,
        end: 6,
      });
    });

    it('takes all indexes without the one among them', () => {
      expect(runAround([3, 4, 30], 7)).toEqual({ first: 0, end: 3 });
      expect(runAround([], 0)).toEqual({ first: 0, end: 0 });
    });
  });

  describe('reveal', () => {
    // The screen between the head and the add button.
    const view = { start: 1050, end: 1500 };

    it('leaves a row that is in the view', () => {
      expect(reveal({ start: 1050, end: 1260 }, view)).toBeNull();
      expect(reveal({ start: 1290, end: 1500 }, view)).toBeNull();
    });

    it('moves a row cut off by the add button or the head into the view', () => {
      expect(reveal({ start: 1400, end: 1610 }, view)).toBe(110);
      expect(reveal({ start: 1000, end: 1210 }, view)).toBe(-50);
    });

    it('leaves a row higher than the view while part of it is shown', () => {
      expect(reveal({ start: 1300, end: 2000 }, view)).toBeNull();
      expect(reveal({ start: 600, end: 1100 }, view)).toBeNull();
      expect(reveal({ start: 900, end: 1800 }, view)).toBeNull();
    });

    it('goes to the start of a row that is not in the view', () => {
      expect(reveal({ start: 1500, end: 1710 }, view)).toBe('start');
      expect(reveal({ start: 840, end: 1050 }, view)).toBe('start');
      expect(reveal({ start: 3000, end: 4000 }, view)).toBe('start');
    });
  });
});
