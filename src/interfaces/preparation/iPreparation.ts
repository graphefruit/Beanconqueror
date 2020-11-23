/**
 * Created by lars on 10/18/2017.
 */
import {IConfig} from '../objectConfig/iObjectConfig';
import {PREPARATION_STYLE_TYPE} from '../../enums/preparations/preparationStyleTypes';
import {IBrewParameter} from '../parameter/iBrewParameter';
import {IOrderBrewParameter} from '../parameter/iOrderBrewParameter';

export interface IPreparation {
  name: string;
  note: string;
  style_type: PREPARATION_STYLE_TYPE;
  config: IConfig;
  finished: boolean;
  manage_parameters: IBrewParameter;
  default_last_coffee_parameters: IBrewParameter;
  brew_order: IOrderBrewParameter;
  use_custom_parameters: boolean;
}
