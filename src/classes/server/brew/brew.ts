import { BREW_QUANTITY_TYPES_ENUM } from '../../../enums/brews/brewQuantityTypes';

export class ServerBrew {
  public brew_id: string;

  public qr_code: string;
  public grind_size: string;
  public grind_weight: number;
  // UUID
  public method_of_preparation: string;
  // UUID
  public mill: string;
  public mill_speed: number;
  public mill_timer: number;
  public pressure_profile: string;
  // UUID
  public bean: string;
  public brew_temperature: number;
  public brew_temperature_time: number;
  public brew_time: number;
  public brew_quantity: number;
  public brew_quantity_type: BREW_QUANTITY_TYPES_ENUM;
  public note: string;
  public rating: number;
  public coffee_type: string;
  public coffee_concentration: string;
  public coffee_first_drip_time: number;
  public coffee_blooming_time: number;

  public tds: number;

  public water: string;
  public bean_weight_in: number;

  public vessel_weight: number;
  public vessel_name: string;

  public brew_beverage_quantity: number;

  public brew_beverage_quantity_type: BREW_QUANTITY_TYPES_ENUM;

  public method_of_preparation_tools: Array<string>;

  constructor() {
    this.grind_size = '';
    this.grind_weight = 0;
    this.method_of_preparation = '';
    this.mill = '';
    this.mill_speed = 0;
    this.mill_timer = 0;
    this.pressure_profile = '';
    this.bean = '';
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

    this.method_of_preparation_tools = [];
    this.bean_weight_in = 0;

    this.water = '';
    this.vessel_name = '';
    this.vessel_weight = 0;
  }
}
