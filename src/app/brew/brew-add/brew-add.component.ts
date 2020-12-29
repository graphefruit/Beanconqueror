import {ChangeDetectorRef, Component, Input, OnInit, ViewChild} from '@angular/core';
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {IPreparation} from '../../../interfaces/preparation/iPreparation';
import {BREW_QUANTITY_TYPES_ENUM} from '../../../enums/brews/brewQuantityTypes';
import {UIHelper} from '../../../services/uiHelper';
import {BREW_VIEW_ENUM} from '../../../enums/settings/brewView';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {TimerComponent} from '../../../components/timer/timer.component';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {IonSlides, LoadingController, ModalController, NavParams, Platform} from '@ionic/angular';
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
import {UIFileHelper} from '../../../services/uiFileHelper';
import {TranslateService} from '@ngx-translate/core';
import {BrewTimerComponent} from '../../../components/brew-timer/brew-timer.component';
import {Geolocation} from '@ionic-native/geolocation/ngx';
import {Preparation} from '../../../classes/preparation/preparation';
import {PREPARATION_STYLE_TYPE} from '../../../enums/preparations/preparationStyleTypes';
import {UILog} from '../../../services/uiLog';
import {UIBrewHelper} from '../../../services/uiBrewHelper';
import {Settings} from '../../../classes/settings/settings';
import {NgxStarsComponent} from 'ngx-stars';

declare var cordova;
@Component({
  selector: 'brew-add',
  templateUrl: './brew-add.component.html',
  styleUrls: ['./brew-add.component.scss'],
})
export class BrewAddComponent implements OnInit {

  @ViewChild('photoSlides', {static: false}) public photoSlides: IonSlides;
  @ViewChild('timer', {static: false}) public timer: BrewTimerComponent;
  @ViewChild('brewTemperatureTime', {static: false}) public brewTemperatureTime: TimerComponent;
  @ViewChild('brewStars', {read: NgxStarsComponent, static: false}) public brewStars: NgxStarsComponent;
  private readonly brew_template: Brew;
  public data: Brew = new Brew();

