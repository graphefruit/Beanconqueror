/** Interfacdes */

import {IOrderBrewParameter} from '../../interfaces/parameter/iOrderBrewParameter';

export class OrderBrewParameter implements IOrderBrewParameter {

  public before: {
    grind_size: number;
    grind_weight: number;
    brew_temperature: number;
    method_of_preparation: number;
    bean_type: number;
    mill: number;
    mill_speed: number;
    mill_timer: number;
    pressure_profile: number;
    method_of_preparation_tool: number;
  };

  public while: {
    brew_temperature_time: number;
    brew_time: number;
    coffee_blooming_time: number;
    coffee_first_drip_time: number;

  };

  public after: {
    brew_quantity: number;
    coffee_type: number;
    coffee_concentration: number;
    rating: number;
    note: number;
    set_custom_brew_time: number;
    attachments: number;
    tds:number;
    brew_beverage_quantity: number;
  };



  constructor() {
    this.before = {
      grind_size: 1,
      grind_weight: 2,
      brew_temperature: 3,
      method_of_preparation: 4,
      bean_type: 5,
      mill: 6,
      mill_speed: 7,
      mill_timer: 8,
      pressure_profile: 9,
      method_of_preparation_tool: 10,
    };

    this.while = {
      brew_temperature_time: 1,
      brew_time: 2,
      coffee_blooming_time: 3,
      coffee_first_drip_time: 4,
    };

    this.after = {
      brew_quantity: 1,
      coffee_type: 2,
      coffee_concentration: 3,
      rating: 4,
      note: 5,
      set_custom_brew_time: 6,
      attachments: 7,
      brew_beverage_quantity: 8,
      tds:9,
    };
  }

  /**
   * Get the translation label for the specific enum key
   * @param _key Specific enum key
   * @return The translation label
   */
  public getLabel(_key: string): string {
    switch (_key) {
      case 'brew_temperature_time':
        return 'BREW_DATA_TEMPERATURE_TIME';
      case 'brew_time':
        return 'BREW_DATA_TIME';
      case 'grind_size':
        return 'BREW_DATA_GRIND_SIZE';
      case 'grind_weight':
        return 'BREW_DATA_GRIND_WEIGHT';
      case 'note':
        return 'BREW_DATA_NOTES';
      case 'method_of_preparation':
        return 'BREW_DATA_PREPARATION_METHOD';
      case 'method_of_preparation_tool':
        return 'BREW_DATA_PREPARATION_METHOD_TOOL';
      case 'mill':
        return 'BREW_DATA_MILL';
      case 'mill_speed':
        return 'BREW_DATA_MILL_SPEED';
      case 'mill_timer':
        return 'BREW_DATA_MILL_TIMER';
      case 'brew_quantity':
        return 'BREW_DATA_BREW_QUANTITY';
      case 'bean_type':
        return 'BREW_DATA_BEAN_TYPE';
      case 'brew_temperature':
        return 'BREW_DATA_BREW_TEMPERATURE';
      case 'pressure_profile':
        return 'BREW_DATA_PRESSURE_PROFILE';
      case 'coffee_type':
        return 'BREW_DATA_COFFEE_TYPE';
      case 'coffee_concentration':
        return 'BREW_DATA_COFFEE_CONCENTRATION';
      case 'coffee_first_drip_time':
        return 'BREW_DATA_COFFEE_FIRST_DRIP_TIME';
      case 'coffee_blooming_time':
        return 'BREW_DATA_COFFEE_BLOOMING_TIME';
      case 'attachments':
        return 'BREW_DATA_ATTACHMENTS';
      case 'rating':
        return 'BREW_DATA_RATING';
      case 'set_custom_brew_time':
        return 'BREW_DATA_CUSTOM_BREW_TIME';
      case 'tds':
        return 'BREW_DATA_TDS';
      case 'brew_beverage_quantity':
        return 'BREW_DATA_BREW_BEVERAGE_QUANTITY';
      default:
        return _key;
    }
  }
}
