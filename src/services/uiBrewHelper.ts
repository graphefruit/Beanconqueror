/** Core */
import {Injectable} from '@angular/core';

import {UIBeanStorage} from './uiBeanStorage';
import {UIMillStorage} from './uiMillStorage';
import {UIPreparationStorage} from './uiPreparationStorage';
import {UIAlert} from './uiAlert';
import {Brew} from '../classes/brew/brew';
import {IBean} from '../interfaces/bean/iBean';
import {IPreparation} from '../interfaces/preparation/iPreparation';
import {IMill} from '../interfaces/mill/iMill';
import {UISettingsStorage} from './uiSettingsStorage';
import {Settings} from '../classes/settings/settings';
import {Preparation} from '../classes/preparation/preparation';

/**
 * Handles every helping functionalities
 */

@Injectable({
  providedIn: 'root'
})
export class UIBrewHelper {

  private canBrewBoolean: boolean = undefined;

  private settings: Settings;
  public static sortBrews(_sortingBrews: Array<Brew>): Array<Brew> {
    const sortedBrews: Array<Brew> = _sortingBrews.sort((obj1, obj2) => {
      if (obj1.config.unix_timestamp < obj2.config.unix_timestamp) {
        return 1;
      }
      if (obj1.config.unix_timestamp > obj2.config.unix_timestamp) {
        return -1;
      }

      return 0;
    });
    return sortedBrews;
  }
  public static sortBrewsASC(_sortingBrews: Array<Brew>): Array<Brew> {
    const sortedBrews: Array<Brew> = _sortingBrews.sort((obj1, obj2) => {
      if (obj1.config.unix_timestamp > obj2.config.unix_timestamp) {
        return 1;
      }
      if (obj1.config.unix_timestamp < obj2.config.unix_timestamp) {
        return -1;
      }

      return 0;
    });
    return sortedBrews;
  }
  constructor (private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiMillStorage: UIMillStorage,
               private readonly uiPreparationStorage: UIPreparationStorage,
               private readonly uiAlert: UIAlert,
               private readonly uiSettingsStorage: UISettingsStorage) {


    this.uiBeanStorage.attachOnEvent().subscribe(() => {
      this.canBrewBoolean = undefined;
    });
    this.uiMillStorage.attachOnEvent().subscribe(() => {
      this.canBrewBoolean = undefined;
    });
    this.uiPreparationStorage.attachOnEvent().subscribe(() => {
      this.canBrewBoolean = undefined;
    });

    this.uiSettingsStorage.attachOnEvent().subscribe(() => {
      this.settings = this.uiSettingsStorage.getSettings();
    });
    this.settings = this.uiSettingsStorage.getSettings();

  }

  public fieldVisible(_settingsField:boolean,_preparationField:boolean,_useCustomPreparation: boolean) {
    return _useCustomPreparation?_preparationField:_settingsField;
  }

  public fieldOrder(_settingsOrder:number, _preparationOrder:number, _useCustomPreparation: boolean) {
    return _useCustomPreparation?_preparationOrder:_settingsOrder;
  }



  public canBrew(): boolean {
    if (this.canBrewBoolean === undefined || this.canBrewBoolean === false) {
      const hasBeans: boolean = (this.uiBeanStorage.getAllEntries().length > 0 && this.uiBeanStorage.getAllEntries()
        .filter((bean) => !bean.finished).length > 0);
      const hasPreparationMethods: boolean = (this.uiPreparationStorage.getAllEntries().filter((e) => !e.finished).length > 0);
      const hasMills: boolean = (this.uiMillStorage.getAllEntries().filter((e) => !e.finished).length > 0);

      this.canBrewBoolean = hasBeans && hasPreparationMethods && hasMills;
    }

    return this.canBrewBoolean;

  }

  public canBrewIfNotShowMessage() {
    if (this.canBrew() === false) {
      this.uiAlert.presentCustomPopover('CANT_START_NEW_BREW_TITLE', 'CANT_START_NEW_BREW_DESCRIPTION', 'UNDERSTOOD');
      return false;
    }
    return true;
  }


