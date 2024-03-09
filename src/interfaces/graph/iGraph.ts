/**
 * Created by lars on 12/21/2017.
 */
import { IConfig } from '../objectConfig/iObjectConfig';

export interface IGraph {
  name: string;
  note: string;
  flow_profile: string;
  finished: boolean;
  config: IConfig;
}
