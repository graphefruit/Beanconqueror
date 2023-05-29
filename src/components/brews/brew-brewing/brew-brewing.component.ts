import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  NgZone,
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

import { UIHelper } from '../../../services/uiHelper';
import { UIExcel } from '../../../services/uiExcel';
import {
  BrewFlow,
  IBrewPressureFlow,
  IBrewRealtimeWaterFlow,
  IBrewTemperatureFlow,
  IBrewWaterFlow,
  IBrewWeightFlow,
} from '../../../classes/brew/brewFlow';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { BrewFlowComponent } from '../../../app/brew/brew-flow/brew-flow.component';
import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';
import { PreparationTool } from '../../../classes/preparation/preparationTool';

import { UIAlert } from '../../../services/uiAlert';
import {
  CoffeeBluetoothDevicesService,
  CoffeeBluetoothServiceEvent,
} from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { PressureDevice } from '../../../classes/devices/pressureBluetoothDevice';
import { BluetoothScale, SCALE_TIMER_COMMAND } from '../../../classes/devices';
import { IBrewGraphs } from '../../../interfaces/brew/iBrewGraphs';
import { BrewRatioCalculatorComponent } from '../../../app/brew/brew-ratio-calculator/brew-ratio-calculator.component';
import { PreparationDevice } from '../../../classes/preparationDevice/preparationDevice';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import {
  XeniaDevice,
  XeniaParams,
} from '../../../classes/preparationDevice/xenia/xeniaDevice';
import { TemperatureDevice } from 'src/classes/devices/temperatureBluetoothDevice';
import { PreparationDeviceType } from '../../../classes/preparationDevice';

