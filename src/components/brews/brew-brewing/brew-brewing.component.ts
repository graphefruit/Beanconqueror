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
import {UIWaterStorage} from '../../../services/uiWaterStorage';
import {BrewBrixCalculatorComponent} from '../../../app/brew/brew-brix-calculator/brew-brix-calculator.component';
import {BrewBeverageQuantityCalculatorComponent} from '../../../app/brew/brew-beverage-quantity-calculator/brew-beverage-quantity-calculator.component';
import {BleManagerService} from '../../../services/bleManager/ble-manager.service';
import {Subscription} from 'rxjs';
import DecentScale, {DECENT_SCALE_TIMER_COMMAND} from '../../../classes/devices/decentScale';
import {Chart} from 'chart.js';


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
  @Input() public loadSpecificLastPreparation: Brew;
  @Input() public isEdit: boolean = false;
  @Output() public dataChange = new EventEmitter<Brew>();

  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  public brewQuantityTypeEnums = BREW_QUANTITY_TYPES_ENUM;
  public settings: Settings;
  public customCreationDate: string = '';
  public displayingBrewTime: string = '';

  public maxBrewRating: number = 5;


  public preparationMethodHasBeenFocused: boolean = false;

  public profileResultsAvailable: boolean = false;
  public profileResults: string[] = [];
  public profileFocused: boolean = false;

  public vesselResultsAvailable: boolean = false;
  public vesselResults: Array<any> =[];
  public vesselFocused: boolean = false;


  public scaleWeightSubscription: Subscription = undefined;
  public scaleFlowSubscription: Subscription = undefined;


  @ViewChild('flowProfileChart', {static: false}) public flowProfileChart;
  public flowProfileObj = {
    TIMES:0,
    VALUE:0,
    CALCULATED_SECOND: -1,
  };
  public flowProfileChartEl: any = undefined;
  public bluetoothScaleConnected: boolean = false;


  constructor(private readonly platform: Platform,
              private readonly uiSettingsStorage: UISettingsStorage,
              private readonly uiPreparationStorage: UIPreparationStorage,
              private readonly translate: TranslateService,
              private readonly modalController: ModalController,
              private readonly changeDetectorRef: ChangeDetectorRef,
              private readonly uiBrewHelper: UIBrewHelper,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiMillStorage: UIMillStorage,
              private readonly uiBeanStorage: UIBeanStorage,
              private readonly uiWaterStorage: UIWaterStorage,
              private readonly bleManager: BleManagerService) {

  }

  public ngAfterViewInit() {


    setTimeout( () => {
    if (this.isEdit === false) {
      // We need a short timeout because of ViewChild, else we get an exception

        if (this.brewTemplate) {
          this.__loadBrew(this.brewTemplate,true);
        } else if (this.loadSpecificLastPreparation) {

          const foundBrews: Array<Brew> = UIBrewHelper.sortBrews(this.uiBrewStorage.getAllEntries().filter((e)=>e.method_of_preparation === this.loadSpecificLastPreparation.config.uuid));
          if (foundBrews.length > 0) {
            this.__loadBrew(foundBrews[0],false);
          } else {
            // Fallback
            this.__loadLastBrew();
          }
        }
        else {
          this.__loadLastBrew();
        }

    } else {
      if (this.timer) {
        this.timer.setTime(this.data.brew_time);
      }
      if ( this.settings.manage_parameters.brew_temperature_time) {
        this.brewTemperatureTime.setTime(this.data.brew_temperature_time);
      }

    }

    // Trigger change rating
    this.changedRating();
    });
  }

  public preparationMethodFocused() {
    // Needs to set set, because ion-change triggers on smartphones but not on websites, and therefore the value is overwritten when you use a brew template
    this.preparationMethodHasBeenFocused = true;
  }
  public resetPreparationTools() {
    if ( this.preparationMethodHasBeenFocused === true) {
      this.data.method_of_preparation_tools = [];
      this.preparationMethodHasBeenFocused = false;
    }

  }

  public attachToScaleEvents() {
    const decentScale: DecentScale = this.bleManager.getDecentScale();
    if (decentScale) {
      this.bluetoothScaleConnected = true;
      setTimeout(() => {
        if (this.flowProfileChartEl === undefined) {
          this.initializeFlowChart();
        }
      });

      this.deattachToScaleChange();
      this.scaleWeightSubscription  = decentScale.weightChange.subscribe((_val) => {
        this.__setScaleWeight(_val);
      });

      this.scaleFlowSubscription = decentScale.flowChange.subscribe((_val) => {
        this.__setFlowProfile(_val);
      });


    }

  }


  private initializeFlowChart(): void {


    const drinkingData = {
      labels: [],
      datasets: [{
        label: this.translate.instant('PAGE_STATISTICS_BREW_PROCESSES'),
        data: [],
        borderColor: 'rgb(159,140,111)',
        backgroundColor: 'rgb(205,194,172)',
      }]
    };
    const chartOptions = {
      legend: {
        display: false,
        position: 'top'
      }
    };

    this.flowProfileChartEl = new Chart(this.flowProfileChart.nativeElement, {
      type: 'line',
      data: drinkingData,
      options: chartOptions
    });
  }

  public deattachToScaleChange() {
    if (this.scaleWeightSubscription) {
      this.scaleWeightSubscription.unsubscribe();
      this.scaleWeightSubscription = undefined;
    }
    if (this.scaleFlowSubscription) {
      this.scaleFlowSubscription.unsubscribe();
      this.scaleFlowSubscription = undefined;
    }
  }


  public ngOnInit (): void {
    this.settings = this.uiSettingsStorage.getSettings();
    if (!this.data.config.uuid) {
      this.customCreationDate = moment().toISOString();
    } else {
      this.customCreationDate = moment.unix(this.data.config.unix_timestamp).toISOString();
      this.displayingBrewTime = moment().startOf('day').add('seconds',this.data.brew_time).toISOString();
    }

    this.maxBrewRating = this.settings.brew_rating;

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

  public async timerStarted(_event) {
    const decentScale: DecentScale = this.bleManager.getDecentScale();
    if (decentScale) {
      await decentScale.tare();
      await decentScale.setTimer(DECENT_SCALE_TIMER_COMMAND.START);
      this.attachToScaleEvents();

    }
  }
  public async timerResumed(_event) {
    const decentScale: DecentScale = this.bleManager.getDecentScale();
    if (decentScale) {
      await decentScale.setTimer(DECENT_SCALE_TIMER_COMMAND.START);
      this.attachToScaleEvents();
    }
  }
  public  async timerPaused(_event) {
    const decentScale: DecentScale = this.bleManager.getDecentScale();
    if (decentScale) {
      await decentScale.setTimer(DECENT_SCALE_TIMER_COMMAND.STOP);
      this.deattachToScaleChange();
    }
  }
  public async timerReset(_event) {
    const decentScale: DecentScale = this.bleManager.getDecentScale();
    if (decentScale) {
      await decentScale.tare();
      await decentScale.setTimer(DECENT_SCALE_TIMER_COMMAND.STOP);
      await decentScale.setTimer(DECENT_SCALE_TIMER_COMMAND.RESET);
      this.deattachToScaleChange();
      this.initializeFlowChart();
      this.flowProfileObj.TIMES = 0;
      this.flowProfileObj.VALUE = 0;
      this.flowProfileObj.CALCULATED_SECOND = -1;
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


  private __setScaleWeight(_scaleChange: any) {

    const weight: number = _scaleChange.WEIGHT;
    const oldWeight: number = _scaleChange.OLD_WEIGHT;
    const stable: boolean = _scaleChange.STABLE;
    if (this.data.getPreparation().style_type !== PREPARATION_STYLE_TYPE.ESPRESSO) {
      this.data.brew_quantity = weight;
    } else
    {
      // If the drip timer is showing, we can set the first drip and not doing a reference to the normal weight.
      if (this.timer.showDripTimer === true) {
        // First drip is incoming
        if (this.uiBrewHelper.fieldVisible(this.settings.manage_parameters.coffee_first_drip_time,
          this.data.getPreparation().manage_parameters.coffee_first_drip_time,
          this.data.getPreparation().use_custom_parameters)) {
          this.setCoffeeDripTime(undefined);
        }

      }
      this.data.brew_beverage_quantity = weight;
    }
  }
  private __setFlowProfile(_scaleChange: any) {
    const weight: number = _scaleChange.WEIGHT;
    const oldWeight: number = _scaleChange.OLD_WEIGHT;
    const stable: boolean = _scaleChange.STABLE;
    const newWeight = weight - oldWeight;
    const scaleSendDate = _scaleChange.DATE;

    //We need to do usefull things here.
    if (this.flowProfileObj.CALCULATED_SECOND === -1) {
      this.flowProfileObj.CALCULATED_SECOND = this.getTime();
      this.flowProfileObj.VALUE = newWeight;
    }

    if (this.flowProfileObj.CALCULATED_SECOND !== this.getTime()) {
      // New second arrived, write the actual flow now.
      this.flowProfileChartEl.data.datasets[0].data.push(newWeight - this.flowProfileObj.VALUE);

      this.flowProfileChartEl.data.labels.push(this.getTime());
      this.flowProfileChartEl.update();
      this.flowProfileObj.VALUE = newWeight;
      this.flowProfileObj.CALCULATED_SECOND = this.getTime();
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
    if (this.getPreparation().use_custom_parameters === true && this.getPreparation().manage_parameters.set_last_coffee_brew === true) {
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
    if (checkData.default_last_coffee_parameters.water || _template === true) {
      this.data.water = brew.water;
    }

    if (checkData.default_last_coffee_parameters.vessel || _template === true) {
      this.data.vessel_name = brew.vessel_name;
      this.data.vessel_weight = brew.vessel_weight;
    }
    if (checkData.default_last_coffee_parameters.bean_weight_in || _template === true) {
      this.data.bean_weight_in = brew.bean_weight_in;
    }



  }



  public onProfileSearchChange(event: any) {
    if (!this.profileFocused) {
      return;
    }
    let actualSearchValue = event.target.value;
    this.profileResults = [];
    this.profileResultsAvailable = false;
    if (actualSearchValue === undefined || actualSearchValue === '') {
      return;
    }


    actualSearchValue = actualSearchValue.toLowerCase();
    const filteredEntries = this.uiBrewStorage.getAllEntries().filter((e)=>e.pressure_profile.toLowerCase().includes(actualSearchValue));

    for (const entry of filteredEntries) {
      this.profileResults.push(entry.pressure_profile);
    }
    // Distinct values
    this.profileResults = Array.from(new Set(this.profileResults.map((e) => e)));

    if (this.profileResults.length > 0) {
      this.profileResultsAvailable = true;
    } else {
      this.profileResultsAvailable = false;
    }

  }
  public onProfileSearchLeave($event) {
    setTimeout(() => {
      this.profileResultsAvailable = false;
      this.profileResults = [];
      this.profileFocused = false;
    },150);

  }
  public onProfileSearchFocus($event) {
    this.profileFocused = true;
  }

  public profileSelected(selected: string) :void {
    this.data.pressure_profile = selected;
    this.profileResults = [];
    this.profileResultsAvailable = false;
    this.profileFocused= false;
  }


  public onVesselSearchChange(event: any) {
    if (!this.vesselFocused) {
      return;
    }
    let actualSearchValue = event.target.value;
    this.vesselResults = [];
    this.vesselResultsAvailable = false;
    if (actualSearchValue === undefined || actualSearchValue === '') {
      return;
    }


    actualSearchValue = actualSearchValue.toLowerCase();
    const filteredEntries = this.uiBrewStorage.getAllEntries().filter((e)=>e.vessel_name !== '' && e.vessel_name.toLowerCase().includes(actualSearchValue));

    for (const entry of filteredEntries) {
      if (this.vesselResults.filter((e)=>e.name === entry.vessel_name && e.weight === entry.vessel_weight).length <=0) {
        this.vesselResults.push({
          "name": entry.vessel_name,
          "weight": entry.vessel_weight}
        );
      }

    }
    // Distinct values
    if (this.vesselResults.length > 0) {
      this.vesselResultsAvailable = true;
    } else {
      this.vesselResultsAvailable = false;
    }

  }
  public onVesselSearchLeave($event) {
    setTimeout(() => {
      this.vesselResults = [];
      this.vesselResultsAvailable = false;
      this.vesselFocused= false;
    },150);

  }
  public onVesselSearchFocus($event) {
    this.vesselFocused = true;
  }

  public vesselSelected(selected: string) :void {
    this.data.vessel_name = selected['name'];
    this.data.vessel_weight = selected['weight'];
    this.vesselResults = [];
    this.vesselResultsAvailable = false;
    this.vesselFocused= false;
  }


  public hasWaterEntries(): boolean {
    if (this.isEdit) {
      // When its edit, it doesn't matter when we don't have any active water
      return this.uiWaterStorage.getAllEntries().length > 0
    }
    return this.uiWaterStorage.getAllEntries().filter((e)=>!e.finished).length > 0

  }

  public async calculateBrixToTds() {

    const modal = await this.modalController.create({component: BrewBrixCalculatorComponent,
      cssClass: 'popover-actions',
      id: BrewBrixCalculatorComponent.COMPONENT_ID});
    await modal.present();

    const {data} = await modal.onWillDismiss();
    if (data !== undefined) {
      this.data.tds = data.tds;
    }

  }

  public async calculateBrewBeverageQuantity() {

    let vesselWeight: number = 0;
    if (this.data.vessel_weight > 0) {
      vesselWeight = this.data.vessel_weight;
    }
    const modal = await this.modalController.create({component: BrewBeverageQuantityCalculatorComponent,
      cssClass: 'popover-actions',
      componentProps: {
        vesselWeight: vesselWeight
      },
      id: BrewBeverageQuantityCalculatorComponent.COMPONENT_ID});
    await modal.present();

    const {data} = await modal.onWillDismiss();
    if (data !== undefined && data.brew_beverage_quantity > 0) {
      this.data.brew_beverage_quantity = data.brew_beverage_quantity;
    }

  }


}
