/** Interfaces */
/** Enums */
import { BREW_VIEW_ENUM } from '../../enums/settings/brewView';
import { ISettings } from '../../interfaces/settings/iSettings';
/** Classes */
import { Config } from '../objectConfig/objectConfig';

import { DefaultBrewParameter } from '../parameter/defaultBrewParameter';
import { STARTUP_VIEW_ENUM } from '../../enums/settings/startupView';
import { OrderBrewParameter } from '../parameter/orderBrewParameter';
import { IBrewPageFilter } from '../../interfaces/brew/iBrewPageFilter';
import { ManageBrewParameter } from '../parameter/manageBrewParameter';
import { IBeanPageSort } from '../../interfaces/bean/iBeanPageSort';
import { BEAN_SORT_AFTER } from '../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../enums/beans/beanSortOrder';
import { ListViewBrewParameter } from '../parameter/listViewBrewParameter';
import { IBeanPageFilter } from '../../interfaces/bean/iBeanPageFilter';

import { IBrewGraphs } from '../../interfaces/brew/iBrewGraphs';

import { BeanManageParameter } from '../parameter/beanManageParameter';
import {
  PressureType,
  RefractometerType,
  ScaleType,
  TemperatureType,
} from '../devices';
import { BeanListViewParameter } from '../parameter/beanListViewParameter';
import { RepeatBrewParameter } from '../parameter/repeatBrewParameter';
import { VISUALIZER_SERVER_ENUM } from '../../enums/settings/visualizerServer';

export class Settings implements ISettings {
  public brew_view: BREW_VIEW_ENUM;
  public startup_view: STARTUP_VIEW_ENUM;
  public date_format: string;

  public matomo_analytics: boolean;
  public qr_scanner_information: boolean;
  public manage_parameters: ManageBrewParameter;
  public default_last_coffee_parameters: DefaultBrewParameter;
  public repeat_coffee_parameters: RepeatBrewParameter;
  public visible_list_view_parameters: ListViewBrewParameter;
  public brew_order: OrderBrewParameter;

  public bean_manage_parameters: BeanManageParameter;
  public bean_visible_list_view_parameters: BeanListViewParameter;
  public config: Config;
  public language: string;
  public track_brew_coordinates: boolean;
  public fast_brew_repeat: boolean;
  public brew_milliseconds: boolean;
  public brew_milliseconds_leading_digits: number;
  public image_quality: number;
  public brew_rating: number;
  public brew_rating_steps: number;
  public bean_rating: number;
  public bean_rating_steps: number;

  public show_archived_beans: boolean;
  public show_archived_brews: boolean;
  public show_archived_mills: boolean;
  public show_archived_preparations: boolean;
  public show_archived_green_beans: boolean;
  public show_archived_waters: boolean;
  public show_archived_brews_on_dashboard: boolean;
  public show_archived_graphs: boolean;
  public brew_timer_start_delay_time: number;
  public brew_timer_start_delay_active: boolean;

  public use_numeric_keyboard_for_grind_size: boolean;

  public welcome_page_showed: boolean;
  public track_caffeine_consumption: boolean;
  public brew_filter: {
    OPEN: IBrewPageFilter;
    ARCHIVED: IBrewPageFilter;
  };

  public bean_filter: {
    OPEN: IBeanPageFilter;
    ARCHIVED: IBeanPageFilter;
  };

  public bean_sort: {
    OPEN: IBeanPageSort;
    ARCHIVED: IBeanPageSort;
  };

  public green_bean_sort: {
    OPEN: IBeanPageSort;
    ARCHIVED: IBeanPageSort;
  };

  public graph: {
    ESPRESSO: IBrewGraphs;
    FILTER: IBrewGraphs;
  };

  public graph_time: {
    ESPRESSO: {
      NORMAL_SCREEN: number;
      FULL_SCREEN: number;
    };
    FILTER: {
      NORMAL_SCREEN: number;
      FULL_SCREEN: number;
    };
  };

  public graph_weight: {
    ESPRESSO: {
      upper: number;
      lower: number;
    };
    FILTER: {
      upper: number;
      lower: number;
    };
  };
  public graph_flow: {
    ESPRESSO: {
      upper: number;
      lower: number;
    };
    FILTER: {
      upper: number;
      lower: number;
    };
  };