  public BREW_VIEW_ENUM = BREW_VIEW_ENUM;
  public settings: Settings;
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
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
               private readonly uiToast: UIToast,
               private readonly uiFileHelper: UIFileHelper,
               private readonly translate: TranslateService,
               private readonly platform: Platform,
               private readonly geolocation: Geolocation,
               private readonly loadingController: LoadingController,
               private uiLog: UILog,
               private readonly uiBrewHelper: UIBrewHelper,
               private readonly changeDetectorRef: ChangeDetectorRef) {
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
   this.getCoordinates(true);
    if (this.brew_template) {
      this.__loadBrew(this.brew_template,true);
    } else {
      this.__loadLastBrew();
    }
  }

  private getCoordinates(_highAccuracy: boolean) {
    if (this.settings.track_brew_coordinates) {
      this.geolocation.getCurrentPosition({ maximumAge: 3000, timeout: 5000, enableHighAccuracy:_highAccuracy}).then((resp) => {
        this.data.coordinates.latitude = resp.coords.latitude;
        this.data.coordinates.accuracy = resp.coords.accuracy;
        this.data.coordinates.altitude = resp.coords.altitude;
        this.data.coordinates.altitudeAccuracy = resp.coords.altitudeAccuracy;
        this.data.coordinates.heading = resp.coords.heading;
        this.data.coordinates.speed = resp.coords.speed;
        this.data.coordinates.longitude = resp.coords.longitude;
        this.uiLog.info('BREW - Coordinates found - ' + JSON.stringify(this.data.coordinates));
      }).catch((error) => {
        // Couldn't get coordinates sorry.
        this.uiLog.error('BREW - No Coordinates found');
        if (_highAccuracy === true) {
          this.uiLog.error('BREW - Try to get coordinates with low accuracy');
          this.getCoordinates(false);
        }

      });
    }
  }

  public async dismiss() {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'brew-add');


  }

  public async finish() {
    const loading = await this.loadingController.create({
      message: this.translate.instant('PLEASE_WAIT')
    });
    loading.present();

    this.stopTimer();


    this.uiBrewHelper.cleanInvisibleBrewData(this.data);
    this.uiBrewStorage.add(this.data);

    let checkData: Settings | Preparation;
    if (this.getPreparation().use_custom_parameters === true) {
      checkData = this.getPreparation();
    } else {
      checkData = this.settings;
    }
    if (checkData.manage_parameters.set_custom_brew_time) {
      this.data.config.unix_timestamp = moment(this.customCreationDate).unix();
    }
    this.uiBrewStorage.update(this.data);
    if (!this.hide_toast_message) {
      this.uiToast.showInfoToast('TOAST_BREW_ADDED_SUCCESSFULLY');
    }


    await loading.dismiss();
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

  public getPreparation(): Preparation {
    return this.uiPreparationStorage.getByUUID(this.data.method_of_preparation);
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

  public async deleteImage(_index: number) {
    const splicedPaths: Array<string> = this.data.attachments.splice(_index, 1);
    for (const path of splicedPaths) {
      try {
        await this.uiFileHelper.deleteFile(path);
        this.uiToast.showInfoToast('IMAGE_DELETED');
      } catch (ex) {
        this.uiToast.showInfoToast('IMAGE_NOT_DELETED');
      }

    }
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

  public showSectionAfterBrew(): boolean {
    let checkData: Settings | Preparation;
    if (this.getPreparation().use_custom_parameters === true) {
      checkData = this.getPreparation();
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

  public showSectionWhileBrew(): boolean {
    let checkData: Settings | Preparation;
    if (this.getPreparation().use_custom_parameters === true) {
      checkData = this.getPreparation();
    } else {
      checkData = this.settings;
    }
    return (checkData.manage_parameters.pressure_profile ||
      checkData.manage_parameters.brew_temperature_time ||
      checkData.manage_parameters.brew_time ||
      checkData.manage_parameters.coffee_blooming_time ||
      checkData.manage_parameters.coffee_first_drip_time);
  }

  public ngOnInit() {}

  public showSectionBeforeBrew(): boolean {
    let checkData: Settings | Preparation;
    if (this.getPreparation().use_custom_parameters === true) {
      checkData = this.getPreparation();
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

  // tslint:disable-next-line
  private __loadLastBrew(): void {
    if (this.settings.manage_parameters.set_last_coffee_brew) {
      const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
      if (brews.length > 0) {
        const lastBrew: Brew = brews[brews.length - 1];

        this.__loadBrew(lastBrew,false);
      }
    }
  }

  private __loadBrew(brew: Brew,_template: boolean) {

    if (this.settings.default_last_coffee_parameters.method_of_preparation || _template === true) {
      const brewPreparation: IPreparation = this.uiPreparationStorage.getByUUID(brew.method_of_preparation);
      if (!brewPreparation.finished) {
        this.data.method_of_preparation = brewPreparation.config.uuid;
      }
    }
    let checkData: Settings | Preparation;
    if (this.getPreparation().use_custom_parameters === true) {
      checkData = this.getPreparation();
    } else {
      checkData = this.settings;
    }

    if (checkData.default_last_coffee_parameters.bean_type || _template === true) {
      const brewBean: IBean = this.uiBeanStorage.getByUUID(brew.bean);
      if (!brewBean.finished) {
        this.data.bean = brewBean.config.uuid;
      }
    }

    if (checkData.default_last_coffee_parameters.grind_size || _template === true) {
      this.data.grind_size = brew.grind_size;
    }
    if (checkData.default_last_coffee_parameters.grind_weight || _template === true) {
      this.data.grind_weight = brew.grind_weight;
    }

    if (checkData.default_last_coffee_parameters.mill || _template === true) {
      const brewMill: IMill = this.uiMillStorage.getByUUID(brew.mill);
      if (!brewMill.finished) {
        this.data.mill = brewMill.config.uuid;
      }

    }
    if (checkData.default_last_coffee_parameters.mill_timer|| _template === true) {
      this.data.mill_timer = brew.mill_timer;
    }
    if (checkData.default_last_coffee_parameters.mill_speed|| _template === true) {
      this.data.mill_speed = brew.mill_speed;
    }
    if (checkData.default_last_coffee_parameters.pressure_profile|| _template === true) {
      this.data.pressure_profile = brew.pressure_profile;
    }
    if (checkData.default_last_coffee_parameters.brew_temperature|| _template === true) {
      this.data.brew_temperature = brew.brew_temperature;
    }

    if (this.brewTemperatureTime) {
      if (checkData.default_last_coffee_parameters.brew_temperature_time || _template === true) {
        this.data.brew_temperature_time = brew.brew_temperature_time;
        this.brewTemperatureTime.setTime(this.data.brew_temperature_time);
      }
    }
    if (this.timer) {
      if (checkData.default_last_coffee_parameters.brew_time || _template === true) {
        this.data.brew_time = brew.brew_time;
        this.timer.setTime(this.data.brew_time);
      }
    }

    if (checkData.default_last_coffee_parameters.brew_quantity|| _template === true) {
      this.data.brew_quantity = brew.brew_quantity;
      this.data.brew_quantity_type = brew.brew_quantity_type;
    }
    if (checkData.default_last_coffee_parameters.coffee_type|| _template === true) {
      this.data.coffee_type = brew.coffee_type;
    }
    if (checkData.default_last_coffee_parameters.coffee_concentration|| _template === true) {
      this.data.coffee_concentration = brew.coffee_concentration;
    }
    if (checkData.default_last_coffee_parameters.coffee_first_drip_time|| _template === true) {
      this.data.coffee_first_drip_time = brew.coffee_first_drip_time;
    }
    if (checkData.default_last_coffee_parameters.coffee_blooming_time|| _template === true) {
      this.data.coffee_blooming_time = brew.coffee_blooming_time;
    }

    if (checkData.default_last_coffee_parameters.rating|| _template === true) {
      this.data.rating = brew.rating;
    }
    if (checkData.default_last_coffee_parameters.note || _template === true) {
      this.data.note = brew.note;
    }
    if (checkData.default_last_coffee_parameters.tds || _template === true) {
      this.data.tds = brew.tds;
    }
    if (checkData.default_last_coffee_parameters.brew_beverage_quantity || _template === true) {
      this.data.brew_beverage_quantity = brew.brew_beverage_quantity;
      this.data.brew_beverage_quantity_type = brew.brew_beverage_quantity_type;
    }
    if (checkData.default_last_coffee_parameters.method_of_preparation_tool || _template === true) {
      this.data.method_of_preparation_tools = brew.method_of_preparation_tools;
    }

  }

  public chooseDateTime(_event) {
    if (this.platform.is('cordova')) {
      _event.cancelBubble = true;
      _event.preventDefault();
      _event.stopImmediatePropagation();
      _event.stopPropagation();

      const myDate = new Date(); // From model.

      cordova.plugins.DateTimePicker.show({
        mode: 'datetime',
        date: myDate,
        okText: this.translate.instant('CHOOSE'),
        todayText: this.translate.instant('TODAY'),
        cancelText: this.translate.instant('CANCEL'),
        success: (newDate) => {
          this.customCreationDate = moment(newDate).toISOString();
          this.changeDetectorRef.detectChanges();

        }, error: () => {

        }
      });



    }
  }

  public changedRating() {
    if (typeof(this.brewStars) !== 'undefined') {
      this.brewStars.setRating(this.data.rating);
    }
  }
}
