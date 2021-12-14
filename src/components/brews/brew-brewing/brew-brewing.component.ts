import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { NgxStarsComponent } from 'ngx-stars';
import { Brew } from '../../../classes/brew/brew';
import { Preparation } from '../../../classes/preparation/preparation';
import moment from 'moment';
import { Settings } from '../../../classes/settings/settings';
import { ModalController, Platform } from '@ionic/angular';
import { DatetimePopoverComponent } from '../../../popover/datetime-popover/datetime-popover.component';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { BREW_QUANTITY_TYPES_ENUM } from '../../../enums/brews/brewQuantityTypes';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { TranslateService } from '@ngx-translate/core';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { BrewTimerComponent } from '../../brew-timer/brew-timer.component';
import { TimerComponent } from '../../timer/timer.component';
import { IPreparation } from '../../../interfaces/preparation/iPreparation';
import { IBean } from '../../../interfaces/bean/iBean';
import { IMill } from '../../../interfaces/mill/iMill';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIWaterStorage } from '../../../services/uiWaterStorage';
import { BrewBrixCalculatorComponent } from '../../../app/brew/brew-brix-calculator/brew-brix-calculator.component';
import { BrewBeverageQuantityCalculatorComponent } from '../../../app/brew/brew-beverage-quantity-calculator/brew-beverage-quantity-calculator.component';
import { BleManagerService } from '../../../services/bleManager/ble-manager.service';
import { Subscription } from 'rxjs';
import { BluetoothScale, SCALE_TIMER_COMMAND } from '../../../classes/devices';
import { Chart } from 'chart.js';
import { UIHelper } from '../../../services/uiHelper';
import { UIExcel } from '../../../services/uiExcel';
import { BrewFlow, IBrewWaterFlow, IBrewWeightFlow } from '../../../classes/brew/brewFlow';
import { UIFileHelper } from '../../../services/uiFileHelper';


declare var cordova;

@Component({
  selector: ' brew-brewing',
  templateUrl: './brew-brewing.component.html',
  styleUrls: ['./brew-brewing.component.scss'],
})
export class BrewBrewingComponent implements OnInit, AfterViewInit {
  @ViewChild('timer', { static: false }) public timer: BrewTimerComponent;
  @ViewChild('brewTemperatureTime', { static: false }) public brewTemperatureTime: TimerComponent;
  @ViewChild('brewStars', { read: NgxStarsComponent, static: false }) public brewStars: NgxStarsComponent;

  @ViewChild('smartScaleWeight', { read: ElementRef }) public smartScaleWeightEl: ElementRef;
  @ViewChild('smartScaleWeightPerSecond', { read: ElementRef }) public smartScaleWeightPerSecondEl: ElementRef;

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
  public vesselResults: Array<any> = [];
  public vesselFocused: boolean = false;


  public scaleTimerSubscription: Subscription = undefined;
  public scaleTareSubscription: Subscription = undefined;
  public scaleFlowSubscription: Subscription = undefined;
  public bluetoothSubscription: Subscription = undefined;
  private flowProfileArr = [];
  private flowTime: number = undefined;
  private flowSecondTick: number = 0;
  public flow_profile_raw: BrewFlow = new BrewFlow();

  @ViewChild('flowProfileChart', { static: false }) public flowProfileChart;

