/**
 * Created by lars on 10/18/2017.
 */
import {BREW_QUANTITY_TYPES_ENUM} from '../../enums/brews/brewQuantityTypes';
import {IConfig} from '../objectConfig/iObjectConfig';
import {ICupping} from '../cupping/iCupping';
import {IBrewCoordinates} from './iBrewCoordinates';

export interface IBrew {
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
   * Inherits the specific preparation method for a brew, default: Standard
   * E.g. "Chemex","Portafilter","Aeropress"
   */
  method_of_preparation: string;
  /**
   * Inherits the specific mill for a brew, default: Standard.
   * E.g. C40, Kinu M47, Mazzer, Eureka Mignon
   */
  mill: string;
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
   * Inherits the used bean for a brew, default: Standard
   */
  bean: string;
  /**
   * Inherits the brew temperature for a brew
   */
  brew_temperature: number;
  /**
   * Inherits the temperature surfing time for the coffee-
   */
  brew_temperature_time: number;
  /**
   * Inherits the brewing time for the coffee, shot-time, infusion-time etc.
   */
  brew_time: number;
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

  /**
   * Inherits the blooming / pid time
   */
  coffee_blooming_time: number;
  /**
   * Image attachments
   */
  attachments: Array<string>;

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

  config: IConfig;

  cupping: ICupping;

  coordinates: IBrewCoordinates;

  /**
   * Inherits list of all uuid of all preparation tools
   */
  method_of_preparation_tools: Array<string>;

  // Functions
  formateDate(): string;

}
