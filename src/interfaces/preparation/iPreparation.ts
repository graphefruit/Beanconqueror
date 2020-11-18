/**
 * Created by lars on 10/18/2017.
 */
import {IConfig} from '../objectConfig/iObjectConfig';
import {PREPARATION_STYLE_TYPE} from '../../enums/preparations/preparationStyleTypes';
import {DefaultBrewParameter} from '../../classes/parameter/defaultBrewParameter';
import {OrderBrewParameter} from '../../classes/parameter/orderBrewParameter';

export interface IPreparation {
  name: string;
  note: string;
  style_type: PREPARATION_STYLE_TYPE;
  config: IConfig;
  finished: boolean;
  parameters: {
     brew_time: boolean;
     brew_temperature_time: boolean;
     grind_size: boolean;
     grind_weight: boolean;
     mill: boolean;
     mill_speed: boolean;
     mill_timer: boolean;
     pressure_profile: boolean;
     method_of_preparation: boolean;
     brew_quantity: boolean;
     bean_type: boolean;
     brew_temperature: boolean;
     note: boolean;
     attachments: boolean;
     rating: boolean;
     coffee_type: boolean;
     coffee_concentration: boolean;
     coffee_first_drip_time: boolean;
     coffee_blooming_time: boolean;
     set_last_coffee_brew: boolean;
     set_custom_brew_time: boolean;
     tds: boolean;
     brew_beverage_quantity: boolean;
     default_last_coffee_parameters: DefaultBrewParameter;
     brew_order: OrderBrewParameter;
     language: string;
     analytics: boolean;
     track_brew_coordinates: boolean;
     fast_brew_repeat: boolean;
  }
}
