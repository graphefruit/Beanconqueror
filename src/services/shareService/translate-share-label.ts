import { TranslateService } from '@ngx-translate/core';

const ENGLISH_SHARE_LABELS: Record<string, string> = {
  BEAN_DATA_NAME: 'Name',
  BEAN_DATA_ROASTER: 'Roaster',
  BEAN_DATA_COUNTRY: 'Country',
  BEAN_DATA_REGION: 'Region',
  BEAN_DATA_VARIETY: 'Variety',
  BEAN_DATA_PROCESSING: 'Processing',
  BREW_DATA_PREPARATION_METHOD: 'Preparation method',
  BREW_DATA_MILL: 'Grinder',
  BREW_DATA_GRIND_SIZE: 'Grind Setting',
  BREW_DATA_GRIND_WEIGHT: 'Ground Coffee (gr)',
  BREW_DATA_BREW_QUANTITY: 'Amount of water',
  BREW_DATA_BREW_BEVERAGE_QUANTITY: 'Beverage quantity',
  BREW_DATA_BREW_TEMPERATURE: 'Brew Temperature',
  BREW_DATA_TIME: 'Time',
  BREW_DATA_RATING: 'Rating',
  BREW_DATA_NOTES: 'Notes',
};

/** Empty translations in older locale files need the app's English fallback. */
export function translateShareLabel(
  translate: TranslateService,
  key: string,
): string {
  const value: unknown = translate.instant(key);
  if (typeof value === 'string' && value.trim() && value !== key) {
    return value;
  }
  return ENGLISH_SHARE_LABELS[key] ?? key;
}
