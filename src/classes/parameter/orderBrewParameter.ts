import { IOrderBrewParameter } from '../../interfaces/parameter/iOrderBrewParameter';

export class OrderBrewParameter implements IOrderBrewParameter {
  public before: {
    bean_type: number;
    bean_weight_in: number;
    grind_weight: number;
    mill: number;
    grind_size: number;
    mill_timer: number;
    mill_speed: number;
    method_of_preparation: number;
    method_of_preparation_tool: number;
    brew_temperature: number;
    water: number;
    vessel: number;
    pressure_profile: number;
  };

  public while: {
    brew_temperature_time: number;
    brew_time: number;
    coffee_blooming_time: number;
    coffee_first_drip_time: number;
  };

  public after: {
    coffee_type: number;
    coffee_concentration: number;
    brew_quantity: number;
    brew_beverage_quantity: number;
    tds: number;
    rating: number;
    note: number;
    set_custom_brew_time: number;
    attachments: number;
  };

  constructor() {
    this.before = {
      bean_type: 1,
      bean_weight_in: 2,
      grind_weight: 3,
      mill: 4,
      grind_size: 5,
      mill_timer: 6,
      mill_speed: 7,
      method_of_preparation: 8,
      method_of_preparation_tool: 9,
      brew_temperature: 10,
      water: 11,
      vessel: 12,
      pressure_profile: 13,
    };

    this.while = {
      brew_temperature_time: 1,
      brew_time: 2,
      coffee_blooming_time: 3,
      coffee_first_drip_time: 4,
    };

    this.after = {
      coffee_type: 1,
      coffee_concentration: 2,
      brew_quantity: 3,
      brew_beverage_quantity: 4,
      tds: 5,
      rating: 6,
      note: 7,
      set_custom_brew_time: 8,
      attachments: 9,
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
      case 'water':
        return 'BREW_DATA_WATER';
      case 'bean_weight_in':
        return 'BREW_DATA_BEAN_WEIGHT_IN';
      case 'vessel':
        return 'BREW_DATA_VESSEL';
      default:
        return _key;
    }
  }
}
