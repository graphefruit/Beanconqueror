/**Interfaces**/
import {IConfig} from '../objectConfig/iObjectConfig';
/**Enums**/
import {BREW_VIEW_ENUM} from '../../enums/settings/brewView';

export interface ISettings {
 //Properties
  brew_view:BREW_VIEW_ENUM,
  brew_time: boolean,
  grind_size: boolean,
  grind_weight: boolean,
  method_of_preparation: boolean,
  brew_quantity: boolean,
  bean_type: boolean,
  brew_temperature:boolean,
  note: boolean,
  coffee_type:boolean,
  coffee_concentration:boolean,
  coffee_first_drip_time:boolean,
  coffee_blooming_time:boolean,
  attachments:boolean;
  rating:boolean;

  config:IConfig;
}


