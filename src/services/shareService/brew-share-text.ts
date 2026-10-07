import { Bean } from '../../classes/bean/bean';
import { Brew } from '../../classes/brew/brew';
import { Mill } from '../../classes/mill/mill';
import { ShareBrewTextFields } from '../../classes/parameter/shareBrewTextFields';
import { Preparation } from '../../classes/preparation/preparation';
import { BREW_QUANTITY_TYPES_ENUM } from '../../enums/brews/brewQuantityTypes';

/** Format a brew for chat apps without translating user-entered bean data. */
export function formatBrewShareText(
  brew: Brew,
  bean: Bean,
  preparation: Preparation,
  mill: Mill,
  fields: ShareBrewTextFields,
  translate: (key: string) => string,
  language: string,
): string {
  const beanLines: string[] = [];
  const brewLines: string[] = [];
  const formatNumber = new Intl.NumberFormat(
    (language || 'en').replace('_', '-'),
    {
      maximumFractionDigits: 2,
    },
  );
  const add = (
    lines: string[],
    enabled: boolean,
    label: string,
    value: string | number,
  ) => {
    if (
      enabled &&
      value !== undefined &&
      value !== null &&
      String(value).trim()
    ) {
      lines.push(`${translate(label)}: ${value}`);
    }
  };
  const numberWithUnit = (value: number, unit: string): string =>
    value > 0 ? `${formatNumber.format(value)} ${unit}` : '';

  add(beanLines, fields.bean_name, 'BEAN_DATA_NAME', bean?.name);
  add(beanLines, fields.bean_roaster, 'BEAN_DATA_ROASTER', bean?.roaster);

  const originFields = [
    {
      enabled: fields.bean_country,
      key: 'BEAN_DATA_COUNTRY',
      field: 'country',
    },
    { enabled: fields.bean_region, key: 'BEAN_DATA_REGION', field: 'region' },
    {
      enabled: fields.bean_variety,
      key: 'BEAN_DATA_VARIETY',
      field: 'variety',
    },
    {
      enabled: fields.bean_processing,
      key: 'BEAN_DATA_PROCESSING',
      field: 'processing',
    },
  ] as const;
  const origins = bean?.bean_information ?? [];
  const originGroups = origins
    .map((origin) =>
      originFields
        .filter(({ enabled, field }) => enabled && origin?.[field]?.trim())
        .map(({ key, field }) => `${translate(key)}: ${origin[field]}`),
    )
    .filter((details) => details.length);
  originGroups.forEach((details, index) => {
    details.forEach((detail) => {
      beanLines.push(
        `${originGroups.length > 1 ? `${index + 1}. ` : ''}${detail}`,
      );
    });
  });

  add(
    brewLines,
    fields.method_of_preparation,
    'BREW_DATA_PREPARATION_METHOD',
    preparation?.name,
  );
  add(brewLines, fields.mill, 'BREW_DATA_MILL', mill?.name);
  add(brewLines, fields.grind_size, 'BREW_DATA_GRIND_SIZE', brew.grind_size);
  add(
    brewLines,
    fields.grind_weight,
    'BREW_DATA_GRIND_WEIGHT',
    numberWithUnit(brew.grind_weight, 'g'),
  );
  add(
    brewLines,
    fields.brew_quantity,
    'BREW_DATA_BREW_QUANTITY',
    numberWithUnit(
      brew.brew_quantity,
      BREW_QUANTITY_TYPES_ENUM[brew.brew_quantity_type],
    ),
  );
  add(
    brewLines,
    fields.brew_beverage_quantity,
    'BREW_DATA_BREW_BEVERAGE_QUANTITY',
    numberWithUnit(
      brew.brew_beverage_quantity,
      BREW_QUANTITY_TYPES_ENUM[brew.brew_beverage_quantity_type],
    ),
  );
  add(
    brewLines,
    fields.brew_temperature,
    'BREW_DATA_BREW_TEMPERATURE',
    numberWithUnit(brew.brew_temperature, '°C'),
  );
  add(
    brewLines,
    fields.brew_time,
    'BREW_DATA_TIME',
    brew.brew_time > 0 ? brew.getFormattedTotalCoffeeBrewTime() : '',
  );
  add(
    brewLines,
    fields.tds,
    'TDS',
    brew.tds > 0 ? `${formatNumber.format(brew.tds)} %` : '',
  );
  const extractionYield =
    fields.extraction_yield && brew.tds > 0 && brew.grind_weight > 0
      ? Number(brew.getExtractionYield())
      : 0;
  add(
    brewLines,
    fields.extraction_yield,
    'EY',
    extractionYield > 0 ? `${formatNumber.format(extractionYield)} %` : '',
  );
  add(
    brewLines,
    fields.rating,
    'BREW_DATA_RATING',
    brew.rating > 0 ? formatNumber.format(brew.rating) : '',
  );
  add(brewLines, fields.note, 'BREW_DATA_NOTES', brew.note);

  const separator =
    beanLines.length && brewLines.length ? ['- - - - - - -'] : [];
  return [...beanLines, ...separator, ...brewLines].join('\n');
}
