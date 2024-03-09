/** Interfaces */

/** Enums */

/** Classes */
import { Config } from '../objectConfig/objectConfig';
import { IWater } from '../../interfaces/water/iWater';
import { WATER_UNIT } from '../../enums/water/waterUnit';
import { WATER_UNIT_TDS } from '../../enums/water/waterUnitTds';

export class Water implements IWater {
  public name: string;

  public note: string;

  public config: Config;

  public finished: boolean;
  public attachments: Array<string>;

  public general_hardness: number;
  public general_hardness_type: WATER_UNIT;
  public total_alkalinity: number;
  public total_alkalinity_type: WATER_UNIT;

  public calcium: number;
  public calcium_type: WATER_UNIT;
  public magnesium: number;
  public magnesium_type: WATER_UNIT;
  public sodium: number;
  public sodium_type: WATER_UNIT;
  public potassium: number;
  public potassium_type: WATER_UNIT;

  public tds: number;
  public tds_type: WATER_UNIT_TDS;

  constructor() {
    this.name = '';
    this.note = '';
    this.config = new Config();
    this.attachments = [];
    this.finished = false;

    this.general_hardness = 0;
    this.total_alkalinity = 0;
    this.calcium = 0;
    this.magnesium = 0;
    this.sodium = 0;
    this.potassium = 0;
    this.tds = 0;

    this.general_hardness_type = 'UNKNOWN' as WATER_UNIT;
    this.total_alkalinity_type = 'UNKNOWN' as WATER_UNIT;
    this.calcium_type = 'UNKNOWN' as WATER_UNIT;
    this.magnesium_type = 'UNKNOWN' as WATER_UNIT;
    this.sodium_type = 'UNKNOWN' as WATER_UNIT;
    this.potassium_type = 'UNKNOWN' as WATER_UNIT;
    this.tds_type = 'PPM' as WATER_UNIT_TDS;
  }

  public initializeByObject(_obj: IWater): void {
    Object.assign(this, _obj);
  }

  public hasPhotos() {
    return this.attachments && this.attachments.length > 0;
  }
}
