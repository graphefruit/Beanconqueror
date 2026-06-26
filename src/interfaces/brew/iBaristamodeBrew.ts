/**
 * Created by lars on 10/18/2017.
 */
import { BrewFlow } from '../../classes/brew/brewFlow';
import { BREW_QUANTITY_TYPES_ENUM } from '../../enums/brews/brewQuantityTypes';
import { ICupping } from '../cupping/iCupping';
import { IFlavor } from '../flavor/iFlavor';
import { IConfig } from '../objectConfig/iObjectConfig';
import { IBrewCoordinates } from './iBrewCoordinates';
import { ICustomInformationBrew } from './ICustomInformationBrew';
import { IPreparationDeviceBrew } from './iPreparationDeviceBrew';
import { IReferenceGraph } from './iReferenceGraph';

export interface IBaristamodeBrew {
  // Properties

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
   * Inherits the actual used pressure profile (name and number)
   */
  pressure_profile: string;

  /**
   * Inherits the brew temperature for a brew
   */
  brew_temperature: number;

  /**
   * Inherits the brewing time for the coffee, shot-time, infusion-time etc.
   */
  brew_time: number;

  brew_time_milliseconds: number;

  /**
   * Inherits the brew beverage (user specific in g or ml)
   */
  brew_beverage_quantity: number;

  /**
   * Inherits the type of the brew quantity
   */
  brew_beverage_quantity_type: BREW_QUANTITY_TYPES_ENUM;

  desired_beverage_quantity: number;

  water_volume_intake: number;

  config: IConfig;

  flow_profile: string;
  customInformation: ICustomInformationBrew;
  method_of_preparation: string;
  // Functions
  formateDate(): string;
}
