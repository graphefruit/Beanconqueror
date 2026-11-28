import { BEAN_SORT_AFTER } from '../../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../../enums/beans/beanSortOrder';
import {
  chooseSortAfter,
  chooseSortOrder,
  filterRatingMax,
  filterRoasters,
  suggestedBeanRating,
} from '../bean-sheet-rules';

const S = BEAN_SORT_AFTER;
const O = BEAN_SORT_ORDER;

describe('bean sheet rules', () => {
  describe('chooseSortAfter', () => {
    it('sorts ascending when no direction was chosen yet', () => {
      expect(
        chooseSortAfter({ sort_after: S.UNKOWN, sort_order: O.UNKOWN }, S.NAME),
      ).toEqual({ sort_after: S.NAME, sort_order: O.ASCENDING });
    });

    it('keeps a chosen direction', () => {
      expect(
        chooseSortAfter(
          { sort_after: S.NAME, sort_order: O.DESCENDING },
          S.RATING,
        ),
      ).toEqual({ sort_after: S.RATING, sort_order: O.DESCENDING });
    });
  });

  describe('chooseSortOrder', () => {
    it('sorts by name when no criterion was chosen yet', () => {
      expect(
        chooseSortOrder(
          { sort_after: S.UNKOWN, sort_order: O.UNKOWN },
          O.DESCENDING,
        ),
      ).toEqual({ sort_after: S.NAME, sort_order: O.DESCENDING });
    });

    it('keeps a chosen criterion', () => {
      expect(
        chooseSortOrder(
          { sort_after: S.ROASTER, sort_order: O.ASCENDING },
          O.DESCENDING,
        ),
      ).toEqual({ sort_after: S.ROASTER, sort_order: O.DESCENDING });
    });
  });

  describe('filterRoasters', () => {
    it('offers each roaster once, without the empty one, by upper case', () => {
      expect(
        filterRoasters([
          { name: 'B', roaster: 'süd' },
          { name: 'A', roaster: 'Nord' },
          { name: 'C', roaster: '' },
          { name: 'D', roaster: 'Nord' },
          { name: 'E', roaster: 'Ost' },
        ]),
      ).toEqual(['Nord', 'Ost', 'süd']);
    });

    it('keeps roasters that differ only in case in the order of the bean names', () => {
      const beans = [
        { name: 'Zeta', roaster: 'nord' },
        { name: 'Alpha', roaster: 'NORD' },
      ];

      expect(filterRoasters(beans)).toEqual(['NORD', 'nord']);
      // The beans handed in keep their order.
      expect(beans.map((bean) => bean.name)).toEqual(['Zeta', 'Alpha']);
    });
  });

  describe('filterRatingMax', () => {
    const beans = [
      { finished: false, rating: 4 },
      { finished: false, rating: 7 },
      { finished: true, rating: 9 },
    ];

    it('is the top of the scale unless a bean of the segment is rated higher', () => {
      expect(filterRatingMax(beans, 'open', 5)).toBe(7);
      expect(filterRatingMax(beans, 'open', 10)).toBe(10);
      expect(filterRatingMax([], 'open', 5)).toBe(5);
    });

    it('looks at the archived beans for every other segment, also the frozen one', () => {
      expect(filterRatingMax(beans, 'archive', 5)).toBe(9);
      expect(filterRatingMax(beans, 'frozen', 5)).toBe(9);
    });
  });

  describe('suggestedBeanRating', () => {
    const FIVE = { bean_rating: 5, brew_rating: 5, bean_rating_steps: 1 };

    it('suggests the average of the rated brews', () => {
      expect(suggestedBeanRating(0, [4, 2, 0], FIVE)).toBe(3);
    });

    it('puts the brews on the bean scale and rounds to its steps', () => {
      expect(suggestedBeanRating(0, [4, 5], { ...FIVE, bean_rating: 10 })).toBe(
        9,
      );
      expect(
        suggestedBeanRating(0, [3, 4], {
          bean_rating: 5,
          brew_rating: 10,
          bean_rating_steps: 0.5,
        }),
      ).toBe(2);
      expect(
        suggestedBeanRating(0, [1, 2], {
          bean_rating: 5,
          brew_rating: 5,
          bean_rating_steps: 0.3,
        }),
      ).toBe(1.5);
    });

    it('suggests nothing for a rated bean or one without rated brews', () => {
      expect(suggestedBeanRating(2, [4], FIVE)).toBeUndefined();
      expect(suggestedBeanRating(0, [0, 0], FIVE)).toBeUndefined();
      expect(suggestedBeanRating(0, [], FIVE)).toBeUndefined();
    });
  });
});
