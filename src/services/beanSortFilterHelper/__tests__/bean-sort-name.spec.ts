import { Bean } from '../../../classes/bean/bean';
import { BEAN_SORT_AFTER } from '../../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../../enums/beans/beanSortOrder';
import { BeanSortFilterHelperService } from '../bean-sort-filter-helper.service';

describe('BeanSortFilterHelperService - sort by name', () => {
  // Sorting by name reads only the beans, so no dependencies are needed.
  const service = Object.create(
    BeanSortFilterHelperService.prototype,
  ) as BeanSortFilterHelperService;

  const names = [
    'Zeta Original',
    'Äthiopien Natural',
    'alpha Filter',
    'Gamma Blend',
    'Delta Minus',
  ];

  function sorted(order: BEAN_SORT_ORDER, sortAfter = BEAN_SORT_AFTER.NAME) {
    const beans = names.map((name) => Object.assign(new Bean(), { name }));
    return service['manageSort'](
      { sort_after: sortAfter, sort_order: order },
      beans,
    ).map((entry: Bean) => entry.name);
  }

  it('sorts ascending, ignoring the case, with "Ä" after "Z" (known defect)', () => {
    // The letters are compared by their code, whatever the language.
    expect(sorted(BEAN_SORT_ORDER.ASCENDING)).toEqual([
      'alpha Filter',
      'Delta Minus',
      'Gamma Blend',
      'Zeta Original',
      'Äthiopien Natural',
    ]);
  });

  it('sorts descending in the reverse order', () => {
    expect(sorted(BEAN_SORT_ORDER.DESCENDING)).toEqual([
      'Äthiopien Natural',
      'Zeta Original',
      'Gamma Blend',
      'Delta Minus',
      'alpha Filter',
    ]);
  });

  it('keeps the stored order while the criterion or the direction is unknown', () => {
    expect(sorted(BEAN_SORT_ORDER.UNKOWN)).toEqual(names);
    expect(sorted(BEAN_SORT_ORDER.ASCENDING, BEAN_SORT_AFTER.UNKOWN)).toEqual(
      names,
    );
  });
});
