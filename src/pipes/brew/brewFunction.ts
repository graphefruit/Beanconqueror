/** Core */
import { Pipe, PipeTransform } from '@angular/core';
import { Brew } from '../../classes/brew/brew';
import { BREW_FUNCTION_PIPE_ENUM } from '../../enums/brews/brewFunctionPipe';

@Pipe({ name: 'brewFunctionPipe' })
export class BrewFunction implements PipeTransform {
  public transform(
    value: Brew,
    arg: BREW_FUNCTION_PIPE_ENUM | Array<BREW_FUNCTION_PIPE_ENUM | any>
  ): any {
    try {
      let action;
      if (typeof arg !== 'object') {
        action = arg;
      } else {
        action = arg[0];
      }
      switch (action) {
        case BREW_FUNCTION_PIPE_ENUM.GET_EXTRACTION_YIELD:
          return value.getExtractionYield();
        case BREW_FUNCTION_PIPE_ENUM.GET_BREW_RATIO:
          return value.getBrewRatio();
        case BREW_FUNCTION_PIPE_ENUM.FORMATTED_TOTAL_COFFEE_TEMPERATURE_TIME:
          return value.getFormattedTotalCoffeeTemperatureTime();
        case BREW_FUNCTION_PIPE_ENUM.FORMATTED_TOTAL_COFFEE_BLOOMING_TIME:
          return value.getFormattedTotalCoffeeBloomingTime();
        case BREW_FUNCTION_PIPE_ENUM.FORMATTED_TOTAL_COFFEE_FIRST_DRIP_TIME:
          return value.getFormattedTotalCoffeeFirstDripTime();
        case BREW_FUNCTION_PIPE_ENUM.GET_CALCULATED_BEAN_AGE:
          return value.getCalculatedBeanAge();
        case BREW_FUNCTION_PIPE_ENUM.IS_ARCHIVED:
          return value.isArchived();
        case BREW_FUNCTION_PIPE_ENUM.GET_GRAMS_PER_LITER:
          return value.getGramsPerLiter();
        case BREW_FUNCTION_PIPE_ENUM.FORMATTED_TOTAL_MILL_TIME:
          return value.getFormattedTotalMillTimerTime();
        case BREW_FUNCTION_PIPE_ENUM.FORMATTED_BREW_TIME:
          return value.getFormattedBrewTime();
        case BREW_FUNCTION_PIPE_ENUM.FORMATTED_COFFEE_BREW_TIME:
          return value.getFormattedCoffeeBrewTime();
        case BREW_FUNCTION_PIPE_ENUM.FORMATTED_TOTAL_COFFEE_BREW_TIME:
          return value.getFormattedTotalCoffeeBrewTime();
        case BREW_FUNCTION_PIPE_ENUM.GET_PREPARATION_TOOL_NAME:
          return value.getPreparationToolName(arg[1]);
        case BREW_FUNCTION_PIPE_ENUM.GET_BEAN_NAME:
          return value.getBean().name;
        case BREW_FUNCTION_PIPE_ENUM.GET_MILL_NAME:
          return value.getMill().name;
        case BREW_FUNCTION_PIPE_ENUM.GET_PREPARATION_NAME:
          return value.getPreparation().name;
        case BREW_FUNCTION_PIPE_ENUM.GET_WATER_NAME:
          return value.getWater().name;
        case BREW_FUNCTION_PIPE_ENUM.HAS_CUSTOM_FLAVORS:
          return value.hasCustomFlavors();
        case BREW_FUNCTION_PIPE_ENUM.HAS_PREDEFINED_FLAVORS:
          return value.hasPredefinedFlavors();
      }
    } catch (ex) {}
  }
}
