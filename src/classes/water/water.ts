/** Interfaces */

/** Enums */

/** Classes */
import { Config } from '../objectConfig/objectConfig';
import { IWater } from '../../interfaces/water/iWater';
import { WATER_UNIT } from '../../enums/water/waterUnit';
import { WATER_UNIT_TDS } from '../../enums/water/waterUnitTds';

import { WATER_TYPES } from '../../enums/water/waterTypes';

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
  public type: WATER_TYPES;

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

    this.type = 'CUSTOM_WATER' as WATER_TYPES;
  }

  public initializeByObject(_obj: IWater): void {
    Object.assign(this, _obj);
  }

  public hasPhotos() {
    return this.attachments && this.attachments.length > 0;
  }

  public getIcon(_key?: WATER_TYPES): string {
    if (_key === undefined) {
      _key = this.type;
    }
    switch (_key) {
      case WATER_TYPES.CUSTOM_WATER:
        return 'water-outline';
      case WATER_TYPES.THIRD_WAVE_WATER_CLASSIC_LIGHT_ROAST_PROFILE:
        return 'beanconqueror-third-wave-water-classic-light-roast-profile';
      case WATER_TYPES.THIRD_WAVE_WATER_MEDIUM_ROAST_PROFILE:
        return 'beanconqueror-third-wave-water-medium-roast-profile';
      case WATER_TYPES.THIRD_WAVE_WATER_DARK_ROAST_PROFILE:
        return 'beanconqueror-third-wave-water-dark-roast-profile';
      case WATER_TYPES.THIRD_WAVE_WATER_ESPRESSO_MACHINE_PROFILE:
        return 'beanconqueror-third-wave-water-espresso-machine-profile';
      case WATER_TYPES.THIRD_WAVE_WATER_COLD_BREW_PROFILE:
        return 'beanconqueror-third-wave-water-cold-brew-profile';
      case WATER_TYPES.THIRD_WAVE_WATER_LOW_ACID_PROFILE:
        return 'beanconqueror-third-wave-water-low-acid-profile';
      case WATER_TYPES.PURE_COFFEE_WATER:
        return 'beanconqueror-pure-coffee-water';
      default:
        return 'water-outline';
    }
  }
}
