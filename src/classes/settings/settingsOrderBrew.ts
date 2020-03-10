/** Interfacdes */

import {IBrewOrder} from '../../interfaces/settings/iBrewOrder';

export class BrewOrder implements IBrewOrder {
  public brew_time: number;
  public brew_temperature_time: number;
  public grind_size: number;
  public grind_weight: number;
  public mill: number;
  public mill_speed: number;
  public mill_timer: number;
  public pressure_profile: number;
  public method_of_preparation: number;
  public brew_quantity: number;
  public bean_type: number;
  public brew_temperature: number;
  public note: number;
  public attachments: number;
  public rating: number;
  public coffee_type: number;
  public coffee_concentration: number;
  public coffee_first_drip_time: number;
  public coffee_blooming_time: number;
  public set_last_coffee_brew: number;
  public set_custom_brew_time: number;

  constructor() {
    this.grind_size = 1;
    this.grind_weight = 2;
    this.brew_temperature = 3;
    this.method_of_preparation = 4;
    this.bean_type = 5;
    this.mill = 6;
    this.mill_speed = 7;
    this.mill_timer = 8;
    this.pressure_profile = 9;
    this.brew_temperature_time = 10;
    this.brew_time = 11;
    this.coffee_blooming_time = 12;
    this.coffee_first_drip_time = 13;
    this.brew_quantity = 14;
    this.coffee_type = 15;
    this.coffee_concentration = 16;
    this.rating = 17;
    this.note = 18;
    this.set_custom_brew_time = 19;
    this.attachments = 20;
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
      default:
        return _key;
    }
  }
}
