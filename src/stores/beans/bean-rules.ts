import moment from 'moment';

import { BEAN_MIX_ENUM } from '../../enums/beans/mix';
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

/** A bean without a code, also one of null, was not scanned. */
export function isScannedBean(bean: BeanFields<'qr_code'>): boolean {
  return !!bean.qr_code;
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

/**
 * The name of a bean in the buttons of its card. Beans can share a name, so
 * the roaster and the roasting date follow while the card shows them, and the
 * id of a frozen bag; `roastingDate` is the date as the card writes it.
 */
export function beanEntryName(
  bean: BeanFields<'name' | 'roaster' | 'frozenId'>,
  shown: { roaster: boolean; roastingDate: string | false },
): string {
  return [
    bean.name,
    shown.roaster && bean.roaster,
    shown.roastingDate,
    bean.frozenId,
  ]
    .filter(Boolean)
    .join(', ');
}

export function isBlend(bean: { readonly beanMix?: BEAN_MIX_ENUM }): boolean {
  return (
    BEAN_MIX_ENUM[bean.beanMix as unknown as keyof typeof BEAN_MIX_ENUM] ===
    BEAN_MIX_ENUM.BLEND
  );
}

/** Which of the three ways the roast degree of a bean is shown in. */
export function roastShownAs(
  bean: BeanFields<'roast'>,
): 'unknown' | 'custom' | 'named' {
  const roast = bean.roast as string;
  if (roast === 'UNKNOWN') {
    return 'unknown';
  }
  return roast === 'CUSTOM_ROAST' ? 'custom' : 'named';
}

/**
 * Seconds of a roast as `HH:mm:ss`; the hours wrap at 24 as on a clock. No
 * value gives `-`, as a missing crack time does.
 */
export function roastTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) {
    return '-';
  }
  const whole = Math.floor(seconds);
  return [
    Math.floor(whole / 3600) % 24,
    Math.floor(whole / 60) % 60,
    whole % 60,
  ]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

/** The time of a crack; none or 0 gives `-`. */
export function crackTime(seconds: number | null | undefined): string {
  return seconds ? roastTime(seconds) : '-';
}

/**
 * What a roast lost of the green beans, as `16.67% (200.0g)`; `-` unless
 * both weights are known and the roasted beans weigh no more.
 */
export function roastWeightLoss(
  greenBeanWeight: unknown,
  roastedWeight: unknown,
): string {
  const green = Number(greenBeanWeight);
  const roasted = Number(roastedWeight);
  if (green > 0 && roasted > 0 && green >= roasted) {
    const loss = green - roasted;
    const pct = (loss / green) * 100;
    return `${pct.toFixed(2)}% (${loss.toFixed(1)}g)`;
  }
  return '-';
}
