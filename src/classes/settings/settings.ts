/** Interfaces */
/** Enums */
import {BREW_VIEW_ENUM} from '../../enums/settings/brewView';
import {ISettings} from '../../interfaces/settings/iSettings';
/** Classes */
import {Config} from '../objectConfig/objectConfig';

import {DefaultLastCoffeeParameters} from './settingsDefaultLastCoffeeParameter';
import {STARTUP_VIEW_ENUM} from '../../enums/settings/startupView';
import {BrewOrder} from './settingsOrderBrew';
import {IBrewPageFilter} from '../../interfaces/brew/iBrewPageFilter';

export class Settings implements ISettings {
  public brew_view: BREW_VIEW_ENUM;
  public startup_view: STARTUP_VIEW_ENUM;
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
  public attachments: boolean;
  public rating: boolean;
  public coffee_type: boolean;
  public coffee_concentration: boolean;
  public coffee_first_drip_time: boolean;
  public coffee_blooming_time: boolean;
  public set_last_coffee_brew: boolean;
  public set_custom_brew_time: boolean;
  public tds: boolean;
  public brew_beverage_quantity: boolean;
  public default_last_coffee_parameters: DefaultLastCoffeeParameters;
  public brew_order: BrewOrder;
  public config: Config;
  public language: string;
  public analytics: boolean;
  public track_brew_coordinates: boolean;

  public show_archived_beans: boolean;
  public show_archived_brews: boolean;
  public show_archived_mills: boolean;
  public show_archived_preparations: boolean;

  public welcome_page_showed: boolean;

  public brew_filter: {
    OPEN: IBrewPageFilter,
    ARCHIVED: IBrewPageFilter
  };

  constructor() {
    this.brew_view = BREW_VIEW_ENUM.SINGLE_PAGE;
    this.startup_view = STARTUP_VIEW_ENUM.HOME_PAGE;
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
    this.set_custom_brew_time = false;
    this.config = new Config();

    this.default_last_coffee_parameters = new DefaultLastCoffeeParameters();
    this.brew_order = new BrewOrder();
    this.language = '';
    this.analytics = undefined;

    this.track_brew_coordinates = false;
    this.show_archived_beans = true;
    this.show_archived_brews = true;
    this.show_archived_mills = true;
    this.show_archived_preparations = true;
    this.brew_beverage_quantity = false;

    this.brew_filter = {
      OPEN: {} as IBrewPageFilter,
      ARCHIVED: {} as IBrewPageFilter
    };

    this.brew_filter.OPEN = {bean: [], method_of_preparation: [], mill: []} as IBrewPageFilter;
    this.brew_filter.ARCHIVED = {bean: [], method_of_preparation: [], mill: []} as IBrewPageFilter;

    this.welcome_page_showed = false;
  }

  public initializeByObject(settingsObj: ISettings): void {
    Object.assign(this, settingsObj);
    // We need to reassign brew order here, else the class would be dismissed.
    this.brew_order = new BrewOrder();
    Object.assign(this.brew_order, settingsObj.brew_order);

    this.default_last_coffee_parameters = new DefaultLastCoffeeParameters();
    Object.assign(this.default_last_coffee_parameters, settingsObj.default_last_coffee_parameters);
  }



  public resetFilter() {
    this.brew_filter = {
      OPEN: {
        mill: [],
        bean: [],
        method_of_preparation: []
      } as IBrewPageFilter,
      ARCHIVED: {
        mill: [],
        bean: [],
        method_of_preparation: []
      } as IBrewPageFilter
    };
  }
}
