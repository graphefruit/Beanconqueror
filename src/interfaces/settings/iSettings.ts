import { ScaleType } from './../../classes/devices';
/** Interfaces */
/** Enums */
import {BREW_VIEW_ENUM} from '../../enums/settings/brewView';
import {IConfig} from '../objectConfig/iObjectConfig';
import {IBrewParameter} from '../parameter/iBrewParameter';
import {STARTUP_VIEW_ENUM} from '../../enums/settings/startupView';
import {IOrderBrewParameter} from '../parameter/iOrderBrewParameter';
import {IBrewPageFilter} from '../brew/iBrewPageFilter';
import {IBeanPageFilter} from '../bean/iBeanPageFilter';

export interface ISettings {
 // Properties
  brew_view: BREW_VIEW_ENUM;
  startup_view: STARTUP_VIEW_ENUM;

  language: string;
  manage_parameters: IBrewParameter;
  default_last_coffee_parameters: IBrewParameter;
  brew_order: IOrderBrewParameter;
  matomo_analytics: boolean;
  track_brew_coordinates: boolean;
  fast_brew_repeat: boolean;
  image_quality: number;
  brew_rating: number;
  brew_rating_steps: number;

  show_archived_beans: boolean;
  show_archived_brews: boolean;
  show_archived_mills: boolean;
  show_archived_preparations: boolean;
  show_archived_green_beans: boolean;
  show_archived_waters: boolean;

  track_caffeine_consumption: boolean;

  show_roasting_section: boolean;
  show_water_section: boolean;
  show_cupping_section: boolean;

  brew_filter: {
    OPEN: IBrewPageFilter,
    ARCHIVED: IBrewPageFilter
  };

  bean_filter: {
    OPEN: IBeanPageFilter,
    ARCHIVED: IBeanPageFilter
  };

  green_bean_filter: {
    OPEN: IBeanPageFilter,
    ARCHIVED: IBeanPageFilter
  };

  welcome_page_showed: boolean;

  wake_lock: boolean;

  config: IConfig;

  scale_id: string;
  scale_type: ScaleType;
  scale_log: boolean;
  bluetooth_scale_stay_connected: boolean;
  bluetooth_scale_tare_on_brew: boolean;
  bluetooth_scale_tare_on_start_timer: boolean;

  currency: string;
}
