import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';

/**
 * Maps LLM-returned string values to BEAN_MIX_ENUM values.
 * Handles both uppercase LLM output and direct enum values.
 *
 * @param value - The string value from LLM (e.g., 'SINGLE_ORIGIN', 'BLEND')
 * @returns The corresponding BEAN_MIX_ENUM value
 */
export function mapToBeanMix(value: string | null | undefined): BEAN_MIX_ENUM {
  if (!value) {
    return BEAN_MIX_ENUM.UNKNOWN;
  }

  const normalized = value.toUpperCase().replace(/[\s_-]+/g, '_');

  switch (normalized) {
    case 'SINGLE_ORIGIN':
      return BEAN_MIX_ENUM.SINGLE_ORIGIN;
    case 'BLEND':
      return BEAN_MIX_ENUM.BLEND;
    case 'UNKNOWN':
    default:
      return BEAN_MIX_ENUM.UNKNOWN;
  }
}

/**
 * Maps LLM-returned string values to BEAN_ROASTING_TYPE_ENUM values.
 * Handles both uppercase LLM output and direct enum values.
 *
 * @param value - The string value from LLM (e.g., 'FILTER', 'ESPRESSO')
 * @returns The corresponding BEAN_ROASTING_TYPE_ENUM value
 */
export function mapToRoastingType(
  value: string | null | undefined,
): BEAN_ROASTING_TYPE_ENUM {
  if (!value) {
    return BEAN_ROASTING_TYPE_ENUM.UNKNOWN;
  }

  const normalized = value.toUpperCase();

  switch (normalized) {
    case 'FILTER':
      return BEAN_ROASTING_TYPE_ENUM.FILTER;
    case 'ESPRESSO':
      return BEAN_ROASTING_TYPE_ENUM.ESPRESSO;
    case 'OMNI':
      return BEAN_ROASTING_TYPE_ENUM.OMNI;
    default:
      return BEAN_ROASTING_TYPE_ENUM.UNKNOWN;
  }
}
