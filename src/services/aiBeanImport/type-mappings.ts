import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';

/**
 * Maps LLM-returned string values to BEAN_MIX_ENUM-compatible values.
 * Handles both uppercase LLM output and direct enum values.
 *
 * IMPORTANT: Returns enum KEY strings (e.g., 'BLEND') rather than enum
 * values (e.g., 'Blend') because the app convention uses key strings at
 * runtime. Both the Bean constructor and the UI ion-select options use
 * enum key strings as values.
 *
 * @param value - The string value from LLM (e.g., 'SINGLE_ORIGIN', 'BLEND')
 * @returns The corresponding enum key string cast as BEAN_MIX_ENUM
 */
export function mapToBeanMix(value: string | null | undefined): BEAN_MIX_ENUM {
  if (!value) {
    return 'UNKNOWN' as BEAN_MIX_ENUM;
  }

  const normalized = value.toUpperCase().replace(/[\s_-]+/g, '_');

  switch (normalized) {
    case 'SINGLE_ORIGIN':
      return 'SINGLE_ORIGIN' as BEAN_MIX_ENUM;
    case 'BLEND':
      return 'BLEND' as BEAN_MIX_ENUM;
    case 'UNKNOWN':
    default:
      return 'UNKNOWN' as BEAN_MIX_ENUM;
  }
}

/**
 * Maps LLM-returned string values to BEAN_ROASTING_TYPE_ENUM-compatible values.
 * Handles both uppercase LLM output and direct enum values.
 *
 * IMPORTANT: Returns enum KEY strings (e.g., 'FILTER') rather than enum
 * values (e.g., 'Filter') because the app convention uses key strings at
 * runtime. Both the Bean constructor and the UI ion-select options use
 * enum key strings as values.
 *
 * @param value - The string value from LLM (e.g., 'FILTER', 'ESPRESSO')
 * @returns The corresponding enum key string cast as BEAN_ROASTING_TYPE_ENUM
 */
export function mapToRoastingType(
  value: string | null | undefined,
): BEAN_ROASTING_TYPE_ENUM {
  if (!value) {
    return 'UNKNOWN' as BEAN_ROASTING_TYPE_ENUM;
  }

  const normalized = value.toUpperCase();

  switch (normalized) {
    case 'FILTER':
      return 'FILTER' as BEAN_ROASTING_TYPE_ENUM;
    case 'ESPRESSO':
      return 'ESPRESSO' as BEAN_ROASTING_TYPE_ENUM;
    case 'OMNI':
      return 'OMNI' as BEAN_ROASTING_TYPE_ENUM;
    default:
      return 'UNKNOWN' as BEAN_ROASTING_TYPE_ENUM;
  }
}
