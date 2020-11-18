/** Interfaces */
import {IPreparation} from '../../interfaces/preparation/iPreparation';
/** Classes */
import {Config} from '../objectConfig/objectConfig';
import {PREPARATION_TYPES} from '../../enums/preparations/preparationTypes';
import {PREPARATION_STYLE_TYPE} from '../../enums/preparations/preparationStyleTypes';
import {DefaultBrewParameter} from '../parameter/defaultBrewParameter';
import {OrderBrewParameter} from '../parameter/orderBrewParameter';


export class Preparation implements IPreparation {
  public name: string;
  public note: string;
  public config: Config;
  public style_type: PREPARATION_STYLE_TYPE;
  public type: PREPARATION_TYPES;
  public finished: boolean;
  public parameters;
  constructor() {
    this.name = '';
    this.note = '';
    this.config = new Config();
    this.type = 'CUSTOM_PREPARATION' as PREPARATION_TYPES;
    this.style_type = undefined;
    this.finished = false;

    this.parameters = {
      brew_time: false,
        brew_temperature_time: false,
        grind_size: false,
        grind_weight: false,
        mill: false,
        mill_speed: false,
        mill_timer: false,
        pressure_profile: false,
        method_of_preparation: false,
        brew_quantity: false,
        bean_type: false,
        brew_temperature: false,
        note: false,
        attachments: false,
        rating: false,
        coffee_type: false,
        coffee_concentration: false,
        coffee_first_drip_time: false,
        coffee_blooming_time: false,
        set_last_coffee_brew: false,
        set_custom_brew_time: false,
        tds: false,
        brew_beverage_quantity: false,
        default_last_coffee_parameters: new DefaultBrewParameter(),
        brew_order: new OrderBrewParameter(),
        language: '',
        analytics: false,
        track_brew_coordinates: false,
        fast_brew_repeat: false,
      };
  }

  public initializeByObject (preparationObj: IPreparation): void {
    Object.assign(this, preparationObj);
  }


  public getPresetStyleType() {
    switch (this.type) {
      case PREPARATION_TYPES.CUSTOM_PREPARATION:
        return  PREPARATION_STYLE_TYPE.ESPRESSO;
      case PREPARATION_TYPES.PORTAFILTER:
        return  PREPARATION_STYLE_TYPE.ESPRESSO;
      default:
        return PREPARATION_STYLE_TYPE.POUR_OVER
    }
  }

  public getIcon(_key?: PREPARATION_TYPES): string {
    if (_key === undefined) {
      _key = this.type;
    }
    switch (_key) {
      case PREPARATION_TYPES.BIALETTI:
        return 'beanconqueror-preparation-bialetti';
      case PREPARATION_TYPES.V60:
        return 'beanconqueror-preparation-v60';
      case PREPARATION_TYPES.CHEMEX:
        return 'beanconqueror-preparation-chemex';
      case PREPARATION_TYPES.AEROPRESS:
        return 'beanconqueror-preparation-aeropress';
      case PREPARATION_TYPES.KALITA_WAVE:
        return 'beanconqueror-preparation-kalita-wave';
      case PREPARATION_TYPES.PORTAFILTER:
        return 'beanconqueror-preparation-portafilter';
      case PREPARATION_TYPES.FRENCH_PRESS:
        return 'beanconqueror-preparation-frenchpress';
      default:
        return 'beanconqueror-preparation-custom';
    }
  }

}
