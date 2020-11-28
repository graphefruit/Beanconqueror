import {Component, OnInit, ViewChild} from '@angular/core';
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {BREW_QUANTITY_TYPES_ENUM} from '../../../enums/brews/brewQuantityTypes';
import {UIHelper} from '../../../services/uiHelper';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {IBrew} from '../../../interfaces/brew/iBrew';
import {IonSlides, ModalController, NavParams, Platform} from '@ionic/angular';
import {UIMillStorage} from '../../../services/uiMillStorage';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {UIImage} from '../../../services/uiImage';
import {Brew} from '../../../classes/brew/brew';
import moment from 'moment';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {Preparation} from '../../../classes/preparation/preparation';
import {Mill} from '../../../classes/mill/mill';
import {Bean} from '../../../classes/bean/bean';
import {UIToast} from '../../../services/uiToast';
import {UIFileHelper} from '../../../services/uiFileHelper';
import {DatePicker} from '@ionic-native/date-picker/ngx';
import {TranslateService} from '@ngx-translate/core';
import {PREPARATION_STYLE_TYPE} from '../../../enums/preparations/preparationStyleTypes';
import {Settings} from '../../../classes/settings/settings';
import {UIBrewHelper} from '../../../services/uiBrewHelper';
import {NgxStarsComponent} from 'ngx-stars';

@Component({
  selector: 'brew-edit',
  templateUrl: './brew-edit.component.html',
  styleUrls: ['./brew-edit.component.scss'],
})
export class BrewEditComponent implements OnInit {


  @ViewChild('photoSlides', {static: false}) public photoSlides: IonSlides;
  @ViewChild('brewStars', {read: NgxStarsComponent, static: false}) public brewStars: NgxStarsComponent;
  public data: Brew = new Brew();
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  public brewQuantityTypeEnums = BREW_QUANTITY_TYPES_ENUM;
  public method_of_preparations: Array<Preparation> = [];
  public beans: Array<Bean> = [];
  public mills: Array<Mill> = [];
  public settings: Settings;
  public customCreationDate: string = '';

  public displayingBrewTime: string = '';

  public customSelectSheetOptions: any = {
    cssClass: 'select-full-screen'
  };
  public brewIcons = {
    empty: '../assets/custom-ion-icons/beanconqueror-brew-rating-empty.svg',
    full: '../assets/custom-ion-icons/beanconqueror-brew-rating-full.svg',
  };

  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiPreparationStorage: UIPreparationStorage,
               private readonly uiBrewStorage: UIBrewStorage,
               public uiHelper: UIHelper,
               private readonly uiImage: UIImage,
               private readonly uiMillStorage: UIMillStorage,
               private readonly uiAnalytics: UIAnalytics,
               private readonly uiSettingsStorage: UISettingsStorage,
               private readonly uiToast: UIToast,
               private readonly uiFileHelper: UIFileHelper,
               private readonly datePicker: DatePicker,
               private readonly translate: TranslateService,
               private readonly platform: Platform,
               private readonly uiBrewHelper: UIBrewHelper) {

    this.settings = this.uiSettingsStorage.getSettings();
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const brew: IBrew = this.uiHelper.copyData(this.navParams.get('brew'));

    if (brew !== undefined) {
      this.data.initializeByObject(brew);
      this.displayingBrewTime = moment().startOf('day').add('seconds',this.data.brew_time).toISOString();
    }

    this.method_of_preparations = this.uiPreparationStorage.getAllEntries()
        .sort((a, b) => a.name.localeCompare(b.name));
    this.beans = this.uiBeanStorage.getAllEntries()
        .sort((a, b) => a.name.localeCompare(b.name));
    this.mills = this.uiMillStorage.getAllEntries()
        .sort((a, b) => a.name.localeCompare(b.name));
  }

  public ionViewDidEnter(): void {
    this.uiAnalytics.trackEvent('BREW', 'EDIT');

    this.customCreationDate = moment.unix(this.data.config.unix_timestamp).toISOString();
  }

  public showRating(): boolean {
    if (this.data !== undefined) {
      return true;
    }
    return false;
  }
  public getPreparation(): Preparation {
    return this.uiPreparationStorage.getByUUID(this.data.method_of_preparation);
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

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'brew-edit');
  }

  public updateBrew(): void {
    const newUnix = moment(this.customCreationDate).unix();
    if (newUnix !== this.data.config.unix_timestamp) {
      this.data.config.unix_timestamp = newUnix;
    }
    this.uiBrewHelper.cleanInvisibleBrewData(this.data);
    this.uiBrewStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_BREW_EDITED_SUCCESSFULLY');
    this.dismiss();
  }

  public ngOnInit() {}

  public chooseDateTime(_event) {
    if (this.platform.is('cordova')) {
      _event.cancelBubble = true;
      _event.preventDefault();
      _event.stopImmediatePropagation();
      _event.stopPropagation();
      this.datePicker.show({
        date: new Date(),
        mode: 'datetime',
        androidTheme: this.datePicker.ANDROID_THEMES.THEME_DEVICE_DEFAULT_LIGHT,
        okText: this.translate.instant('CHOOSE'),
        todayText: this.translate.instant('TODAY'),
        cancelText: this.translate.instant('CANCEL'),
      }).then(
        (date) => {
          this.customCreationDate = moment(date).toISOString();
        },
        (err) => {

        }

      );
    }
  }

  public changeDate(_event) {
    const durationPassed =  moment.duration(moment(_event).diff(moment(_event).startOf('day')));
    this.displayingBrewTime = moment(_event).toISOString();
    this.data.brew_time = durationPassed.asSeconds();
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

  public changedRating() {
    if (typeof(this.brewStars) !== 'undefined') {
      this.brewStars.setRating(this.data.rating);
    }
  }
}
