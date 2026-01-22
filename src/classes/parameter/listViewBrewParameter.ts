import { IBrewParameter } from '../../interfaces/parameter/iBrewParameter';

export class ListViewBrewParameter implements IBrewParameter {
  public brew_time: boolean;
  public brew_temperature_time: boolean;
  public grind_size: boolean;
  public grind_weight: boolean;
  public mill: boolean;
  public mill_speed: boolean;
  public mill_timer: boolean;
  public pressure_profile: boolean;
  public method_of_preparation: boolean;
  public brew_quantity: boolean;
  public bean_type: boolean;
  public brew_temperature: boolean;
  public note: boolean;
  public coffee_type: boolean;
  public coffee_concentration: boolean;
  public coffee_first_drip_time: boolean;
  public coffee_blooming_time: boolean;
  public rating: boolean;
  public tds: boolean;
  public brew_beverage_quantity: boolean;
  public method_of_preparation_tool: boolean;
  public water: boolean;
  public bean_weight_in: boolean;
  public vessel: boolean;

  public bean_age_by_brew_date: boolean;
  constructor() {
    this.bean_type = true;
    this.brew_temperature_time = false;
    this.brew_time = true;
    this.grind_size = true;
    this.grind_weight = true;
    this.mill = true;
    this.method_of_preparation = true;
    this.brew_quantity = true;
    this.bean_type = true;
    this.mill_speed = true;
    this.mill_timer = false;
    this.brew_beverage_quantity = true;
    this.tds = true;
    this.coffee_first_drip_time = true;

    this.pressure_profile = true;
    this.brew_temperature = true;
    this.note = false;
    this.coffee_type = false;
    this.coffee_concentration = false;

    this.coffee_blooming_time = false;
    this.rating = true;
    this.method_of_preparation_tool = false;
    this.water = false;
    this.bean_weight_in = false;
    this.vessel = false;

    this.bean_age_by_brew_date = false;
  }
}
