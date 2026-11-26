import { IBean } from '../../interfaces/bean/iBean';
import { IBeanInformation } from '../../interfaces/bean/iBeanInformation';
import { DeepReadonly } from '../core/read-only';

/** Rules of the bean add and edit forms, as pure functions of the entered data. */

type BeanFields<K extends keyof IBean> = Pick<DeepReadonly<IBean>, K>;

/** A bean is stored only with a name that is more than blanks. */
export function hasBeanName(bean: BeanFields<'name'>): boolean {
  return !!bean.name && bean.name.trim() !== '';
}

/** A bean put into the freezer gets an id of its own once. */
export function needsFrozenId(
  bean: BeanFields<'frozenDate' | 'frozenId'>,
): boolean {
  return !!bean.frozenDate && bean.frozenId === '';
}

/**
 * The bean that is left alone in the frozen group `groupId` once the bean
 * `uuid` has left it: a group of one is no group any more.
 */
export function aloneInFrozenGroup<
  T extends BeanFields<'frozenGroupId' | 'config'>,
>(beans: readonly T[], groupId: string, uuid: string): T | undefined {
  const remaining = beans.filter(
    (bean) => bean.frozenGroupId === groupId && bean.config.uuid !== uuid,
  );
  return remaining.length === 1 ? remaining[0] : undefined;
}

const SORT_TEXTS = [
  'country',
  'region',
  'farm',
  'farmer',
  'elevation',
  'harvest_time',
  'variety',
  'processing',
  'certification',
] as const;
const SORT_NUMBERS = ['percentage', 'purchasing_price', 'fob_price'] as const;

/** Whether a sort holds anything the user would miss when the sorts are hidden. */
export function hasSortInformation(
  sort: Readonly<Partial<IBeanInformation>>,
): boolean {
  return (
    SORT_TEXTS.some((field) => !!sort[field]) ||
    SORT_NUMBERS.some((field) => !!sort[field] && sort[field] > 0)
  );
}
