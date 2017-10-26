/**Interfaces**/
import {IConfig} from '../objectConfig/iObjectConfig';
/**Enums**/
import {BREW_VIEW_ENUM} from '../../enums/settings/brewView';

export interface ISettings {
 //Properties
  brew_view:BREW_VIEW_ENUM,
  time: boolean,
  grind_size: boolean,
  weight: boolean,
  method_of_preparation: boolean,
  water_flow: boolean,
  bean_type: boolean,
  brew_temperature:boolean,
  note: boolean,
  attachments:boolean;
  rating:boolean;
  config:IConfig;
}


