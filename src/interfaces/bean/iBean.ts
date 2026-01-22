/**
 * Created by lars on 10/18/2017.
 */
import { BEAN_FREEZING_STORAGE_ENUM } from '../../enums/beans/beanFreezingStorage';
import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';
import { ROASTS_ENUM } from '../../enums/beans/roasts';
import { ICupping } from '../cupping/iCupping';
import { IFlavor } from '../flavor/iFlavor';
import { IConfig } from '../objectConfig/iObjectConfig';
import { IBeanInformation } from './iBeanInformation';
import { IBeanRoastInformation } from './iBeanRoastInformation';

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
  /**
   * This one is used for generating qr-codes / NFC tags to directly brew them or view them
   */
  internal_share_code: string;
  shared: boolean;
  cupping: ICupping;
  cupped_flavor: IFlavor;

  frozenDate: string;
  unfrozenDate: string;
  frozenId: string;
  /**
   * If there is a list of multiple bags, there will be an id to group them**/
  frozenGroupId: string;
  frozenStorageType: BEAN_FREEZING_STORAGE_ENUM;
  frozenNote: string;

  bestDate: string;
  openDate: string;

  /**
   * kg CO2e /kg for emission data.
   */
  co2e_kg: number;
}
