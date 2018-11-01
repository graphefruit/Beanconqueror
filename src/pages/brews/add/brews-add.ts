/**Core**/
import {Component, ViewChild} from '@angular/core';
/**Ionic**/
import {ViewController, Slides} from 'ionic-angular';

/**Services**/
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {UIImage} from '../../../services/uiImage';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {UIHelper} from '../../../services/uiHelper';
/**Components**/
import {TimerComponent} from '../../../components/timer/timer';

/**Enums**/
import {BREW_VIEW_ENUM} from '../../../enums/settings/brewView';


/**Classes**/
import {Brew} from '../../../classes/brew/brew';

/**Interfaces**/
import {IPreparation} from '../../../interfaces/preparation/iPreparation';
import {IBean} from '../../../interfaces/bean/iBean';
import {ISettings} from '../../../interfaces/settings/iSettings';
/**Enums**/

import {BREW_QUANTITY_TYPES_ENUM} from '../../../enums/brews/brewQuantityTypes';

@Component({
  selector: 'brews-add',
  templateUrl: 'brews-add.html',
})
export class BrewsAddModal {
  @ViewChild('photoSlides') photoSlides: Slides;
  @ViewChild('timer') timer: TimerComponent;
  @ViewChild('brewTemperatureTime') brewTemperatureTime: TimerComponent;


  public data: Brew = new Brew();

  public BREW_VIEW_ENUM = BREW_VIEW_ENUM;
  public settings: ISettings;

  public brewQuantityTypeEnums = BREW_QUANTITY_TYPES_ENUM;

  public method_of_preparations: Array<IPreparation> = [];
  beans: Array<IBean> = [];

  public keyDownHandler(event: Event) {

    //  event.preventDefault();
  }

  constructor(private viewCtrl: ViewController, private uiBeanStorage: UIBeanStorage, private uiPreparationStorage: UIPreparationStorage,
              private uiBrewStorage: UIBrewStorage, private uiImage: UIImage, private uiSettingsStorage: UISettingsStorage, public uiHelper: UIHelper) {
    //Initialize to standard in dropdowns

    this.settings = this.uiSettingsStorage.getSettings();
    this.method_of_preparations = this.uiPreparationStorage.getAllEntries();
    this.beans = this.uiBeanStorage.getAllEntries();

    //Get first entry
    this.data.bean = this.beans[0].config.uuid;
    this.data.method_of_preparation = this.method_of_preparations[0].config.uuid;


  }

  ionViewDidEnter() {
    this.__loadLastBrew();
  }

  private __loadLastBrew() {
    if (this.settings.set_last_coffee_brew === true) {
      let brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
      if (brews.length > 0) {
        let lastBrew: Brew = brews[brews.length - 1];


        if (this.settings.default_last_coffee_parameters.bean_type === true) {
          this.data.bean = lastBrew.bean;
        }

        if (this.settings.default_last_coffee_parameters.grind_size === true) {
          this.data.grind_size = lastBrew.grind_size;
        }
        if (this.settings.default_last_coffee_parameters.grind_weight === true) {
          this.data.grind_weight = lastBrew.grind_weight;
        }
        if (this.settings.default_last_coffee_parameters.method_of_preparation === true) {
          this.data.method_of_preparation = lastBrew.method_of_preparation;
        }
        if (this.settings.default_last_coffee_parameters.brew_temperature === true) {
          this.data.brew_temperature = lastBrew.brew_temperature;
        }
        debugger;
        if (this.brewTemperatureTime) {
          if (this.settings.default_last_coffee_parameters.brew_temperature_time === true) {
            this.data.brew_temperature_time = lastBrew.brew_temperature_time;
            this.brewTemperatureTime.setTime(this.data.brew_temperature_time);
          }
        }
        if (this.timer) {
          if (this.settings.default_last_coffee_parameters.brew_time === true) {
            this.data.brew_time = lastBrew.brew_time;
            this.timer.setTime(this.data.brew_time);
          }
        }

        if (this.settings.default_last_coffee_parameters.brew_quantity === true) {
          this.data.brew_quantity = lastBrew.brew_quantity;
          this.data.brew_quantity_type = lastBrew.brew_quantity_type;
        }
        if (this.settings.default_last_coffee_parameters.coffee_type === true) {
          this.data.coffee_type = lastBrew.coffee_type;
        }
        if (this.settings.default_last_coffee_parameters.coffee_concentration === true) {
          this.data.coffee_concentration = lastBrew.coffee_concentration;
        }
        if (this.settings.default_last_coffee_parameters.coffee_first_drip_time === true) {
          this.data.coffee_first_drip_time = lastBrew.coffee_first_drip_time;
        }
        if (this.settings.default_last_coffee_parameters.coffee_blooming_time === true) {
          this.data.coffee_blooming_time = lastBrew.coffee_blooming_time;
        }


        if (this.settings.default_last_coffee_parameters.rating === true) {
          this.data.rating = lastBrew.rating;
        }
        if (this.settings.default_last_coffee_parameters.note === true) {
          this.data.note = lastBrew.note;
        }


      }
    }
  }


  dismiss() {
    this.viewCtrl.dismiss("", null, {animate: false});
  }

  public finish() {

    this.stopTimer();
    this.uiBrewStorage.add(this.data);
    this.dismiss();
  }

  public brewTimeStarted(_event) {
    if (this.brewTemperatureTime) {
      this.brewTemperatureTime.pauseTimer();
    }
  }

  public getTime(): number {
    if (this.timer) {
      return this.timer.getSeconds();
    }
    return 0;

  }

  public setCoffeeDripTime() {
    this.data.coffee_first_drip_time = this.getTime();
  }

  public setCoffeeBloomingTime() {
    this.data.coffee_blooming_time = this.getTime();
  }

  public addImage() {
    this.uiImage.showOptionChooser().then((_option) => {
      if (_option === "CHOOSE") {
        //CHOSE
        this.uiImage.choosePhoto().then((_path) => {
          console.log(_path);

          if (_path) {
            this.data.attachments.push(_path.toString());
          }

        }, () => {

        })
      }
      else {
        //TAKE
        this.uiImage.takePhoto().then((_path) => {
          this.data.attachments.push(_path.toString());
        }, () => {

        })
      }
    });
  }

  public deleteImage(_index: number) {
    this.data.attachments.splice(_index, 1);
    if (this.data.attachments.length > 0) {
      //Slide to one item before
      this.photoSlides.slideTo(_index - 1, 0);
    }

  }

  public stopTimer() {
    if (this.brewTemperatureTime) {
      this.brewTemperatureTime.pauseTimer();
      this.data.brew_temperature_time = this.brewTemperatureTime.getSeconds();
    }
    else {
      this.data.brew_temperature_time = 0;
    }
    if (this.timer) {
      this.timer.pauseTimer();
      this.data.brew_time = this.timer.getSeconds();
    }
    else {
      this.data.brew_time = 0;
    }

  }


}
