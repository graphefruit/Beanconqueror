import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import {NgxStarsComponent} from 'ngx-stars';
import {Brew} from '../../../classes/brew/brew';
import {Preparation} from '../../../classes/preparation/preparation';
import moment from 'moment';
import {Settings} from '../../../classes/settings/settings';
import {ModalController, Platform} from '@ionic/angular';
import {DatetimePopoverComponent} from '../../../popover/datetime-popover/datetime-popover.component';
import {PREPARATION_STYLE_TYPE} from '../../../enums/preparations/preparationStyleTypes';
import {BREW_QUANTITY_TYPES_ENUM} from '../../../enums/brews/brewQuantityTypes';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {TranslateService} from '@ngx-translate/core';
import {UIBrewHelper} from '../../../services/uiBrewHelper';
import {BrewTimerComponent} from '../../brew-timer/brew-timer.component';
import {TimerComponent} from '../../timer/timer.component';
import {IPreparation} from '../../../interfaces/preparation/iPreparation';
import {IBean} from '../../../interfaces/bean/iBean';
import {IMill} from '../../../interfaces/mill/iMill';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {UIMillStorage} from '../../../services/uiMillStorage';
import {UIBeanStorage} from '../../../services/uiBeanStorage';


declare var cordova;
@Component({
  selector: ' brew-brewing',
  templateUrl: './brew-brewing.component.html',
  styleUrls: ['./brew-brewing.component.scss'],
})
export class BrewBrewingComponent implements OnInit,AfterViewInit {
  @ViewChild('timer', {static: false}) public timer: BrewTimerComponent;
  @ViewChild('brewTemperatureTime', {static: false}) public brewTemperatureTime: TimerComponent;
  @ViewChild('brewStars', {read: NgxStarsComponent, static: false}) public brewStars: NgxStarsComponent;
  @Input() public data: Brew;
  @Input() public brewTemplate: Brew;
  @Input() public isEdit: boolean = false;
  @Output() public dataChange = new EventEmitter<Brew>();

  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  public brewQuantityTypeEnums = BREW_QUANTITY_TYPES_ENUM;
  public settings: Settings;
  public customCreationDate: string = '';
  public displayingBrewTime: string = '';

  constructor(private readonly platform: Platform,
              private readonly uiSettingsStorage: UISettingsStorage,
              private readonly uiPreparationStorage: UIPreparationStorage,
              private readonly translate: TranslateService,
              private readonly modalController: ModalController,
              private readonly changeDetectorRef: ChangeDetectorRef,
              private readonly uiBrewHelper: UIBrewHelper,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiMillStorage: UIMillStorage,
              private readonly uiBeanStorage: UIBeanStorage) {

  }

  public ngAfterViewInit() {
    setTimeout( () => {
    if (this.isEdit === false) {
      // We need a short timeout because of ViewChild, else we get an exception

        if (this.brewTemplate) {
          this.__loadBrew(this.brewTemplate,true);
        } else {
          this.__loadLastBrew();
        }

    } else {
      this.timer.setTime(this.data.brew_time);

      if ( this.settings.manage_parameters.brew_temperature_time) {
        this.brewTemperatureTime.setTime(this.data.brew_temperature_time);
      }

    }
    })
  }

  public resetPreparationTools() {
    this.data.method_of_preparation_tools = [];
  }

  public ngOnInit (): void {
    this.settings = this.uiSettingsStorage.getSettings();
    if (!this.data.config.uuid) {
      this.customCreationDate = moment().toISOString();
    } else {
      this.customCreationDate = moment.unix(this.data.config.unix_timestamp).toISOString();
      this.displayingBrewTime = moment().startOf('day').add('seconds',this.data.brew_time).toISOString();
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

  public brewTimeTicked(_event): void {
    if (this.timer) {
      this.data.brew_time = this.timer.getSeconds();
    } else {
      this.data.brew_time = 0;
    }
  }
  public temperatureTimeChanged(_event): void {
    if (this.brewTemperatureTime) {
      this.data.brew_temperature_time = this.brewTemperatureTime.getSeconds();
    } else {
      this.data.brew_temperature_time = 0;
    }
  }

  public getPreparation(): Preparation {
    return this.uiPreparationStorage.getByUUID(this.data.method_of_preparation);
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
          const newUnix = moment(this.customCreationDate).unix();
          if (newUnix !== this.data.config.unix_timestamp) {
            this.data.config.unix_timestamp = newUnix;
          }
          this.changeDetectorRef.detectChanges();

        }, error: () => {

        }
      });

    }
  }



  public showSectionAfterBrew(): boolean {
    return this.uiBrewHelper.showSectionAfterBrew(this.getPreparation());
  }


  public showSectionWhileBrew(): boolean {
    return this.uiBrewHelper.showSectionWhileBrew(this.getPreparation());
  }

  public showSectionBeforeBrew(): boolean {
    return this.uiBrewHelper.showSectionBeforeBrew(this.getPreparation());
  }

  public changedRating() {
    if (typeof(this.brewStars) !== 'undefined') {
      this.brewStars.setRating(this.data.rating);
    }
  }
  public async showTimeOverlay(_event) {
    _event.stopPropagation();
    _event.stopImmediatePropagation();

    const modal = await this.modalController.create({component: DatetimePopoverComponent,
      id:'datetime-popover',
      cssClass: 'half-bottom-modal',
      showBackdrop: true,
      backdropDismiss: true,
      swipeToClose: true,
      componentProps: {displayingTime: this.displayingBrewTime }});
    await modal.present();
    const modalData = await modal.onWillDismiss();
    if (modalData.data.displayingTime !== undefined) {
      this.displayingBrewTime =  modalData.data.displayingTime;
      this.data.brew_time =moment.duration(moment(modalData.data.displayingTime).diff(moment(modalData.data.displayingTime).startOf('day'))).asSeconds();
    }
  }

  // tslint:disable-next-line
  private __loadLastBrew(): void {
    if (this.settings.manage_parameters.set_last_coffee_brew || this.data.getPreparation().manage_parameters.set_last_coffee_brew) {
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

}
