import { BEAN_SORT_AFTER } from '../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../enums/beans/beanSortOrder';
import { IBean } from '../../interfaces/bean/iBean';
import { IBeanPageSort } from '../../interfaces/bean/iBeanPageSort';
import { DeepReadonly } from '../core/read-only';

/** Rules of the archive, filter and sort sheets of the bean list. */

type BeanFields<K extends keyof IBean> = Pick<DeepReadonly<IBean>, K>;

/** A criterion chosen without a direction sorts ascending. */
export function chooseSortAfter(
  sort: IBeanPageSort,
  after: BEAN_SORT_AFTER,
): IBeanPageSort {
  return {
    sort_after: after,
    sort_order:
      sort.sort_order === BEAN_SORT_ORDER.UNKOWN
        ? BEAN_SORT_ORDER.ASCENDING
        : sort.sort_order,
  };
}

/** A direction chosen without a criterion sorts by name. */
export function chooseSortOrder(
  sort: IBeanPageSort,
  order: BEAN_SORT_ORDER,
): IBeanPageSort {
  return {
    sort_after:
      sort.sort_after === BEAN_SORT_AFTER.UNKOWN
        ? BEAN_SORT_AFTER.NAME
        : sort.sort_after,
    sort_order: order,
  };
}

/**
 * The roasters the filter offers: those of all beans, once each, without the
 * empty one, by their upper case. Roasters that differ only in case keep the
 * order of the names of their beans.
 */
export function filterRoasters(
  beans: readonly BeanFields<'name' | 'roaster'>[],
): string[] {
  const byName = [...beans].sort((a, b) => a.name.localeCompare(b.name));
  return [...new Set(byName.map((bean) => bean.roaster))]
    .filter((roaster) => roaster !== '')
    .sort((a, b) => {
      const upperA = a.toUpperCase();
      const upperB = b.toUpperCase();
      if (upperA < upperB) {
        return -1;
      }
      return upperA > upperB ? 1 : 0;
    });
}

/**
 * The top of the rating range in the filter of `segment`: the highest rating
 * of its beans, at least the top of the rating scale. Any segment but `open`
 * looks at the archived beans, also the frozen one.
 */
export function filterRatingMax(
  beans: readonly BeanFields<'finished' | 'rating'>[],
  segment: string,
  scaleMax: number,
): number {
  const archived = segment !== 'open';
  return beans
    .filter((bean) => bean.finished === archived)
    .reduce((max, bean) => (bean.rating > max ? bean.rating : max), scaleMax);
}

/** How ratings are given, from the settings. */
export interface RatingScale {
  readonly bean_rating: number;
  readonly brew_rating: number;
  readonly bean_rating_steps: number;
}

/**
 * The rating the archive sheet suggests for an unrated bean: the average of
 * its rated brews on the bean scale, rounded to the rating steps. None for a
 * rated bean or one without rated brews.
 */
export function suggestedBeanRating(
  beanRating: number,
  brewRatings: readonly number[],
  scale: RatingScale,
): number | undefined {
  const rated = brewRatings.filter((rating) => rating > 0);
  if (beanRating !== 0 || rated.length === 0) {
    return undefined;
  }
  const ratio = scale.bean_rating / scale.brew_rating;
  const sum = rated.reduce((total, rating) => total + rating * ratio, 0);
  const steps = Math.round(sum / rated.length / scale.bean_rating_steps);
  return +(steps * scale.bean_rating_steps).toFixed(2);
}