  public wake_lock: boolean;
  public security_check_when_going_back: boolean;

  public show_roasting_section: boolean;
  public show_water_section: boolean;
  public show_cupping_section: boolean;
  public show_graph_section: boolean;

  public scale_id: string;
  public scale_type: ScaleType;
  public scale_log: boolean;

  public bluetooth_scale_stay_connected: boolean;
  public bluetooth_scale_tare_on_brew: boolean;
  public bluetooth_scale_tare_on_start_timer: boolean;
  public bluetooth_scale_reset_timer_on_brew: boolean;
  public bluetooth_scale_stop_timer_on_brew: boolean;
  public bluetooth_scale_maximize_on_start_timer: boolean;
  public bluetooth_ignore_negative_values: boolean;
  public bluetooth_ignore_anomaly_values: boolean;
  public bluetooth_command_delay: number;
  public acaia_heartbeat_command_delay: number;
  public bluetooth_scale_espresso_stop_on_no_weight_change: boolean;
  public bluetooth_scale_espresso_stop_on_no_weight_change_min_flow: number;
  public bluetooth_scale_listening_threshold_start: number;
  public bluetooth_scale_listening_threshold_active: boolean;
  public bluetooth_scale_ignore_weight_button_active: boolean;
  public bluetooth_scale_first_drip_threshold: number;

  public pressure_id: string;
  public pressure_type: PressureType;
  public pressure_log: boolean;
  public pressure_threshold_active: boolean;
  public pressure_threshold_bar: number;
  public pressure_stay_connected: boolean;

  public temperature_id: string;
  public temperature_type: TemperatureType;
  public temperature_log: boolean;
  public temperature_threshold_active: boolean;
  public temperature_threshold_temp: number;
  public temperature_stay_connected: boolean;

  public refractometer_id: string;
  public refractometer_type: RefractometerType;
  public refractometer_stay_connected: boolean;
  public refractometer_log: boolean;

  public currency: string;
  public brew_display_bean_image: boolean;
  public best_brew: boolean;

  public visualizer_active: boolean;
  public visualizer_url: string;
  public visualizer_server: VISUALIZER_SERVER_ENUM;
  public visualizer_username: string;
  public visualizer_password: string;
  public visualizer_upload_automatic: boolean;

  public show_backup_issues: boolean;

  public text_to_speech_active: boolean;
  public text_to_speech_rate: number;
  public text_to_speech_pitch: number;
  public text_to_speech_interval_rate: number;

  public haptic_feedback_active: boolean;
  public haptic_feedback_brew_started: boolean;
  public haptic_feedback_brew_stopped: boolean;
  public haptic_feedback_tare: boolean;

  public brew_timer_show_hours: boolean;
  public brew_timer_show_minutes: boolean;
  public GET_BEAN_FILTER(): IBeanPageFilter {
    const upperRating: number = this.bean_rating;
    return {
      favourite: false,
      rating: {
        upper: upperRating,
        lower: 0,
      },
      roast_range: {
        upper: 5,
        lower: 0,
      },
      bean_roasting_type: [],
      roastingDateStart: '',
      roastingDateEnd: '',
    } as IBeanPageFilter;
  }

  public GET_BREW_FILTER(): IBrewPageFilter {
    const upperRating: number = this.brew_rating;

    return {
      mill: [],
      bean: [],
      method_of_preparation: [],
      method_of_preparation_tools: [],
      favourite: false,
      best_brew: false,
      chart_data: false,
      profiles: [],
      rating: {
        upper: upperRating,
        lower: -1,
      },
    } as IBrewPageFilter;
  }

  public GET_BREW_GRAPHS(): IBrewGraphs {
    return {
      weight: true,
      calc_flow: true,
      realtime_flow: true,
      pressure: true,
      temperature: true,
    } as IBrewGraphs;
  }

