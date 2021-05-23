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
import {TranslateService} from '@ngx-translate/core';
import {ICupping} from '../interfaces/cupping/iCupping';
import {UIBrewStorage} from './uiBrewStorage';
import {Bean} from '../classes/bean/bean';
import {UIBeanHelper} from './uiBeanHelper';

/**
 * Handles every helping functionalities
 */

@Injectable({
  providedIn: 'root'
})
export class UIBrewHelper {


  private static instance: UIBrewHelper;

  private canBrewBoolean: boolean = undefined;

  private settings: Settings;

  public static getInstance(): UIBrewHelper {
    if (UIBrewHelper.instance) {
      return UIBrewHelper.instance;
    }
    // noinspection TsLint

    return undefined;
  }
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
               private readonly uiBrewStorage: UIBrewStorage,
               private readonly uiAlert: UIAlert,
               private readonly uiSettingsStorage: UISettingsStorage,
               private readonly translate: TranslateService) {


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

    if (UIBrewHelper.instance === undefined) {
      UIBrewHelper.instance = this;
    }

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

  public checkIfBeanPackageIsConsumed(_bean: Bean): boolean {
      const bean: Bean = _bean;
      if (bean.weight > 0) {
        const beanPackageWeight = bean.weight;
        let usedWeightCount: number = 0;
        const brews: Array<Brew> = this.uiBrewStorage.getAllEntries().filter((e)=> e.getBean().config.uuid === bean.config.uuid);
        for (const brew of brews) {
          usedWeightCount += brew.grind_weight;
        }



        // 5 grams is threshold
        // If we just got 5 grams left, ask the user if he wants to archive his beans
        if ((beanPackageWeight - usedWeightCount) <= 5) {
          return true;
        }

      }
      return false;
  }


  public async checkIfBeanPackageIsConsumedTriggerMessageAndArchive(_bean) {
   if (this.checkIfBeanPackageIsConsumed(_bean)) {
     try {
       await this.uiAlert.showConfirm('IT looks like your bean package is consumed, shall we archive it right now');
       // He said yes
       UIBeanHelper.getInstance().archiveBeanWithRatingQuestion(_bean);

     } catch (ex) {

     }

   }

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


  public showSectionAfterBrew(_preparation: Preparation): boolean {

    let checkData: Settings | Preparation;
    if (_preparation.use_custom_parameters === true) {
      checkData = _preparation;
    } else {
      checkData = this.settings;
    }
    return (checkData.manage_parameters.brew_quantity ||
      checkData.manage_parameters.coffee_type ||
      checkData.manage_parameters.coffee_concentration ||
      checkData.manage_parameters.rating ||
      checkData.manage_parameters.note ||
      checkData.manage_parameters.set_custom_brew_time ||
      checkData.manage_parameters.attachments ||
      checkData.manage_parameters.tds ||
      checkData.manage_parameters.brew_beverage_quantity);
  }


  public showSectionWhileBrew(_preparation: Preparation): boolean {
    let checkData: Settings | Preparation;
    if (_preparation.use_custom_parameters === true) {
      checkData = _preparation;
    } else {
      checkData = this.settings;
    }
    return (checkData.manage_parameters.pressure_profile ||
      checkData.manage_parameters.brew_temperature_time ||
      checkData.manage_parameters.brew_time ||
      checkData.manage_parameters.coffee_blooming_time ||
      checkData.manage_parameters.coffee_first_drip_time);
  }

  public showSectionBeforeBrew(_preparation: Preparation): boolean {
    let checkData: Settings | Preparation;
    if (_preparation.use_custom_parameters === true) {
      checkData = _preparation;
    } else {
      checkData = this.settings;
    }
    return (checkData.manage_parameters.grind_size ||
      checkData.manage_parameters.grind_weight ||
      checkData.manage_parameters.brew_temperature ||
      checkData.manage_parameters.method_of_preparation ||
      checkData.manage_parameters.bean_type ||
      checkData.manage_parameters.mill ||
      checkData.manage_parameters.mill_speed ||
      checkData.manage_parameters.mill_timer);

  }

  public showCupping(_data: Brew): boolean {
    return (_data.cupping.dry_fragrance > 0 ||
      _data.cupping.wet_aroma > 0 ||
      _data.cupping.brightness > 0 ||
      _data.cupping.flavor > 0 ||
      _data.cupping.body > 0 ||
      _data.cupping.finish > 0 ||
      _data.cupping.sweetness > 0 ||
      _data.cupping.clean_cup > 0 ||
      _data.cupping.complexity > 0 ||
      _data.cupping.uniformity > 0);
  }


  public getCuppingChartData(_data: Brew | ICupping) {

    let data:any;
    if (_data instanceof Brew) {
      data =_data.cupping;
    } else {
      data = _data;
    }
    const cuppingData = {
      labels: [
        this.translate.instant('CUPPING_SCORE_DRY_FRAGRANCE'),
        this.translate.instant('CUPPING_SCORE_WET_AROMA'),
        this.translate.instant('CUPPING_SCORE_BRIGHTNESS'),
        this.translate.instant('CUPPING_SCORE_FLAVOR'),
        this.translate.instant('CUPPING_SCORE_BODY'),
        this.translate.instant('CUPPING_SCORE_FINISH'),
        this.translate.instant('CUPPING_SCORE_SWEETNESS'),
        this.translate.instant('CUPPING_SCORE_CLEAN_CUP'),
        this.translate.instant('CUPPING_SCORE_COMPLEXITY'),
        this.translate.instant('CUPPING_SCORE_UNIFORMITY'),
      ],
      datasets: [
        {
          fillColor: 'rgba(220,220,220,0.5)',
          strokeColor: 'rgba(220,220,220,1)',
          pointColor: 'rgba(220,220,220,1)',
          pointStrokeColor: '#fff',
          data: [
            data.dry_fragrance,
            data.wet_aroma,
            data.brightness,
            data.flavor,
            data.body,
            data.finish,
            data.sweetness,
            data.clean_cup,
            data.complexity,
            data.uniformity
          ]
        }]
    };
    const chartOptions = {
      responsive: true,
      legend: false,
      title: {
        display: false,
        text: '',
      },

      scale: {
        ticks: {
          beginAtZero: true,
          max: 10,
          min: 0,
          step: 0.1
        }
      },
      tooltips: {
        // Disable the on-canvas tooltip
        enabled: false,
      },
      maintainAspectRatio: true,
      aspectRatio: 1,
    };
    const cuppingElementData = {
      type: 'radar',
      data: cuppingData,
      options: chartOptions
    };
    return cuppingElementData;
  }

}
