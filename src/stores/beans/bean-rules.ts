import moment from 'moment';

import { IBean } from '../../interfaces/bean/iBean';
import { DeepReadonly } from '../core/read-only';

/**
 * Rules about a single bean for new code, as pure functions of store data.
 * Each gives the same result as the method of the same name on `Bean`; the
 * current time comes in as a parameter.
 */

type BeanFields<K extends keyof IBean> = Pick<DeepReadonly<IBean>, K>;

export function isFrozen(
  bean: BeanFields<'frozenDate' | 'unfrozenDate'>,
): boolean {
  return !!bean.frozenDate && !bean.unfrozenDate;
}

export function hasFrozenInformation(
  bean: BeanFields<'frozenDate' | 'unfrozenDate'>,
): boolean {
  return !!(bean.frozenDate || bean.unfrozenDate);
}

export function isSelfRoasted(
  bean: BeanFields<'bean_roast_information'>,
): boolean {
  return !!bean.bean_roast_information?.bean_uuid;
}

export function isScannedBean(bean: BeanFields<'qr_code'>): boolean {
  return bean.qr_code !== '';
}

export function hasPhotos(bean: BeanFields<'attachments'>): boolean {
  return !!bean.attachments && bean.attachments.length > 0;
}

/** Whether the card shows the price per kilogram next to the cost. */
export function showsCostPerKg(bean: BeanFields<'weight' | 'cost'>): boolean {
  return (
    !!bean.weight &&
    bean.weight > 0 &&
    bean.weight !== 1000 &&
    !!bean.cost &&
    bean.cost > 0
  );
}

/** Days are counted between the starts of the local days. */
function startOfDay(time: moment.MomentInput): moment.Moment {
  return moment(time).startOf('day');
}

/**
 * Age of the roast in days at `now` (milliseconds). An archived bean stops
 * ageing on the day of its last brew, `lastBrewAt` (seconds, as
 * `config.unix_timestamp`), if it has one. Days in the freezer count one per
 * 90.
 */
export function beanAgeInDays(
  bean: BeanFields<'roastingDate' | 'finished' | 'frozenDate' | 'unfrozenDate'>,
  now: number,
  lastBrewAt: number | undefined,
): number {
  if (
    bean.roastingDate === null ||
    bean.roastingDate === undefined ||
    bean.roastingDate === ''
  ) {
    return 0;
  }
  const today =
    bean.finished && lastBrewAt !== undefined
      ? startOfDay(lastBrewAt * 1000)
      : startOfDay(now);
  const roastingDate = startOfDay(bean.roastingDate);
  if (!bean.frozenDate) {
    return today.diff(roastingDate, 'days');
  }

  const frozenDate = startOfDay(bean.frozenDate);
  // The days between roasting and freezing count in full.
  let days = frozenDate.diff(roastingDate, 'days');
  if (bean.unfrozenDate) {
    const unfrozenDate = startOfDay(bean.unfrozenDate);
    days += Math.floor(unfrozenDate.diff(frozenDate, 'days') / 90);
    days += today.diff(unfrozenDate, 'days');
  } else {
    // Still frozen, or used straight from the freezer.
    days += Math.floor(today.diff(frozenDate, 'days') / 90);
  }
  return days;
}
