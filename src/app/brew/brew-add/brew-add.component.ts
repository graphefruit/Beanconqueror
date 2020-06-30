import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {IPreparation} from '../../../interfaces/preparation/iPreparation';
import {BREW_QUANTITY_TYPES_ENUM} from '../../../enums/brews/brewQuantityTypes';
import {UIHelper} from '../../../services/uiHelper';
import {ISettings} from '../../../interfaces/settings/iSettings';
import {BREW_VIEW_ENUM} from '../../../enums/settings/brewView';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {TimerComponent} from '../../../components/timer/timer.component';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {IonSlides, ModalController, NavParams} from '@ionic/angular';
import {UIMillStorage} from '../../../services/uiMillStorage';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {UIImage} from '../../../services/uiImage';
import {Brew} from '../../../classes/brew/brew';
import {IBean} from '../../../interfaces/bean/iBean';
import moment from 'moment';
import {Mill} from '../../../classes/mill/mill';
import {Bean} from '../../../classes/bean/bean';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {IMill} from '../../../interfaces/mill/iMill';
import {UIToast} from '../../../services/uiToast';

@Component({
  selector: 'brew-add',
  templateUrl: './brew-add.component.html',
  styleUrls: ['./brew-add.component.scss'],
})
export class BrewAddComponent implements OnInit {

  @ViewChild('photoSlides', {static: false}) public photoSlides: IonSlides;
  @ViewChild('timer', {static: false}) public timer: TimerComponent;
  @ViewChild('brewTemperatureTime', {static: false}) public brewTemperatureTime: TimerComponent;

  private readonly brew_template: Brew;
  public data: Brew = new Brew();

  public BREW_VIEW_ENUM = BREW_VIEW_ENUM;
  public settings: ISettings;

  public brewQuantityTypeEnums = BREW_QUANTITY_TYPES_ENUM;

  public method_of_preparations: Array<IPreparation> = [];
  public beans: Array<Bean> = [];
  public mills: Array<Mill> = [];
  public customCreationDate: string = '';

