import { BREW_SORT_AFTER } from '../../enums/brews/brewSortAfter';
import { BREW_SORT_ORDER } from '../../enums/brews/brewSortOrder';

export interface IBrewPageSort {
  sort_after: BREW_SORT_AFTER;
  sort_order: BREW_SORT_ORDER;
}
