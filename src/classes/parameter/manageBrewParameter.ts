/** Interfacdes */

import {IManageBrewParameter} from '../../interfaces/parameter/iManageBrewParameter';

export class ManageBrewParameter implements IManageBrewParameter {
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
  public attachments: boolean;
  public set_last_coffee_brew: boolean;
  public set_custom_brew_time: boolean;

  constructor() {
    this.bean_type = true;
    this.brew_temperature_time = false;
    this.brew_time = true;
    this.grind_size = true;
    this.grind_weight = true;
    this.mill = true;
    this.mill_timer = false;
    this.method_of_preparation = true;
    this.brew_quantity = true;
    this.bean_type = true;
    this.brew_temperature = true;
    this.note = false;
    this.coffee_type = true;
    this.coffee_concentration = true;
    this.coffee_first_drip_time = true;
    this.coffee_blooming_time = true;
    this.rating = false;
    this.mill_speed = false;
    this.pressure_profile = false;
    this.tds = false;
    this.brew_beverage_quantity = false;
    this.attachments = false;
    this.set_last_coffee_brew = false;
    this.set_custom_brew_time = false;
  }
}
