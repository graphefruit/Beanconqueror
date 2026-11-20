import { anchorAt, anchorOffset, ListAnchor } from '../virtual-list-anchor';

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
});
