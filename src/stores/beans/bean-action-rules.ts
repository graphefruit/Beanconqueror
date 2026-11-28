import { BEAN_ACTION } from '../../enums/beans/beanAction';
import { IBean } from '../../interfaces/bean/iBean';
import { DeepReadonly } from '../core/read-only';
import { isFrozen, isScannedBean } from './bean-rules';

/** An entry of the menu of a bean card. */
export interface BeanActionEntry {
  role: BEAN_ACTION;
  translationKey: string;
  icon: string;
}

type MenuBean = Pick<
  DeepReadonly<IBean>,
  | 'finished'
  | 'favourite'
  | 'frozenId'
  | 'qr_code'
  | 'attachments'
  | 'frozenDate'
  | 'unfrozenDate'
>;

/**
 * The menu of a bean card: the entries it offers for `bean`, in the order
 * they are shown. `hasActiveBrews` says whether the bean has a brew that can
 * be repeated.
 */
export function beanActions(
  bean: MenuBean,
  context: { freezeEnabled: boolean; hasActiveBrews: boolean },
): BeanActionEntry[] {
  const A = BEAN_ACTION;
  const frozen = isFrozen(bean);
  const entries: [BEAN_ACTION, string, string, boolean?][] = [
    [A.DETAIL, 'DETAIL', 'beanconqueror-detail'],
    [A.REPEAT, 'REPEAT', 'beanconqueror-repeat'],
    [A.EDIT, 'EDIT', 'beanconqueror-edit'],
    [
      A.REPEAT_LAST_OR_BEST_BREW,
      'POPOVER_BEANS_OPTION_REPEAT',
      'beanconqueror-repeat',
      context.hasActiveBrews,
    ],
    [A.SHOW_BREWS, 'POPOVER_SHOW_BREWS', 'beanconqueror-brew'],
    [A.CUPPING, 'POPOVER_BREWS_OPTION_CUPPING', 'beanconqueror-cupping'],
    [
      A.FREEZE,
      'POPOVER_FREEZE_COFFEE_BEAN',
      'snow-outline',
      context.freezeEnabled && !frozen,
    ],
    [
      A.UNFREEZE,
      'POPOVER_UNFREEZE_COFFEE_BEAN',
      'thermometer-outline',
      context.freezeEnabled && frozen,
    ],
    [
      A.COPY_FROZEN_ID,
      'POPOVER_COPY_FROZEN_ID',
      'copy-outline',
      !!bean.frozenId,
    ],
    [
      A.REFRESH_DATA_FROM_QR_CODE,
      'POPOVER_QR_CODE_REFRESH',
      'beanconqueror-refresh-barcode',
      isScannedBean(bean),
    ],
    [
      A.TOGGLE_FAVOURITE,
      'POPOVER_BREWS_OPTION_TOGGLE_FAVOURITE',
      bean.favourite ? 'heart' : 'heart-outline',
    ],
    [A.SHARE, 'SHARE_BEAN_URL', 'share-social-outline'],
    [A.SHARE_IMAGE, 'SHARE_CARD.MENU', 'images-outline'],
    [
      A.BEANS_CONSUMED,
      'BEANS_CONSUMED',
      'beanconqueror-finished',
      bean.finished === false,
    ],
    [
      A.UNARCHIVE,
      'BEANS_UNARCHIVE',
      'beanconqueror-unfinish',
      bean.finished === true,
    ],
    [
      A.PHOTO_GALLERY,
      'POPOVER_BREWS_OPTION_PHOTO_GALLERY',
      'beanconqueror-photo-gallery',
      bean.attachments.length > 0,
    ],
    [
      A.GENERATE_INTERNAL_SHARE_CODE,
      'POPOVER_BEAN_OPTION_GENERATE_INTERNAL_SHARE_CODE',
      'qr-code-outline',
    ],
    [A.DELETE, 'DELETE', 'beanconqueror-delete'],
  ];
  return entries
    .filter(([, , , visible]) => visible !== false)
    .map(([role, translationKey, icon]) => ({ role, translationKey, icon }));
}

interface RepeatableBrew {
  best_brew: boolean;
  config: { unix_timestamp: number };
}

/**
 * Which brew "repeat a brew" takes from the brews of a bean that can be
 * repeated: the latest one and, when best brews are switched on and there is
 * one, the latest best one. Undefined without brews.
 */
export function pickRepeatBrew<T extends RepeatableBrew>(
  activeBrews: readonly T[],
  bestBrewEnabled: boolean,
): { latest: T; best: T | undefined } | undefined {
  if (activeBrews.length === 0) {
    return undefined;
  }
  // The comparison of UIBrewHelper.sortBrews, so that brews without a
  // timestamp end up where they do in the lists of brews.
  const sorted = [...activeBrews].sort((obj1, obj2) => {
    if (obj1.config.unix_timestamp < obj2.config.unix_timestamp) {
      return 1;
    }
    if (obj1.config.unix_timestamp > obj2.config.unix_timestamp) {
      return -1;
    }

    return 0;
  });
  return {
    latest: sorted[0],
    best: bestBrewEnabled
      ? sorted.find((brew) => brew.best_brew === true)
      : undefined,
  };
}
