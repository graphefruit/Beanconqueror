import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';

/**
 * Maps LLM-returned string values to BEAN_MIX_ENUM-compatible values.
 * Handles both uppercase LLM output and direct enum values.
 *
 * Returns proper enum values (e.g., BEAN_MIX_ENUM.BLEND).
 *
 * @param value - The string value from LLM (e.g., 'SINGLE_ORIGIN', 'BLEND')
 * @returns The corresponding enum key string cast as BEAN_MIX_ENUM
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
 * Maps LLM-returned string values to BEAN_ROASTING_TYPE_ENUM-compatible values.
 * Handles both uppercase LLM output and direct enum values.
 *
 * Returns proper enum values (e.g., BEAN_ROASTING_TYPE_ENUM.FILTER).
 *
 * @param value - The string value from LLM (e.g., 'FILTER', 'ESPRESSO')
 * @returns The corresponding enum key string cast as BEAN_ROASTING_TYPE_ENUM
 */
/**
 * Convert a BEAN_MIX_ENUM value to its key string for UI compatibility.
 * The UI constructs translation keys like "BEAN_MIX_" + beanMix,
 * so it needs key strings ('BLEND') not enum values ('Blend').
 */
export function beanMixToKeyString(value: BEAN_MIX_ENUM): BEAN_MIX_ENUM {
  for (const [key, val] of Object.entries(BEAN_MIX_ENUM)) {
    if (val === value) {
      return key as BEAN_MIX_ENUM;
    }
  }
  return 'UNKNOWN' as BEAN_MIX_ENUM;
}

/**
 * Convert a BEAN_ROASTING_TYPE_ENUM value to its key string for UI compatibility.
 * The UI constructs translation keys like "BEAN_ROASTING_TYPE_" + bean_roasting_type,
 * so it needs key strings ('FILTER') not enum values ('Filter').
 */
export function roastingTypeToKeyString(
  value: BEAN_ROASTING_TYPE_ENUM,
): BEAN_ROASTING_TYPE_ENUM {
  for (const [key, val] of Object.entries(BEAN_ROASTING_TYPE_ENUM)) {
    if (val === value) {
      return key as BEAN_ROASTING_TYPE_ENUM;
    }
  }
  return 'UNKNOWN' as BEAN_ROASTING_TYPE_ENUM;
}

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
