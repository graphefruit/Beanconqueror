/**
 * Created by lars on 10/18/2017.
 */
import {IConfig} from '../objectConfig/iObjectConfig';
/** Enums */

import {IBeanInformation} from '../bean/iBeanInformation';

export interface IGreenBean {
  name: string;

  date: string;

  // Aromatics
  aromatics: string;
  note: string;

  config: IConfig;
  weight: number;
  finished: boolean;
  cost: number;
  attachments: Array<string>;

  url: string;
  ean_article_number: string;
  cupping_points:string;
  decaffeinated: boolean;

  bean_information: Array<IBeanInformation>;


}
