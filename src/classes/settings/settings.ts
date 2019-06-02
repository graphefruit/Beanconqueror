/** Interfaces */
import {ISettings} from "../../interfaces/settings/iSettings";
/** Classes */
import {Config} from "../objectConfig/objectConfig";
/** Enums */
import {BREW_VIEW_ENUM} from '../../enums/settings/brewView';

import {DefaultLastCoffeeParameters} from "./settingsDefaultLastCoffeeParameter";
export class Settings implements ISettings {
  public brew_view: BREW_VIEW_ENUM;
  public brew_time: boolean;
  public brew_temperature_time:boolean;
  public grind_size: boolean;
  public grind_weight: boolean;
  public mill:boolean;
  public mill_speed:boolean;
  public pressure_profile:boolean;
  public method_of_preparation: boolean;
  public brew_quantity: boolean;
  public bean_type: boolean;
  public brew_temperature: boolean;
  public note: boolean;
  public attachments: boolean;
  public rating: boolean;
  public coffee_type: boolean;
  public coffee_concentration: boolean;
  public coffee_first_drip_time: boolean;
  public coffee_blooming_time: boolean;
  public set_last_coffee_brew:boolean;
  public default_last_coffee_parameters:DefaultLastCoffeeParameters;
  public config: Config;


  public initializeByObject(brewObj: ISettings) {
    Object.assign(this, brewObj)
  }

  constructor() {
    this.brew_view = BREW_VIEW_ENUM.SINGLE_PAGE;
    this.brew_temperature_time = false;
    this.brew_time = true;
    this.grind_size = true;
    this.grind_weight = true;
    this.mill = true;
    this.method_of_preparation = true;
    this.brew_quantity = true;
    this.bean_type = true;
    this.brew_temperature = true;
    this.coffee_type = true;
    this.coffee_concentration = true;
    this.coffee_first_drip_time = true;
    this.coffee_blooming_time = true;
    this.note = true;
    this.attachments = true;
    this.rating = true;
    this.set_last_coffee_brew = false;
    this.mill_speed = false;
    this.pressure_profile = false;
    this.config = new Config();

    this.default_last_coffee_parameters = new DefaultLastCoffeeParameters();

  }


}
