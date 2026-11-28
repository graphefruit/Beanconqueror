import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { BEAN_ACTION } from '../../../enums/beans/beanAction';
import { IBean } from '../../../interfaces/bean/iBean';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { beanActions, pickRepeatBrew } from '../bean-action-rules';

const A = BEAN_ACTION;
const FROZEN_AT = '2026-01-10T10:00:00.000Z';
const THAWED_AT = '2026-02-10T10:00:00.000Z';

/** A bean in stock with a photo, a code and a frozen id. */
function bean(fields: Partial<IBean> = {}): Bean {
  const result = new Bean();
  Object.assign(
    result,
    { frozenId: 'F1', qr_code: 'qr', attachments: ['photo.jpg'] },
    fields,
  );
  return result;
}

const EVERYTHING = { freezeEnabled: true, hasActiveBrews: true };

function roles(
  fields: Partial<IBean>,
  context: Partial<typeof EVERYTHING> = {},
): BEAN_ACTION[] {
  return beanActions(bean(fields), { ...EVERYTHING, ...context }).map(
    (entry) => entry.role,
  );
}

describe('bean action rules', () => {
  describe('beanActions', () => {
    it('lists the actions of a bean in stock in the order of the menu', () => {
      expect(beanActions(bean(), EVERYTHING)).toEqual([
        {
          role: A.DETAIL,
          translationKey: 'DETAIL',
          icon: 'beanconqueror-detail',
        },
        {
          role: A.REPEAT,
          translationKey: 'REPEAT',
          icon: 'beanconqueror-repeat',
        },
        { role: A.EDIT, translationKey: 'EDIT', icon: 'beanconqueror-edit' },
        {
          role: A.REPEAT_LAST_OR_BEST_BREW,
          translationKey: 'POPOVER_BEANS_OPTION_REPEAT',
          icon: 'beanconqueror-repeat',
        },
        {
          role: A.SHOW_BREWS,
          translationKey: 'POPOVER_SHOW_BREWS',
          icon: 'beanconqueror-brew',
        },
        {
          role: A.CUPPING,
          translationKey: 'POPOVER_BREWS_OPTION_CUPPING',
          icon: 'beanconqueror-cupping',
        },
        {
          role: A.FREEZE,
          translationKey: 'POPOVER_FREEZE_COFFEE_BEAN',
          icon: 'snow-outline',
        },
        {
          role: A.COPY_FROZEN_ID,
          translationKey: 'POPOVER_COPY_FROZEN_ID',
          icon: 'copy-outline',
        },
        {
          role: A.REFRESH_DATA_FROM_QR_CODE,
          translationKey: 'POPOVER_QR_CODE_REFRESH',
          icon: 'beanconqueror-refresh-barcode',
        },
        {
          role: A.TOGGLE_FAVOURITE,
          translationKey: 'POPOVER_BREWS_OPTION_TOGGLE_FAVOURITE',
          icon: 'heart-outline',
        },
        {
          role: A.SHARE,
          translationKey: 'SHARE_BEAN_URL',
          icon: 'share-social-outline',
        },
        {
          role: A.SHARE_IMAGE,
          translationKey: 'SHARE_CARD.MENU',
          icon: 'images-outline',
        },
        {
          role: A.BEANS_CONSUMED,
          translationKey: 'BEANS_CONSUMED',
          icon: 'beanconqueror-finished',
        },
        {
          role: A.PHOTO_GALLERY,
          translationKey: 'POPOVER_BREWS_OPTION_PHOTO_GALLERY',
          icon: 'beanconqueror-photo-gallery',
        },
        {
          role: A.GENERATE_INTERNAL_SHARE_CODE,
          translationKey: 'POPOVER_BEAN_OPTION_GENERATE_INTERNAL_SHARE_CODE',
          icon: 'qr-code-outline',
        },
        {
          role: A.DELETE,
          translationKey: 'DELETE',
          icon: 'beanconqueror-delete',
        },
      ]);
    });

    it('puts thawing and taking back where freezing and archiving were', () => {
      const frozenArchive = beanActions(
        bean({ frozenDate: FROZEN_AT, finished: true }),
        EVERYTHING,
      );

      expect(frozenArchive.map((entry) => entry.role)).toEqual([
        A.DETAIL,
        A.REPEAT,
        A.EDIT,
        A.REPEAT_LAST_OR_BEST_BREW,
        A.SHOW_BREWS,
        A.CUPPING,
        A.UNFREEZE,
        A.COPY_FROZEN_ID,
        A.REFRESH_DATA_FROM_QR_CODE,
        A.TOGGLE_FAVOURITE,
        A.SHARE,
        A.SHARE_IMAGE,
        A.UNARCHIVE,
        A.PHOTO_GALLERY,
        A.GENERATE_INTERNAL_SHARE_CODE,
        A.DELETE,
      ]);
      expect(frozenArchive[6]).toEqual({
        role: A.UNFREEZE,
        translationKey: 'POPOVER_UNFREEZE_COFFEE_BEAN',
        icon: 'thermometer-outline',
      });
      expect(frozenArchive[12]).toEqual({
        role: A.UNARCHIVE,
        translationKey: 'BEANS_UNARCHIVE',
        icon: 'beanconqueror-unfinish',
      });
    });

    it('always offers the actions that need nothing', () => {
      expect(
        roles(
          {
            frozenId: '',
            qr_code: '',
            attachments: [],
            finished: undefined,
          },
          { freezeEnabled: false, hasActiveBrews: false },
        ),
      ).toEqual([
        A.DETAIL,
        A.REPEAT,
        A.EDIT,
        A.SHOW_BREWS,
        A.CUPPING,
        A.TOGGLE_FAVOURITE,
        A.SHARE,
        A.SHARE_IMAGE,
        A.GENERATE_INTERNAL_SHARE_CODE,
        A.DELETE,
      ]);
    });

    interface Offer {
      name: string;
      bean?: Partial<IBean>;
      context?: Partial<typeof EVERYTHING>;
      shown?: BEAN_ACTION[];
      hidden?: BEAN_ACTION[];
    }
    const offers: Offer[] = [
      {
        name: 'a bean in stock',
        shown: [A.FREEZE, A.BEANS_CONSUMED],
        hidden: [A.UNFREEZE, A.UNARCHIVE],
      },
      {
        name: 'an archived bean',
        bean: { finished: true },
        shown: [A.UNARCHIVE],
        hidden: [A.BEANS_CONSUMED],
      },
      {
        name: 'a bean that is neither archived nor in stock',
        bean: { finished: null },
        hidden: [A.UNARCHIVE, A.BEANS_CONSUMED],
      },
      {
        name: 'a frozen bean',
        bean: { frozenDate: FROZEN_AT },
        shown: [A.UNFREEZE],
        hidden: [A.FREEZE],
      },
      {
        name: 'a frozen bean with an empty thaw date',
        bean: { frozenDate: FROZEN_AT, unfrozenDate: '' },
        shown: [A.UNFREEZE],
        hidden: [A.FREEZE],
      },
      {
        name: 'a thawed bean',
        bean: { frozenDate: FROZEN_AT, unfrozenDate: THAWED_AT },
        shown: [A.FREEZE],
        hidden: [A.UNFREEZE],
      },
      {
        name: 'a bean with only a thaw date',
        bean: { frozenDate: undefined, unfrozenDate: THAWED_AT },
        shown: [A.FREEZE],
        hidden: [A.UNFREEZE],
      },
      {
        name: 'a frozen bean when freezing is switched off',
        bean: { frozenDate: FROZEN_AT },
        context: { freezeEnabled: false },
        hidden: [A.FREEZE, A.UNFREEZE],
      },
      {
        name: 'a bean in stock when freezing is switched off',
        context: { freezeEnabled: false },
        hidden: [A.FREEZE, A.UNFREEZE],
      },
      {
        name: 'a bean with a photo',
        shown: [A.PHOTO_GALLERY],
      },
      {
        name: 'a bean without a photo',
        bean: { attachments: [] },
        hidden: [A.PHOTO_GALLERY],
      },
      {
        name: 'a bean with a code',
        shown: [A.REFRESH_DATA_FROM_QR_CODE],
      },
      {
        name: 'a bean with an empty code',
        bean: { qr_code: '' },
        hidden: [A.REFRESH_DATA_FROM_QR_CODE],
      },
      {
        name: 'a bean with a code of null',
        bean: { qr_code: null },
        hidden: [A.REFRESH_DATA_FROM_QR_CODE],
      },
      {
        name: 'a bean with a frozen id',
        shown: [A.COPY_FROZEN_ID],
      },
      {
        name: 'a bean with an empty frozen id',
        bean: { frozenId: '' },
        hidden: [A.COPY_FROZEN_ID],
      },
      {
        name: 'a bean without a frozen id',
        bean: { frozenId: undefined },
        hidden: [A.COPY_FROZEN_ID],
      },
      {
        name: 'a bean with a brew to repeat',
        shown: [A.REPEAT_LAST_OR_BEST_BREW],
      },
      {
        name: 'a bean without a brew to repeat',
        context: { hasActiveBrews: false },
        hidden: [A.REPEAT_LAST_OR_BEST_BREW],
      },
    ];
    for (const { name, bean: fields, context, shown, hidden } of offers) {
      it(`offers what fits ${name}`, () => {
        const offered = roles(fields ?? {}, context);

        for (const action of shown ?? []) {
          expect(offered).toContain(action);
        }
        for (const action of hidden ?? []) {
          expect(offered).not.toContain(action);
        }
      });
    }

    it('agrees with Bean on what counts as frozen', () => {
      for (const fields of [
        {},
        { frozenDate: FROZEN_AT },
        { frozenDate: FROZEN_AT, unfrozenDate: '' },
        { frozenDate: FROZEN_AT, unfrozenDate: THAWED_AT },
        { unfrozenDate: THAWED_AT },
      ]) {
        const legacy = bean(fields);

        expect(roles(fields).includes(A.UNFREEZE)).toBe(legacy.isFrozen());
        expect(roles(fields).includes(A.FREEZE)).toBe(!legacy.isFrozen());
      }
    });

    it('fills the heart of a favourite', () => {
      const icon = (favourite: boolean) =>
        beanActions(bean({ favourite }), EVERYTHING).find(
          (entry) => entry.role === A.TOGGLE_FAVOURITE,
        ).icon;

      expect(icon(true)).toBe('heart');
      expect(icon(false)).toBe('heart-outline');
      expect(icon(undefined)).toBe('heart-outline');
    });
  });

  describe('pickRepeatBrew', () => {
    function brew(at: number | undefined, best = false): Brew {
      const result = new Brew();
      result.config.unix_timestamp = at;
      result.best_brew = best;
      return result;
    }

    it('picks nothing without brews', () => {
      expect(pickRepeatBrew([], true)).toBeUndefined();
      expect(pickRepeatBrew([], false)).toBeUndefined();
    });

    it('takes the latest brew and leaves the list as it was', () => {
      const [old, latest, middle] = [brew(100), brew(300), brew(200)];
      const brews = [old, latest, middle];

      const choice = pickRepeatBrew(brews, true);

      expect(choice.latest).toBe(latest);
      expect(choice.best).toBeUndefined();
      expect(brews).toEqual([old, latest, middle]);
    });

    it('takes the first stored of two brews of the same time', () => {
      const [first, second] = [brew(100), brew(100)];

      expect(pickRepeatBrew([first, second], true).latest).toBe(first);
    });

    it('takes the latest of the best brews', () => {
      const [oldBest, latestBest, latest] = [
        brew(100, true),
        brew(200, true),
        brew(300),
      ];

      const choice = pickRepeatBrew([oldBest, latest, latestBest], true);

      expect(choice.latest).toBe(latest);
      expect(choice.best).toBe(latestBest);
    });

    it('names the latest brew as the best one when it is', () => {
      const [old, latestBest] = [brew(100), brew(300, true)];

      const choice = pickRepeatBrew([old, latestBest], true);

      expect(choice.latest).toBe(latestBest);
      expect(choice.best).toBe(latestBest);
    });

    it('names no best brew when best brews are switched off', () => {
      const [best, latest] = [brew(100, true), brew(300)];

      const choice = pickRepeatBrew([best, latest], false);

      expect(choice.latest).toBe(latest);
      expect(choice.best).toBeUndefined();
    });

    it('names no best brew when no brew says it is one', () => {
      const [latest, old] = [brew(300), brew(100)];
      // As a brew stored before there were best brews has it.
      latest.best_brew = undefined;
      old.best_brew = null;

      const choice = pickRepeatBrew([latest, old], true);

      expect(choice.latest).toBe(latest);
      expect(choice.best).toBeUndefined();
    });

    it('orders brews without a timestamp as the lists of brews do', () => {
      const [a, b, c, d] = [
        brew(100),
        brew(undefined, true),
        brew(300, true),
        brew(200),
      ];
      const orders = [
        [a, b, c, d],
        [b, a, d, c],
        [c, d, b, a],
        [d, c, a, b],
        [b, c],
        [c, b],
      ];
      for (const brews of orders) {
        const sorted = UIBrewHelper.sortBrews([...brews]);

        const choice = pickRepeatBrew(brews, true);

        expect(choice.latest).toBe(sorted[0]);
        expect(choice.best).toBe(sorted.find((entry) => entry.best_brew));
      }
    });
  });
});
