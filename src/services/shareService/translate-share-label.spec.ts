import { TranslateService } from '@ngx-translate/core';

import { translateShareLabel } from './translate-share-label';

describe('translateShareLabel', () => {
  it('uses English when a locale contains an empty label', () => {
    const translate = {
      instant: () => '',
    } as unknown as TranslateService;

    expect(translateShareLabel(translate, 'BEAN_DATA_COUNTRY')).toBe('Country');
  });

  it('prefers the active language when its label is present', () => {
    const translate = {
      instant: () => 'País',
    } as unknown as TranslateService;

    expect(translateShareLabel(translate, 'BEAN_DATA_COUNTRY')).toBe('País');
  });

  it('uses English when a locale does not contain the label', () => {
    const translate = {
      instant: (key: string) => key,
    } as unknown as TranslateService;

    expect(translateShareLabel(translate, 'BEAN_DATA_COUNTRY')).toBe('Country');
  });
});
