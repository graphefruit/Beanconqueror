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
import {UISettingsStorage} from '../../services/uiSettingsStorage';

export class Settings implements ISettings {


  public brew_view: BREW_VIEW_ENUM;
  public startup_view: STARTUP_VIEW_ENUM;


  public matomo_analytics:boolean;
  public manage_parameters: ManageBrewParameter;
  public default_last_coffee_parameters: DefaultBrewParameter;
  public brew_order: OrderBrewParameter;
  public config: Config;
  public language: string;
  public track_brew_coordinates: boolean;
  public fast_brew_repeat: boolean;
  public image_quality: number;
  public brew_rating: number;

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

  public static GET_BREW_FILTER(): IBrewPageFilter {
    let uiSettingsStorage: UISettingsStorage;
    uiSettingsStorage = UISettingsStorage.getInstance();
    let upperRating: number = 5;
    try {
      if (uiSettingsStorage !== undefined) {
        upperRating = uiSettingsStorage.getSettings().brew_rating;
      }
    } catch(ex) {

    }


    return {
      mill: [],
      bean: [],
      method_of_preparation: [],
      method_of_preparation_tools: [],
      favourite: false,
      rating: {
        upper: upperRating,
        lower:-1
      }
    } as IBrewPageFilter;
  }

  constructor() {
    this.brew_view = BREW_VIEW_ENUM.SINGLE_PAGE;
    this.startup_view = STARTUP_VIEW_ENUM.HOME_PAGE;

    this.config = new Config();

    this.manage_parameters = new ManageBrewParameter();
    this.default_last_coffee_parameters = new DefaultBrewParameter();
    this.brew_order = new OrderBrewParameter();
    this.language = '';
    this.matomo_analytics = undefined;

    this.track_brew_coordinates = false;
    this.fast_brew_repeat = false;
    this.show_archived_beans = true;
    this.show_archived_brews = true;
    this.show_archived_mills = true;
    this.show_archived_preparations = true;
    this.show_archived_green_beans = true;

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
    this.image_quality = 100;
    this.brew_rating = 5;
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
