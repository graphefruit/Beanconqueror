/**
 * Created by lars on 10/18/2017.
 */
import { IConfig } from '../objectConfig/iObjectConfig';

/** Enums */
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';
import { ROASTS_ENUM } from '../../enums/beans/roasts';

export interface IBean {
  name: string;
  roastingDate: string;
  // Blend / Single Origin.
  beanMix: BEAN_MIX_ENUM;
  variety: string;
  country: string;
  // Aromatics
  aromatics: string;
  note: string;
  filePath: string;
  roaster: string;
  roast: ROASTS_ENUM;
  // Will be filled when roast is choosen as custom.
  roast_custom: string;
  config: IConfig;
  weight: number;
  finished: boolean;
  cost: number;
}
