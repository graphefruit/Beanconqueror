/** Interfacdes */

import {ISplunkParameter} from '../../interfaces/parameter/iSplunkParameter';

export class SplunkParameter implements ISplunkParameter {
  public hec_endpoint: string;
  public hec_token: string;

  constructor() {

  }
}
