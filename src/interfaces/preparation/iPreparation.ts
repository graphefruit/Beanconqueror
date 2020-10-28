/**
 * Created by lars on 10/18/2017.
 */
import {IConfig} from '../objectConfig/iObjectConfig';
import {PREPARATION_STYLE_TYPE} from '../../enums/preparations/preparationStyleTypes';

export interface IPreparation {
  name: string;
  note: string;
  style_type: PREPARATION_STYLE_TYPE;
  config: IConfig;
  finished: boolean;
}
