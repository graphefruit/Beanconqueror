import en from '../../../assets/i18n/en.json';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { PREPARATION_TYPES } from '../../../enums/preparations/preparationTypes';
import { beanconquerorIcons } from '../../../generated/icon-registry';
import { Preparation } from '../preparation';

describe('xBloom preparation type', () => {
  it('appears with its icon and translated name wherever preparation types are listed', () => {
    const preparation = new Preparation();
    preparation.type = PREPARATION_TYPES.XBLOOM;

    expect(Object.keys(PREPARATION_TYPES)).toContain('XBLOOM');
    expect(preparation.getPresetStyleType()).toBe(
      PREPARATION_STYLE_TYPE.POUR_OVER,
    );
    expect(preparation.getIcon()).toBe('beanconqueror-preparation-xbloom');
    expect(en.PREPARATION_TYPE_XBLOOM).toBe('xBloom');
    expect(
      beanconquerorIcons.some(
        (icon) =>
          icon.name === 'beanconqueror-preparation-xbloom' &&
          icon.path === 'beanconqueror-preparation-xbloom.svg',
      ),
    ).toBeTrue();
  });
});
