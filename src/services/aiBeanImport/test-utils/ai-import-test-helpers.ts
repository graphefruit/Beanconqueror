import { Bean } from '../../../classes/bean/bean';
import { IBeanInformation } from '../../../interfaces/bean/iBeanInformation';
import { IBeanParameter } from '../../../interfaces/parameter/iBeanParameter';
import { MergedExamples } from '../ai-import-examples.service';
import { Block, TextDetectionResult } from '../ocr-metadata.service';

/**
 * Create a mock Block with specified bounding box.
 * @param text Block text content
 * @param left Left coordinate
 * @param top Top coordinate
 * @param right Right coordinate
 * @param bottom Bottom coordinate
 * @param recognizedLanguage Optional language code (default: 'en')
 */
export function createBlock(
  text: string,
  left: number,
  top: number,
  right: number,
  bottom: number,
  recognizedLanguage: string = 'en',
): Block {
  return {
    text,
    boundingBox: { left, top, right, bottom },
    recognizedLanguage,
    lines: [],
  };
}

/**
 * Create a mock TextDetectionResult from text and blocks.
 */
export function createTextDetectionResult(
  text: string,
  blocks: Block[],
): TextDetectionResult {
  return { text, blocks };
}

/**
 * Create mock MergedExamples with default English values.
 * Override specific keys as needed.
 */
export function createMockExamples(
  overrides: Partial<MergedExamples> = {},
): MergedExamples {
  return {
    ORIGINS: 'Colombia, Ethiopia, Kenya, Brazil, Guatemala',
    PROCESSING_METHODS: 'Washed, Natural, Honey, Anaerobic',
    VARIETIES: 'Bourbon, Gesha, SL-28, Typica, Caturra',
    ROASTING_TYPE_FILTER_KEYWORDS: 'Filter, Pour Over',
    ROASTING_TYPE_ESPRESSO_KEYWORDS: 'Espresso',
    ROASTING_TYPE_OMNI_KEYWORDS: 'Omni',
    DECAF_KEYWORDS: 'Decaf, Decaffeinated',
    BLEND_KEYWORDS: 'Blend, House Blend',
    SINGLE_ORIGIN_KEYWORDS: 'Single Origin',
    PRODUCER_KEYWORDS: 'Producer, Farmer, Cooperative',
    ROASTDATE_KEYWORDS: 'Roast date, Roasted on, Freshly roasted',
    ROASTER_KEYWORDS: 'Roastery, Coffee Roasters, Kaffeerösterei',
    ...overrides,
  };
}

/**
 * Create a mock Bean with default values.
 * Override specific properties as needed.
 */
export function createMockBean(overrides: Partial<Bean> = {}): Bean {
  const bean = new Bean();
  Object.assign(bean, overrides);
  return bean;
}

/**
 * Create a mock IBeanInformation with empty/default values.
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
 * Create mock IBeanParameter with all fields enabled.
 * Override specific fields as needed.
 */
export function createMockBeanParams(
  overrides: Partial<IBeanParameter> = {},
): IBeanParameter {
  return {
    bean_information: true,
    roaster: true,
    bean_roasting_type: true,
    aromatics: true,
    decaffeinated: true,
    cupping_points: true,
    roastingDate: true,
    region: true,
    variety: true,
    processing: true,
    elevation: true,
    farm: true,
    farmer: true,
    ...overrides,
  } as IBeanParameter;
}

/**
 * Create a mock settings object with bean parameters.
 */
export function createMockSettings(params: Partial<IBeanParameter> = {}) {
  return {
    bean_manage_parameters: createMockBeanParams(params),
  };
}
