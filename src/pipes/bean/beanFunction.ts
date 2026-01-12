import { Pipe, PipeTransform } from '@angular/core';

import { BEAN_FUNCTION_PIPE_ENUM } from '../../enums/beans/beanFunctionPipe';
import { Bean } from '../../classes/bean/bean';
import { BREW_FUNCTION_PIPE_ENUM } from '../../enums/brews/brewFunctionPipe';

@Pipe({ name: 'beanFunctionPipe' })
export class BeanFunction implements PipeTransform {
  public transform(
    value: Bean,
    arg: BEAN_FUNCTION_PIPE_ENUM | Array<BEAN_FUNCTION_PIPE_ENUM | any>,
  ): any {
    try {
      let action;
      if (typeof arg !== 'object') {
        action = arg;
      } else {
        action = arg[0];
      }
      switch (action) {
        case BEAN_FUNCTION_PIPE_ENUM.IS_FROZEN:
          return value.isFrozen();
        case BEAN_FUNCTION_PIPE_ENUM.IS_SCANNED_BEAN:
          return value.isScannedBean();
        case BEAN_FUNCTION_PIPE_ENUM.HAS_PHOTOS:
          return value.hasPhotos();
        case BEAN_FUNCTION_PIPE_ENUM.HAS_FROZEN_INFORMATION:
          return value.hasFrozenInformation();
        case BEAN_FUNCTION_PIPE_ENUM.BEAN_AGE_IN_DAYS:
          return value.beanAgeInDays();
        case BEAN_FUNCTION_PIPE_ENUM.HAS_CUSTOM_FLAVORS:
          return value.hasCustomFlavors();
        case BEAN_FUNCTION_PIPE_ENUM.HAS_PREDEFINED_FLAVORS:
          return value.hasPredefinedFlavors();
        case BEAN_FUNCTION_PIPE_ENUM.IS_SELF_ROASTED:
          return value.isSelfRoasted();
        case BEAN_FUNCTION_PIPE_ENUM.SHOW_COST_PER_KG:
          if (
            value.weight &&
            value.weight > 0 &&
            value.weight !== 1000 &&
            value.cost &&
            value.cost > 0
          ) {
            return true;
          }
          return false;
        case BEAN_FUNCTION_PIPE_ENUM.IS_UNFROZEN:
          return value.isUnfrozen();
      }
    } catch (ex) {}
  }
}
