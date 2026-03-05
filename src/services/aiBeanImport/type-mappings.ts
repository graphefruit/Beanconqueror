import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';


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


