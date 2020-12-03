import {BEAN_SORT_AFTER} from '../../enums/beans/beanSortAfter';
import {BEAN_SORT_ORDER} from '../../enums/beans/beanSortOrder';

export interface IBeanPageFilter {
  sort_after:  BEAN_SORT_AFTER,
  sort_order: BEAN_SORT_ORDER

}