  constructor() {
    this.brew_view = BREW_VIEW_ENUM.SINGLE_PAGE;
    this.startup_view = STARTUP_VIEW_ENUM.HOME_PAGE;
    this.date_format = 'DD.MM.YYYY';
    this.config = new Config();

    this.manage_parameters = new ManageBrewParameter();
    this.default_last_coffee_parameters = new DefaultBrewParameter();
    this.visible_list_view_parameters = new ListViewBrewParameter();
    this.repeat_coffee_parameters = new RepeatBrewParameter();

    this.brew_order = new OrderBrewParameter();

    this.bean_manage_parameters = new BeanManageParameter();
    this.bean_visible_list_view_parameters = new BeanListViewParameter();

    this.language = '';
    this.matomo_analytics = undefined;

    this.qr_scanner_information = false;

    this.track_brew_coordinates = false;
    this.fast_brew_repeat = false;
    this.brew_milliseconds = false;
    this.show_archived_beans = true;
    this.show_archived_brews = true;
    this.show_archived_mills = true;
    this.show_archived_preparations = true;
    this.show_archived_green_beans = true;
    this.show_archived_waters = true;
    this.show_archived_brews_on_dashboard = true;
    this.show_archived_graphs = true;
    this.brew_timer_start_delay_time = 1;
    this.brew_timer_start_delay_active = false;

    this.track_caffeine_consumption = false;

    this.show_roasting_section = false;
    this.show_water_section = false;
    this.show_cupping_section = false;
    this.show_graph_section = false;

    this.use_numeric_keyboard_for_grind_size = false;

    this.brew_filter = {
      OPEN: {} as IBrewPageFilter,
      ARCHIVED: {} as IBrewPageFilter,
    };

    this.bean_filter = {
      OPEN: {} as IBeanPageFilter,
      ARCHIVED: {} as IBeanPageFilter,
    };

    this.bean_sort = {
      OPEN: {} as IBeanPageSort,
      ARCHIVED: {} as IBeanPageSort,
    };

    this.green_bean_sort = {
      OPEN: {} as IBeanPageSort,
      ARCHIVED: {} as IBeanPageSort,
    };

    this.graph = {
      ESPRESSO: {} as IBrewGraphs,
      FILTER: {} as IBrewGraphs,
    };

    this.graph.ESPRESSO = this.GET_BREW_GRAPHS();
    this.graph.FILTER = this.GET_BREW_GRAPHS();
    this.graph.FILTER.realtime_flow = false;

    this.graph_time = {
      ESPRESSO: {
        NORMAL_SCREEN: 20,
        FULL_SCREEN: 60,
      },
      FILTER: {
        NORMAL_SCREEN: 20,
        FULL_SCREEN: 60,
      },
    };

    this.graph_weight = {
      ESPRESSO: {
        lower: 0,
        upper: 50,
      },
      FILTER: {
        lower: 0,
        upper: 300,
      },
    };
    this.graph_flow = {
      ESPRESSO: {
        lower: 0,
        upper: 2.5,
      },
      FILTER: {
        lower: 0,
        upper: 20,
      },
    };

    this.brew_rating = 5;
    this.brew_rating_steps = 1;
    this.bean_rating = 5;
    this.bean_rating_steps = 1;

    this.brew_filter.OPEN = this.GET_BREW_FILTER();
    this.brew_filter.ARCHIVED = this.GET_BREW_FILTER();

    this.bean_filter.OPEN = this.GET_BEAN_FILTER();
    this.bean_filter.ARCHIVED = this.GET_BEAN_FILTER();

    this.bean_sort.OPEN = {
      sort_after: BEAN_SORT_AFTER.UNKOWN,
      sort_order: BEAN_SORT_ORDER.UNKOWN,
    } as IBeanPageSort;
    this.bean_sort.ARCHIVED = {
      sort_after: BEAN_SORT_AFTER.UNKOWN,
      sort_order: BEAN_SORT_ORDER.UNKOWN,
    } as IBeanPageSort;

    this.green_bean_sort.OPEN = {
      sort_after: BEAN_SORT_AFTER.UNKOWN,
      sort_order: BEAN_SORT_ORDER.UNKOWN,
    } as IBeanPageSort;
    this.green_bean_sort.ARCHIVED = {
      sort_after: BEAN_SORT_AFTER.UNKOWN,
      sort_order: BEAN_SORT_ORDER.UNKOWN,
    } as IBeanPageSort;

    this.welcome_page_showed = false;
    this.wake_lock = false;
    this.security_check_when_going_back = false;
    this.image_quality = 100;

    this.scale_id = '';
    this.scale_type = null;
    this.bluetooth_scale_stay_connected = false;
    this.bluetooth_scale_tare_on_brew = true;
    this.bluetooth_scale_tare_on_start_timer = true;
    this.bluetooth_scale_stop_timer_on_brew = true;
    this.bluetooth_scale_reset_timer_on_brew = true;
    this.bluetooth_scale_maximize_on_start_timer = false;
    this.bluetooth_ignore_negative_values = false;
    this.bluetooth_ignore_anomaly_values = false;
    this.bluetooth_command_delay = 50;
    this.acaia_heartbeat_command_delay = 1000;
    this.bluetooth_scale_espresso_stop_on_no_weight_change = false;
    this.bluetooth_scale_espresso_stop_on_no_weight_change_min_flow = 0.1;
    this.bluetooth_scale_listening_threshold_start = 0.1;
    this.bluetooth_scale_listening_threshold_active = false;
    this.bluetooth_scale_ignore_weight_button_active = false;
    this.bluetooth_scale_first_drip_threshold = 0.1;

    this.scale_log = false;

    this.pressure_id = '';
    this.pressure_type = null;
    this.pressure_log = false;
    this.pressure_threshold_active = false;
    this.pressure_threshold_bar = 0.5;
    this.pressure_stay_connected = false;

    this.temperature_id = '';
    this.temperature_type = null;
    this.temperature_log = false;
    this.temperature_threshold_active = false;
    this.temperature_threshold_temp = 92;
    this.temperature_stay_connected = false;

    this.refractometer_id = '';
    this.refractometer_type = null;
    this.refractometer_stay_connected = false;
    this.refractometer_log = false;

    this.currency = 'EUR';
    this.brew_milliseconds_leading_digits = 3;
    this.brew_display_bean_image = false;
    this.best_brew = false;

    this.visualizer_active = false;
    this.visualizer_url = 'https://visualizer.coffee/';
    this.visualizer_server = VISUALIZER_SERVER_ENUM.VISUALIZER;
    this.visualizer_username = '';
    this.visualizer_password = '';
    this.visualizer_upload_automatic = false;

    this.show_backup_issues = true;

    this.text_to_speech_active = false;
    this.text_to_speech_rate = 1;
    this.text_to_speech_pitch = 3;
    this.text_to_speech_interval_rate = 500;

    this.haptic_feedback_active = false;
    this.haptic_feedback_brew_started = false;
    this.haptic_feedback_brew_stopped = false;
    this.haptic_feedback_tare = false;

    this.brew_timer_show_hours = true;
    this.brew_timer_show_minutes = true;
  }

