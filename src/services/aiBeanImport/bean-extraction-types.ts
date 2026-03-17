import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';
import { IBeanInformation } from '../../interfaces/bean/iBeanInformation';

/**
 * Result of extracting top-level bean fields.
 */
export interface TopLevelFieldsResult {
  name: string;
  roaster: string;
  weight: number;
  bean_roasting_type?: BEAN_ROASTING_TYPE_ENUM;
  aromatics?: string;
  decaffeinated?: boolean;
  cupping_points?: number;
  roastingDate?: string;
}

/**
 * Result of extracting origin-related fields.
 */
export interface OriginFieldsResult {
  beanMix: BEAN_MIX_ENUM;
  bean_information: IBeanInformation[];
}
