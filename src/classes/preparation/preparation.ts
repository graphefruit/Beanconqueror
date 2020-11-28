/** Interfaces */
import {IPreparation} from '../../interfaces/preparation/iPreparation';
/** Classes */
import {Config} from '../objectConfig/objectConfig';
import {PREPARATION_TYPES} from '../../enums/preparations/preparationTypes';
import {PREPARATION_STYLE_TYPE} from '../../enums/preparations/preparationStyleTypes';
import {DefaultBrewParameter} from '../parameter/defaultBrewParameter';
import {OrderBrewParameter} from '../parameter/orderBrewParameter';
import {ManageBrewParameter} from '../parameter/manageBrewParameter';
import {PreparationTool} from './preparationTool';


export class Preparation implements IPreparation {
  public name: string;
  public note: string;
  public config: Config;
  public style_type: PREPARATION_STYLE_TYPE;
  public type: PREPARATION_TYPES;
  public finished: boolean;
  public use_custom_parameters: boolean;
  public manage_parameters: ManageBrewParameter;
  public default_last_coffee_parameters: DefaultBrewParameter;
  public brew_order: OrderBrewParameter;
  public tools: Array<PreparationTool>;
  constructor() {
    this.name = '';
    this.note = '';
    this.config = new Config();
    this.type = 'CUSTOM_PREPARATION' as PREPARATION_TYPES;
    this.style_type = undefined;
    this.finished = false;

    this.use_custom_parameters = false;
    this.manage_parameters = new ManageBrewParameter();
    this.default_last_coffee_parameters = new DefaultBrewParameter();
    this.brew_order = new OrderBrewParameter();
    this.tools = [];
  }

  public initializeByObject (preparationObj: IPreparation): void {
    Object.assign(this, preparationObj);

    // We need to reassign brew order here, else the class would be dismissed.
    this.brew_order = new OrderBrewParameter();
    Object.assign(this.brew_order, preparationObj.brew_order);

    this.default_last_coffee_parameters = new DefaultBrewParameter();
    Object.assign(this.default_last_coffee_parameters, preparationObj.default_last_coffee_parameters);
  }


  public getPresetStyleType() {
    switch (this.type) {
      case PREPARATION_TYPES.CUSTOM_PREPARATION:
        return  PREPARATION_STYLE_TYPE.ESPRESSO;
      case PREPARATION_TYPES.PORTAFILTER:
        return  PREPARATION_STYLE_TYPE.ESPRESSO;
      case PREPARATION_TYPES.BIALETTI:
        return  PREPARATION_STYLE_TYPE.ESPRESSO;
      case PREPARATION_TYPES.V60:
        return  PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.CHEMEX:
        return  PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.AEROPRESS:
        return  PREPARATION_STYLE_TYPE.FULL_IMMERSION;
      case PREPARATION_TYPES.KALITA_WAVE:
        return  PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.TURKISH:
        return  PREPARATION_STYLE_TYPE.FULL_IMMERSION;
      case PREPARATION_TYPES.SWANNECK:
        return  PREPARATION_STYLE_TYPE.PERCOLATION;
      case PREPARATION_TYPES.AEROPRESS_INVERTED:
        return  PREPARATION_STYLE_TYPE.FULL_IMMERSION;
      case PREPARATION_TYPES.DRIPPER:
        return  PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.DELTER_PRESS:
        return  PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.COLD_BREW:
        return  PREPARATION_STYLE_TYPE.FULL_IMMERSION;
      case PREPARATION_TYPES.BLUE_DRIPPER:
        return  PREPARATION_STYLE_TYPE.POUR_OVER;
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
      case PREPARATION_TYPES.TURKISH:
        return 'beanconqueror-preparation-turkish';
        case PREPARATION_TYPES.SWANNECK:
        return 'beanconqueror-preparation-swanneck';
      case PREPARATION_TYPES.AEROPRESS_INVERTED:
        return 'beanconqueror-preparation-aeropress-inverted';
      case PREPARATION_TYPES.DRIPPER:
        return 'beanconqueror-preparation-dripper';
        case PREPARATION_TYPES.DELTER_PRESS:
        return 'beanconqueror-preparation-delter-press';
      case PREPARATION_TYPES.COLD_BREW:
          return 'beanconqueror-preparation-cold-brew';
      case PREPARATION_TYPES.BLUE_DRIPPER:
          return 'beanconqueror-preparation-blue-dripper';
      default:
        return 'beanconqueror-preparation-custom';
    }
  }

}
