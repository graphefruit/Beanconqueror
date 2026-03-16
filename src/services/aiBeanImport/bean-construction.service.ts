import type { Bean } from '../../classes/bean/bean';
import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';
import { IBeanInformation } from '../../interfaces/bean/iBeanInformation';
import {
  OriginFieldsResult,
  TopLevelFieldsResult,
} from './bean-extraction-types';
import { beanMixToKeyString, roastingTypeToKeyString } from './type-mappings';

/**
 * Create an empty IBeanInformation object with all fields initialized.
 */
export function createEmptyBeanInformation(): IBeanInformation {
  return {
    country: '',
    region: '',
    farm: '',
    farmer: '',
    elevation: '',
    harvest_time: '',
    variety: '',
    processing: '',
    certification: '',
    purchasing_price: 0,
    fob_price: 0,
  } as IBeanInformation;
}

/**
 * Create an empty Bean-compatible object with all default values.
 *
 * Uses a plain object because importing the Bean class at runtime
 * pulls in its full dependency tree (Angular services, Config, etc.)
 * which causes "Bean is not a constructor" in Karma tests.
 */
export function createDefaultBean(): Bean {
  return {
    name: '',
    buyDate: '',
    roastingDate: '',
    note: '',
    roaster: '',
    config: { uuid: '', unix_timestamp: 0, attachments: [] },
    roast: 'UNKNOWN',
    roast_range: 0,
    roast_custom: '',
    beanMix: 'SINGLE_ORIGIN',
    aromatics: '',
    weight: 0,
    finished: false,
    cost: 0,
    attachments: [],
    decaffeinated: false,
    cupping_points: '',
    bean_roasting_type: 'UNKNOWN',
    bean_information: [],
    url: '',
    ean_article_number: '',
    bean_roast_information: {},
    rating: 0,
    qr_code: '',
    internal_share_code: '',
    favourite: false,
    shared: false,
    cupping: {
      body: 0,
      brightness: 0,
      clean_cup: 0,
      complexity: 0,
      cuppers_correction: 0,
      dry_fragrance: 0,
      finish: 0,
      flavor: 0,
      sweetness: 0,
      uniformity: 0,
      wet_aroma: 0,
      notes: '',
    },
    cupped_flavor: { predefined_flavors: {}, custom_flavors: [] },
    frozenDate: '',
    unfrozenDate: '',
    frozenId: '',
    frozenGroupId: '',
    frozenStorageType: 'UNKNOWN',
    frozenNote: '',
    bestDate: '',
    openDate: '',
    co2e_kg: 0,
  } as unknown as Bean;
}

/**
 * Construct a Bean object from extracted field data.
 * Applies cross-field validation and ensures data consistency.
 */
export function constructBeanFromExtractedData(
  topLevelFields: TopLevelFieldsResult,
  originFields: OriginFieldsResult,
): Bean {
  const bean = createDefaultBean();

  // Assign top-level fields
  bean.name = topLevelFields.name;
  bean.roaster = topLevelFields.roaster;
  bean.weight = topLevelFields.weight;

  if (topLevelFields.bean_roasting_type != null) {
    bean.bean_roasting_type = topLevelFields.bean_roasting_type;
  }
  if (topLevelFields.aromatics != null) {
    bean.aromatics = topLevelFields.aromatics;
  }
  if (topLevelFields.decaffeinated != null) {
    bean.decaffeinated = topLevelFields.decaffeinated;
  }
  if (topLevelFields.cupping_points != null) {
    bean.cupping_points = String(topLevelFields.cupping_points);
  }
  if (topLevelFields.roastingDate != null) {
    bean.roastingDate = topLevelFields.roastingDate;
  }

  // Assign origin fields
  bean.beanMix = originFields.beanMix;
  bean.bean_information = originFields.bean_information;

  // Ensure at least one bean_information entry
  if (bean.bean_information.length === 0) {
    bean.bean_information = [createEmptyBeanInformation()];
  }

  // Final validation
  const validated = validateBean(bean);

  // Convert enum values to key strings for UI compatibility.
  // The UI constructs translation keys like "BEAN_MIX_" + beanMix,
  // so it needs key strings ('BLEND') not enum values ('Blend').
  validated.beanMix = beanMixToKeyString(validated.beanMix);
  if (validated.bean_roasting_type) {
    validated.bean_roasting_type = roastingTypeToKeyString(
      validated.bean_roasting_type,
    );
  }

  return validated;
}

/**
 * Cross-field validation and cleanup.
 */
export function validateBean(bean: Bean): Bean {
  // If country detected but beanMix is null/unknown, set to SINGLE_ORIGIN
  if (
    bean.bean_information.length === 1 &&
    (!bean.beanMix || bean.beanMix === BEAN_MIX_ENUM.UNKNOWN)
  ) {
    bean.beanMix = BEAN_MIX_ENUM.SINGLE_ORIGIN;
  }

  // If multiple countries, ensure BLEND
  if (
    bean.bean_information.length > 1 &&
    bean.beanMix !== BEAN_MIX_ENUM.BLEND
  ) {
    bean.beanMix = BEAN_MIX_ENUM.BLEND;
  }

  // Ensure at least one bean_information entry exists if any origin data
  if (bean.bean_information.length === 0) {
    bean.bean_information = [createEmptyBeanInformation()];
  }

  return bean;
}