  @Input() private hide_toast_message: boolean;




  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiPreparationStorage: UIPreparationStorage,
               private readonly uiBrewStorage: UIBrewStorage,
               private readonly uiImage: UIImage,
               private readonly uiSettingsStorage: UISettingsStorage,
               public uiHelper: UIHelper,
               private readonly uiMillStorage: UIMillStorage,
               private readonly uiAnalytics: UIAnalytics,
               private readonly uiToast: UIToast) {
    // Initialize to standard in drop down
    //

    this.settings = this.uiSettingsStorage.getSettings();
    this.method_of_preparations = this.uiPreparationStorage.getAllEntries()
      .filter((e) => !e.finished)
        .sort((a, b) => a.name.localeCompare(b.name));
    this.beans = this.uiBeanStorage.getAllEntries()
        .filter((bean) => !bean.finished)
        .sort((a, b) => a.name.localeCompare(b.name));
    this.mills = this.uiMillStorage.getAllEntries()
      .filter((e) => !e.finished)
        .sort((a, b) => a.name.localeCompare(b.name));

    this.brew_template = this.navParams.get('brew_template');
    // Get first entry
    if (this.beans.length > 0) {
      this.data.bean = this.beans[0].config.uuid;
    }
    if (this.method_of_preparations.length > 0) {
      this.data.method_of_preparation = this.method_of_preparations[0].config.uuid;
    }
    if (this.mills.length > 0) {
      this.data.mill = this.mills[0].config.uuid;
    }

    this.customCreationDate = moment().toISOString();
  }


  public ionViewDidEnter(): void {
    this.uiAnalytics.trackEvent('BREW', 'ADD');
    if (this.brew_template) {
      this.__loadBrew(this.brew_template);
    } else {
      this.__loadLastBrew();
    }
  }

  public async dismiss() {
    this.modalController.dismiss({
      dismissed: true
    });


  }

  public finish(): void {
    this.stopTimer();
    this.uiBrewStorage.add(this.data);
    if (this.settings.set_custom_brew_time) {
      this.data.config.unix_timestamp = moment(this.customCreationDate).unix();
    }
    this.uiBrewStorage.update(this.data);
    if (!this.hide_toast_message) {
      this.uiToast.showInfoToast('TOAST_BREW_ADDED_SUCCESSFULLY');
    }

    this.dismiss();
  }

  public brewTimeTicked(_event): void {
    if (this.timer) {
      this.data.brew_time = this.timer.getSeconds();
    } else {
      this.data.brew_time = 0;
    }
  }


  public getTime(): number {
    if (this.timer) {
      return this.timer.getSeconds();
    }

    return 0;
  }

  public setCoffeeDripTime($event): void {
    this.data.coffee_first_drip_time = this.getTime();
  }

  public setCoffeeBloomingTime($event): void {
    this.data.coffee_blooming_time = this.getTime();
  }

  public addImage(): void {
    this.uiImage.showOptionChooser()
        .then((_option) => {
          if (_option === 'CHOOSE') {
            // CHOSE
            this.uiImage.choosePhoto()
                .then((_path) => {
                  if (_path) {
                    this.data.attachments.push(_path.toString());
                  }

                });
          } else {
            // TAKE
            this.uiImage.takePhoto()
                .then((_path) => {
                  this.data.attachments.push(_path.toString());
                });
          }
        });
  }

  public deleteImage(_index: number): void {
    this.data.attachments.splice(_index, 1);
    if (this.data.attachments.length > 0) {
      // Slide to one item before
      this.photoSlides.slideTo(_index - 1, 0);
    }

  }

  public stopTimer(): void {
    if (this.brewTemperatureTime) {
      this.brewTemperatureTime.pauseTimer();
      this.data.brew_temperature_time = this.brewTemperatureTime.getSeconds();
    } else {
      this.data.brew_temperature_time = 0;
    }
    if (this.timer) {
      this.timer.pauseTimer();
      this.data.brew_time = this.timer.getSeconds();
    } else {
      this.data.brew_time = 0;
    }

  }

  // tslint:disable-next-line
  private __loadLastBrew(): void {
    if (this.settings.set_last_coffee_brew) {
      const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
      if (brews.length > 0) {
        const lastBrew: Brew = brews[brews.length - 1];

        this.__loadBrew(lastBrew);
      }
    }
  }

  private __loadBrew(brew: Brew) {

    if (this.settings.default_last_coffee_parameters.bean_type) {
      const brewBean: IBean = this.uiBeanStorage.getByUUID(brew.bean);
      if (!brewBean.finished) {
        this.data.bean = brewBean.config.uuid;
      }
    }

    if (this.settings.default_last_coffee_parameters.grind_size) {
      this.data.grind_size = brew.grind_size;
    }
    if (this.settings.default_last_coffee_parameters.grind_weight) {
      this.data.grind_weight = brew.grind_weight;
    }
    if (this.settings.default_last_coffee_parameters.method_of_preparation) {
      const brewPreparation: IPreparation = this.uiPreparationStorage.getByUUID(brew.method_of_preparation);
      if (!brewPreparation.finished) {
        this.data.method_of_preparation = brewPreparation.config.uuid;
      }

    }
    if (this.settings.default_last_coffee_parameters.mill) {
      const brewMill: IMill = this.uiMillStorage.getByUUID(brew.mill);
      if (!brewMill.finished) {
        this.data.mill = brewMill.config.uuid;
      }

    }
    if (this.settings.default_last_coffee_parameters.mill_timer) {
      this.data.mill_timer = brew.mill_timer;
    }
    if (this.settings.default_last_coffee_parameters.mill_speed) {
      this.data.mill_speed = brew.mill_speed;
    }
    if (this.settings.default_last_coffee_parameters.pressure_profile) {
      this.data.pressure_profile = brew.pressure_profile;
    }
    if (this.settings.default_last_coffee_parameters.brew_temperature) {
      this.data.brew_temperature = brew.brew_temperature;
    }

    if (this.brewTemperatureTime) {
      if (this.settings.default_last_coffee_parameters.brew_temperature_time) {
        this.data.brew_temperature_time = brew.brew_temperature_time;
        this.brewTemperatureTime.setTime(this.data.brew_temperature_time);
      }
    }
    if (this.timer) {
      if (this.settings.default_last_coffee_parameters.brew_time) {
        this.data.brew_time = brew.brew_time;
        this.timer.setTime(this.data.brew_time);
      }
    }

    if (this.settings.default_last_coffee_parameters.brew_quantity) {
      this.data.brew_quantity = brew.brew_quantity;
      this.data.brew_quantity_type = brew.brew_quantity_type;
    }
    if (this.settings.default_last_coffee_parameters.coffee_type) {
      this.data.coffee_type = brew.coffee_type;
    }
    if (this.settings.default_last_coffee_parameters.coffee_concentration) {
      this.data.coffee_concentration = brew.coffee_concentration;
    }
    if (this.settings.default_last_coffee_parameters.coffee_first_drip_time) {
      this.data.coffee_first_drip_time = brew.coffee_first_drip_time;
    }
    if (this.settings.default_last_coffee_parameters.coffee_blooming_time) {
      this.data.coffee_blooming_time = brew.coffee_blooming_time;
    }

    if (this.settings.default_last_coffee_parameters.rating) {
      this.data.rating = brew.rating;
    }
    if (this.settings.default_last_coffee_parameters.note) {
      this.data.note = brew.note;
    }

  }

  public ngOnInit() {}


  public showSectionAfterBrew(): boolean {
    return (this.settings.brew_quantity ||
      this.settings.coffee_type ||
      this.settings.coffee_concentration ||
      this.settings.rating ||
      this.settings.note ||
      this.settings.set_custom_brew_time ||
      this.settings.attachments);
  }


  public showSectionWhileBrew(): boolean {
    return (this.settings.pressure_profile ||
      this.settings.brew_temperature_time ||
      this.settings.brew_time ||
      this.settings.coffee_blooming_time ||
      this.settings.coffee_first_drip_time);
  }

  public showSectionBeforeBrew(): boolean {
    return (this.settings.grind_size ||
      this.settings.grind_weight ||
      this.settings.brew_temperature ||
      this.settings.method_of_preparation ||
      this.settings.bean_type ||
      this.settings.mill ||
      this.settings.mill_speed ||
      this.settings.mill_timer);

  }
}
