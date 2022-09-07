import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
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

import { Subscription } from 'rxjs';

import { Chart } from 'chart.js';
import { UIHelper } from '../../../services/uiHelper';
import { UIExcel } from '../../../services/uiExcel';
import {
  BrewFlow,
  IBrewPressureFlow,
  IBrewRealtimeWaterFlow,
  IBrewWaterFlow,
  IBrewWeightFlow,
} from '../../../classes/brew/brewFlow';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { BrewFlowComponent } from '../../../app/brew/brew-flow/brew-flow.component';
import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';
import { PreparationTool } from '../../../classes/preparation/preparationTool';

import { UIAlert } from '../../../services/uiAlert';
import { CoffeeBluetoothDevicesService } from '@graphefruit/coffee-bluetooth-devices';
import { BluetoothScale } from '@graphefruit/coffee-bluetooth-devices';
import { SCALE_TIMER_COMMAND } from '@graphefruit/coffee-bluetooth-devices';
import { PressureDevice } from '@graphefruit/coffee-bluetooth-devices';

declare var cordova;

@Component({
  selector: 'brew-brewing',
  templateUrl: './brew-brewing.component.html',
  styleUrls: ['./brew-brewing.component.scss'],
})
export class BrewBrewingComponent implements OnInit, AfterViewInit {
  @ViewChild('timer', { static: false }) public timer: BrewTimerComponent;
  @ViewChild('brewTemperatureTime', { static: false })
  public brewTemperatureTime: TimerComponent;
  @ViewChild('brewCoffeeBloomingTime', { static: false })
  public brewCoffeeBloomingTime: TimerComponent;
  @ViewChild('brewFirstDripTime', { static: false })
  public brewFirstDripTime: TimerComponent;
  @ViewChild('brewStars', { read: NgxStarsComponent, static: false })
  public brewStars: NgxStarsComponent;

  @ViewChild('smartScaleWeight', { read: ElementRef })
  public smartScaleWeightEl: ElementRef;
  @ViewChild('smartScaleWeightPerSecond', { read: ElementRef })
  public smartScaleWeightPerSecondEl: ElementRef;
  @ViewChild('smartScaleAvgFlowPerSecond', { read: ElementRef })
  public smartScaleAvgFlowPerSecondEl: ElementRef;

  @Input() public data: Brew;
  @Input() public brewTemplate: Brew;
  @Input() public loadSpecificLastPreparation: Preparation;
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
  private scaleFlowChangeSubscription: Subscription = undefined;
  private flowProfileArr = [];
  private flowProfileArrObjs = [];
  private flowProfileArrCalculated = [];
  private flowTime: number = undefined;
  private flowSecondTick: number = 0;
  public flow_profile_raw: BrewFlow = new BrewFlow();

  @ViewChild('flowProfileChart', { static: false }) public flowProfileChart;

  public flowProfileChartEl: any = undefined;
  private startingFlowTime: number = undefined;
  private brewFlowGraphSubject: EventEmitter<any> = new EventEmitter();
  private brewPressureGraphSubject: EventEmitter<any> = new EventEmitter();
  public pressureDeviceSubscription: Subscription = undefined;

  constructor(
    private readonly platform: Platform,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly translate: TranslateService,
    private readonly modalController: ModalController,
    private readonly changeDetectorRef: ChangeDetectorRef,
    public readonly uiBrewHelper: UIBrewHelper,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiMillStorage: UIMillStorage,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiWaterStorage: UIWaterStorage,
    private readonly bleManager: CoffeeBluetoothDevicesService,
    private readonly uiHelper: UIHelper,
    private readonly uiExcel: UIExcel,
    private readonly uiFileHelper: UIFileHelper,
    private readonly screenOrientation: ScreenOrientation,
    private readonly uiAlert: UIAlert
  ) {}

  public getActivePreparationTools() {
    return this.data.getPreparation().tools.filter((e) => e.archived === false);
  }

  public getChoosenPreparationToolsWhichAreArchived() {
    const toolIds = this.data.method_of_preparation_tools;
    const tools: Array<PreparationTool> = [];
    for (const id of toolIds) {
      const tool = this.data
        .getPreparation()
        .tools.find((e) => e.config.uuid === id);
      if (tool.archived === true) {
        tools.push(tool);
      }
    }
    return tools;
  }

  public async ngAfterViewInit() {
    setTimeout(async () => {
      // If we wouldn't wait in the timeout, the components wouldnt be existing
      if (this.isEdit === false) {
        // We need a short timeout because of ViewChild, else we get an exception

        if (this.brewTemplate) {
          this.__loadBrew(this.brewTemplate, true);
        } else if (this.loadSpecificLastPreparation) {
          const foundBrews: Array<Brew> = UIBrewHelper.sortBrews(
            this.uiBrewStorage
              .getAllEntries()
              .filter(
                (e) =>
                  e.method_of_preparation ===
                  this.loadSpecificLastPreparation.config.uuid
              )
          );
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
          this.timer.setTime(
            this.data.brew_time,
            this.data.brew_time_milliseconds
          );
        }
        if (
          this.brewTemperatureTime &&
          this.settings.manage_parameters.brew_temperature_time
        ) {
          this.brewTemperatureTime.setTime(
            this.data.brew_temperature_time,
            this.data.brew_temperature_time_milliseconds
          );
        }
        if (
          this.brewCoffeeBloomingTime &&
          this.settings.manage_parameters.coffee_blooming_time
        ) {
          this.brewCoffeeBloomingTime.setTime(
            this.data.coffee_blooming_time,
            this.data.coffee_blooming_time_milliseconds
          );
        }
        if (
          this.brewFirstDripTime &&
          this.settings.manage_parameters.coffee_first_drip_time
        ) {
          this.brewFirstDripTime.setTime(
            this.data.coffee_first_drip_time,
            this.data.coffee_first_drip_time_milliseconds
          );
        }
        if (this.data.flow_profile !== '') {
          // We had a flow profile, so read data now.
          await this.readFlowProfile();
          this.initializeFlowChart();
        }
      }

      let isSomethingConnected: boolean = false;
      if (this.smartScaleConnected()) {
        await this.__connectSmartScale(true);
        isSomethingConnected = true;
      }
      if (this.pressureDeviceConnected()) {
        await this.__connectPressureDevice(true);
        isSomethingConnected = true;
      }
      if (isSomethingConnected === true) {
        this.initializeFlowChart();
      }

      this.bluetoothSubscription = this.bleManager
        .attachOnEvent()
        .subscribe((_type) => {
          let disconnectTriggered: boolean = false;
          let connectTriggered: boolean = false;

          if (_type && _type.type === 'CONNECT_SCALE') {
            connectTriggered = true;
            this.__connectSmartScale(false);
          } else if (_type && _type.type === 'DISCONNECT_SCALE') {
            this.deattachToWeightChange();
            this.deattachToFlowChange();
            this.deattachToScaleEvents();
            disconnectTriggered = true;
          } else if (_type && _type.type === 'CONNECT_PRESSURE') {
            connectTriggered = true;
            this.__connectPressureDevice(false);
          } else if (_type && _type.type === 'DISCONNECT_PRESSURE') {
            this.deattachToPressureChange();
            disconnectTriggered = true;
          }

          if (disconnectTriggered) {
            if (
              !this.smartScaleConnected() &&
              !this.pressureDeviceConnected()
            ) {
              // When one is connected we don't pause
              this.flowProfileChartEl.options.scales.x.realtime.pause = true;
              this.flowProfileChartEl.update('quiet');
            }
          }
          if (connectTriggered) {
            if (!this.flowProfileChartEl) {
              this.initializeFlowChart();
            }
          }
          // If scale disconnected, sometimes the timer run but the screen was not refreshed, so maybe it helpes to detect the change.
          this.checkChanges();
        });

      // Trigger change rating
      this.changedRating();
    });
  }

