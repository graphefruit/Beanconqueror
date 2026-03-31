import { Bean } from '../classes/bean/bean';
import { IBeanInformation } from '../interfaces/bean/iBeanInformation';
import { IBeanParameter } from '../interfaces/parameter/iBeanParameter';

/**
 * Create a Bean with default values.
 * Override specific properties as needed.
 */
export function createBean(overrides: Partial<Bean> = {}): Bean {
  const bean = new Bean();
  Object.assign(bean, overrides);
  return bean;
}

/**
 * Create an IBeanInformation with empty/default values.
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
 * Create IBeanParameter with all fields enabled.
 * Override specific fields as needed.
 */
export function createBeanParams(
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
 * Create a settings object with bean parameters.
 */
export function createSettings(params: Partial<IBeanParameter> = {}) {
  return {
    bean_manage_parameters: createBeanParams(params),
  };
}
