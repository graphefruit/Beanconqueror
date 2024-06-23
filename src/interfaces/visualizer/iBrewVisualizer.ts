/**
 * Created by lars on 10/18/2017.
 */
import { BREW_QUANTITY_TYPES_ENUM } from '../../enums/brews/brewQuantityTypes';
import { BrewFlow } from '../../classes/brew/brewFlow';
import { IConfig } from '../objectConfig/iObjectConfig';

export interface IBrewVisualizer {
  // Properties
  /**
   * Inherits the grind size set on your hand/electric grinder
   */
  grind_size: string;
  /**
   * Inherits the actualy grinded size when starting a new brew
   */
  grind_weight: number;

  /**
   * Inherits the used mill speed (rounds per minute), default: 0
   */
  mill_speed: number;
  /**
   * Inherits the used timer settings (), default: 0
   */
  mill_timer: number;
  /**
   * Inherits the actual used pressure profile (name and number)
   */
  pressure_profile: string;

  /**
   * Inherits the brew temperature for a brew
   */
  brew_temperature: number;
  /**
   * Inherits the temperature surfing time for the coffee-
   */
  brew_temperature_time: number;

  brew_temperature_time_milliseconds: number;
  /**
   * Inherits the brewing time for the coffee, shot-time, infusion-time etc.
   */
  brew_time: number;

  brew_time_milliseconds: number;
  /**
   * Inherits the output (user specific in g or ml)
   */
  brew_quantity: number;

  /**
   * Inherits the type of the brew quantity
   */
  brew_quantity_type: BREW_QUANTITY_TYPES_ENUM;
  /**
   * Inherits the notes the user doing during or after the shot
   */
  note: string;
  /**
   * Taste rating
   */
  rating: number;

  /**
   * Inherits the brewn type of coffee: Espresso, Ristretto, Long Black, Americano, Pour Over
   */
  coffee_type: string;

  /**
   * Inherits the extraction concentration
   */
  coffee_concentration: string;

  /**
   * Inherits the first drip in seconds
   */
  coffee_first_drip_time: number;

  coffee_first_drip_time_milliseconds: number;

  /**
   * Inherits the blooming / pid time
   */
  coffee_blooming_time: number;

  coffee_blooming_time_milliseconds: number;

  /**
   * Inherits the brew beverage (user specific in g or ml)
   */
  brew_beverage_quantity: number;

  /**
   * Inherits the type of the brew quantity
   */
  brew_beverage_quantity_type: BREW_QUANTITY_TYPES_ENUM;

  /**
   * Total dissolved units
   */
  tds: number;

  /**
   * Used for rentention calculation
   */
  bean_weight_in: number;

  vessel_weight: number;
  vessel_name: string;

  config: IConfig;

  /*** this is calculcated **/
  ey: number;
}
