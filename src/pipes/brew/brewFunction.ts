/** Core */
import { Pipe, PipeTransform } from '@angular/core';
import { Brew } from '../../classes/brew/brew';
import { BREW_FUNCTION_PIPE_ENUM } from '../../enums/brews/brewFunctionPipe';

@Pipe({ name: 'brewFunctionPipe' })
export class BrewFunction implements PipeTransform {
  public transform(value: Brew, arg: BREW_FUNCTION_PIPE_ENUM): any {
    try {
      switch (arg) {
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
      }
    } catch (ex) {}
  }
}