declare var cordova;
declare var Plotly;
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

  @ViewChild('pressure', { read: ElementRef })
  public pressureEl: ElementRef;

  @ViewChild('temperature', { read: ElementRef })
  public temperatureEl: ElementRef;

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
  public flow_profile_raw: BrewFlow = new BrewFlow();
  public pressureDeviceSubscription: Subscription = undefined;
  public temperatureDeviceSubscription: Subscription = undefined;
  private scaleFlowChangeSubscription: Subscription = undefined;
  private flowProfileArr = [];
  private flowProfileArrObjs = [];
  private flowProfileArrCalculated = [];
  private flowTime: number = undefined;
  private flowSecondTick: number = 0;
  private startingFlowTime: number = undefined;
  private brewFlowGraphSubject: EventEmitter<any> = new EventEmitter();
  private brewPressureGraphSubject: EventEmitter<any> = new EventEmitter();
  private brewTemperatureGraphSubject: EventEmitter<any> = new EventEmitter();
  private maximizeFlowGraphIsShown: boolean = false;

  public weightTrace: any;
  public flowPerSecondTrace: any;
  public realtimeFlowTrace: any;
  public pressureTrace: any;
  public temperatureTrace: any;

  public weightTraceNew: any;

  private graphTimerTest: any = undefined;

  public lastChartLayout: any = undefined;
  public lastChartRenderingInstance: number = 0;
  public graphSettings: IBrewGraphs = undefined;

  public preparationDevice: XeniaDevice = undefined;

  private pressureThresholdWasHit: boolean = false;
  private temperatureThresholdWasHit: boolean = false;

  public customXeniaOptions = {
    cssClass: 'xenia-script-chooser',
  };

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
    private readonly uiAlert: UIAlert,
    private readonly uiPreparationHelper: UIPreparationHelper,
    private readonly ngZone: NgZone
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
            /** We start an empty new brew, and set the preparation method for it
             * so when the next brew will come, data can or will be preset
             * **/
            const newBrew = new Brew();
            newBrew.method_of_preparation =
              this.loadSpecificLastPreparation.config.uuid;
            this.__loadBrew(newBrew, false);
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
          setTimeout(() => {
            // Fix that you also see the brew weight
            const weightEl = this.smartScaleWeightEl.nativeElement;
            if (
              this.data.getPreparation().getPresetStyleType() ===
              PREPARATION_STYLE_TYPE.ESPRESSO
            ) {
              weightEl.textContent = this.data.brew_beverage_quantity + ' g';
            } else {
              if (this.data.brew_beverage_quantity > 0) {
                weightEl.textContent = this.data.brew_beverage_quantity + ' g';
              } else {
                weightEl.textContent = this.data.brew_quantity + ' g';
              }
            }
          }, 350);
        }

        this.instancePreparationDevice(this.data);
      }

      let isSomethingConnected: boolean = false;
      if (this.smartScaleConnected()) {
        await this.__connectSmartScale(true);
        isSomethingConnected = true;
      }
      if (
        this.pressureDeviceConnected() &&
        this.data.getPreparation().style_type ===
          PREPARATION_STYLE_TYPE.ESPRESSO
      ) {
        await this.__connectPressureDevice(true);
        isSomethingConnected = true;
      }
      if (this.temperatureDeviceConnected()) {
        await this.__connectTemperatureDevice(true);
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

          if (_type === CoffeeBluetoothServiceEvent.CONNECTED_SCALE) {
            connectTriggered = true;
            this.__connectSmartScale(false);
          } else if (_type === CoffeeBluetoothServiceEvent.DISCONNECTED_SCALE) {
            this.deattachToWeightChange();
            this.deattachToFlowChange();
            this.deattachToScaleEvents();
            disconnectTriggered = true;
          } else if (_type === CoffeeBluetoothServiceEvent.CONNECTED_PRESSURE) {
            connectTriggered = true;
            this.__connectPressureDevice(false);
          } else if (
            _type === CoffeeBluetoothServiceEvent.DISCONNECTED_PRESSURE
          ) {
            this.deattachToPressureChange();
            disconnectTriggered = true;
          } else if (
            _type === CoffeeBluetoothServiceEvent.CONNECTED_TEMPERATURE
          ) {
            connectTriggered = true;
            this.__connectTemperatureDevice(false);
          } else if (
            _type === CoffeeBluetoothServiceEvent.DISCONNECTED_TEMPERATURE
          ) {
            this.deattachToTemperatureChange();
            disconnectTriggered = true;
          }

          if (disconnectTriggered) {
            if (
              !this.smartScaleConnected() &&
              !this.pressureDeviceConnected() &&
              !this.temperatureDeviceConnected()
            ) {
              // When one is connected we don't pause
            }
          }
          if (connectTriggered) {
            if (this.weightTrace === undefined) {
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

  public resetPreparationTools() {
    setTimeout(() => {
      // Wait for 150ms, so we get the new preparation
      if (this.preparationMethodHasBeenFocused === true) {
        this.data.method_of_preparation_tools = [];
        this.preparationMethodHasBeenFocused = false;

        this.instancePreparationDevice();

        if (this.timer.isTimerRunning() === false) {
          this.initializeFlowChart();
        }
      }
    }, 150);
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange() {
    if (
      this.smartScaleConnected() ||
      this.pressureDeviceConnected() ||
      this.temperatureDeviceConnected()
    ) {
      setTimeout(() => {
        this.lastChartLayout.height = 150;
        this.lastChartLayout.width = document.getElementById(
          'canvasContainerBrew'
        ).offsetWidth;
        Plotly.relayout('flowProfileChart', this.lastChartLayout);
      }, 50);
    }
  }

  public async maximizeFlowGraph() {
    if (this.maximizeFlowGraphIsShown === true) {
      return;
    }
    this.maximizeFlowGraphIsShown = true;

    let actualOrientation;
    try {
      if (this.platform.is('cordova')) {
        actualOrientation = this.screenOrientation.type;
      }
    } catch (ex) {}

    await new Promise(async (resolve) => {
      this.updateChart();
      try {
        if (this.platform.is('cordova')) {
          await this.screenOrientation.lock(
            this.screenOrientation.ORIENTATIONS.LANDSCAPE
          );
        }
      } catch (ex) {}

      resolve(undefined);
    });

    const modal = await this.modalController.create({
      component: BrewFlowComponent,

      id: BrewFlowComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      componentProps: {
        brewComponent: this,
        brew: this.data,
        brewFlowGraphEvent: this.brewFlowGraphSubject,
        brewPressureGraphEvent: this.brewPressureGraphSubject,
        brewTemperatureGraphEvent: this.brewTemperatureGraphSubject,
      },
    });

    // will force rerender :D
    this.lastChartRenderingInstance = -1;
    await modal.present();
    await modal.onWillDismiss().then(async () => {
      this.maximizeFlowGraphIsShown = false;
      // will force rerender :D
      this.lastChartRenderingInstance = -1;
      // If responsive would be true, the add of the container would result into 0 width 0 height, therefore the hack
      this.updateChart();
      try {
        if (this.platform.is('cordova')) {
          if (
            this.screenOrientation.type ===
            this.screenOrientation.ORIENTATIONS.LANDSCAPE
          ) {
            if (
              this.screenOrientation.ORIENTATIONS.LANDSCAPE ===
              actualOrientation
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
      } catch (ex) {}

      await new Promise((resolve) => {
        setTimeout(async () => {
          this.onOrientationChange();
          resolve(undefined);
        }, 50);
      });
    });
  }

  public ngOnDestroy() {
    // We don't deattach the timer subscription in the deattach toscale events, else we couldn't start anymore.

    if (this.bluetoothSubscription) {
      this.bluetoothSubscription.unsubscribe();
      this.bluetoothSubscription = undefined;
    }

    this.deattachToWeightChange();
    this.deattachToFlowChange();
    this.deattachToPressureChange();
    this.deattachToScaleEvents();
    this.deattachToTemperatureChange();
  }

  public preparationMethodFocused() {
    // Needs to set , because ion-change triggers on smartphones but not on websites, and therefore the value is overwritten when you use a brew template
    this.preparationMethodHasBeenFocused = true;
  }

  public attachToScaleWeightChange() {
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale) {
      this.deattachToWeightChange();

      this.scaleFlowSubscription = scale.flowChange.subscribe((_val) => {
        if (
          this.timer.isTimerRunning() &&
          this.preparationDeviceConnected() &&
          this.data.preparationDeviceBrew.params.scriptAtWeightReachedNumber > 0
        ) {
          const weight: number = this.uiHelper.toFixedIfNecessary(
            _val.actual,
            1
          );
          if (
            weight >=
            this.data.preparationDeviceBrew.params.scriptAtWeightReachedNumber
          ) {
            if (
              this.data.preparationDeviceBrew.params.scriptAtWeightReachedId > 0
            ) {
              this.preparationDevice
                .startScript(
                  this.data.preparationDeviceBrew.params.scriptAtWeightReachedId
                )
                .catch(() => {});
            } else {
              // Instant stop!
              this.preparationDevice.stopScript().catch(() => {});
            }
            this.timer.pauseTimer('xenia');
          }
        }
        this.__setFlowProfile(_val);
      });
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

  public getGraphIonColSize() {
    let bluetoothDeviceConnections = 0;
    let smartScaleConnected: boolean = false;
    if (
      this.pressureDeviceConnected() &&
      this.data.getPreparation().style_type === PREPARATION_STYLE_TYPE.ESPRESSO
    ) {
      bluetoothDeviceConnections += 1;
    }
    if (this.temperatureDeviceConnected()) {
      bluetoothDeviceConnections += 1;
    }
    if (this.smartScaleConnected()) {
      bluetoothDeviceConnections += 1;
      smartScaleConnected = true;
    }

    if (bluetoothDeviceConnections === 3) {
      return 3;
    } else if (bluetoothDeviceConnections === 2) {
      if (smartScaleConnected) {
        return 4;
      } else {
        return 6;
      }
    } else if (bluetoothDeviceConnections === 1) {
      if (smartScaleConnected) {
        return 6;
      } else {
        return 12;
      }
    }
  }

  public temperatureDeviceConnected() {
    if (!this.platform.is('cordova')) {
      return true;
    }

    const temperatureDevice: TemperatureDevice =
      this.bleManager.getTemperatureDevice();
    return !!temperatureDevice;
  }

  public resetPressure() {
    if (this.pressureDeviceConnected()) {
      const pressureDevice: PressureDevice =
        this.bleManager.getPressureDevice();
      try {
        pressureDevice.updateZero();
      } catch (ex) {}
    }
  }

  public attachToPressureChange() {
    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    if (pressureDevice) {
      this.pressureThresholdWasHit = false;
      this.deattachToPressureChange();

      const isEspressoBrew: boolean =
        this.data.getPreparation().style_type ===
        PREPARATION_STYLE_TYPE.ESPRESSO;
      if (!isEspressoBrew) {
        return;
      }
      this.pressureDeviceSubscription = pressureDevice.pressureChange.subscribe(
        (_val) => {
          const actual: number = _val.actual;
          //Reset to 0, as a temporary fix to exclude the "451" bar
          if (actual > 15) {
            _val.actual = 0;
          }
          if (this.timer.isTimerRunning()) {
            this.__setPressureFlow(_val);
          } else {
            if (
              this.pressureThresholdWasHit === false &&
              this.settings.pressure_threshold_active &&
              _val.actual >= this.settings.pressure_threshold_bar
            ) {
              this.pressureThresholdWasHit = true;
              this.ngZone.run(() => {
                this.timerStartPressed(true);

                setTimeout(() => {
                  this.changeDetectorRef.markForCheck();
                  this.timer.checkChanges();
                  this.checkChanges();
                });
              });
            }
          }
        }
      );
    }
  }

  public attachToTemperatureChange() {
    const temperatureDevice: TemperatureDevice =
      this.bleManager.getTemperatureDevice();
    if (temperatureDevice) {
      this.temperatureThresholdWasHit = false;
      this.deattachToTemperatureChange();

      this.temperatureDeviceSubscription =
        temperatureDevice.temperatureChange.subscribe((_val) => {
          if (this.timer.isTimerRunning()) {
            this.__setTemperatureFlow(_val);
          } else {
            if (
              this.temperatureThresholdWasHit === false &&
              this.settings.temperature_threshold_active &&
              _val.actual >= this.settings.temperature_threshold_temp
            ) {
              this.temperatureThresholdWasHit = true;
              this.ngZone.run(() => {
                this.timerStartPressed(true);

                setTimeout(() => {
                  this.changeDetectorRef.markForCheck();
                  this.timer.checkChanges();
                  this.checkChanges();
                });
              });
            }
          }
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

    if (
      this.preparationDeviceConnected() &&
      this.data.preparationDeviceBrew.params.scriptAtFirstDripId > -1
    ) {
      this.preparationDevice
        .startScript(this.data.preparationDeviceBrew.params.scriptAtFirstDripId)
        .catch(() => {});
    }
  }

  public bluetoothScaleSetGrindWeight() {
    this.data.grind_weight = this.getActualBluetoothWeight();
    this.checkChanges();
  }

  public bluetoothScaleSetBeanWeightIn() {
    this.data.bean_weight_in = this.getActualBluetoothWeight();
    this.checkChanges();
  }

  public bluetoothScaleSetBrewQuantityWeight() {
    this.data.brew_quantity = this.getActualBluetoothWeight();
    this.checkChanges();
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
    this.checkChanges();
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

  public deattachToTemperatureChange() {
    if (this.temperatureDeviceSubscription) {
      this.temperatureDeviceSubscription.unsubscribe();
      this.temperatureDeviceSubscription = undefined;
    }
  }

  public shallFlowProfileBeHidden(): boolean {
    if (
      this.smartScaleConnected() === true ||
      this.temperatureDeviceConnected() === true ||
      (this.pressureDeviceConnected() === true &&
        this.data.getPreparation().style_type ===
          PREPARATION_STYLE_TYPE.ESPRESSO)
    ) {
      return false;
    }
    if (this.isEdit === true && this.data.flow_profile !== '') {
      return false;
    }
    if (
      this.flow_profile_raw.weight.length > 0 ||
      this.flow_profile_raw.pressureFlow.length > 0 ||
      this.flow_profile_raw.temperatureFlow.length > 0
    ) {
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

  public async timerStarted(_event) {
    const scale: BluetoothScale = this.bleManager.getScale();
    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    const temperatureDevice: TemperatureDevice =
      this.bleManager.getTemperatureDevice();
    if (!this.platform.is('cordova')) {
      let weight = 0;
      let realtime_flow = 0;
      let flow = 0;
      let pressure = 0;
      let temperature = 0;
      this.startingFlowTime = Date.now();
      const startingDay = moment(new Date()).startOf('day');
      //IF brewtime has some seconds, we add this to the delay directly.
      if (this.data.brew_time > 0) {
        startingDay.add('seconds', this.data.brew_time);
      }
      let flowTime = startingDay.toDate().getTime();
      for (var i = 0; i < 10000; i++) {
        weight = weight + Math.floor(Math.random() * 11);
        this.weightTraceNew.x.push(flowTime);
        this.weightTraceNew.y.push(weight);
        flowTime = flowTime + 10;
      }

      weight = 0;

      this.graphTimerTest = setInterval(() => {
        flow = Math.floor(Math.random() * 11);
        realtime_flow = Math.floor(Math.random() * 11);
        weight = weight + Math.floor(Math.random() * 11);
        pressure = Math.floor(Math.random() * 11);
        temperature = Math.floor(Math.random() * 90);
        this.__setPressureFlow({ actual: pressure, old: pressure });
        this.__setTemperatureFlow({ actual: temperature, old: temperature });
        this.__setFlowProfile({
          actual: weight,
          old: 1,
          smoothed: 1,
          oldSmoothed: 1,
        });

        this.brewPressureGraphSubject.next({
          pressure: pressure,
        });

        this.brewTemperatureGraphSubject.next({
          temperature: temperature,
        });
      }, 1);
    }

    if (scale || pressureDevice || temperatureDevice) {
      if (
        this.settings.bluetooth_scale_maximize_on_start_timer === true &&
        this.maximizeFlowGraphIsShown === false
      ) {
        // If maximizeFlowGraphIsShown===true, we already started once and resetted, don't show overlay again
        // First maximize, then go on with the timer, else it will lag hard.

        if (scale || temperatureDevice) {
          this.maximizeFlowGraph();
        } else {
          if (
            this.data.getPreparation().style_type ===
              PREPARATION_STYLE_TYPE.ESPRESSO &&
            pressureDevice
          ) {
            this.maximizeFlowGraph();
          } else {
            //Don't maximize because pressure is connected, but preparation is not right
          }
        }
      }

      if (scale) {
        if (this.settings.bluetooth_scale_tare_on_start_timer === true) {
          await new Promise((resolve) => {
            scale.tare();
            setTimeout(async () => {
              resolve(undefined);
            }, this.settings.bluetooth_command_delay);
          });
        }
        await new Promise((resolve) => {
          scale.setTimer(SCALE_TIMER_COMMAND.START);
          setTimeout(async () => {
            resolve(undefined);
          }, this.settings.bluetooth_command_delay);
        });
      }
      if (pressureDevice && this.settings.pressure_threshold_active === false) {
        // Just update to zero if there is no threshold active
        pressureDevice.updateZero();
      }

      this.startingFlowTime = Date.now();
      if (this.data.brew_time > 0) {
        // IF brewtime has some seconds, we add this to the delay directly.
        const startingDay = moment(new Date()).startOf('day');
        startingDay.add('seconds', this.data.brew_time);
        this.startingFlowTime = startingDay.toDate().getTime();
      }
      this.updateChart();

      if (scale) {
        this.attachToScaleWeightChange();
        this.attachToFlowChange();
      }
      if (
        pressureDevice &&
        (this.settings.pressure_threshold_active === false || _event !== true)
      ) {
        this.attachToPressureChange();
      }
      if (
        temperatureDevice &&
        (this.settings.temperature_threshold_active === false ||
          _event !== true)
      ) {
        this.attachToTemperatureChange();
      }
    }
    if (this.preparationDeviceConnected()) {
      if (this.data.preparationDeviceBrew.params.scriptStartId > 0) {
        this.preparationDevice
          .startScript(this.data.preparationDeviceBrew.params.scriptStartId)
          .catch(() => {});
      }
    }
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
      if (this.settings.brew_milliseconds) {
        this.data.brew_time_milliseconds = 0;
      }
    }
  }

  public async timerStartPressed(_event) {
    if (this.data.brew_time > 0) {
      const scale: BluetoothScale = this.bleManager.getScale();
      const pressureDevice: PressureDevice =
        this.bleManager.getPressureDevice();
      const temperatureDevice: TemperatureDevice =
        this.bleManager.getTemperatureDevice();
      if (
        scale ||
        pressureDevice ||
        temperatureDevice ||
        !this.platform.is('cordova')
      ) {
        this.uiAlert.showMessage(
          'BREW_CANT_START_BECAUSE_TIMER_NOT_RESETTED_DESCRIPTION',
          'BREW_CANT_START_BECAUSE_TIMER_NOT_RESETTED_TITLE',
          undefined,
          true
        );
        return;
      }
    }
    await this.timerStarted(_event);
    this.timer.startTimer();
  }

  public checkXeniaScripts() {
    setTimeout(() => {
      if (this.data.preparationDeviceBrew.params.scriptStartId === 0) {
        this.data.preparationDeviceBrew.params.scriptAtFirstDripId = 0;
        this.data.preparationDeviceBrew.params.scriptAtWeightReachedId = 0;
      }
    }, 50);
  }
  public coffeeFirstDripTimeChanged(_event): void {
    if (this.brewFirstDripTime) {
      this.data.coffee_first_drip_time = this.brewFirstDripTime.getSeconds();
      if (this.settings.brew_milliseconds) {
        this.data.coffee_first_drip_time_milliseconds =
          this.brewFirstDripTime.getMilliseconds();
      }
    } else {
      this.data.coffee_first_drip_time = 0;
      this.data.coffee_first_drip_time_milliseconds = 0;
    }
    if (!this.smartScaleConnected() && this.preparationDeviceConnected()) {
      // If scale is not connected but the device, we can now choose that still the script is executed if existing.
      if (this.data.preparationDeviceBrew.params.scriptAtFirstDripId > 0) {
        this.preparationDevice
          .startScript(
            this.data.preparationDeviceBrew.params.scriptAtFirstDripId
          )
          .catch(() => {});
      }
    }
  }

  public async timerResumedPressed(_event) {
    await this.timerResumed(_event);
    this.timer.resumeTimer();
  }

  public async timerResumed(_event) {
    const scale: BluetoothScale = this.bleManager.getScale();
    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    const temperatureDevice: TemperatureDevice =
      this.bleManager.getTemperatureDevice();

    if (scale || pressureDevice || temperatureDevice) {
      if (scale) {
        scale.setTimer(SCALE_TIMER_COMMAND.START);
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

      this.updateChart();

      if (scale) {
        this.attachToScaleWeightChange();
        this.attachToFlowChange();
      }
      if (pressureDevice) {
        this.attachToPressureChange();
      }
      if (temperatureDevice) {
        this.attachToTemperatureChange();
      }
    }
  }

  public async timerPaused(_event) {
    const scale: BluetoothScale = this.bleManager.getScale();
    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    const temperatureDevice: TemperatureDevice =
      this.bleManager.getTemperatureDevice();
    if (scale || pressureDevice || temperatureDevice) {
      if (scale) {
        scale.setTimer(SCALE_TIMER_COMMAND.STOP);
        this.deattachToWeightChange();
        this.deattachToFlowChange();
      }
      if (pressureDevice) {
        this.deattachToPressureChange();
      }
      if (temperatureDevice) {
        this.deattachToTemperatureChange();
      }
      this.updateChart();
    }

    if (this.preparationDeviceConnected() && _event !== 'xenia') {
      // If the event is not xenia, we pressed buttons, if the event was triggerd by xenia, timer already stopped.
      //If we press pause, stop scripts.
      this.preparationDevice.stopScript().catch(() => {});
    }
    if (!this.platform.is('cordova')) {
      window.clearInterval(this.graphTimerTest);
    }
  }

  public async tareScale(_event) {
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale) {
      scale.tare();
    }
  }

  public async timerReset(_event) {
    const scale: BluetoothScale = this.bleManager.getScale();
    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    const temperatureDevice: TemperatureDevice =
      this.bleManager.getTemperatureDevice();

    if (this.preparationDeviceConnected()) {
      //If users rests, we reset also drip time, else the script would not recognize it.
      this.data.coffee_first_drip_time = 0;
      this.data.coffee_first_drip_time_milliseconds = 0;
    }

    if (scale || pressureDevice || temperatureDevice) {
      await this.uiAlert.showLoadingSpinner();
      if (scale) {
        await new Promise((resolve) => {
          scale.tare();
          setTimeout(async () => {
            resolve(undefined);
          }, this.settings.bluetooth_command_delay);
        });

        await new Promise((resolve) => {
          scale.setTimer(SCALE_TIMER_COMMAND.STOP);
          setTimeout(async () => {
            resolve(undefined);
          }, this.settings.bluetooth_command_delay);
        });

        await new Promise((resolve) => {
          scale.setTimer(SCALE_TIMER_COMMAND.RESET);
          setTimeout(async () => {
            resolve(undefined);
          }, this.settings.bluetooth_command_delay);
        });

        this.deattachToWeightChange();
        this.deattachToFlowChange();
      }

      if (pressureDevice) {
        this.deattachToPressureChange();
        if (this.settings.pressure_threshold_active === true) {
          // After attaching attach again
          this.attachToPressureChange();
        }
      }

      if (temperatureDevice) {
        this.deattachToTemperatureChange();
        if (this.settings.temperature_threshold_active === true) {
          // After attaching attach again
          this.attachToTemperatureChange();
        }
      }

      if (this.isEdit) {
        await this.deleteFlowProfile();
        this.data.flow_profile = '';
      }

      this.flow_profile_raw = new BrewFlow();

      if (
        scale ||
        temperatureDevice ||
        (pressureDevice &&
          this.data.getPreparation().style_type ===
            PREPARATION_STYLE_TYPE.ESPRESSO)
      ) {
        this.initializeFlowChart(false);
      }

      // Give the buttons a bit of time, 100ms won't be an issue for user flow
      await new Promise((resolve) => {
        setTimeout(async () => {
          await this.uiAlert.hideLoadingSpinner();
          resolve(undefined);
        }, 200);
      });
    } else if (
      this.flow_profile_raw?.weight.length > 0 ||
      this.flow_profile_raw?.pressureFlow.length > 0 ||
      this.flow_profile_raw?.temperatureFlow.length > 0
    ) {
      await this.uiAlert.showLoadingSpinner();
      //The pressure or weight went down and we need to reset the graph now still
      this.flow_profile_raw = new BrewFlow();
      this.initializeFlowChart(false);
      // Give the buttons a bit of time, 100ms won't be an issue for user flow
      await new Promise((resolve) => {
        setTimeout(async () => {
          await this.uiAlert.hideLoadingSpinner();
          resolve(undefined);
        }, 200);
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
    if (this.brewCoffeeBloomingTime) {
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

  public preparationDeviceConnected(): boolean {
    if (
      this.preparationDevice &&
      this.data.preparationDeviceBrew.type !== PreparationDeviceType.NONE
    ) {
      return true;
    }
    return false;
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

  public updateChart(_type: string = 'weight') {
    try {
      if (_type === 'weight') {
        Plotly.extendTraces(
          'flowProfileChart',
          {
            x: [
              [this.weightTrace.x[this.weightTrace.x.length - 1]],
              [this.flowPerSecondTrace.x[this.flowPerSecondTrace.x.length - 1]],
              [this.realtimeFlowTrace.x[this.realtimeFlowTrace.x.length - 1]],
            ],
            y: [
              [this.weightTrace.y[this.weightTrace.y.length - 1]],
              [this.flowPerSecondTrace.y[this.flowPerSecondTrace.y.length - 1]],
              [this.realtimeFlowTrace.y[this.realtimeFlowTrace.y.length - 1]],
            ],
          },
          [0, 1, 2]
        );
      } else if (_type === 'pressure') {
        Plotly.extendTraces(
          'flowProfileChart',
          {
            x: [
              [],
              [],
              [],
              [this.pressureTrace.x[this.pressureTrace.x.length - 1]],
            ],
            y: [
              [],
              [],
              [],
              [this.pressureTrace.y[this.pressureTrace.y.length - 1]],
            ],
          },
          [0, 1, 2, 3]
        );
      } else if (_type === 'temperature') {
        if (this.lastChartLayout['yaxis4']) {
          // Pressure device is connected, we got 5 entries
          Plotly.extendTraces(
            'flowProfileChart',
            {
              x: [
                [],
                [],
                [],
                [],
                [this.temperatureTrace.x[this.temperatureTrace.x.length - 1]],
              ],
              y: [
                [],
                [],
                [],
                [],
                [this.temperatureTrace.y[this.temperatureTrace.y.length - 1]],
              ],
            },
            [0, 1, 2, 3, 4]
          );
        } else {
          // Pressure device is not connected, so temp takes his place
          Plotly.extendTraces(
            'flowProfileChart',
            {
              x: [
                [],
                [],
                [],
                [this.temperatureTrace.x[this.temperatureTrace.x.length - 1]],
              ],
              y: [
                [],
                [],
                [],
                [this.temperatureTrace.y[this.temperatureTrace.y.length - 1]],
              ],
            },
            [0, 1, 2, 3]
          );
        }
      }
      setTimeout(() => {
        let newLayoutIsNeeded: boolean = false;
        /**Timeout is needed, because on mobile devices, the trace and the relayout bothers each other, which results into not refreshing the graph*/
        let newRenderingInstance = 0;
        if (this.maximizeFlowGraphIsShown === true) {
          newRenderingInstance = Math.floor(this.timer.getSeconds() / 60);
        } else {
          newRenderingInstance = Math.floor(this.timer.getSeconds() / 20);
        }

        if (
          newRenderingInstance > this.lastChartRenderingInstance ||
          this.lastChartRenderingInstance === -1
        ) {
          let subtractTime: number = this.maximizeFlowGraphIsShown ? 40 : 10;
          const addTime: number = this.maximizeFlowGraphIsShown ? 70 : 30;
          if (this.data.brew_time <= 10) {
            subtractTime = 0;
          }

          const delay = moment(new Date())
            .startOf('day')
            .add('seconds', this.timer.getSeconds() - subtractTime)
            .toDate()
            .getTime();
          const delayedTime: number = moment(new Date())
            .startOf('day')
            .add('seconds', this.timer.getSeconds() + addTime)
            .toDate()
            .getTime();
          this.lastChartLayout.xaxis.range = [delay, delayedTime];
          newLayoutIsNeeded = true;
          this.lastChartRenderingInstance = newRenderingInstance;
        }

        if (this.weightTrace.y.length > 0) {
          const lastWeightData: number =
            this.weightTrace.y[this.weightTrace.y.length - 1];
          if (lastWeightData > this.lastChartLayout.yaxis.range[1]) {
            //Scale a bit up
            this.lastChartLayout.yaxis.range[1] = lastWeightData * 1.5;
            newLayoutIsNeeded = true;
          }
        }
        if (this.realtimeFlowTrace.y.length > 0) {
          const lastRealtimeFlowVal: number =
            this.realtimeFlowTrace.y[this.realtimeFlowTrace.y.length - 1];
          if (lastRealtimeFlowVal > this.lastChartLayout.yaxis2.range[1]) {
            //Scale a bit up
            this.lastChartLayout.yaxis2.range[1] = lastRealtimeFlowVal * 1.5;
            newLayoutIsNeeded = true;
          }
        }
        if (newLayoutIsNeeded) {
          Plotly.relayout('flowProfileChart', this.lastChartLayout);
        }
      }, 25);
    } catch (ex) {}
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
        scaleWeight: actualScaleWeight,
        smoothedWeight: actualSmoothedWeightPerSecond,
        avgFlow: avgFlow,
      });
    } catch (ex) {}
  }
  public setActualPressureInformation(_pressure) {
    try {
      const pressureEl = this.pressureEl.nativeElement;

      pressureEl.textContent = _pressure;
    } catch (ex) {}
  }
  public setActualTemperatureInformation(_temperature) {
    try {
      const temperatureEl = this.temperatureEl.nativeElement;

      temperatureEl.textContent = _temperature;
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

  public async brewRatioCalculator() {
    let waterQuantity: number = 0;
    if (
      this.data.getPreparation().style_type === PREPARATION_STYLE_TYPE.ESPRESSO
    ) {
      waterQuantity = this.data.brew_beverage_quantity;
    } else {
      waterQuantity = this.data.brew_quantity;
    }
    const modal = await this.modalController.create({
      component: BrewRatioCalculatorComponent,
      cssClass: 'popover-actions',
      breakpoints: [0, 1],
      initialBreakpoint: 1,
      id: BrewRatioCalculatorComponent.COMPONENT_ID,
      componentProps: {
        grindWeight: this.data.grind_weight,
        waterQuantity: waterQuantity,
      },
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
  }

  public async calculateBrixToTds() {
    const modal = await this.modalController.create({
      component: BrewBrixCalculatorComponent,
      cssClass: 'popover-actions',
      breakpoints: [0, 0.35],
      initialBreakpoint: 0.35,
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
      breakpoints: [0, 0.5, 1],
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
                this.checkChanges();
                break;
              case SCALE_TIMER_COMMAND.STOP:
                this.timer.pauseTimer();
                this.checkChanges();
                break;
              case SCALE_TIMER_COMMAND.RESET:
                this.uiAlert
                  .showConfirm(
                    'SCALE_RESET_TRIGGERED_DESCRIPTION',
                    'SCALE_RESET_TRIGGERED_TITLE',
                    true
                  )
                  .then(
                    () => {
                      this.timer.reset();
                      this.checkChanges();
                    },
                    () => {}
                  );

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
          await new Promise((resolve) => {
            if (scale) {
              scale.tare();
            }
            setTimeout(async () => {
              resolve(undefined);
            }, this.settings.bluetooth_command_delay);
          });
        }

        if (this.settings.bluetooth_scale_stop_timer_on_brew === true) {
          await new Promise((resolve) => {
            if (scale) {
              scale.setTimer(SCALE_TIMER_COMMAND.STOP);
            }
            setTimeout(async () => {
              resolve(undefined);
            }, this.settings.bluetooth_command_delay);
          });
        }

        if (this.settings.bluetooth_scale_reset_timer_on_brew === true) {
          await new Promise((resolve) => {
            if (scale) {
              scale.setTimer(SCALE_TIMER_COMMAND.RESET);
            }
            setTimeout(async () => {
              resolve(undefined);
            }, this.settings.bluetooth_command_delay);
          });
        }
      }
      if (this.timer.isTimerRunning() === true && _firstStart === false) {
        this.attachToScaleWeightChange();
      }
      // Always attach flow.
      this.attachToFlowChange();

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
          pressureDevice.updateZero();
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

  private async __connectTemperatureDevice(_firstStart: boolean) {
    if (this.temperatureDeviceConnected()) {
      this.deattachToTemperatureChange();

      if (_firstStart) {
        const temperatureDevice: TemperatureDevice =
          this.bleManager.getTemperatureDevice();
      }
      if (this.timer.isTimerRunning() === true && _firstStart === false) {
        this.attachToTemperatureChange();
      } else if (this.settings.temperature_threshold_active) {
        this.attachToTemperatureChange();
      }

      this.checkChanges();
    }
  }

  private checkChanges() {
    // #507 Wrapping check changes in set timeout so all values get checked
    setTimeout(() => {
      this.changeDetectorRef.detectChanges();
      window.getComputedStyle(window.document.getElementsByTagName('body')[0]);
    }, 15);
  }

  private getActualBluetoothWeight() {
    try {
      const scale: BluetoothScale = this.bleManager.getScale();
      return this.uiHelper.toFixedIfNecessary(scale.getWeight(), 1);
    } catch (ex) {
      return 0;
    }
  }

  public toggleChartLines(_type: string) {
    if (_type === 'weight') {
      this.weightTrace.visible = !this.weightTrace.visible;
    } else if (_type === 'calc_flow') {
      this.flowPerSecondTrace.visible = !this.flowPerSecondTrace.visible;
    } else if (_type === 'realtime_flow') {
      this.realtimeFlowTrace.visible = !this.realtimeFlowTrace.visible;
    } else if (_type === 'pressure') {
      this.pressureTrace.visible = !this.pressureTrace.visible;
    } else if (_type === 'temperature') {
      this.temperatureTrace.visible = !this.temperatureTrace.visible;
    }
  }

  private async instancePreparationDevice(_brew: Brew = null) {
    const connectedDevice: PreparationDevice =
      this.uiPreparationHelper.getConnectedDevice(this.data.getPreparation());
    if (connectedDevice) {
      let preparationDeviceNotConnected: boolean = false;
      try {
        await this.uiAlert.showLoadingSpinner(
          'PREPARATION_DEVICE.TYPE_XENIA.CHECKING_CONNECTION_TO_PORTAFILTER'
        );
        await connectedDevice.deviceConnected().then(
          () => {
            // No popup needed
          },
          () => {
            preparationDeviceNotConnected = true;
            this.uiAlert.showMessage(
              'PREPARATION_DEVICE.TYPE_XENIA.ERROR_CONNECTION_COULD_NOT_BE_ESTABLISHED',
              'ERROR_OCCURED',
              undefined,
              true
            );
          }
        );
        if (preparationDeviceNotConnected) {
          await this.uiAlert.hideLoadingSpinner();
          this.preparationDevice = undefined;
          return;
        }
      } catch (ex) {}

      if (this.timer.isTimerRunning()) {
        //If timer is running, we need to stop, else scripts would get execute which would get realy bad in the end :O
        this.timer.pauseTimer();
      }
      this.preparationDevice = connectedDevice as XeniaDevice;
      await this.uiAlert.setLoadingSpinnerMessage(
        'PREPARATION_DEVICE.TYPE_XENIA.GRABING_SCRIPTS',
        true
      );
      try {
        try {
          const xeniaScripts = await this.preparationDevice.getScripts();
          this.preparationDevice.mapScriptsAndSaveTemp(xeniaScripts);
        } catch (ex) {}
        // We didn't set any data yet
        if (
          this.data.preparationDeviceBrew.type === PreparationDeviceType.NONE
        ) {
          if (!this.isEdit) {
            // If a brew was passed, we came from loading, else we just swapped the preparation toolings
            let wasSomethingSet: boolean = false;
            if (_brew) {
              if (
                _brew.preparationDeviceBrew.type !== PreparationDeviceType.NONE
              ) {
                this.data.preparationDeviceBrew = this.uiHelper.cloneData(
                  _brew.preparationDeviceBrew
                );
                wasSomethingSet = true;
              }
            }

            if (wasSomethingSet === false) {
              // maybe the passed brew, didn't had any params in it - why ever?!
              // Is add
              const brews: Array<Brew> = this.uiHelper
                .cloneData(this.uiBrewStorage.getAllEntries())
                .reverse();
              if (brews.length > 0) {
                const foundEntry = brews.find(
                  (b) =>
                    b.preparationDeviceBrew.type !== PreparationDeviceType.NONE
                );
                if (foundEntry) {
                  this.data.preparationDeviceBrew = this.uiHelper.cloneData(
                    foundEntry.preparationDeviceBrew
                  );
                  wasSomethingSet = true;
                }
              }
            }

            if (wasSomethingSet) {
              if (
                this.data.preparationDeviceBrew.params === undefined ||
                this.data.preparationDeviceBrew.params === null
              ) {
                //Something completly broke. reset.
                this.data.preparationDeviceBrew.params = new XeniaParams();
              }
              //Check if all scripts exists
              let isAScriptMissing: boolean = false;
              const xeniaParams: XeniaParams = this.data.preparationDeviceBrew
                .params as XeniaParams;
              if (
                xeniaParams.scriptStartId > 2 &&
                this.preparationDevice.scriptList.findIndex(
                  (e) => e.INDEX === xeniaParams.scriptStartId
                ) === -1
              ) {
                // Script not found.
                this.data.preparationDeviceBrew.params.scriptStartId = 0;
                isAScriptMissing = true;
              }
              if (
                xeniaParams.scriptAtFirstDripId > 2 &&
                this.preparationDevice.scriptList.findIndex(
                  (e) => e.INDEX === xeniaParams.scriptAtFirstDripId
                ) === -1
              ) {
                // Script not found.
                this.data.preparationDeviceBrew.params.scriptAtFirstDripId = 0;
                isAScriptMissing = true;
              }
              if (
                xeniaParams.scriptAtWeightReachedId > 2 &&
                this.preparationDevice.scriptList.findIndex(
                  (e) => e.INDEX === xeniaParams.scriptAtWeightReachedId
                ) === -1
              ) {
                // Script not found.
                this.data.preparationDeviceBrew.params.scriptAtWeightReachedId = 0;
                isAScriptMissing = true;
              }
              if (isAScriptMissing) {
                this.uiAlert.showMessage(
                  'PREPARATION_DEVICE.TYPE_XENIA.ERROR_NOT_ALL_SCRIPTS_FOUND',
                  'CARE',
                  undefined,
                  true
                );
              }
            } else {
              this.data.preparationDeviceBrew.type =
                PreparationDeviceType.XENIA;
              this.data.preparationDeviceBrew.params = new XeniaParams();
              // Atleast set xenia, reset is not needed
            }
          }
        }
      } catch (ex) {}

      await this.uiAlert.hideLoadingSpinner();
    } else {
      this.preparationDevice = undefined;
    }
  }

  public initializeFlowChart(_wait: boolean = true): void {
    let timeout = 1;
    if (_wait === true) {
      timeout = 1000;
    }
    setTimeout(() => {
      try {
        Plotly.purge('flowProfileChart');
      } catch (ex) {}
      this.graphSettings = this.uiHelper.cloneData(this.settings.graph.FILTER);
      if (
        this.data.getPreparation().style_type ===
        PREPARATION_STYLE_TYPE.ESPRESSO
      ) {
        this.graphSettings = this.uiHelper.cloneData(
          this.settings.graph.ESPRESSO
        );
      }

      this.weightTrace = {
        x: [],
        y: [],
        name: this.translate.instant('BREW_FLOW_WEIGHT'),
        yaxis: 'y',
        type: 'scattergl',
        mode: 'lines',
        line: {
          shape: 'linear',
          color: '#cdc2ac',
          width: 2,
        },
        visible: this.graphSettings.weight,
      };
      this.flowPerSecondTrace = {
        x: [],
        y: [],
        name: this.translate.instant('BREW_FLOW_WEIGHT_PER_SECOND'),
        yaxis: 'y2',
        type: 'scattergl',
        mode: 'lines',
        line: {
          shape: 'linear',
          color: '#7F97A2',
          width: 2,
        },
        visible: this.graphSettings.calc_flow,
      };

      this.realtimeFlowTrace = {
        x: [],
        y: [],
        name: this.translate.instant('BREW_FLOW_WEIGHT_REALTIME'),
        yaxis: 'y2',
        type: 'scattergl',
        mode: 'lines',
        line: {
          shape: 'linear',
          color: '#09485D',
          width: 2,
        },
        visible: this.graphSettings.realtime_flow,
      };

      this.pressureTrace = {
        x: [],
        y: [],
        name: this.translate.instant('BREW_PRESSURE_FLOW'),
        yaxis: 'y4',
        type: 'scattergl',
        mode: 'lines',
        line: {
          shape: 'linear',
          color: '#05C793',
          width: 2,
        },
        visible: this.graphSettings.pressure,
      };

      this.temperatureTrace = {
        x: [],
        y: [],
        name: this.translate.instant('BREW_TEMPERATURE_REALTIME'),
        yaxis: 'y5',
        type: 'scattergl',
        mode: 'lines',
        line: {
          shape: 'linear',
          color: '#CC3311',
          width: 2,
        },
        visible: this.graphSettings.temperature,
      };

      this.weightTraceNew = {
        x: [],
        y: [],
        name: this.translate.instant('BREW_FLOW_WEIGHT'),
        yaxis: 'y',
        type: 'scattergl',
        mode: 'lines',
        line: {
          shape: 'linear',
          color: 'red',
          width: 2,
        },
        visible: this.graphSettings.weight,
      };

      if (
        this.flow_profile_raw.weight.length > 0 ||
        this.flow_profile_raw.pressureFlow.length > 0 ||
        this.flow_profile_raw.temperatureFlow.length > 0
      ) {
        const startingDay = moment(new Date()).startOf('day');
        // IF brewtime has some seconds, we add this to the delay directly.

        let firstTimestamp;
        if (this.flow_profile_raw.weight.length > 0) {
          firstTimestamp = this.flow_profile_raw.weight[0].timestamp;
        } else if (this.flow_profile_raw.pressureFlow.length > 0) {
          firstTimestamp = this.flow_profile_raw.pressureFlow[0].timestamp;
        } else if (this.flow_profile_raw.temperatureFlow.length > 0) {
          firstTimestamp = this.flow_profile_raw.temperatureFlow[0].timestamp;
        }
        const delay =
          moment(firstTimestamp, 'HH:mm:ss.SSS').toDate().getTime() -
          startingDay.toDate().getTime();
        if (this.flow_profile_raw.weight.length > 0) {
          for (const data of this.flow_profile_raw.weight) {
            this.weightTrace.x.push(
              new Date(
                moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() -
                  delay
              )
            );
            this.weightTrace.y.push(data.actual_weight);
          }
          for (const data of this.flow_profile_raw.waterFlow) {
            this.flowPerSecondTrace.x.push(
              new Date(
                moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() -
                  delay
              )
            );
            this.flowPerSecondTrace.y.push(data.value);
          }
          if (this.flow_profile_raw.realtimeFlow) {
            for (const data of this.flow_profile_raw.realtimeFlow) {
              this.realtimeFlowTrace.x.push(
                new Date(
                  moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() -
                    delay
                )
              );
              this.realtimeFlowTrace.y.push(data.flow_value);
            }
          }
        }
        if (
          this.flow_profile_raw.pressureFlow &&
          this.flow_profile_raw.pressureFlow.length > 0
        ) {
          for (const data of this.flow_profile_raw.pressureFlow) {
            this.pressureTrace.x.push(
              new Date(
                moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() -
                  delay
              )
            );
            this.pressureTrace.y.push(data.actual_pressure);
          }
        }
        if (
          this.flow_profile_raw.temperatureFlow &&
          this.flow_profile_raw.temperatureFlow.length > 0
        ) {
          for (const data of this.flow_profile_raw.temperatureFlow) {
            this.temperatureTrace.x.push(
              new Date(
                moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() -
                  delay
              )
            );
            this.temperatureTrace.y.push(data.actual_temperature);
          }
        }
      }

      const chartData = [
        this.weightTrace,
        this.flowPerSecondTrace,
        this.realtimeFlowTrace,
      ];

      this.lastChartLayout = this.getChartLayout();
      if (this.lastChartLayout['yaxis4']) {
        chartData.push(this.pressureTrace);
      }

      if (this.lastChartLayout['yaxis5']) {
        chartData.push(this.temperatureTrace);
      }

      //chartData.push(this.weightTraceNew);
      try {
        Plotly.newPlot(
          'flowProfileChart',
          chartData,
          this.lastChartLayout,
          this.getChartConfig()
        );
      } catch (ex) {}
    }, timeout);
  }

  private getChartLayout() {
    const chartWidth: number = document.getElementById(
      'canvasContainerBrew'
    ).offsetWidth;
    const chartHeight: number = 150;

    const tickFormat = '%M:%S';

    /*  yaxis3: {
        title: '',
        titlefont: {color: '#09485D'},
        tickfont: {color: '#09485D'},
        anchor: 'x',
        overlaying: 'y',
        side: 'right',
        position: 1,
        fixedrange: true

      },*/

    const suggestedMinFlow: number = 0;
    let suggestedMaxFlow: number = 20;

    const suggestedMinWeight: number = 0;
    let suggestedMaxWeight: number = 250;

    if (
      this.data.getPreparation().style_type === PREPARATION_STYLE_TYPE.ESPRESSO
    ) {
      suggestedMaxFlow = 2.5;
      suggestedMaxWeight = 50;
    }

    const startRange = moment(new Date()).startOf('day').toDate().getTime();
    const endRange: number = moment(new Date())
      .startOf('day')
      .add('seconds', 30)
      .toDate()
      .getTime();

    const layout = {
      width: chartWidth,
      height: chartHeight,
      margin: {
        l: 20,
        r: 20,
        b: 20,
        t: 20,
        pad: 2,
      },
      showlegend: false,
      dragmode: false,
      xaxis: {
        tickformat: tickFormat,
        visible: true,
        domain: [0, 1],
        fixedrange: true,
        type: 'date',
        range: [startRange, endRange],
      },
      yaxis: {
        title: '',
        titlefont: { color: '#cdc2ac' },
        tickfont: { color: '#cdc2ac' },
        fixedrange: true,
        side: 'left',
        position: 0.03,
        rangemode: 'nonnegative',
        range: [suggestedMinWeight, suggestedMaxWeight],
      },
      yaxis2: {
        title: '',
        titlefont: { color: '#7F97A2' },
        tickfont: { color: '#7F97A2' },
        anchor: 'free',
        overlaying: 'y',
        side: 'right',
        showgrid: false,
        position: 0.97,
        fixedrange: true,
        rangemode: 'nonnegative',
        range: [suggestedMinFlow, suggestedMaxFlow],
      },
    };
    const pressureDevice = this.bleManager.getPressureDevice();
    if (
      (pressureDevice != null &&
        this.getPreparation().style_type === PREPARATION_STYLE_TYPE.ESPRESSO) ||
      !this.platform.is('cordova')
    ) {
      layout['yaxis4'] = {
        title: '',
        titlefont: { color: '#05C793' },
        tickfont: { color: '#05C793' },
        anchor: 'free',
        overlaying: 'y',
        side: 'right',
        showgrid: false,
        position: 0.91,
        fixedrange: true,
        range: [0, 10],
      };
    }
    const temperatureDevice = this.bleManager.getTemperatureDevice();
    if (temperatureDevice != null || !this.platform.is('cordova')) {
      layout['yaxis5'] = {
        title: '',
        titlefont: { color: '#CC3311' },
        tickfont: { color: '#CC3311' },
        anchor: 'free',
        overlaying: 'y',
        side: 'right',
        showgrid: false,
        position: 0.8,
        fixedrange: true,
        visible: false,
        range: [0, 100],
      };
    }
    if (!window['layout']) {
      window['layout'] = layout;
    }

    return layout;
  }

  private getChartConfig() {
    const config = {
      displayModeBar: false, // this is the line that hides the bar.
    };
    return config;
  }

  // tslint:disable-next-line
  private __loadLastBrew(): void {
    let wasAnythingLoaded: boolean = false;
    if (
      this.settings.manage_parameters.set_last_coffee_brew ||
      this.data.getPreparation().manage_parameters.set_last_coffee_brew
    ) {
      const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
      if (brews.length > 0) {
        const lastBrew: Brew = brews[brews.length - 1];
        this.__loadBrew(lastBrew, false);
        wasAnythingLoaded = true;
      }
    }
    if (!wasAnythingLoaded) {
      //If we didn't load any brew, we didn't fire instancePreparationDevice with a brew, so we need to fire it here in the end at all.
      this.instancePreparationDevice();
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
    const actual: number = this.uiHelper.toFixedIfNecessary(
      _pressure.actual,
      2
    );
    const old: number = this.uiHelper.toFixedIfNecessary(_pressure.old, 2);

    // If no smartscale is connected, the set pressure flow needs to be the master to set flowtime and flowtime seconds, else we just retrieve from the scale.
    const isSmartScaleConnected = this.smartScaleConnected();
    if (this.flowTime === undefined) {
      this.flowTime = this.getTime();
      this.flowSecondTick = 0;
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

    this.pressureTrace.x.push(new Date(pressureObj.unixTime));
    this.pressureTrace.y.push(pressureObj.actual);

    this.pushPressureProfile(
      pressureObj.flowTimeSecond,
      pressureObj.actual,
      pressureObj.old
    );

    this.updateChart('pressure');
    if (!isSmartScaleConnected) {
      this.flowSecondTick++;
    }
    this.brewPressureGraphSubject.next({
      pressure: pressureObj.actual,
    });
    this.setActualPressureInformation(pressureObj.actual);
  }

  private __setTemperatureFlow(_temperature: any) {
    // Nothing for storing etc. is done here actually
    const actual: number = this.uiHelper.toFixedIfNecessary(
      _temperature.actual,
      2
    );
    const old: number = this.uiHelper.toFixedIfNecessary(_temperature.old, 2);

    // If no smartscale is connected, the set temperature flow needs to be the master to set flowtime and flowtime seconds, else we just retrieve from the scale.
    const isSmartScaleConnected = this.smartScaleConnected();
    if (this.flowTime === undefined) {
      this.flowTime = this.getTime();
      this.flowSecondTick = 0;
    }

    const actualUnixTime: number = moment(new Date())
      .startOf('day')
      .add('milliseconds', Date.now() - this.startingFlowTime)
      .toDate()
      .getTime();

    const temperatureObj = {
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

    this.temperatureTrace.x.push(new Date(temperatureObj.unixTime));
    this.temperatureTrace.y.push(temperatureObj.actual);

    this.pushTemperatureProfile(
      temperatureObj.flowTimeSecond,
      temperatureObj.actual,
      temperatureObj.old
    );

    this.updateChart('temperature');
    if (!isSmartScaleConnected) {
      this.flowSecondTick++;
    }
    this.brewTemperatureGraphSubject.next({
      temperature: temperatureObj.actual,
    });
    this.setActualTemperatureInformation(temperatureObj.actual);
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
      for (let i = this.weightTrace.y.length - 1; i >= 0; i--) {
        const dataVal = this.weightTrace.y[i];
        if (dataVal !== null) {
          lastFoundRightValue = dataVal;
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

          this.weightTrace.x.push(new Date(item.unixTime));
          this.weightTrace.y.push(weightToAdd);

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
        this.flowPerSecondTrace.x.push(new Date(item.unixTime));
        this.flowPerSecondTrace.y.push(actualFlowValue);
        this.flow_profile_raw.waterFlow.push(waterFlow);
      }

      this.__setScaleWeight(weight, wrongFlow, weightDidntChange);

      // Reset
      this.flowTime = this.getTime();
      this.flowSecondTick = 0;

      this.flowProfileArr = [];
      this.flowProfileArrObjs = [];
      this.flowProfileArrCalculated = [];
      this.updateChart();
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

    this.realtimeFlowTrace.x.push(new Date(flowObj.unixTime));
    this.realtimeFlowTrace.y.push(realtimeWaterFlow.flow_value);

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

          this.setCoffeeDripTime(undefined);
          this.checkChanges();
        }
      }
    }

    if (
      this.settings.bluetooth_ignore_anomaly_values === false &&
      this.settings.bluetooth_ignore_negative_values === false
    ) {
      this.weightTrace.x.push(new Date(flowObj.unixTime));
      this.weightTrace.y.push(flowObj.weight);

      this.pushFlowProfile(
        flowObj.flowTimestamp,
        flowObj.flowTimeSecond,
        flowObj.weight,
        flowObj.oldWeight,
        flowObj.smoothedWeight,
        flowObj.oldSmoothedWeight
      );
      this.updateChart();
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

  private pushTemperatureProfile(
    _brewTime: string,
    _actualTemperature: number,
    _oldTemperature: number
  ) {
    const temperatureFlow: IBrewTemperatureFlow = {} as IBrewTemperatureFlow;
    temperatureFlow.timestamp = this.uiHelper.getActualTimeWithMilliseconds();
    temperatureFlow.brew_time = _brewTime;
    temperatureFlow.actual_temperature = _actualTemperature;
    temperatureFlow.old_temperature = _oldTemperature;

    this.flow_profile_raw.temperatureFlow.push(temperatureFlow);
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
      _template === true &&
      this.getPreparation().use_custom_parameters === true &&
      this.getPreparation()?.repeat_coffee_parameters?.repeat_coffee_active ===
        true
    ) {
      checkData = this.getPreparation();
    } else if (
      _template === false &&
      this.getPreparation().use_custom_parameters === true &&
      this.getPreparation().manage_parameters.set_last_coffee_brew === true
    ) {
      checkData = this.getPreparation();
    } else {
      checkData = this.settings;
    }

    if (
      (_template === false &&
        checkData.default_last_coffee_parameters.bean_type) ||
      (_template === true && checkData.repeat_coffee_parameters.bean_type)
    ) {
      if (brew.bean) {
        const brewBean: IBean = this.uiBeanStorage.getByUUID(brew.bean);
        if (!brewBean.finished) {
          this.data.bean = brewBean.config.uuid;
        }
      }
    }

    if (
      (_template === false &&
        checkData.default_last_coffee_parameters.grind_size) ||
      (_template === true && checkData.repeat_coffee_parameters.grind_size)
    ) {
      this.data.grind_size = brew.grind_size;
    }
    if (
      (_template === false &&
        checkData.default_last_coffee_parameters.grind_weight) ||
      (_template === true && checkData.repeat_coffee_parameters.grind_weight)
    ) {
      this.data.grind_weight = brew.grind_weight;
    }

    if (
      (_template === false && checkData.default_last_coffee_parameters.mill) ||
      (_template === true && checkData.repeat_coffee_parameters.mill)
    ) {
      if (brew.mill) {
        const brewMill: IMill = this.uiMillStorage.getByUUID(brew.mill);
        if (!brewMill.finished) {
          this.data.mill = brewMill.config.uuid;
        }
      }
    }
    if (
      (_template === false &&
        checkData.default_last_coffee_parameters.mill_timer) ||
      (_template === true && checkData.repeat_coffee_parameters.mill_timer)
    ) {
      this.data.mill_timer = brew.mill_timer;
    }
    if (
      (_template === false &&
        checkData.default_last_coffee_parameters.mill_speed) ||
      (_template === true && checkData.repeat_coffee_parameters.mill_speed)
    ) {
      this.data.mill_speed = brew.mill_speed;
    }
    if (
      (_template === false &&
        checkData.default_last_coffee_parameters.pressure_profile) ||
      (_template === true &&
        checkData.repeat_coffee_parameters.pressure_profile)
    ) {
      this.data.pressure_profile = brew.pressure_profile;
    }
    if (
      (_template === false &&
        checkData.default_last_coffee_parameters.brew_temperature) ||
      (_template === true &&
        checkData.repeat_coffee_parameters.brew_temperature)
    ) {
      this.data.brew_temperature = brew.brew_temperature;
    }

    if (this.brewTemperatureTime) {
      if (
        (_template === false &&
          checkData.default_last_coffee_parameters.brew_temperature_time) ||
        (_template === true &&
          checkData.repeat_coffee_parameters.brew_temperature_time)
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
        (_template === false &&
          checkData.default_last_coffee_parameters.brew_time) ||
        (_template === true && checkData.repeat_coffee_parameters.brew_time)
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
      (_template === false &&
        checkData.default_last_coffee_parameters.brew_quantity) ||
      (_template === true && checkData.repeat_coffee_parameters.brew_quantity)
    ) {
      this.data.brew_quantity = brew.brew_quantity;
      this.data.brew_quantity_type = brew.brew_quantity_type;
    }
    if (
      (_template === false &&
        checkData.default_last_coffee_parameters.coffee_type) ||
      (_template === true && checkData.repeat_coffee_parameters.coffee_type)
    ) {
      this.data.coffee_type = brew.coffee_type;
    }
    if (
      (_template === false &&
        checkData.default_last_coffee_parameters.coffee_concentration) ||
      (_template === true &&
        checkData.repeat_coffee_parameters.coffee_concentration)
    ) {
      this.data.coffee_concentration = brew.coffee_concentration;
    }
    if (
      (_template === false &&
        checkData.default_last_coffee_parameters.coffee_first_drip_time) ||
      (_template === true &&
        checkData.repeat_coffee_parameters.coffee_first_drip_time)
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
      (_template === false &&
        checkData.default_last_coffee_parameters.coffee_blooming_time) ||
      (_template === true &&
        checkData.repeat_coffee_parameters.coffee_blooming_time)
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

    if (
      (_template === false &&
        checkData.default_last_coffee_parameters.rating) ||
      (_template === true && checkData.repeat_coffee_parameters.rating)
    ) {
      this.data.rating = brew.rating;
    }
    if (
      (_template === false && checkData.default_last_coffee_parameters.note) ||
      (_template === true && checkData.repeat_coffee_parameters.note)
    ) {
      this.data.note = brew.note;
    }
    if (
      (_template === false && checkData.default_last_coffee_parameters.tds) ||
      (_template === true && checkData.repeat_coffee_parameters.tds)
    ) {
      this.data.tds = brew.tds;
    }
    if (
      (_template === false &&
        checkData.default_last_coffee_parameters.brew_beverage_quantity) ||
      (_template === true &&
        checkData.repeat_coffee_parameters.brew_beverage_quantity)
    ) {
      this.data.brew_beverage_quantity = brew.brew_beverage_quantity;
      this.data.brew_beverage_quantity_type = brew.brew_beverage_quantity_type;
    }
    if (
      (_template === false &&
        checkData.default_last_coffee_parameters.method_of_preparation_tool) ||
      (_template === true &&
        checkData.repeat_coffee_parameters.method_of_preparation_tool)
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
    if (
      (_template === false && checkData.default_last_coffee_parameters.water) ||
      (_template === true && checkData.repeat_coffee_parameters.water)
    ) {
      this.data.water = brew.water;
    }

    if (
      (_template === false &&
        checkData.default_last_coffee_parameters.vessel) ||
      (_template === true && checkData.repeat_coffee_parameters.vessel)
    ) {
      this.data.vessel_name = brew.vessel_name;
      this.data.vessel_weight = brew.vessel_weight;
    }
    if (
      (_template === false &&
        checkData.default_last_coffee_parameters.bean_weight_in) ||
      (_template === true && checkData.repeat_coffee_parameters.bean_weight_in)
    ) {
      this.data.bean_weight_in = brew.bean_weight_in;
    }

    this.data.flow_profile = '';

    this.instancePreparationDevice(brew);
  }
}
