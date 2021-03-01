/** Interfaces */
/** Enums */
import {BREW_VIEW_ENUM} from '../../enums/settings/brewView';
import {ISettings} from '../../interfaces/settings/iSettings';
/** Classes */
import {Config} from '../objectConfig/objectConfig';

import {DefaultBrewParameter} from '../parameter/defaultBrewParameter';
import {STARTUP_VIEW_ENUM} from '../../enums/settings/startupView';
import {OrderBrewParameter} from '../parameter/orderBrewParameter';
import {IBrewPageFilter} from '../../interfaces/brew/iBrewPageFilter';
import {ManageBrewParameter} from '../parameter/manageBrewParameter';
import {IBeanPageFilter} from '../../interfaces/bean/iBeanPageFilter';
import {BEAN_SORT_AFTER} from '../../enums/beans/beanSortAfter';
import {BEAN_SORT_ORDER} from '../../enums/beans/beanSortOrder';

export class Settings implements ISettings {

  public static GET_BREW_FILTER(): IBrewPageFilter {
    return {
      mill: [],
      bean: [],
      method_of_preparation: [],
      favourite: false,
    } as IBrewPageFilter;
  }

  public brew_view: BREW_VIEW_ENUM;
  public startup_view: STARTUP_VIEW_ENUM;
  /** @deprecated */
  public brew_time: boolean;
  /** @deprecated */
  public brew_temperature_time: boolean;
  /** @deprecated */
  public grind_size: boolean;
  /** @deprecated */
  public grind_weight: boolean;
  /** @deprecated */
  public mill: boolean;
  /** @deprecated */
  public mill_speed: boolean;
  /** @deprecated */
  public mill_timer: boolean;
  /** @deprecated */
  public pressure_profile: boolean;
  /** @deprecated */
  public method_of_preparation: boolean;
  /** @deprecated */
  public brew_quantity: boolean;
  /** @deprecated */
  public bean_type: boolean;
  /** @deprecated */
  public brew_temperature: boolean;
  /** @deprecated */
  public note: boolean;
  /** @deprecated */
  public attachments: boolean;
  /** @deprecated */
  public rating: boolean;
  /** @deprecated */
  public coffee_type: boolean;
  /** @deprecated */
  public coffee_concentration: boolean;
  /** @deprecated */
  public coffee_first_drip_time: boolean;
  /** @deprecated */
  public coffee_blooming_time: boolean;
  /** @deprecated */
  public set_last_coffee_brew: boolean;
  /** @deprecated */
  public set_custom_brew_time: boolean;
  /** @deprecated */
  public tds: boolean;
  /** @deprecated */
  public brew_beverage_quantity: boolean;


  public manage_parameters: ManageBrewParameter;
  public default_last_coffee_parameters: DefaultBrewParameter;
  public brew_order: OrderBrewParameter;
  public config: Config;
  public language: string;
  public analytics: boolean;
  public track_brew_coordinates: boolean;
  public fast_brew_repeat: boolean;

  public show_archived_beans: boolean;
  public show_archived_brews: boolean;
  public show_archived_mills: boolean;
  public show_archived_preparations: boolean;
  public show_archived_green_beans: boolean;

  public welcome_page_showed: boolean;
  public track_caffeine_consumption: boolean;
  public brew_filter: {
    OPEN: IBrewPageFilter,
    ARCHIVED: IBrewPageFilter
  };
  public bean_filter: {
    OPEN: IBeanPageFilter,
    ARCHIVED: IBeanPageFilter
  };

  public green_bean_filter: {
    OPEN: IBeanPageFilter,
    ARCHIVED: IBeanPageFilter
  };

  public wake_lock: boolean;

  public show_roasting_section: boolean;
  public show_cupping_section: boolean;

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

    this.manage_parameters = new ManageBrewParameter();
    this.default_last_coffee_parameters = new DefaultBrewParameter();
    this.brew_order = new OrderBrewParameter();
    this.language = '';
    this.analytics = undefined;

    this.track_brew_coordinates = false;
    this.fast_brew_repeat = false;
    this.show_archived_beans = true;
    this.show_archived_brews = true;
    this.show_archived_mills = true;
    this.show_archived_preparations = true;
    this.show_archived_green_beans = true;
    this.brew_beverage_quantity = false;
    this.track_caffeine_consumption = false;

    this.show_roasting_section = false;
    this.show_cupping_section = false;

    this.brew_filter = {
      OPEN: {} as IBrewPageFilter,
      ARCHIVED: {} as IBrewPageFilter
    };

    this.bean_filter = {
      OPEN: {} as IBeanPageFilter,
      ARCHIVED: {} as IBeanPageFilter
    };

    this.green_bean_filter = {
      OPEN: {} as IBeanPageFilter,
      ARCHIVED: {} as IBeanPageFilter
    };

    this.brew_filter.OPEN = Settings.GET_BREW_FILTER();
    this.brew_filter.ARCHIVED = Settings.GET_BREW_FILTER();

    this.bean_filter.OPEN = {sort_after: BEAN_SORT_AFTER.UNKOWN, sort_order:  BEAN_SORT_ORDER.UNKOWN} as IBeanPageFilter;
    this.bean_filter.ARCHIVED =  {sort_after: BEAN_SORT_AFTER.UNKOWN, sort_order:  BEAN_SORT_ORDER.UNKOWN} as IBeanPageFilter;

    this.green_bean_filter.OPEN = {sort_after: BEAN_SORT_AFTER.UNKOWN, sort_order:  BEAN_SORT_ORDER.UNKOWN} as IBeanPageFilter;
    this.green_bean_filter.ARCHIVED =  {sort_after: BEAN_SORT_AFTER.UNKOWN, sort_order:  BEAN_SORT_ORDER.UNKOWN} as IBeanPageFilter;


    this.welcome_page_showed = false;
    this.wake_lock = false;
  }

  public initializeByObject(settingsObj: ISettings): void {
    Object.assign(this, settingsObj);
    // We need to reassign brew order here, else the class would be dismissed.

    this.manage_parameters = new ManageBrewParameter();
    Object.assign(this.manage_parameters, settingsObj.manage_parameters);

    this.brew_order = new OrderBrewParameter();
    Object.assign(this.brew_order, settingsObj.brew_order);

    this.default_last_coffee_parameters = new DefaultBrewParameter();
    Object.assign(this.default_last_coffee_parameters, settingsObj.default_last_coffee_parameters);


  }



  public resetFilter() {
    this.brew_filter = {
      OPEN: {} as IBrewPageFilter,
      ARCHIVED: {} as IBrewPageFilter
    };
    this.brew_filter.OPEN = Settings.GET_BREW_FILTER();
    this.brew_filter.ARCHIVED = Settings.GET_BREW_FILTER();
  }



}