  public initializeByObject(settingsObj: ISettings): void {
    Object.assign(this, settingsObj);
    // We need to reassign brew order here, else the class would be dismissed.

    this.manage_parameters = new ManageBrewParameter();
    Object.assign(this.manage_parameters, settingsObj.manage_parameters);

    this.brew_order = new OrderBrewParameter();
    Object.assign(this.brew_order, settingsObj.brew_order);

    this.default_last_coffee_parameters = new DefaultBrewParameter();
    Object.assign(
      this.default_last_coffee_parameters,
      settingsObj.default_last_coffee_parameters
    );

    this.repeat_coffee_parameters = new RepeatBrewParameter();
    Object.assign(
      this.repeat_coffee_parameters,
      settingsObj.repeat_coffee_parameters
    );

    this.bean_manage_parameters = new BeanManageParameter();
    Object.assign(
      this.bean_manage_parameters,
      settingsObj.bean_manage_parameters
    );

    this.bean_visible_list_view_parameters = new BeanListViewParameter();
    Object.assign(
      this.bean_visible_list_view_parameters,
      settingsObj.bean_visible_list_view_parameters
    );
  }

  public resetFilter() {
    this.brew_filter = {
      OPEN: {} as IBrewPageFilter,
      ARCHIVED: {} as IBrewPageFilter,
    };
    this.brew_filter.OPEN = this.GET_BREW_FILTER();
    this.brew_filter.ARCHIVED = this.GET_BREW_FILTER();

    this.bean_filter = {
      OPEN: {} as IBeanPageFilter,
      ARCHIVED: {} as IBeanPageFilter,
    };
    this.bean_filter.OPEN = this.GET_BEAN_FILTER();
    this.bean_filter.ARCHIVED = this.GET_BEAN_FILTER();
  }
}
