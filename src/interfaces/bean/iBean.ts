/**
 * Created by lars on 10/18/2017.
 */
import { IConfig } from '../objectConfig/iObjectConfig';
/** Enums */
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';
import { ROASTS_ENUM } from '../../enums/beans/roasts';
import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { IBeanInformation } from './iBeanInformation';
import { IBeanRoastInformation } from './iBeanRoastInformation';
import { IFlavor } from '../flavor/iFlavor';
import { ICupping } from '../cupping/iCupping';

export interface IBean {
  name: string;
  buyDate: string;
  roastingDate: string;
  // Blend / Single Origin.
  beanMix: BEAN_MIX_ENUM;

  // Aromatics
  aromatics: string;
  note: string;

  roaster: string;
  roast: ROASTS_ENUM;
  roast_range: number;
  // Will be filled when roast is choosen as custom.
  roast_custom: string;
  config: IConfig;
  weight: number;
  finished: boolean;
  cost: number;
  attachments: Array<string>;

  url: string;
  ean_article_number: string;
  cupping_points: string;
  decaffeinated: boolean;

  favourite: boolean;
  bean_roasting_type: BEAN_ROASTING_TYPE_ENUM;

  bean_information: Array<IBeanInformation>;

  bean_roast_information: IBeanRoastInformation;

  rating: number;
  qr_code: string;
  shared: boolean;
  cupping: ICupping;
  cupped_flavor: IFlavor;

  frozenDate: string;
  unfrozenDate: string;
  frozenId: string;
}
