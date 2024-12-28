import { BREW_QUANTITY_TYPES_ENUM } from '../../enums/brews/brewQuantityTypes';
import { BrewFlow } from '../brew/brewFlow';
import { IBrewVisualizer } from '../../interfaces/visualizer/iBrewVisualizer';
import { Config } from '../objectConfig/objectConfig';

export class BrewVisualizer implements IBrewVisualizer {
  public grind_size: string;
  public grind_weight: number;

  public mill_speed: number;
  public mill_timer: number;
  public mill_timer_milliseconds: number;
  public pressure_profile: string;
  public brew_temperature: number;
  public brew_temperature_time: number;

  public brew_temperature_time_milliseconds: number;

  public brew_time: number;
  public brew_time_milliseconds: number;
  public brew_quantity: number;
  public brew_quantity_type: BREW_QUANTITY_TYPES_ENUM;
  public note: string;
  public rating: number;
  public coffee_type: string;
  public coffee_concentration: string;
  public coffee_first_drip_time: number;
  public coffee_first_drip_time_milliseconds: number;
  public coffee_blooming_time: number;
  public coffee_blooming_time_milliseconds: number;

  public tds: number;

  public bean_weight_in: number;

  public vessel_weight: number;
  public vessel_name: string;

  public config: Config;

  public brew_beverage_quantity: number;

  public brew_beverage_quantity_type: BREW_QUANTITY_TYPES_ENUM;

  public ey: number;
  constructor() {
    this.grind_size = '';
    this.grind_weight = 0;
    this.mill_speed = 0;
    this.mill_timer = 0;
    this.pressure_profile = '';
    this.brew_temperature_time = 0;
    this.brew_temperature = 0;
    this.brew_time = 0;
    this.brew_quantity = 0;
    this.brew_quantity_type = 'GR' as BREW_QUANTITY_TYPES_ENUM;
    this.note = '';
    this.rating = 0;
    this.coffee_type = '';
    this.coffee_concentration = '';
    this.coffee_first_drip_time = 0;
    this.coffee_blooming_time = 0;
    this.tds = 0;
    this.brew_beverage_quantity = 0;
    this.brew_beverage_quantity_type = 'GR' as BREW_QUANTITY_TYPES_ENUM;

    this.mill_timer_milliseconds = 0;
    this.brew_time_milliseconds = 0;
    this.brew_temperature_time_milliseconds = 0;
    this.coffee_first_drip_time_milliseconds = 0;
    this.coffee_blooming_time_milliseconds = 0;

    this.bean_weight_in = 0;

    this.vessel_name = '';
    this.vessel_weight = 0;
    this.config = new Config();
    this.ey = 0;
  }
}