  public flowProfileChartEl: any = undefined;


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
    private readonly bleManager: BleManagerService,
    private readonly uiHelper: UIHelper,
    private readonly uiExcel: UIExcel,
    private readonly uiFileHelper: UIFileHelper) {

  }

  public async ngAfterViewInit() {

    setTimeout(async () => {
      // If we wouldn't wait in the timeout, the components wouldnt be existing
      if (this.isEdit === false) {
        // We need a short timeout because of ViewChild, else we get an exception

        if (this.brewTemplate) {
          this.__loadBrew(this.brewTemplate, true);
        } else if (this.loadSpecificLastPreparation) {

          const foundBrews: Array<Brew> = UIBrewHelper.sortBrews(this.uiBrewStorage.getAllEntries().filter((e) => e.method_of_preparation === this.loadSpecificLastPreparation.config.uuid));
          if (foundBrews.length > 0) {
            this.__loadBrew(foundBrews[0], false);
          } else {
            // Fallback
            this.__loadLastBrew();
          }
        } else {
          this.__loadLastBrew();
        }

      } else {
        if (this.timer) {
          this.timer.setTime(this.data.brew_time);
        }
        if (this.brewTemperatureTime && this.settings.manage_parameters.brew_temperature_time) {
          this.brewTemperatureTime.setTime(this.data.brew_temperature_time);
        }
        if (this.data.flow_profile !== '') {
          // We had a flow profile, so read data now.
          await this.readFlowProfile();
          this.initializeFlowChart();
        }
      }

      if (this.smartScaleConnected()) {
        this.__connectSmartScale(true);
      }


      this.bluetoothSubscription = this.bleManager.attachOnEvent().subscribe((_type) => {
        if (_type && _type.type === 'CONNECT') {
          this.__connectSmartScale(false);
        } else {
          this.deattachToWeightChange();
          this.deattachToScaleEvents();
          //If scale disconnected, sometimes the timer run but the screen was not refreshed, so maybe it helpes to detect the change.
          this.changeDetectorRef.detectChanges();
        }
      });



      // Trigger change rating
      this.changedRating();
    });
  }

  private async __connectSmartScale(_firstStart: boolean) {
    if (this.smartScaleConnected()) {

      this.deattachToWeightChange();
      this.deattachToScaleEvents();
      this.initializeFlowChart();

      const scale: BluetoothScale = this.bleManager.getScale();
      if (!this.scaleTimerSubscription) {

        this.scaleTimerSubscription = scale.timerEvent.subscribe((event) => {
          // Timer pressed
          if (event) {
            switch (event.command) {
              case SCALE_TIMER_COMMAND.START:
                this.timer.startTimer();
                break;
              case SCALE_TIMER_COMMAND.STOP:
                this.timer.pauseTimer();
                break;
            }
          } else {
            if (this.timer.isTimerRunning() === true) {
              this.timer.pauseTimer();
            } else {
              this.timer.startTimer();
            }
          }
          this.changeDetectorRef.detectChanges();

        });
      }
      if (!this.scaleTareSubscription) {
        this.scaleTareSubscription = scale.tareEvent.subscribe(() => {
          // Timer pressed
          if (this.data.getPreparation().style_type !== PREPARATION_STYLE_TYPE.ESPRESSO) {
            this.data.brew_quantity = 0;
          } else {
            this.data.brew_beverage_quantity = 0;
          }

          this.changeDetectorRef.detectChanges();

        });
      }

      if (_firstStart) {
        await scale.tare();
        await scale.setTimer(SCALE_TIMER_COMMAND.STOP);
        await scale.setTimer(SCALE_TIMER_COMMAND.RESET);
      }
      if (this.timer.isTimerRunning() === true && _firstStart === false) {
        this.attachToScaleWeightChange();
      }

    }
  }

  public ngOnDestroy() {
    // We don't deattach the timer subscription in the deattach toscale events, else we couldn't start anymore.

    if (this.bluetoothSubscription) {
      this.bluetoothSubscription.unsubscribe();
      this.bluetoothSubscription = undefined;
    }

    this.deattachToWeightChange();
    this.deattachToScaleEvents();
  }

  public preparationMethodFocused() {
    // Needs to set set, because ion-change triggers on smartphones but not on websites, and therefore the value is overwritten when you use a brew template
    this.preparationMethodHasBeenFocused = true;
  }

  public resetPreparationTools() {
    if (this.preparationMethodHasBeenFocused === true) {
      this.data.method_of_preparation_tools = [];
      this.preparationMethodHasBeenFocused = false;
    }

  }

  public smartScaleConnected() {
    if (!this.platform.is('cordova')) {
      return false;
    }

    const scale: BluetoothScale = this.bleManager.getScale();
    return !!scale;
  }

  public attachToScaleWeightChange() {
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale) {
      this.deattachToWeightChange();

      this.scaleFlowSubscription = scale.flowChange.subscribe((_val) => {
        this.__setFlowProfile(_val);
        this.setActualSmartInformation();
      });
    }
  }

  private getActualBluetoothWeight() {
    try {
      const scale: BluetoothScale = this.bleManager.getScale();
      return this.uiHelper.toFixedIfNecessary(scale.getWeight(),1);
    }catch(ex) {
      return 0;
    }

  }

  public bluetoothScaleSetGrindWeight() {
    this.data.grind_weight = this.getActualBluetoothWeight();
  }

  public bluetoothScaleSetBrewQuantityWeight() {
    this.data.brew_quantity = this.getActualBluetoothWeight();
  }

  public bluetoothScaleSetBrewBeverageQuantityWeight() {
    this.data.brew_beverage_quantity = this.getActualBluetoothWeight();
  }


  private initializeFlowChart(): void {

    setTimeout(() => {
      if (this.flowProfileChartEl) {
        this.flowProfileChartEl.destroy();
        this.flowProfileChartEl = undefined;
        this.flowTime = undefined;
        this.flowSecondTick = 0;
        this.flowProfileArr = [];
      }
      if (this.flowProfileChartEl === undefined) {
        const drinkingData = {
          labels: [],
          datasets: [{
            label: this.translate.instant('BREW_FLOW_WEIGHT'),
            data: [],
            borderColor: 'rgb(159,140,111)',
            backgroundColor: 'rgb(205,194,172)',
            yAxisID: 'y',
            pointRadius: 0,
          },
          {
            label: this.translate.instant('BREW_FLOW_WEIGHT_PER_SECOND'),
            data: [],
            borderColor: 'rgb(96,125,139)',
            backgroundColor: 'rgb(127,151,162)',
            yAxisID: 'y1',
            spanGaps: true,
            pointRadius: 0,
          }]
        };
        const chartOptions = {
          animation: true,
          legend: {
            display: false,
            position: 'top'
          },
          responsive: true,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          stacked: false,

          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              // grid line settings
              grid: {
                drawOnChartArea: false, // only want the grid lines for one axis to show up
              },
            },
            xAxis: {
              ticks: {
                maxTicksLimit: 10
              }
            }
          }
        };

        this.flowProfileChartEl = new Chart(this.flowProfileChart.nativeElement, {
          type: 'line',
          data: drinkingData,
          options: chartOptions
        } as any);

        if (this.flow_profile_raw.weight.length > 0) {
          for (const data of this.flow_profile_raw.weight) {
            this.flowProfileChartEl.data.datasets[0].data.push(data.actual_weight);

            this.flowProfileChartEl.data.labels.push(data.brew_time);
          }
          for (const data of this.flow_profile_raw.waterFlow) {
            this.flowProfileChartEl.data.datasets[1].data.push(data.value);
          }
          this.flowProfileChartEl.update();
        }
      }
    }, 250);
  }

  public deattachToWeightChange() {
    if (this.scaleFlowSubscription) {
      this.scaleFlowSubscription.unsubscribe();
      this.scaleFlowSubscription = undefined;
    }

  }

  public shallFlowProfileBeHidden(): boolean {
    if (this.smartScaleConnected() === true) {
      return false;
    }
    if (this.smartScaleConnected() === false && this.isEdit === true && this.data.flow_profile !== '') {
      return false;
    }
    if (this.smartScaleConnected() === false && this.flow_profile_raw.weight.length > 0) {
      return false;
    }

    return true;
  }

  public deattachToScaleEvents() {

    if (this.scaleTimerSubscription) {
      this.scaleTimerSubscription.unsubscribe();
      this.scaleTimerSubscription = undefined;
    }
    if (this.scaleTareSubscription) {
      this.scaleTareSubscription.unsubscribe();
      this.scaleTareSubscription = undefined;
    }


  }


  public ngOnInit(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    if (!this.data.config.uuid) {
      this.customCreationDate = moment().toISOString();
    } else {
      this.customCreationDate = moment.unix(this.data.config.unix_timestamp).toISOString();
      this.displayingBrewTime = moment().startOf('day').add('seconds', this.data.brew_time).toISOString();
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
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale) {
      await scale.tare();
      await scale.setTimer(SCALE_TIMER_COMMAND.START);
      this.attachToScaleWeightChange();

    }
  }

  public async timerResumed(_event) {
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale) {
      await scale.setTimer(SCALE_TIMER_COMMAND.START);
      this.attachToScaleWeightChange();
    }
  }

  public async timerPaused(_event) {
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale) {
      await scale.setTimer(SCALE_TIMER_COMMAND.STOP);
      this.deattachToWeightChange();
    }
  }

  public async tareScale(_event) {
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale) {
      await scale.tare();
    }
  }

  public async timerReset(_event) {
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale) {
      await scale.tare();
      await scale.setTimer(SCALE_TIMER_COMMAND.STOP);
      await scale.setTimer(SCALE_TIMER_COMMAND.RESET);
      this.deattachToWeightChange();


      if (this.isEdit) {
        await this.deleteFlowProfile();
        this.data.flow_profile = '';
      }

      this.flow_profile_raw = new BrewFlow();

      this.initializeFlowChart();
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
    if (typeof (this.brewStars) !== 'undefined') {
      this.brewStars.setRating(this.data.rating);
    }
  }

  public async showTimeOverlay(_event) {
    _event.stopPropagation();
    _event.stopImmediatePropagation();

    const modal = await this.modalController.create({
      component: DatetimePopoverComponent,
      id: 'datetime-popover',
      cssClass: 'half-bottom-modal',
      showBackdrop: true,
      backdropDismiss: true,
      swipeToClose: true,
      componentProps: { displayingTime: this.displayingBrewTime }
    });
    await modal.present();
    const modalData = await modal.onWillDismiss();
    if (modalData.data.displayingTime !== undefined) {
      this.displayingBrewTime = modalData.data.displayingTime;
      this.data.brew_time = moment.duration(moment(modalData.data.displayingTime).diff(moment(modalData.data.displayingTime).startOf('day'))).asSeconds();
    }
  }

  // tslint:disable-next-line
  private __loadLastBrew(): void {
    if (this.settings.manage_parameters.set_last_coffee_brew || this.data.getPreparation().manage_parameters.set_last_coffee_brew) {
      const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
      if (brews.length > 0) {
        const lastBrew: Brew = brews[brews.length - 1];

        this.__loadBrew(lastBrew, false);
      }
    }
  }

  private __setScaleWeight(_weight: number, _wrongFlow: boolean, _weightDidntChange: boolean) {
    if (_wrongFlow === false || _weightDidntChange === true) {
      if (this.data.getPreparation().style_type !== PREPARATION_STYLE_TYPE.ESPRESSO) {
        if (_weight > 0) {
          this.data.brew_quantity = this.uiHelper.toFixedIfNecessary(_weight, 1);
        }
      } else {
        if (_weight > 0) {
          // If the drip timer is showing, we can set the first drip and not doing a reference to the normal weight.
          this.data.brew_beverage_quantity = this.uiHelper.toFixedIfNecessary(_weight, 1);
        }

      }
      this.changeDetectorRef.detectChanges();
    } else {
      // Pah. Shit here.
    }

    if (this.data.getPreparation().style_type === PREPARATION_STYLE_TYPE.ESPRESSO && _weight > 0) {
      // If the drip timer is showing, we can set the first drip and not doing a reference to the normal weight.
      if (this.timer.showDripTimer === true && this.data.coffee_first_drip_time <= 0) {
        // First drip is incoming
        if (this.uiBrewHelper.fieldVisible(this.settings.manage_parameters.coffee_first_drip_time,
          this.data.getPreparation().manage_parameters.coffee_first_drip_time,
          this.data.getPreparation().use_custom_parameters)) {
          // The first time we set the weight, we have one sec delay, because of this do it -1 second
          this.data.coffee_first_drip_time = this.getTime() - 1;
          this.changeDetectorRef.detectChanges();
        }
      }
    }
  }

  /**
   * This function is triggered outside of add/edit component, because the uuid is not existing on adding at start
   * @param _uuid
   */
  public saveFlowProfile(_uuid: string): string {
    const random = Math.floor(Math.random() * 10) + 1;

    const t = [];
    for (let i = 0; i < random; i++) {
      t.push(i);
    }
    const savingPath = 'brews/' + _uuid + '_flow_profile.json';
    this.uiFileHelper.saveJSONFile(savingPath, JSON.stringify(this.flow_profile_raw));
    return savingPath;
  }

  private async readFlowProfile() {
    const flowProfilePath = 'brews/' + this.data.config.uuid + '_flow_profile.json';
    try {
      const jsonParsed = await this.uiFileHelper.getJSONFile(flowProfilePath);
      this.flow_profile_raw = jsonParsed;

    } catch(ex) {

    }

  }
  private async deleteFlowProfile() {
    try {
      if (this.data.flow_profile !== '') {
        const flowProfilePath = 'brews/' + this.data.config.uuid + '_flow_profile.json';
        await this.uiFileHelper.deleteFile(flowProfilePath);
      }
    } catch (ex) {

    }

  }


  private __setFlowProfile(_scaleChange: any) {
    const weight: number = this.uiHelper.toFixedIfNecessary(_scaleChange.actual,1);
    const oldWeight: number = this.uiHelper.toFixedIfNecessary(_scaleChange.old,1);
    const smoothedWeight: number = this.uiHelper.toFixedIfNecessary(_scaleChange.smoothed,1);
    const oldSmoothedWeight: number = this.uiHelper.toFixedIfNecessary(_scaleChange.oldSmoothed,1);

    if (this.flowTime === undefined) {
      this.flowTime = this.getTime();
    }
    if (this.flowTime !== this.getTime()) {
      // Old solution: We wait for 10 entries,
      // New solution: We wait for the new second, even when their are just 8 entries.
      let wrongFlow: boolean = false;
      let weightDidntChange: boolean = false;
      let sameFlowPerTenHerzCounter: number = 0;

      let flowHasSomeMinusValueInIt: boolean = false;
      for (let i = 0; i < this.flowProfileArr.length; i++) {
        const val: number = this.flowProfileArr[i];

        // We ignore the latest value in this check.
        if (i !== this.flowProfileArr.length - 1) {
          const nextVal = this.flowProfileArr[i + 1];
          if (val > nextVal || val < 0) {
            // The first value is taller then the second value... somethings is wrong
            // Also if the value is negative, something strange happend.
            wrongFlow = true;
            weightDidntChange = false;
            break;
          }
          // Treat this as same level as other if and not else if.
          if (val === nextVal) {
            sameFlowPerTenHerzCounter += 1;
            if (sameFlowPerTenHerzCounter >= 5) {
              //
              wrongFlow = true;
              weightDidntChange = true;
              // We don't get out of the loop here, why? because the next value could be negative, and we then need to say that the weight changed, else we would maybe set wrong data.

            }
          }

        } else {
          // This is the latest value of this time
          if (val < 0) {
            wrongFlow = true;
            weightDidntChange = false;
            break;
          }
        }

        if (val < 0) {
          flowHasSomeMinusValueInIt = true;
        }
      }
      if (weightDidntChange === true && flowHasSomeMinusValueInIt === true) {
        weightDidntChange = false;
      }
      if (wrongFlow === false) {
        const firstVal: number = this.flowProfileArr[0];
        const lastVal: number = this.flowProfileArr[this.flowProfileArr.length - 1];

        if (this.data.getPreparation().style_type !== PREPARATION_STYLE_TYPE.ESPRESSO) {
          // We do some calculations on filter
          if ((lastVal - firstVal) > 100) {
            // Threshhold reached, more then 100g in on esecond is to much
            wrongFlow = true;
          } else if (firstVal === lastVal) {
            // Weight didn't change at all.
            weightDidntChange = true;
            wrongFlow = true;
          } else if ((lastVal - firstVal) < 0.5 || (this.flowProfileArr.length > 2 && (this.flowProfileArr[this.flowProfileArr.length - 2] - firstVal) < 0.5)) {
            // Threshold for filter is bigger, 0.5g
            // Threshshold, weight changes because of strange thing happening.
            // Sometimes the weight changes so strange, that the last two preVal's came above
            wrongFlow = true;
            weightDidntChange = true;
          }
        } else {
          if ((lastVal - firstVal) > 100) {
            // Threshhold reached, more then 100g in on esecond is to much
            wrongFlow = true;
          } else if (firstVal === lastVal) {
            // Weight didn't change at all.
            weightDidntChange = true;
            wrongFlow = true;
          } else if ((lastVal - firstVal) < 0.1) {
            // Threshshold, weight changes because of strange thing happening.
            // Sometimes the weight changes so strange, that the last two preVal's came above
            wrongFlow = true;
            weightDidntChange = true;
          }
        }

      }


      let actualFlowValue: number = 0;

      if (wrongFlow === false) {
        // Overwrite to make sure to have the latest data to save.
        // Get the latest flow, why?? -> Because we're on a new time actually, and thats why we need to get the latest push value
        const lastFlow = this.flow_profile_raw.weight[this.flow_profile_raw.weight.length - 1];
        let flowValue: number = (lastFlow.actual_smoothed_weight - lastFlow.old_smoothed_weight) * 10;
        // Ignore flowing weight when we're below zero
        if (flowValue < 0) {
          flowValue = 0;
        }
        actualFlowValue = flowValue;
      }

      if (actualFlowValue >= 70) {
        // Something went broken, more then 70 flow seems like miserable.
        actualFlowValue = 0;
      }

      const weightData = this.flowProfileChartEl.data.datasets[0].data;

      const addRange = weightData.length - this.flowProfileChartEl.data.datasets[1].data.length;

      const timestamp = this.uiHelper.getActualTimeWithMilliseconds();
      for (let i = 0; i < addRange; i++) {
        const waterFlow: IBrewWaterFlow = {

        } as IBrewWaterFlow;

        waterFlow.brew_time = this.flowTime.toString();
        waterFlow.timestamp = timestamp;

        // This looks so scary :<
        if (i === addRange - 1) {
          // We set last entry as value.
          this.flowProfileChartEl.data.datasets[1].data.push(actualFlowValue);
          waterFlow.value = actualFlowValue;
        } else {
          this.flowProfileChartEl.data.datasets[1].data.push(null);
          waterFlow.value = null;
        }

        this.flow_profile_raw.waterFlow.push(waterFlow);

      }

      this.__setScaleWeight(weight, wrongFlow, weightDidntChange);

      // Reset
      this.flowTime = this.getTime();
      this.flowSecondTick = 0;
      this.flowProfileChartEl.update();
      this.flowProfileArr = [];

    }

    this.flowProfileChartEl.data.labels.push(this.flowTime + '.' + this.flowSecondTick);
    this.flowProfileChartEl.data.datasets[0].data.push(weight);
    this.flowProfileArr.push(weight);
    this.pushFlowProfile(this.flowTime + '.' + this.flowSecondTick, weight, oldWeight, smoothedWeight, oldSmoothedWeight);
    this.flowSecondTick++;
  }

  private pushFlowProfile(_brewTime: string,
    _actualWeight: number,
    _oldWeight: number,
    _actualSmoothedWeight: number,
    _oldSmoothedWeight: number) {
    const brewFlow: IBrewWeightFlow = {

    } as IBrewWeightFlow;
    brewFlow.timestamp = this.uiHelper.getActualTimeWithMilliseconds();
    brewFlow.brew_time = _brewTime;
    brewFlow.actual_weight = _actualWeight;
    brewFlow.old_weight = _oldWeight;
    brewFlow.actual_smoothed_weight = _actualSmoothedWeight;
    brewFlow.old_smoothed_weight = _oldSmoothedWeight;
    this.flow_profile_raw.weight.push(brewFlow);

  }

  public setActualSmartInformation() {
    try {
      const weightEl = this.smartScaleWeightEl.nativeElement;
      const secondEl = this.smartScaleWeightPerSecondEl.nativeElement;
      weightEl.textContent = this.getActualScaleWeight() + ' g';
      secondEl.textContent = this.getActualSmoothedWeightPerSecond() + ' g/s';
    } catch (ex) {

    }
  }

  public getActualScaleWeight() {
    try {
      return this.uiHelper.toFixedIfNecessary(this.bleManager.getScale().getWeight(),1);
    } catch (ex) {
      return 0;
    }
  }

  public getActualSmoothedWeightPerSecond(): number {
    try {
      const lastflow = this.flow_profile_raw.weight[this.flow_profile_raw.weight.length - 1];
      const smoothedWeight = lastflow.actual_smoothed_weight;
      const oldSmoothedWeight = lastflow.old_smoothed_weight;
      const flowValue: number = (smoothedWeight - oldSmoothedWeight) * 10;
      return this.uiHelper.toFixedIfNecessary(flowValue, 2);
    } catch (ex) {
      return 0;
    }

  }

  public async downloadFlowProfile() {
    await this.uiExcel.exportBrewFlowProfile(this.flow_profile_raw);
  }

  private __loadBrew(brew: Brew, _template: boolean) {

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
    if (checkData.default_last_coffee_parameters.mill_timer || _template === true) {
      this.data.mill_timer = brew.mill_timer;
    }
    if (checkData.default_last_coffee_parameters.mill_speed || _template === true) {
      this.data.mill_speed = brew.mill_speed;
    }
    if (checkData.default_last_coffee_parameters.pressure_profile || _template === true) {
      this.data.pressure_profile = brew.pressure_profile;
    }
    if (checkData.default_last_coffee_parameters.brew_temperature || _template === true) {
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

    if (checkData.default_last_coffee_parameters.brew_quantity || _template === true) {
      this.data.brew_quantity = brew.brew_quantity;
      this.data.brew_quantity_type = brew.brew_quantity_type;
    }
    if (checkData.default_last_coffee_parameters.coffee_type || _template === true) {
      this.data.coffee_type = brew.coffee_type;
    }
    if (checkData.default_last_coffee_parameters.coffee_concentration || _template === true) {
      this.data.coffee_concentration = brew.coffee_concentration;
    }
    if (checkData.default_last_coffee_parameters.coffee_first_drip_time || _template === true) {
      this.data.coffee_first_drip_time = brew.coffee_first_drip_time;
    }
    if (checkData.default_last_coffee_parameters.coffee_blooming_time || _template === true) {
      this.data.coffee_blooming_time = brew.coffee_blooming_time;
    }

    if (checkData.default_last_coffee_parameters.rating || _template === true) {
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

    this.data.flow_profile = '';

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
    const filteredEntries = this.uiBrewStorage.getAllEntries().filter((e) => e.pressure_profile.toLowerCase().includes(actualSearchValue));

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
    }, 150);

  }

  public onProfileSearchFocus($event) {
    this.profileFocused = true;
  }

  public profileSelected(selected: string): void {
    this.data.pressure_profile = selected;
    this.profileResults = [];
    this.profileResultsAvailable = false;
    this.profileFocused = false;
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
    const filteredEntries = this.uiBrewStorage.getAllEntries().filter((e) => e.vessel_name !== '' && e.vessel_name.toLowerCase().includes(actualSearchValue));

    for (const entry of filteredEntries) {
      if (this.vesselResults.filter((e) => e.name === entry.vessel_name && e.weight === entry.vessel_weight).length <= 0) {
        this.vesselResults.push({
          name: entry.vessel_name,
          weight: entry.vessel_weight
        }
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
      this.vesselFocused = false;
    }, 150);

  }

  public onVesselSearchFocus($event) {
    this.vesselFocused = true;
  }

  public vesselSelected(selected: string): void {
    this.data.vessel_name = selected['name'];
    this.data.vessel_weight = selected['weight'];
    this.vesselResults = [];
    this.vesselResultsAvailable = false;
    this.vesselFocused = false;
  }


  public hasWaterEntries(): boolean {
    if (this.isEdit) {
      // When its edit, it doesn't matter when we don't have any active water
      return this.uiWaterStorage.getAllEntries().length > 0;
    }
    return this.uiWaterStorage.getAllEntries().filter((e) => !e.finished).length > 0;

  }

  public async calculateBrixToTds() {

    const modal = await this.modalController.create({
      component: BrewBrixCalculatorComponent,
      cssClass: 'popover-actions',
      id: BrewBrixCalculatorComponent.COMPONENT_ID
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data !== undefined) {
      this.data.tds = data.tds;
    }

  }

  public async calculateBrewBeverageQuantity() {

    let vesselWeight: number = 0;
    if (this.data.vessel_weight > 0) {
      vesselWeight = this.data.vessel_weight;
    }
    const modal = await this.modalController.create({
      component: BrewBeverageQuantityCalculatorComponent,
      cssClass: 'popover-actions',
      componentProps: {
        vesselWeight: vesselWeight
      },
      id: BrewBeverageQuantityCalculatorComponent.COMPONENT_ID
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data !== undefined && data.brew_beverage_quantity > 0) {
      this.data.brew_beverage_quantity = data.brew_beverage_quantity;
    }

  }


}