  public repeatBrew(_brewToCopy: Brew): Brew {
    const repeatBrew: Brew = new Brew();
    const brewBean: IBean = this.uiBeanStorage.getByUUID(_brewToCopy.bean);
    if (!brewBean.finished) {
      repeatBrew.bean = brewBean.config.uuid;
    }
    repeatBrew.grind_size = _brewToCopy.grind_size;

    repeatBrew.grind_weight = _brewToCopy.grind_weight;

    const brewPreparation: IPreparation = this.uiPreparationStorage.getByUUID(_brewToCopy.method_of_preparation);
    if (!brewPreparation.finished) {
      repeatBrew.method_of_preparation = brewPreparation.config.uuid;
    }

    const brewMill: IMill = this.uiMillStorage.getByUUID(_brewToCopy.mill);
    if (!brewMill.finished) {
      repeatBrew.mill = brewMill.config.uuid;
    }
    repeatBrew.mill_timer = _brewToCopy.mill_timer;
    repeatBrew.mill_speed = _brewToCopy.mill_speed;
    repeatBrew.pressure_profile = _brewToCopy.pressure_profile;
    repeatBrew.brew_temperature = _brewToCopy.brew_temperature;
    repeatBrew.brew_temperature_time = _brewToCopy.brew_temperature_time;
    repeatBrew.brew_time = _brewToCopy.brew_time;
    repeatBrew.brew_quantity = _brewToCopy.brew_quantity;
    repeatBrew.brew_quantity_type = _brewToCopy.brew_quantity_type;
    repeatBrew.coffee_type = _brewToCopy.coffee_type;
    repeatBrew.coffee_concentration = _brewToCopy.coffee_concentration;
    repeatBrew.coffee_first_drip_time = _brewToCopy.coffee_first_drip_time;
    repeatBrew.coffee_blooming_time = _brewToCopy.coffee_blooming_time;
    repeatBrew.rating = _brewToCopy.rating;
    repeatBrew.note = _brewToCopy.note;
    repeatBrew.coordinates = _brewToCopy.coordinates;
    repeatBrew.method_of_preparation_tools = _brewToCopy.method_of_preparation_tools;
    repeatBrew.tds = _brewToCopy.tds;
    repeatBrew.brew_beverage_quantity = _brewToCopy.brew_beverage_quantity;
    repeatBrew.brew_beverage_quantity_type = _brewToCopy.brew_beverage_quantity_type;
    return repeatBrew;
  }


  public cleanInvisibleBrewData(brew: Brew) {
    const settingsObj: Settings = this.uiSettingsStorage.getSettings();
    let checkData: Settings | Preparation;
    if (brew.getPreparation().use_custom_parameters === true) {
      checkData = brew.getPreparation()
    } else {
      checkData = settingsObj;
    }



    if (!checkData.manage_parameters.grind_size ) {
      brew.grind_size = '';
    }
    if (!checkData.manage_parameters.grind_weight) {
      brew.grind_weight = 0;
    }

    if (!checkData.manage_parameters.mill_timer) {
      brew.mill_timer = 0;
    }
    if (!checkData.manage_parameters.mill_speed) {
      brew.mill_speed = 0;
    }
    if (!checkData.manage_parameters.pressure_profile) {
      brew.pressure_profile = '';
    }
    if (!checkData.manage_parameters.brew_temperature) {
      brew.brew_temperature = 0;
    }
    if (!checkData.manage_parameters.brew_temperature_time) {
     brew.brew_temperature_time = 0;
    }
    if (!checkData.manage_parameters.brew_time) {
      brew.brew_time = 0;
    }

    if (!checkData.manage_parameters.brew_quantity) {
      brew.brew_quantity = 0;
    }
    if (!checkData.manage_parameters.coffee_type) {
      brew.coffee_type = '';
    }
    if (!checkData.manage_parameters.coffee_concentration) {
      brew.coffee_concentration = '';
    }
    if (!checkData.manage_parameters.coffee_first_drip_time) {
     brew.coffee_first_drip_time = 0;
    }
    if (!checkData.manage_parameters.coffee_blooming_time) {
      brew.coffee_blooming_time = 0;
    }

    if (!checkData.manage_parameters.rating) {
      brew.rating = 0;
    }
    if (!checkData.manage_parameters.note) {
      brew.note ='';
    }
    if (!checkData.manage_parameters.tds) {
      brew.tds =0;
    }
    if (!checkData.manage_parameters.brew_beverage_quantity) {
      brew.brew_beverage_quantity = 0;
    }
    if (!checkData.manage_parameters.method_of_preparation_tool) {
      brew.method_of_preparation_tools = [];
    }

  }

}