  private async __connectSmartScale(_firstStart: boolean) {
    if (this.smartScaleConnected()) {
      this.deattachToWeightChange();
      this.deattachToScaleEvents();

      const scale: BluetoothScale = this.bleManager.getScale();
      if (scale && !this.scaleTimerSubscription) {
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
              case SCALE_TIMER_COMMAND.RESET:
                this.timer.reset();
                break;
            }
          } else {
            if (this.timer.isTimerRunning() === true) {
              this.timer.pauseTimer();
            } else {
              this.timer.startTimer();
            }
          }
          this.checkChanges();
        });
      }
      if (scale && !this.scaleTareSubscription) {
        this.scaleTareSubscription = scale.tareEvent.subscribe(() => {
          // Timer pressed
          if (
            this.data.getPreparation().style_type !==
            PREPARATION_STYLE_TYPE.ESPRESSO
          ) {
            this.data.brew_quantity = 0;
          } else {
            this.data.brew_beverage_quantity = 0;
          }

          this.checkChanges();
        });
      }

      if (_firstStart) {
        if (this.settings.bluetooth_scale_tare_on_brew === true) {
          if (scale) {
            await scale.tare();
          }
        }

        if (this.settings.bluetooth_scale_stop_timer_on_brew === true) {
          await new Promise((resolve) => {
            setTimeout(async () => {
              if (scale) {
                await scale.setTimer(SCALE_TIMER_COMMAND.STOP);
              }

              resolve(undefined);
            }, 50);
          });
        }

        if (this.settings.bluetooth_scale_reset_timer_on_brew === true) {
          await new Promise((resolve) => {
            setTimeout(async () => {
              if (scale) {
                await scale.setTimer(SCALE_TIMER_COMMAND.RESET);
              }
              resolve(undefined);
            }, 50);
          });
        }
      }
      if (this.timer.isTimerRunning() === true && _firstStart === false) {
        this.attachToScaleWeightChange();
        this.attachToFlowChange();
      }

      this.checkChanges();
    }
  }

  private async __connectPressureDevice(_firstStart: boolean) {
    if (this.pressureDeviceConnected()) {
      this.deattachToPressureChange();

      if (_firstStart) {
        const pressureDevice: PressureDevice =
          this.bleManager.getPressureDevice();
        if (pressureDevice) {
          await pressureDevice.updateZero();
        }
      }
      if (this.timer.isTimerRunning() === true && _firstStart === false) {
        this.attachToPressureChange();
      } else if (this.settings.pressure_threshold_active) {
        this.attachToPressureChange();
      }

      this.checkChanges();
    }
  }
  public async maximizeFlowGraph() {
    let actualOrientation;
    if (this.platform.is('cordova')) {
      actualOrientation = this.screenOrientation.type;
    }
    await new Promise(async (resolve) => {
      this.flowProfileChartEl.update();
      if (this.platform.is('cordova')) {
        await this.screenOrientation.lock(
          this.screenOrientation.ORIENTATIONS.LANDSCAPE
        );
      }
      resolve(undefined);
    });
    const oldCanvasHeight = document.getElementById(
      'canvasContainerBrew'
    ).offsetHeight;
    const modal = await this.modalController.create({
      component: BrewFlowComponent,
      breakpoints: [0, 1],
      initialBreakpoint: 1,
      id: BrewFlowComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      componentProps: {
        brewComponent: this,
        brew: this.data,
        flowChartEl: this.flowProfileChartEl,
        brewFlowGraphEvent: this.brewFlowGraphSubject,
        brewPressureGraphEvent: this.brewPressureGraphSubject,
      },
    });
    await modal.present();
    await modal.onWillDismiss().then(async () => {
      // If responsive would be true, the add of the container would result into 0 width 0 height, therefore the hack
      this.flowProfileChartEl.options.responsive = false;
      this.flowProfileChartEl.update('quite');

      if (this.platform.is('cordova')) {
        if (
          this.screenOrientation.type ===
          this.screenOrientation.ORIENTATIONS.LANDSCAPE
        ) {
          if (
            this.screenOrientation.ORIENTATIONS.LANDSCAPE === actualOrientation
          ) {
            // Get back to portrait
            await new Promise((resolve) => {
              setTimeout(async () => {
                await this.screenOrientation.lock(
                  this.screenOrientation.ORIENTATIONS.PORTRAIT_PRIMARY
                );
                resolve(undefined);
              }, 50);
            });
          }
        }
        setTimeout(() => {
          this.screenOrientation.unlock();
        }, 150);
      }

      await new Promise((resolve) => {
        setTimeout(async () => {
          document
            .getElementById('canvasContainerBrew')
            .append(this.flowProfileChartEl.ctx.canvas);
          resolve(undefined);
        }, 50);
      });

      await new Promise((resolve) => {
        setTimeout(async () => {
          // If we would not set the old height, the graph would explode to big.
          document.getElementById('canvasContainerBrew').style.height =
            oldCanvasHeight + 'px';
          this.flowProfileChartEl.options.responsive = true;
          this.flowProfileChartEl.update();
          resolve(undefined);
        }, 50);
      });
    });
  }

  private checkChanges() {
    this.changeDetectorRef.detectChanges();
    window.getComputedStyle(window.document.getElementsByTagName('body')[0]);
  }

  public ngOnDestroy() {
    // We don't deattach the timer subscription in the deattach toscale events, else we couldn't start anymore.

    if (this.bluetoothSubscription) {
      this.bluetoothSubscription.unsubscribe();
      this.bluetoothSubscription = undefined;
    }
    if (this.flowProfileChartEl) {
      this.flowProfileChartEl.destroy();
      this.flowProfileChartEl = undefined;
    }
    this.deattachToWeightChange();
    this.deattachToFlowChange();
    this.deattachToPressureChange();
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
      if (this.timer.isTimerRunning() === false) {
        this.initializeFlowChart();
      }
    }
  }

  public smartScaleConnected() {
    if (!this.platform.is('cordova')) {
      return true;
    }

    const scale: BluetoothScale = this.bleManager.getScale();
    return !!scale;
  }

  public pressureDeviceConnected() {
    if (!this.platform.is('cordova')) {
      return true;
    }

    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    return !!pressureDevice;
  }

  public attachToScaleWeightChange() {
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale) {
      this.deattachToWeightChange();

      this.scaleFlowSubscription = scale.flowChange.subscribe((_val) => {
        this.__setFlowProfile(_val);
      });
    }
  }

  public attachToFlowChange() {
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale) {
      this.deattachToFlowChange();

      this.scaleFlowChangeSubscription = scale.flowChange.subscribe((_val) => {
        this.setActualSmartInformation();
      });
    }
  }

  public attachToPressureChange() {
    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    if (pressureDevice) {
      this.deattachToPressureChange();

      this.pressureDeviceSubscription = pressureDevice.pressureChange.subscribe(
        (_val) => {
          if (this.timer.isTimerRunning()) {
            this.__setPressureFlow(_val);
          } else {
            if (
              this.settings.pressure_threshold_active &&
              _val.actual > this.settings.pressure_threshold_bar
            ) {
              this.timer.startTimer();
            }
          }
        }
      );
    }
  }

  private getActualBluetoothWeight() {
    try {
      const scale: BluetoothScale = this.bleManager.getScale();
      return this.uiHelper.toFixedIfNecessary(scale.getWeight(), 1);
    } catch (ex) {
      return 0;
    }
  }

  public bluetoothScaleSetGrindWeight() {
    this.data.grind_weight = this.getActualBluetoothWeight();
  }

  public bluetoothScaleSetBeanWeightIn() {
    this.data.bean_weight_in = this.getActualBluetoothWeight();
  }

  public bluetoothScaleSetBrewQuantityWeight() {
    this.data.brew_quantity = this.getActualBluetoothWeight();
  }

  public bluetoothScaleSetBrewBeverageQuantityWeight() {
    let vesselWeight: number = 0;
    if (this.data.vessel_weight > 0) {
      vesselWeight = this.data.vessel_weight;
    }
    this.data.brew_beverage_quantity = this.uiHelper.toFixedIfNecessary(
      this.getActualBluetoothWeight() - vesselWeight,
      2
    );
  }

  private initializeFlowChart(): void {
    setTimeout(() => {
      if (this.flowProfileChartEl) {
        this.flowProfileChartEl.destroy();
        this.flowProfileChartEl = undefined;
        this.flowTime = undefined;
        this.flowSecondTick = 0;
        this.flowProfileArr = [];
        this.flowProfileArrObjs = [];
        this.flowProfileArrCalculated = [];
      }
      if (this.flowProfileChartEl === undefined) {
        let graphSettings = this.settings.graph.FILTER;
        if (
          this.data.getPreparation().style_type ===
          PREPARATION_STYLE_TYPE.ESPRESSO
        ) {
          graphSettings = this.settings.graph.ESPRESSO;
        }

        const drinkingData = {
          labels: [],
          datasets: [
            {
              label: this.translate.instant('BREW_FLOW_WEIGHT'),
              data: [],
              borderColor: 'rgb(159,140,111)',
              backgroundColor: 'rgb(205,194,172)',
              yAxisID: 'y',
              pointRadius: 0,
              tension: 0,
              hidden: !graphSettings.weight,
            },
            {
              label: this.translate.instant('BREW_FLOW_WEIGHT_PER_SECOND'),
              data: [],
              borderColor: 'rgb(96,125,139)',
              backgroundColor: 'rgb(127,151,162)',
              yAxisID: 'y1',
              spanGaps: true,
              pointRadius: 0,
              tension: 0,
              hidden: !graphSettings.calc_flow,
            },
            {
              label: this.translate.instant('BREW_FLOW_WEIGHT_REALTIME'),
              data: [],
              borderColor: 'rgb(144,60,99)',
              backgroundColor: 'rgb(191,101,143)',
              yAxisID: 'y2',
              spanGaps: true,
              pointRadius: 0,
              tension: 0,
              hidden: !graphSettings.calc_flow,
            },
          ],
        };

        const pressureDevice = this.bleManager.getPressureDevice();
        if (pressureDevice != null || !this.platform.is('cordova')) {
          drinkingData.datasets.push({
            label: this.translate.instant('BREW_PRESSURE_FLOW'),
            data: [],
            borderColor: 'rgb(132,42,37)',
            backgroundColor: 'rgb(189,61,53)',
            yAxisID: 'y3',
            spanGaps: true,
            pointRadius: 0,
            tension: 0,
            hidden: !graphSettings.pressure,
          });
        }

        const startingDay = moment(new Date()).startOf('day');
        // IF brewtime has some seconds, we add this to the delay directly.
        if (this.data.brew_time > 0) {
          startingDay.add('seconds', this.data.brew_time);
        }
        const delay = Date.now() - startingDay.toDate().getTime();

        const suggestedMinFlow: number = 0;
        let suggestedMaxFlow: number = 20;

        const suggestedMinWeight: number = 0;
        let suggestedMaxWeight: number = 300;
        if (
          this.data.getPreparation().style_type ===
          PREPARATION_STYLE_TYPE.ESPRESSO
        ) {
          suggestedMaxFlow = 2.5;
          suggestedMaxWeight = 30;
        }

        const chartOptions = {
          animation: false, // disa
          scales: {
            x: {
              type: 'realtime',
              display: true,
              realtime: {
                // How much timeseconds do we want to show
                duration: 20000,
                delay: delay,
                // data will be automatically deleted as it disappears off the chart
                ttl: undefined,
                pause: true,
                onRefresh: (chart) => {},
              },
              time: {
                displayFormats: {
                  millisecond: 'mm:ss',
                  second: 'mm:ss',
                  minute: 'mm:ss',
                  hour: 'mm:ss',
                  day: 'mm:ss',
                  week: 'mm:ss',
                  month: 'mm:ss',
                  quarter: 'mm:ss',
                  year: 'mm:ss',
                },
              },
            },

            y: {
              type: 'linear',
              display: true,
              position: 'left',
              suggestedMin: suggestedMinWeight,
              suggestedMax: suggestedMaxWeight,
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              // grid line settings
              grid: {
                drawOnChartArea: false, // only want the grid lines for one axis to show up
              },
              suggestedMin: suggestedMinFlow,
              suggestedMax: suggestedMaxFlow,
            },
            y2: {
              // Real time flow
              type: 'linear',
              display: false,
              position: 'right',
              // grid line settings
              grid: {
                drawOnChartArea: false, // only want the grid lines for one axis to show up
              },
              suggestedMin: suggestedMinFlow,
              suggestedMax: suggestedMaxFlow,
            },
          },
          interaction: {
            intersect: false,
          },
        };

        if (pressureDevice != null || !this.platform.is('cordova')) {
          chartOptions.scales['y3'] = {
            type: 'linear',
            display: true,
            position: 'right',
            // grid line settings
            grid: {
              drawOnChartArea: false, // only want the grid lines for one axis to show up
            },
            // More then 12 bar should be strange.
            suggestedMin: 0,
            suggestedMax: 12,
          };
        }

        this.flowProfileChartEl = new Chart(
          this.flowProfileChart.nativeElement,
          {
            type: 'line',
            data: drinkingData,
            options: chartOptions,
          } as any
        );
        if (this.flow_profile_raw.weight.length > 0) {
          for (const data of this.flow_profile_raw.weight) {
            const dataDay = moment(new Date()).startOf('day');
            dataDay.add('seconds', data.brew_time);
            this.flowProfileChartEl.data.datasets[0].data.push({
              x: dataDay.toDate().getTime(),
              y: data.actual_weight,
            });
          }
          for (const data of this.flow_profile_raw.waterFlow) {
            const dataDay = moment(new Date()).startOf('day');
            dataDay.add('seconds', data.brew_time);

            this.flowProfileChartEl.data.datasets[1].data.push({
              x: dataDay.toDate().getTime(),
              y: data.value,
            });
          }
          if (this.flow_profile_raw.realtimeFlow) {
            for (const data of this.flow_profile_raw.realtimeFlow) {
              const dataDay = moment(new Date()).startOf('day');
              dataDay.add('seconds', data.brew_time);
              this.flowProfileChartEl.data.datasets[2].data.push({
                x: dataDay.toDate().getTime(),
                y: data.flow_value,
              });
            }
          }
          if (this.flow_profile_raw.pressureFlow) {
            for (const data of this.flow_profile_raw.pressureFlow) {
              const dataDay = moment(new Date()).startOf('day');
              dataDay.add('seconds', data.brew_time);
              this.flowProfileChartEl.data.datasets[3].data.push({
                x: dataDay.toDate().getTime(),
                y: data.actual_pressure,
              });
            }
          }
        }
        this.flowProfileChartEl.update('quite');
      }
      // Check changes after all is done
      this.checkChanges();
    }, 250);
  }

  public deattachToWeightChange() {
    if (this.scaleFlowSubscription) {
      this.scaleFlowSubscription.unsubscribe();
      this.scaleFlowSubscription = undefined;
    }
  }

  public deattachToFlowChange() {
    if (this.scaleFlowChangeSubscription) {
      this.scaleFlowChangeSubscription.unsubscribe();
      this.scaleFlowChangeSubscription = undefined;
    }
  }

  public deattachToPressureChange() {
    if (this.pressureDeviceSubscription) {
      this.pressureDeviceSubscription.unsubscribe();
      this.pressureDeviceSubscription = undefined;
    }
  }

  public shallFlowProfileBeHidden(): boolean {
    if (
      this.smartScaleConnected() === true ||
      this.pressureDeviceConnected() === true
    ) {
      return false;
    }
    if (this.isEdit === true && this.data.flow_profile !== '') {
      return false;
    }
    if (this.flow_profile_raw.weight.length > 0) {
      return false;
    }

    return true;
  }

  public getAvgFlow(): number {
    const waterFlows: Array<IBrewWaterFlow> = this.flow_profile_raw.waterFlow;
    let calculatedFlow: number = 0;
    let foundEntries: number = 0;
    for (const water of waterFlows) {
      if (water.value > 0) {
        calculatedFlow += water.value;
        foundEntries += 1;
      }
    }
    if (calculatedFlow > 0) {
      return calculatedFlow / foundEntries;
    }
    return 0;
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
      this.customCreationDate = moment
        .unix(this.data.config.unix_timestamp)
        .toISOString();
      this.displayingBrewTime = moment()
        .startOf('day')
        .add('seconds', this.data.brew_time)
        .toISOString();
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
    if (this.settings.brew_milliseconds) {
      this.data.coffee_first_drip_time_milliseconds =
        this.timer.getMilliseconds();
    }
    this.brewFirstDripTime.setTime(
      this.data.coffee_first_drip_time,
      this.data.coffee_first_drip_time_milliseconds
    );
  }

  public setCoffeeBloomingTime($event): void {
    this.data.coffee_blooming_time = this.getTime();
    if (this.settings.brew_milliseconds) {
      this.data.coffee_blooming_time_milliseconds =
        this.timer.getMilliseconds();
    }
    this.brewCoffeeBloomingTime.setTime(
      this.data.coffee_blooming_time,
      this.data.coffee_blooming_time_milliseconds
    );
  }

  public brewTimeTicked(_event): void {
    if (this.timer) {
      this.data.brew_time = this.timer.getSeconds();
      if (this.settings.brew_milliseconds) {
        this.data.brew_time_milliseconds = this.timer.getMilliseconds();
      }
    } else {
      this.data.brew_time = 0;
    }
  }

  public async timerStarted(_event) {
    const scale: BluetoothScale = this.bleManager.getScale();
    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    /**
     let weight=0;
     let realtime_flow = 0;
     let flow = 0;
     let pressure = 0;
     this.startingFlowTime = Date.now();
     this.flowProfileChartEl.options.scales.x.realtime.pause = false;
     const startingDay = moment(new Date()).startOf('day');
     //IF brewtime has some seconds, we add this to the delay directly.
     if (this.data.brew_time > 0) {
      startingDay.add('seconds',this.data.brew_time);
    }
     const delay = Date.now() - startingDay.toDate().getTime();
     this.flowProfileChartEl.options.scales.x.realtime.delay = delay;
     this.flowProfileChartEl.update('quiet');
     setInterval(() => {
      flow = Math.floor(Math.random() * 11);
      realtime_flow = Math.floor(Math.random() * 11);
      weight = weight + Math.floor(Math.random() * 11);
      pressure = Math.floor(Math.random() * 11);
      const flowObj= {
        unixTime: moment(new Date()).startOf('day').add('milliseconds',Date.now() - this.startingFlowTime).toDate().getTime(),
        weight: weight,
        realtime_flow: realtime_flow,
        flow: flow
      };
      this.flowProfileChartEl.data.datasets[0].data.push(
        {x: flowObj.unixTime, y: flowObj.weight}
      );
      this.flowProfileChartEl.data.datasets[1].data.push(
        {x: flowObj.unixTime, y: flowObj.flow}
      );
      this.flowProfileChartEl.data.datasets[2].data.push(
        {x: flowObj.unixTime, y: flowObj.realtime_flow}
      );
      this.flowProfileChartEl.data.datasets[3].data.push(
        {x: flowObj.unixTime, y: pressure}
      );
      this.flowProfileChartEl.update('quite');
    },100);
     **/
    if (scale || pressureDevice) {
      if (scale) {
        if (this.settings.bluetooth_scale_tare_on_start_timer === true) {
          await new Promise((resolve) => {
            setTimeout(async () => {
              await scale.tare();
              resolve(undefined);
            }, 50);
          });
        }
        await new Promise((resolve) => {
          setTimeout(async () => {
            await scale.setTimer(SCALE_TIMER_COMMAND.START);
            resolve(undefined);
          }, 50);
        });
      }
      if (pressureDevice) {
        await pressureDevice.updateZero();
      }

      if (this.settings.bluetooth_scale_maximize_on_start_timer === true) {
        this.maximizeFlowGraph();
      }

      this.startingFlowTime = Date.now();
      const startingDay = moment(new Date()).startOf('day');
      // IF brewtime has some seconds, we add this to the delay directly.
      if (this.data.brew_time > 0) {
        startingDay.add('seconds', this.data.brew_time);
      }
      const delay = Date.now() - startingDay.toDate().getTime();
      this.flowProfileChartEl.options.scales.x.realtime.delay = delay;
      this.flowProfileChartEl.options.scales.x.realtime.pause = false;
      //Don't update quietly.
      this.flowProfileChartEl.update();

      if (scale) {
        this.attachToScaleWeightChange();
        this.attachToFlowChange();
      }
      if (pressureDevice) {
        this.attachToPressureChange();
      }
    }
  }

  public async timerResumed(_event) {
    const scale: BluetoothScale = this.bleManager.getScale();
    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();

    if (scale || pressureDevice) {
      if (scale) {
        await scale.setTimer(SCALE_TIMER_COMMAND.START);
      }
      this.startingFlowTime = Date.now();

      const startingDay = moment(new Date()).startOf('day');
      // IF brewtime has some seconds, we add this to the delay directly.
      if (this.data.brew_time > 0) {
        startingDay.add('seconds', this.data.brew_time);

        this.startingFlowTime = moment()
          .subtract('seconds', this.data.brew_time)
          .toDate()
          .getTime();
      }
      const delay = Date.now() - startingDay.toDate().getTime();
      this.flowProfileChartEl.options.scales.x.realtime.delay = delay;
      this.flowProfileChartEl.options.scales.x.realtime.pause = false;
      this.flowProfileChartEl.update('quiet');

      if (scale) {
        this.attachToScaleWeightChange();
        this.attachToFlowChange();
      }
      if (pressureDevice) {
        this.attachToPressureChange();
      }
    }
  }

  public async timerPaused(_event) {
    const scale: BluetoothScale = this.bleManager.getScale();
    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    if (scale || pressureDevice) {
      if (scale) {
        await scale.setTimer(SCALE_TIMER_COMMAND.STOP);
        this.deattachToWeightChange();
        this.deattachToFlowChange();
      }
      if (pressureDevice) {
        this.deattachToPressureChange();
      }
      this.flowProfileChartEl.options.scales.x.realtime.pause = true;
      this.flowProfileChartEl.update('quiet');
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
    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    if (scale || pressureDevice) {
      await this.uiAlert.showLoadingSpinner();
      if (scale) {
        await scale.tare();

        await new Promise((resolve) => {
          setTimeout(async () => {
            await scale.setTimer(SCALE_TIMER_COMMAND.STOP);
            resolve(undefined);
          }, 50);
        });

        await new Promise((resolve) => {
          setTimeout(async () => {
            await scale.setTimer(SCALE_TIMER_COMMAND.RESET);
            resolve(undefined);
          }, 50);
        });

        this.deattachToWeightChange();
        this.deattachToFlowChange();
      }

      if (pressureDevice) {
        this.deattachToPressureChange();
      }

      if (this.isEdit) {
        await this.deleteFlowProfile();
        this.data.flow_profile = '';
      }

      this.flow_profile_raw = new BrewFlow();

      this.initializeFlowChart();

      // Give the buttons a bit of time, 100ms won't be an issue for user flow
      await new Promise((resolve) => {
        setTimeout(async () => {
          await this.uiAlert.hideLoadingSpinner();
          resolve(undefined);
        }, 100);
      });
    }
  }

  public temperatureTimeChanged(_event): void {
    if (this.brewTemperatureTime) {
      this.data.brew_temperature_time = this.brewTemperatureTime.getSeconds();
      if (this.settings.brew_milliseconds) {
        this.data.brew_temperature_time_milliseconds =
          this.brewTemperatureTime.getMilliseconds();
      }
    } else {
      this.data.brew_temperature_time = 0;
      this.data.brew_temperature_time_milliseconds = 0;
    }
  }

  public coffeeBloomingTimeChanged(_event): void {
    if (this.brewTemperatureTime) {
      this.data.coffee_blooming_time = this.brewCoffeeBloomingTime.getSeconds();
      if (this.settings.brew_milliseconds) {
        this.data.coffee_blooming_time_milliseconds =
          this.brewCoffeeBloomingTime.getMilliseconds();
      }
    } else {
      this.data.coffee_blooming_time = 0;
      this.data.coffee_blooming_time_milliseconds = 0;
    }
  }
  public coffeeFirstDripTimeChanged(_event): void {
    if (this.brewTemperatureTime) {
      this.data.coffee_first_drip_time = this.brewFirstDripTime.getSeconds();
      if (this.settings.brew_milliseconds) {
        this.data.coffee_first_drip_time_milliseconds =
          this.brewFirstDripTime.getMilliseconds();
      }
    } else {
      this.data.coffee_first_drip_time = 0;
      this.data.coffee_first_drip_time_milliseconds = 0;
    }
  }

  public getPreparation(): Preparation {
    return this.uiPreparationStorage.getByUUID(this.data.method_of_preparation);
  }

  public chooseDateTime(_event) {
    if (this.platform.is('cordova')) {
      _event.target.blur();
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
          this.checkChanges();
        },
        error: () => {},
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
    if (typeof this.brewStars !== 'undefined') {
      this.brewStars.setRating(this.data.rating);
    }
  }

  public async showTimeOverlay(_event) {
    _event.stopPropagation();
    _event.stopImmediatePropagation();

    const modal = await this.modalController.create({
      component: DatetimePopoverComponent,
      id: 'datetime-popover',
      cssClass: 'popover-actions',
      breakpoints: [0, 0.5, 0.75, 1],
      initialBreakpoint: 0.5,
      componentProps: { displayingTime: this.displayingBrewTime },
    });
    await modal.present();
    const modalData = await modal.onWillDismiss();
    if (
      modalData !== undefined &&
      modalData.data &&
      modalData.data.displayingTime !== undefined
    ) {
      this.displayingBrewTime = modalData.data.displayingTime;
      this.data.brew_time = moment
        .duration(
          moment(modalData.data.displayingTime).diff(
            moment(modalData.data.displayingTime).startOf('day')
          )
        )
        .asSeconds();
    }
  }

  // tslint:disable-next-line
  private __loadLastBrew(): void {
    if (
      this.settings.manage_parameters.set_last_coffee_brew ||
      this.data.getPreparation().manage_parameters.set_last_coffee_brew
    ) {
      const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
      if (brews.length > 0) {
        const lastBrew: Brew = brews[brews.length - 1];

        this.__loadBrew(lastBrew, false);
      }
    }
  }

  private __setScaleWeight(
    _weight: number,
    _wrongFlow: boolean,
    _weightDidntChange: boolean
  ) {
    if (_wrongFlow === false || _weightDidntChange === true) {
      if (
        this.data.getPreparation().style_type !==
        PREPARATION_STYLE_TYPE.ESPRESSO
      ) {
        if (_weight > 0) {
          this.data.brew_quantity = this.uiHelper.toFixedIfNecessary(
            _weight,
            1
          );
        }
      } else {
        if (_weight > 0) {
          // If the drip timer is showing, we can set the first drip and not doing a reference to the normal weight.
          this.data.brew_beverage_quantity = this.uiHelper.toFixedIfNecessary(
            _weight,
            1
          );
        }
      }
      this.checkChanges();
    } else {
      // Pah. Shit here.
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
    this.uiFileHelper.saveJSONFile(
      savingPath,
      JSON.stringify(this.flow_profile_raw)
    );
    return savingPath;
  }

  private async readFlowProfile() {
    const flowProfilePath =
      'brews/' + this.data.config.uuid + '_flow_profile.json';
    try {
      const jsonParsed = await this.uiFileHelper.getJSONFile(flowProfilePath);
      this.flow_profile_raw = jsonParsed;
    } catch (ex) {}
  }

  private async deleteFlowProfile() {
    try {
      if (this.data.flow_profile !== '') {
        const flowProfilePath =
          'brews/' + this.data.config.uuid + '_flow_profile.json';
        await this.uiFileHelper.deleteFile(flowProfilePath);
      }
    } catch (ex) {}
  }

  private __setPressureFlow(_pressure: any) {
    // Nothing for storing etc. is done here actually
    const actual: number = _pressure.actual;
    const old: number = _pressure.old;

    // If no smartscale is connected, the set pressure flow needs to be the master to set flowtime and flowtime seconds, else we just retrieve from the scale.
    const isSmartScaleConnected = this.smartScaleConnected();
    if (!isSmartScaleConnected) {
      if (this.flowTime === undefined) {
        this.flowTime = this.getTime();
      }
    }

    const actualUnixTime: number = moment(new Date())
      .startOf('day')
      .add('milliseconds', Date.now() - this.startingFlowTime)
      .toDate()
      .getTime();

    const pressureObj = {
      unixTime: actualUnixTime,
      actual: actual,
      old: old,
      flowTime: this.flowTime,
      flowTimeSecond: this.flowTime + '.' + this.flowSecondTick,
    };

    if (!isSmartScaleConnected) {
      if (this.flowTime !== this.getTime()) {
        this.flowTime = this.getTime();
        this.flowSecondTick = 0;
      }
    }
    this.flowProfileChartEl.data.datasets[3].data.push({
      x: pressureObj.unixTime,
      y: pressureObj.actual,
    });
    this.pushPressureProfile(
      pressureObj.flowTimeSecond,
      pressureObj.actual,
      pressureObj.old
    );

    this.flowProfileChartEl.update('quiet');
    if (!isSmartScaleConnected) {
      this.flowSecondTick++;
    }
    this.brewPressureGraphSubject.next({
      pressure: pressureObj.actual,
    });
  }

  private __setFlowProfile(_scaleChange: any) {
    const weight: number = this.uiHelper.toFixedIfNecessary(
      _scaleChange.actual,
      1
    );
    const oldWeight: number = this.uiHelper.toFixedIfNecessary(
      _scaleChange.old,
      1
    );
    const smoothedWeight: number = this.uiHelper.toFixedIfNecessary(
      _scaleChange.smoothed,
      1
    );
    const oldSmoothedWeight: number = this.uiHelper.toFixedIfNecessary(
      _scaleChange.oldSmoothed,
      1
    );

    if (this.flowTime === undefined) {
      this.flowTime = this.getTime();
    }

    const flowObj = {
      unixTime: moment(new Date())
        .startOf('day')
        .add('milliseconds', Date.now() - this.startingFlowTime)
        .toDate()
        .getTime(),
      weight: weight,
      oldWeight: oldWeight,
      smoothedWeight: smoothedWeight,
      oldSmoothedWeight: oldSmoothedWeight,
      flowTime: this.flowTime,
      flowTimeSecond: this.flowTime + '.' + this.flowSecondTick,
      flowTimestamp: this.uiHelper.getActualTimeWithMilliseconds(),
    };

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

          if (
            this.data.getPreparation().style_type !==
            PREPARATION_STYLE_TYPE.ESPRESSO
          ) {
            // Treat this as same level as other if and not else if.
            // We just check this when we're not on espresso, cause sometimes we just get 0.1 or 0.2g changes in 1 second
            if (val === nextVal) {
              sameFlowPerTenHerzCounter += 1;
              if (sameFlowPerTenHerzCounter >= 5) {
                //
                wrongFlow = true;
                weightDidntChange = true;
                // We don't get out of the loop here, why? because the next value could be negative, and we then need to say that the weight changed, else we would maybe set wrong data.
              }
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

      // Maybe we got 8 tickets with minus values, we would set above that the weight didn't change, this would be wrong
      if (weightDidntChange === true && flowHasSomeMinusValueInIt === true) {
        weightDidntChange = false;
      }

      // If the first anomalie check is done, we check the second anomalie
      if (wrongFlow === false) {
        const firstVal: number = this.flowProfileArr[0];
        const lastVal: number =
          this.flowProfileArr[this.flowProfileArr.length - 1];

        if (
          this.data.getPreparation().style_type !==
          PREPARATION_STYLE_TYPE.ESPRESSO
        ) {
          // We do some calculations on filter
          if (lastVal - firstVal > 100) {
            // Threshhold reached, more then 100g in on esecond is to much
            wrongFlow = true;
          } else if (firstVal === lastVal) {
            // Weight didn't change at all.
            weightDidntChange = true;
            wrongFlow = true;
          } else if (
            lastVal - firstVal < 0.5 ||
            (this.flowProfileArr.length > 2 &&
              this.flowProfileArr[this.flowProfileArr.length - 2] - firstVal <
                0.5)
          ) {
            // Threshold for filter is bigger, 0.5g
            // Threshshold, weight changes because of strange thing happening.
            // Sometimes the weight changes so strange, that the last two preVal's came above
            wrongFlow = true;
            weightDidntChange = true;
          }
        } else {
          if (lastVal - firstVal > 100) {
            // Threshhold reached, more then 100g in on esecond is to much
            wrongFlow = true;
          } else if (firstVal === lastVal) {
            // Weight didn't change at all.
            weightDidntChange = true;
            wrongFlow = true;
          } else if (lastVal - firstVal < 0.1) {
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

        let calculatedFlowWeight = 0;
        for (const flowWeight of this.flowProfileArrCalculated) {
          calculatedFlowWeight += flowWeight;
        }
        calculatedFlowWeight =
          (calculatedFlowWeight / this.flowProfileArrCalculated.length) * 10;

        // Ignore flowing weight when we're below zero
        if (calculatedFlowWeight < 0) {
          calculatedFlowWeight = 0;
        }
        actualFlowValue = calculatedFlowWeight;
      }

      if (actualFlowValue >= 70) {
        // Something went broken, more then 70 flow seems like miserable.
        actualFlowValue = 0;
      }

      let lastFoundRightValue = 0;
      for (
        let i = this.flowProfileChartEl.data.datasets[0].data.length - 1;
        i >= 0;
        i--
      ) {
        const dataVal = this.flowProfileChartEl.data.datasets[0].data[i];
        if (dataVal !== null) {
          if (
            this.settings.bluetooth_ignore_negative_values === true &&
            dataVal.y > 0
          ) {
            lastFoundRightValue = dataVal.y;
          } else {
            lastFoundRightValue = dataVal.y;
          }

          break;
        }
      }

      if (
        this.settings.bluetooth_ignore_anomaly_values === true ||
        this.settings.bluetooth_ignore_negative_values === true
      ) {
        for (const item of this.flowProfileArrObjs) {
          // tslint:disable-next-line:no-shadowed-variable
          let weightToAdd = item.weight;

          if (this.settings.bluetooth_ignore_anomaly_values === true) {
            if (wrongFlow === true) {
              weightToAdd = null;
            }
          }
          if (
            flowHasSomeMinusValueInIt === true &&
            this.settings.bluetooth_ignore_negative_values === true
          ) {
            weightToAdd = null;
          }

          if (weightToAdd === null) {
            // Set the last right weight value
            weightToAdd = lastFoundRightValue;
          }

          this.flowProfileChartEl.data.datasets[0].data.push({
            x: item.unixTime,
            y: weightToAdd,
          });
          this.pushFlowProfile(
            item.flowTimestamp,
            item.flowTimeSecond,
            weightToAdd,
            item.oldWeight,
            item.smoothedWeight,
            item.oldSmoothedWeight
          );
        }
      }

      const timestamp = this.uiHelper.getActualTimeWithMilliseconds();

      for (const item of this.flowProfileArrObjs) {
        const waterFlow: IBrewWaterFlow = {} as IBrewWaterFlow;

        waterFlow.brew_time = this.flowTime.toString();
        waterFlow.timestamp = timestamp;
        waterFlow.value = actualFlowValue;
        this.flowProfileChartEl.data.datasets[1].data.push({
          x: item.unixTime,
          y: actualFlowValue,
        });
        this.flow_profile_raw.waterFlow.push(waterFlow);
      }

      this.__setScaleWeight(weight, wrongFlow, weightDidntChange);

      // Reset
      this.flowTime = this.getTime();
      this.flowSecondTick = 0;

      this.flowProfileArr = [];
      this.flowProfileArrObjs = [];
      this.flowProfileArrCalculated = [];
      this.flowProfileChartEl.update('quiet');
    }

    this.flowProfileArr.push(weight);
    this.flowProfileArrObjs.push(flowObj);
    this.flowProfileArrCalculated.push(weight - oldWeight);

    /* Realtime flow start**/
    let lastRealtimeFlow = null;
    if (this.flow_profile_raw.realtimeFlow.length > 0) {
      lastRealtimeFlow =
        this.flow_profile_raw.realtimeFlow[
          this.flow_profile_raw.realtimeFlow.length - 1
        ];
    }

    let oldRealtimeSmoothedValue = 0;
    if (lastRealtimeFlow != null) {
      oldRealtimeSmoothedValue = lastRealtimeFlow.smoothed_weight;
    }
    const newSmoothedWeight = oldRealtimeSmoothedValue * 0.9 + weight * 0.1;

    const realtimeWaterFlow: IBrewRealtimeWaterFlow =
      {} as IBrewRealtimeWaterFlow;

    realtimeWaterFlow.brew_time = flowObj.flowTimeSecond;
    realtimeWaterFlow.timestamp = this.uiHelper.getActualTimeWithMilliseconds();
    realtimeWaterFlow.smoothed_weight = newSmoothedWeight;
    realtimeWaterFlow.flow_value =
      (newSmoothedWeight - oldRealtimeSmoothedValue) * 10;

    this.flowProfileChartEl.data.datasets[2].data.push({
      x: flowObj.unixTime,
      y: realtimeWaterFlow.flow_value,
    });
    this.flow_profile_raw.realtimeFlow.push(realtimeWaterFlow);
    /* Realtime flow End **/

    if (
      this.data.getPreparation().style_type ===
        PREPARATION_STYLE_TYPE.ESPRESSO &&
      flowObj.weight > 0
    ) {
      // If the drip timer is showing, we can set the first drip and not doing a reference to the normal weight.
      if (
        this.timer.showDripTimer === true &&
        this.data.coffee_first_drip_time <= 0
      ) {
        // First drip is incoming
        if (
          this.uiBrewHelper.fieldVisible(
            this.settings.manage_parameters.coffee_first_drip_time,
            this.data.getPreparation().manage_parameters.coffee_first_drip_time,
            this.data.getPreparation().use_custom_parameters
          )
        ) {
          // The first time we set the weight, we have one sec delay, because of this do it -1 second
          this.data.coffee_first_drip_time = this.timer.getSeconds();
          if (this.settings.brew_milliseconds) {
            this.data.coffee_first_drip_time_milliseconds =
              this.timer.getMilliseconds();
          }
          this.checkChanges();
        }
      }
    }

    if (
      this.settings.bluetooth_ignore_anomaly_values === false &&
      this.settings.bluetooth_ignore_negative_values === false
    ) {
      this.flowProfileChartEl.data.datasets[0].data.push({
        x: flowObj.unixTime,
        y: flowObj.weight,
      });

      this.pushFlowProfile(
        flowObj.flowTimestamp,
        flowObj.flowTimeSecond,
        flowObj.weight,
        flowObj.oldWeight,
        flowObj.smoothedWeight,
        flowObj.oldSmoothedWeight
      );
      this.flowProfileChartEl.update('quiet');
    }

    this.flowSecondTick++;
  }

  private pushFlowProfile(
    _timestamp: string,
    _brewTime: string,
    _actualWeight: number,
    _oldWeight: number,
    _actualSmoothedWeight: number,
    _oldSmoothedWeight: number
  ) {
    const brewFlow: IBrewWeightFlow = {} as IBrewWeightFlow;
    brewFlow.timestamp = _timestamp;
    brewFlow.brew_time = _brewTime;
    brewFlow.actual_weight = _actualWeight;
    brewFlow.old_weight = _oldWeight;
    brewFlow.actual_smoothed_weight = _actualSmoothedWeight;
    brewFlow.old_smoothed_weight = _oldSmoothedWeight;
    this.flow_profile_raw.weight.push(brewFlow);
  }

  private pushPressureProfile(
    _brewTime: string,
    _actualPressure: number,
    _oldPressure: number
  ) {
    const pressureFlow: IBrewPressureFlow = {} as IBrewPressureFlow;
    pressureFlow.timestamp = this.uiHelper.getActualTimeWithMilliseconds();
    pressureFlow.brew_time = _brewTime;
    pressureFlow.actual_pressure = _actualPressure;
    pressureFlow.old_pressure = _oldPressure;

    this.flow_profile_raw.pressureFlow.push(pressureFlow);
  }

  public setActualSmartInformation() {
    try {
      const weightEl = this.smartScaleWeightEl.nativeElement;
      const flowEl = this.smartScaleWeightPerSecondEl.nativeElement;
      const avgFlowEl = this.smartScaleAvgFlowPerSecondEl.nativeElement;

      const actualScaleWeight = this.getActualScaleWeight();
      const actualSmoothedWeightPerSecond =
        this.getActualSmoothedWeightPerSecond();
      const avgFlow = this.uiHelper.toFixedIfNecessary(this.getAvgFlow(), 2);
      weightEl.textContent = actualScaleWeight + ' g';
      flowEl.textContent = actualSmoothedWeightPerSecond + ' g/s';
      avgFlowEl.textContent = 'Ø ' + avgFlow + ' g/s';

      this.brewFlowGraphSubject.next({
        scaleWeight: actualScaleWeight + ' g',
        smoothedWeight: actualSmoothedWeightPerSecond + ' g/s',
        avgFlow: 'Ø ' + avgFlow + ' g/s',
      });
    } catch (ex) {}
  }

  public getActualScaleWeight() {
    try {
      return this.uiHelper.toFixedIfNecessary(
        this.bleManager.getScale().getWeight(),
        1
      );
    } catch (ex) {
      return 0;
    }
  }

  public getActualSmoothedWeightPerSecond(): number {
    try {
      const lastflow =
        this.flow_profile_raw.weight[this.flow_profile_raw.weight.length - 1];
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
    if (
      this.settings.default_last_coffee_parameters.method_of_preparation ||
      _template === true
    ) {
      const brewPreparation: IPreparation = this.uiPreparationStorage.getByUUID(
        brew.method_of_preparation
      );
      if (!brewPreparation.finished) {
        this.data.method_of_preparation = brewPreparation.config.uuid;
      }
    }
    let checkData: Settings | Preparation;
    if (
      this.getPreparation().use_custom_parameters === true &&
      this.getPreparation().manage_parameters.set_last_coffee_brew === true
    ) {
      checkData = this.getPreparation();
    } else {
      checkData = this.settings;
    }

    if (
      checkData.default_last_coffee_parameters.bean_type ||
      _template === true
    ) {
      const brewBean: IBean = this.uiBeanStorage.getByUUID(brew.bean);
      if (!brewBean.finished) {
        this.data.bean = brewBean.config.uuid;
      }
    }

    if (
      checkData.default_last_coffee_parameters.grind_size ||
      _template === true
    ) {
      this.data.grind_size = brew.grind_size;
    }
    if (
      checkData.default_last_coffee_parameters.grind_weight ||
      _template === true
    ) {
      this.data.grind_weight = brew.grind_weight;
    }

    if (checkData.default_last_coffee_parameters.mill || _template === true) {
      const brewMill: IMill = this.uiMillStorage.getByUUID(brew.mill);
      if (!brewMill.finished) {
        this.data.mill = brewMill.config.uuid;
      }
    }
    if (
      checkData.default_last_coffee_parameters.mill_timer ||
      _template === true
    ) {
      this.data.mill_timer = brew.mill_timer;
    }
    if (
      checkData.default_last_coffee_parameters.mill_speed ||
      _template === true
    ) {
      this.data.mill_speed = brew.mill_speed;
    }
    if (
      checkData.default_last_coffee_parameters.pressure_profile ||
      _template === true
    ) {
      this.data.pressure_profile = brew.pressure_profile;
    }
    if (
      checkData.default_last_coffee_parameters.brew_temperature ||
      _template === true
    ) {
      this.data.brew_temperature = brew.brew_temperature;
    }

    if (this.brewTemperatureTime) {
      if (
        checkData.default_last_coffee_parameters.brew_temperature_time ||
        _template === true
      ) {
        this.data.brew_temperature_time = brew.brew_temperature_time;
        if (this.settings.brew_milliseconds) {
          this.data.brew_temperature_time_milliseconds =
            brew.brew_temperature_time_milliseconds;
        }
        setTimeout(() => {
          this.brewTemperatureTime.setTime(
            this.data.brew_temperature_time,
            this.data.brew_temperature_time_milliseconds
          );
        }, 250);
      }
    }

    if (this.timer) {
      if (
        checkData.default_last_coffee_parameters.brew_time ||
        _template === true
      ) {
        this.data.brew_time = brew.brew_time;
        if (this.settings.brew_milliseconds) {
          this.data.brew_time_milliseconds = brew.brew_time_milliseconds;
        }
        setTimeout(() => {
          this.timer.setTime(
            this.data.brew_time,
            this.data.brew_time_milliseconds
          );
        }, 250);
      }
    }

    if (
      checkData.default_last_coffee_parameters.brew_quantity ||
      _template === true
    ) {
      this.data.brew_quantity = brew.brew_quantity;
      this.data.brew_quantity_type = brew.brew_quantity_type;
    }
    if (
      checkData.default_last_coffee_parameters.coffee_type ||
      _template === true
    ) {
      this.data.coffee_type = brew.coffee_type;
    }
    if (
      checkData.default_last_coffee_parameters.coffee_concentration ||
      _template === true
    ) {
      this.data.coffee_concentration = brew.coffee_concentration;
    }
    if (
      checkData.default_last_coffee_parameters.coffee_first_drip_time ||
      _template === true
    ) {
      this.data.coffee_first_drip_time = brew.coffee_first_drip_time;
      if (this.settings.brew_milliseconds) {
        this.data.coffee_first_drip_time_milliseconds =
          brew.coffee_first_drip_time_milliseconds;
      }

      setTimeout(() => {
        if (this.brewFirstDripTime) {
          this.brewFirstDripTime.setTime(
            this.data.coffee_first_drip_time,
            this.data.coffee_first_drip_time_milliseconds
          );
        }
      }, 250);
    }
    if (
      checkData.default_last_coffee_parameters.coffee_blooming_time ||
      _template === true
    ) {
      this.data.coffee_blooming_time = brew.coffee_blooming_time;
      if (this.settings.brew_milliseconds) {
        this.data.coffee_blooming_time_milliseconds =
          brew.coffee_blooming_time_milliseconds;
      }

      setTimeout(() => {
        if (this.brewCoffeeBloomingTime) {
          this.brewCoffeeBloomingTime.setTime(
            this.data.coffee_blooming_time,
            this.data.coffee_blooming_time_milliseconds
          );
        }
      }, 250);
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
    if (
      checkData.default_last_coffee_parameters.brew_beverage_quantity ||
      _template === true
    ) {
      this.data.brew_beverage_quantity = brew.brew_beverage_quantity;
      this.data.brew_beverage_quantity_type = brew.brew_beverage_quantity_type;
    }
    if (
      checkData.default_last_coffee_parameters.method_of_preparation_tool ||
      _template === true
    ) {
      const repeatTools = brew.method_of_preparation_tools;
      this.data.method_of_preparation_tools = [];
      for (const id of repeatTools) {
        const tool = this.data
          .getPreparation()
          .tools.find((e) => e.config.uuid === id);
        if (tool.archived === false) {
          this.data.method_of_preparation_tools.push(tool.config.uuid);
        }
      }
    }
    if (checkData.default_last_coffee_parameters.water || _template === true) {
      this.data.water = brew.water;
    }

    if (checkData.default_last_coffee_parameters.vessel || _template === true) {
      this.data.vessel_name = brew.vessel_name;
      this.data.vessel_weight = brew.vessel_weight;
    }
    if (
      checkData.default_last_coffee_parameters.bean_weight_in ||
      _template === true
    ) {
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
    const filteredEntries = this.uiBrewStorage
      .getAllEntries()
      .filter((e) =>
        e.pressure_profile.toLowerCase().includes(actualSearchValue)
      );

    for (const entry of filteredEntries) {
      this.profileResults.push(entry.pressure_profile);
    }
    // Distinct values
    this.profileResults = Array.from(
      new Set(this.profileResults.map((e) => e))
    );

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
    const filteredEntries = this.uiBrewStorage
      .getAllEntries()
      .filter(
        (e) =>
          e.vessel_name !== '' &&
          e.vessel_name.toLowerCase().includes(actualSearchValue)
      );

    for (const entry of filteredEntries) {
      if (
        this.vesselResults.filter(
          (e) =>
            e.name === entry.vessel_name && e.weight === entry.vessel_weight
        ).length <= 0
      ) {
        this.vesselResults.push({
          name: entry.vessel_name,
          weight: entry.vessel_weight,
        });
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
    return (
      this.uiWaterStorage.getAllEntries().filter((e) => !e.finished).length > 0
    );
  }

  public async calculateBrixToTds() {
    const modal = await this.modalController.create({
      component: BrewBrixCalculatorComponent,
      cssClass: 'popover-actions',
      breakpoints: [0, 0.25],
      initialBreakpoint: 0.25,
      id: BrewBrixCalculatorComponent.COMPONENT_ID,
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
      breakpoints: [0, 0.5],
      initialBreakpoint: 0.5,
      componentProps: {
        vesselWeight: vesselWeight,
      },
      id: BrewBeverageQuantityCalculatorComponent.COMPONENT_ID,
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data !== undefined && data.brew_beverage_quantity > 0) {
      this.data.brew_beverage_quantity = this.uiHelper.toFixedIfNecessary(
        data.brew_beverage_quantity,
        1
      );
    }
  }
}
