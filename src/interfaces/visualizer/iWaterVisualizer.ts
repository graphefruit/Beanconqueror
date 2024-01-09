/**
 * Created by lars on 10/18/2017.
 */
import { IConfig } from '../objectConfig/iObjectConfig';
import { WATER_UNIT } from '../../enums/water/waterUnit';
import { WATER_UNIT_TDS } from '../../enums/water/waterUnitTds';

/** Enums */

export interface IWaterVisualizer {
  name: string;
  general_hardness: number;
  general_hardness_type: WATER_UNIT;
  total_alkalinity: number;
  total_alkalinity_type: WATER_UNIT;

  calcium: number;
  calcium_type: WATER_UNIT;
  magnesium: number;
  magnesium_type: WATER_UNIT;
  sodium: number;
  sodium_type: WATER_UNIT;
  potassium: number;
  potassium_type: WATER_UNIT;
  tds: number;
  tds_type: WATER_UNIT_TDS;
}
