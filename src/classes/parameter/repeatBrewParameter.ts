/** Interfacdes */

import { IBrewParameter } from '../../interfaces/parameter/iBrewParameter';

export class RepeatBrewParameter implements IBrewParameter {
  public repeat_coffee_active: boolean;

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
  constructor() {
    this.bean_type = true;
    this.brew_temperature_time = true;
    this.brew_time = true;
    this.grind_size = true;
    this.grind_weight = true;
    this.mill = true;
    this.mill_timer = true;
    this.method_of_preparation = true;
    this.brew_quantity = true;
    this.bean_type = true;
    this.brew_temperature = true;
    this.note = true;
    this.coffee_type = true;
    this.coffee_concentration = true;
    this.coffee_first_drip_time = true;
    this.coffee_blooming_time = true;
    this.rating = true;
    this.mill_speed = true;
    this.pressure_profile = true;
    this.tds = true;
    this.brew_beverage_quantity = true;
    this.method_of_preparation_tool = true;
    this.water = true;
    this.bean_weight_in = true;
    this.vessel = true;

    this.repeat_coffee_active = true;
  }
}
