import { PREPARATION_SORT_AFTER } from '../../enums/preparations/preparationSortAfter';
import { PREPARATION_SORT_ORDER } from '../../enums/preparations/preparationSortOrder';

export interface IPreparationPageSort {
  sort_after: PREPARATION_SORT_AFTER;
  sort_order: PREPARATION_SORT_ORDER;
}
