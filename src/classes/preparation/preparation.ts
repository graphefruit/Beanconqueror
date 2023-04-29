/** Interfaces */
import { IPreparation } from '../../interfaces/preparation/iPreparation';
/** Classes */
import { Config } from '../objectConfig/objectConfig';
import { PREPARATION_TYPES } from '../../enums/preparations/preparationTypes';
import { PREPARATION_STYLE_TYPE } from '../../enums/preparations/preparationStyleTypes';
import { DefaultBrewParameter } from '../parameter/defaultBrewParameter';
import { OrderBrewParameter } from '../parameter/orderBrewParameter';
import { ManageBrewParameter } from '../parameter/manageBrewParameter';
import { PreparationTool } from './preparationTool';
import { UIHelper } from '../../services/uiHelper';
import { ListViewBrewParameter } from '../parameter/listViewBrewParameter';
import { RepeatBrewParameter } from '../parameter/repeatBrewParameter';
import { ConnectedPreparationDevice } from '../preparationDevice/connectedPreparationDevice';

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
  public visible_list_view_parameters: ListViewBrewParameter;
  public repeat_coffee_parameters: RepeatBrewParameter;
  public brew_order: OrderBrewParameter;
  public tools: Array<PreparationTool>;
  public attachments: Array<string>;
  public connectedPreparationDevice: ConnectedPreparationDevice;

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
    this.visible_list_view_parameters = new ListViewBrewParameter();
    this.repeat_coffee_parameters = new RepeatBrewParameter();
    this.repeat_coffee_parameters.repeat_coffee_active = false;
    this.repeat_coffee_parameters.coffee_first_drip_time = false;
    this.repeat_coffee_parameters.brew_beverage_quantity = false;
    this.repeat_coffee_parameters.brew_quantity = false;

    this.brew_order = new OrderBrewParameter();
    this.tools = [];
    this.attachments = [];

    this.connectedPreparationDevice = new ConnectedPreparationDevice();
  }

  public initializeByObject(preparationObj: IPreparation): void {
    Object.assign(this, preparationObj);

    // We need to reassign brew order here, else the class would be dismissed.
    this.brew_order = new OrderBrewParameter();
    Object.assign(this.brew_order, preparationObj.brew_order);

    this.default_last_coffee_parameters = new DefaultBrewParameter();
    Object.assign(
      this.default_last_coffee_parameters,
      preparationObj.default_last_coffee_parameters
    );

    // Maybe the connectedPreparationDevice is not existing as parameter, so we cant assign it.
    if ('connectedPreparationDevice' in preparationObj) {
      Object.assign(
        this.connectedPreparationDevice,
        preparationObj.connectedPreparationDevice
      );
    } else {
      this.connectedPreparationDevice = new ConnectedPreparationDevice();
    }
  }

  public getPresetStyleType() {
    switch (this.type) {
      case PREPARATION_TYPES.CUSTOM_PREPARATION:
        return PREPARATION_STYLE_TYPE.ESPRESSO;
      case PREPARATION_TYPES.PORTAFILTER:
        return PREPARATION_STYLE_TYPE.ESPRESSO;
      case PREPARATION_TYPES.BIALETTI:
        return PREPARATION_STYLE_TYPE.PERCOLATION;
      case PREPARATION_TYPES.V60:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.CHEMEX:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.AEROPRESS:
        return PREPARATION_STYLE_TYPE.FULL_IMMERSION;
      case PREPARATION_TYPES.KALITA_WAVE:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.TURKISH:
        return PREPARATION_STYLE_TYPE.FULL_IMMERSION;
      case PREPARATION_TYPES.AEROPRESS_INVERTED:
        return PREPARATION_STYLE_TYPE.FULL_IMMERSION;
      case PREPARATION_TYPES.DRIPPER:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.DELTER_PRESS:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.COLD_BREW:
        return PREPARATION_STYLE_TYPE.FULL_IMMERSION;
      case PREPARATION_TYPES.BLUE_DRIPPER:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.FRENCH_PRESS:
        return PREPARATION_STYLE_TYPE.FULL_IMMERSION;
      case PREPARATION_TYPES.GINA:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.KONO:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.CAFELAT:
        return PREPARATION_STYLE_TYPE.ESPRESSO;
      case PREPARATION_TYPES.ORIGAMI:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.OREA:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.FLAIR:
        return PREPARATION_STYLE_TYPE.ESPRESSO;
      case PREPARATION_TYPES.HAND_LEVER:
        return PREPARATION_STYLE_TYPE.ESPRESSO;
      case PREPARATION_TYPES.COLD_DRIP:
        return PREPARATION_STYLE_TYPE.PERCOLATION;
      case PREPARATION_TYPES.APRIL_BREWER:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.ESPRO_BLOOM:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.FELLOW_STAGG:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.HSIAO_50:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.KARLSBADER_KANNE:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.MOCCA_MASTER:
        return PREPARATION_STYLE_TYPE.PERCOLATION;
      case PREPARATION_TYPES.SIPHON:
        return PREPARATION_STYLE_TYPE.FULL_IMMERSION;
      case PREPARATION_TYPES.CAFEC_FLOWER:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.DECEMBER_DRIPPER:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.DECENT_ESPRESSO:
        return PREPARATION_STYLE_TYPE.ESPRESSO;
      case PREPARATION_TYPES.HARIO_SWITCH:
        return PREPARATION_STYLE_TYPE.FULL_IMMERSION;
      case PREPARATION_TYPES.HARIO_WOODNECK:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.RATIO_SIX_COFFEE_BREWER:
        return PREPARATION_STYLE_TYPE.PERCOLATION;
      case PREPARATION_TYPES.ROK:
        return PREPARATION_STYLE_TYPE.ESPRESSO;
      case PREPARATION_TYPES.TORNADO_DUO:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      case PREPARATION_TYPES.TRICOLATE:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
      default:
        return PREPARATION_STYLE_TYPE.POUR_OVER;
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
      case PREPARATION_TYPES.GINA:
        return 'beanconqueror-preparation-gina';
      case PREPARATION_TYPES.KONO:
        return 'beanconqueror-preparation-kono';
      case PREPARATION_TYPES.ORIGAMI:
        return 'beanconqueror-preparation-origami';
      case PREPARATION_TYPES.CAFELAT:
        return 'beanconqueror-preparation-cafelat';
      case PREPARATION_TYPES.OREA:
        return 'beanconqueror-preparation-orea';
      case PREPARATION_TYPES.FLAIR:
        return 'beanconqueror-preparation-flair';
      case PREPARATION_TYPES.HAND_LEVER:
        return 'beanconqueror-preparation-hand-lever';
      case PREPARATION_TYPES.COLD_DRIP:
        return 'beanconqueror-preparation-cold-drip';
      case PREPARATION_TYPES.APRIL_BREWER:
        return 'beanconqueror-preparation-april-brewer';
      case PREPARATION_TYPES.ESPRO_BLOOM:
        return 'beanconqueror-preparation-espro-bloom';
      case PREPARATION_TYPES.FELLOW_STAGG:
        return 'beanconqueror-preparation-fellow-stagg';
      case PREPARATION_TYPES.HSIAO_50:
        return 'beanconqueror-preparation-hsiao-50';
      case PREPARATION_TYPES.KARLSBADER_KANNE:
        return 'beanconqueror-preparation-karlsbader-kanne';
      case PREPARATION_TYPES.MOCCA_MASTER:
        return 'beanconqueror-preparation-mocca-master';
      case PREPARATION_TYPES.SIPHON:
        return 'beanconqueror-preparation-siphon';
      case PREPARATION_TYPES.CAFEC_FLOWER:
        return 'beanconqueror-preparation-cafec-flower';
      case PREPARATION_TYPES.DECEMBER_DRIPPER:
        return 'beanconqueror-preparation-december-dripper';
      case PREPARATION_TYPES.DECENT_ESPRESSO:
        return 'beanconqueror-preparation-decent-espresso';
      case PREPARATION_TYPES.HARIO_SWITCH:
        return 'beanconqueror-preparation-hario-switch';
      case PREPARATION_TYPES.HARIO_WOODNECK:
        return 'beanconqueror-preparation-hario-woodneck';
      case PREPARATION_TYPES.RATIO_SIX_COFFEE_BREWER:
        return 'beanconqueror-preparation-ratio-six-coffee-brewer';
      case PREPARATION_TYPES.ROK:
        return 'beanconqueror-preparation-rok';
      case PREPARATION_TYPES.TORNADO_DUO:
        return 'beanconqueror-preparation-tornado-duo';
      case PREPARATION_TYPES.TRICOLATE:
        return 'beanconqueror-preparation-tricolate';
      default:
        return 'beanconqueror-preparation-custom';
    }
  }

  public addTool(_toolName: string): boolean {
    const nextTool = _toolName;
    if (nextTool.trim() !== '') {
      const prepTool: PreparationTool = new PreparationTool();
      prepTool.name = nextTool;
      prepTool.config.uuid = UIHelper.generateUUID();
      prepTool.config.unix_timestamp = UIHelper.getUnixTimestamp();
      this.tools.push(prepTool);
      return true;
    }
    return false;
  }

  public addToolByObject(_tool: PreparationTool): boolean {
    const nextTool = _tool;
    if (nextTool.name !== '') {
      const prepTool: PreparationTool = new PreparationTool();
      prepTool.name = nextTool.name;
      prepTool.config.uuid = UIHelper.generateUUID();
      prepTool.config.unix_timestamp = UIHelper.getUnixTimestamp();
      prepTool.archived = _tool.archived;
      this.tools.push(prepTool);
      return true;
    }
    return false;
  }

  public deleteTool(_tool: PreparationTool): boolean {
    const tool: PreparationTool = _tool as PreparationTool;
    for (let i = 0; i < this.tools.length; i++) {
      if (this.tools[i].config.uuid === tool.config.uuid) {
        this.tools.splice(i, 1);
        return true;
      }
    }
    return false;
  }
  public updateTool(_tool: PreparationTool): boolean {
    const tool: PreparationTool = _tool as PreparationTool;
    for (let i = 0; i < this.tools.length; i++) {
      if (this.tools[i].config.uuid === tool.config.uuid) {
        this.tools[i] = _tool;
        return true;
      }
    }
    return false;
  }

  public hasPhotos(): boolean {
    return this.attachments && this.attachments.length > 0;
  }
}
