import {
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
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
import {
  BluetoothScale,
  SCALE_TIMER_COMMAND,
  ScaleType,
} from '../../../classes/devices';
import { ModalController, Platform } from '@ionic/angular';
import {
  CoffeeBluetoothDevicesService,
  CoffeeBluetoothServiceEvent,
} from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { TemperatureDevice } from '../../../classes/devices/temperatureBluetoothDevice';
import { PressureDevice } from '../../../classes/devices/pressureBluetoothDevice';
import { Brew } from '../../../classes/brew/brew';
import { XeniaDevice } from '../../../classes/preparationDevice/xenia/xeniaDevice';
import {
  BrewFlow,
  IBrewByWeight,
  IBrewPressureFlow,
  IBrewRealtimeWaterFlow,
  IBrewTemperatureFlow,
  IBrewWaterFlow,
  IBrewWeightFlow,
} from '../../../classes/brew/brewFlow';
import { Preparation } from '../../../classes/preparation/preparation';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import moment from 'moment/moment';
import { BrewChooseGraphReferenceComponent } from '../../../app/brew/brew-choose-graph-reference/brew-choose-graph-reference.component';
import { ReferenceGraph } from '../../../classes/brew/referenceGraph';
import { REFERENCE_GRAPH_TYPE } from '../../../enums/brews/referenceGraphType';
import BeanconquerorFlowTestDataDummySecondDummy from '../../../assets/BeanconquerorFlowTestDataSecond.json';
import { Subscription } from 'rxjs';
import { IBrewGraphs } from '../../../interfaces/brew/iBrewGraphs';
import { TranslateService } from '@ngx-translate/core';
import { UIAlert } from '../../../services/uiAlert';
import { UIToast } from '../../../services/uiToast';
import { Settings } from '../../../classes/settings/settings';
import { UIHelper } from '../../../services/uiHelper';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { BrewBrewingComponent } from '../brew-brewing/brew-brewing.component';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UILog } from '../../../services/uiLog';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { MeticulousDevice } from '../../../classes/preparationDevice/meticulous/meticulousDevice';
import { MeticulousShotData } from '../../../classes/preparationDevice/meticulous/meticulousShotData';
import { Graph } from '../../../classes/graph/graph';
import { UIGraphStorage } from '../../../services/uiGraphStorage.service';
import regression from 'regression';

declare var Plotly;

@Component({
  selector: 'brew-brewing-graph',
  templateUrl: './brew-brewing-graph.component.html',
  styleUrls: ['./brew-brewing-graph.component.scss'],
})
export class BrewBrewingGraphComponent implements OnInit {
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

  @Input() public brewComponent: BrewBrewingComponent;

  @Input() public data: Brew;
  @Output() public dataChange = new EventEmitter<Brew>();

  @Input() public isEdit: boolean = false;
  @Input() public isDetail: boolean = false;

  public PREPARATION_DEVICE_TYPE_ENUM = PreparationDeviceType;
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;

  public scaleTimerSubscription: Subscription = undefined;
  public scaleTareSubscription: Subscription = undefined;
  public scaleFlowSubscription: Subscription = undefined;
  public bluetoothSubscription: Subscription = undefined;
  public flow_profile_raw: BrewFlow = new BrewFlow();
  public reference_profile_raw: BrewFlow = new BrewFlow();

  public pressureDeviceSubscription: Subscription = undefined;
  public temperatureDeviceSubscription: Subscription = undefined;
  private scaleFlowChangeSubscription: Subscription = undefined;
  private scaleListeningSubscription: Subscription = undefined;
  private scaleStartTareListeningSubscription: Subscription = undefined;

  private flowProfileArr = [];
  private flowProfileArrObjs = [];
  private flowProfileArrCalculated = [];
  private flowProfileTempAll = [];
  private flowTime: number = undefined;
  private flowSecondTick: number = 0;
  private flowNCalculation: number = 0;
  private startingFlowTime: number = undefined;

  public weightTrace: any;
  public flowPerSecondTrace: any;
  public realtimeFlowTrace: any;
  public pressureTrace: any;
  public temperatureTrace: any;

  public weightTraceReference: any;
  public flowPerSecondTraceReference: any;
  public realtimeFlowTraceReference: any;
  public pressureTraceReference: any;
  public temperatureTraceReference: any;
  private graphTimerTest: any = undefined;
  private pressureThresholdWasHit: boolean = false;
  private temperatureThresholdWasHit: boolean = false;
  private xeniaOverviewInterval: any = undefined;
  private meticulousInterval: any = undefined;

  public lastChartLayout: any = undefined;
  public lastChartRenderingInstance: number = 0;
  public graphSettings: IBrewGraphs = undefined;

  public ignoreScaleWeight: boolean = false;

  public settings: Settings = undefined;

  public machineStopScriptWasTriggered: boolean = false;

  @ViewChild('canvaContainer', { read: ElementRef, static: true })
  public canvaContainer: ElementRef;
  @ViewChild('profileDiv', { read: ElementRef, static: true })
  public profileDiv: ElementRef;

  public chartData = [];
  constructor(
    private readonly platform: Platform,
    private readonly bleManager: CoffeeBluetoothDevicesService,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly translate: TranslateService,
    private readonly uiAlert: UIAlert,
    private readonly uiToast: UIToast,
    private readonly uiHelper: UIHelper,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiPreparationHelper: UIPreparationHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly uiFileHelper: UIFileHelper,
    private readonly ngZone: NgZone,
    private readonly modalController: ModalController,
    private readonly uiLog: UILog,
    public readonly uiBrewHelper: UIBrewHelper,
    private readonly uiGraphStorage: UIGraphStorage
  ) {}

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public async instance() {
    if (this.isEdit || this.isDetail) {
      // This needs to be done before initialize the flow chart
      if (this.data.flow_profile !== '') {
        // We had a flow profile, so read data now.
        await this.readFlowProfile();

        if (this.data.reference_flow_profile) {
          await this.readReferenceFlowProfile(this.data);
        }

        this.initializeFlowChart();
      }
    }

    if (this.isDetail === false) {
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
      if (
        this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
        this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
          PreparationDeviceType.METICULOUS
      ) {
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
            //Always initialize new as long as the timer is not running
            if (this.brewComponent.timer.isTimerRunning() === false) {
              this.initializeFlowChart();
            }
          }
          // If scale disconnected, sometimes the timer run but the screen was not refreshed, so maybe it helpes to detect the change.
          setTimeout(() => {
            this.checkChanges();
          }, 200);
          this.brewComponent?.brewBrewingPreparationDeviceEl?.checkChanges();
          this.brewComponent?.checkChanges();
        });
    }
  }

  private async readReferenceFlowProfile(_brew: Brew) {
    if (this.platform.is('cordova')) {
      if (_brew.reference_flow_profile.type !== REFERENCE_GRAPH_TYPE.NONE) {
        let referencePath: string = '';
        const uuid = _brew.reference_flow_profile.uuid;
        let referenceObj: Brew | Graph = null;
        if (_brew.reference_flow_profile.type === REFERENCE_GRAPH_TYPE.BREW) {
          referenceObj = this.uiBrewStorage.getEntryByUUID(uuid);
        } else {
          referenceObj = this.uiGraphStorage.getEntryByUUID(uuid);
        }
        if (referenceObj) {
          referencePath = referenceObj.getGraphPath();

          await this.uiAlert.showLoadingSpinner();
          try {
            const jsonParsed = await this.uiFileHelper.getJSONFile(
              referencePath
            );
            this.reference_profile_raw = jsonParsed;
          } catch (ex) {
            // Maybe the reference flow has been deleted.
          }
        }
      }
      await this.uiAlert.hideLoadingSpinner();
    } else {
      this.reference_profile_raw =
        BeanconquerorFlowTestDataDummySecondDummy as any;
    }
  }

  public checkChanges() {
    // #507 Wrapping check changes in set timeout so all values get checked
    setTimeout(() => {
      this.changeDetectorRef.detectChanges();
      window.getComputedStyle(window.document.getElementsByTagName('body')[0]);
    }, 15);
  }

  public smartScaleConnected() {
    if (!this.platform.is('cordova')) {
      return true;
    }

    const scale: BluetoothScale = this.bleManager.getScale();
    return !!scale;
  }

  public temperatureDeviceConnected() {
    if (!this.platform.is('cordova')) {
      return true;
    }

    const temperatureDevice: TemperatureDevice =
      this.bleManager.getTemperatureDevice();
    return !!temperatureDevice;
  }

  public pressureDeviceConnected() {
    if (!this.platform.is('cordova')) {
      return true;
    }

    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    return !!pressureDevice;
  }

  public shallFlowProfileBeHidden(): boolean {
    try {
      if (
        this.smartScaleConnected() === true ||
        this.temperatureDeviceConnected() === true ||
        (this.pressureDeviceConnected() === true &&
          this.data.getPreparation()?.style_type ===
            PREPARATION_STYLE_TYPE.ESPRESSO) ||
        this.brewComponent?.brewBrewingPreparationDeviceEl
          ?.preparationDevice !== undefined
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
    } catch (ex) {
      return true;
    }
  }

  public getPreparation(): Preparation {
    return this.uiPreparationStorage.getByUUID(this.data.method_of_preparation);
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

  public getGraphIonColSize() {
    if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.METICULOUS
    ) {
      return 3;
    }

    let bluetoothDeviceConnections = 0;
    let smartScaleConnected: boolean = false;
    if (
      (this.pressureDeviceConnected() ||
        this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected()) &&
      this.data.getPreparation().style_type === PREPARATION_STYLE_TYPE.ESPRESSO
    ) {
      bluetoothDeviceConnections += 1;
    }
    if (
      this.temperatureDeviceConnected() ||
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected()
    ) {
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

  public toggleChartLines(_type: string) {
    if (_type === 'weight') {
      this.weightTrace.visible = !this.weightTrace.visible;
      if (this.weightTraceReference) {
        this.weightTraceReference.visible = !this.weightTraceReference.visible;
      }
    } else if (_type === 'calc_flow') {
      this.flowPerSecondTrace.visible = !this.flowPerSecondTrace.visible;
      if (this.flowPerSecondTraceReference) {
        this.flowPerSecondTraceReference.visible =
          !this.flowPerSecondTraceReference.visible;
      }
    } else if (_type === 'realtime_flow') {
      this.realtimeFlowTrace.visible = !this.realtimeFlowTrace.visible;
      if (this.realtimeFlowTraceReference) {
        this.realtimeFlowTraceReference.visible =
          !this.realtimeFlowTraceReference.visible;
      }
    } else if (_type === 'pressure') {
      this.pressureTrace.visible = !this.pressureTrace.visible;
      if (this.pressureTraceReference) {
        this.pressureTraceReference.visible =
          !this.pressureTraceReference.visible;
      }
    } else if (_type === 'temperature') {
      this.temperatureTrace.visible = !this.temperatureTrace.visible;
      if (this.temperatureTraceReference) {
        this.temperatureTraceReference.visible =
          !this.temperatureTraceReference.visible;
      }
    }
    if (
      this.brewComponent?.timer?.isTimerRunning() === false ||
      this.data.brew_time === 0 ||
      this.isDetail === true
    ) {
      // Re render, else the lines would not be hidden/shown when having references graphs
      Plotly.relayout(this.profileDiv.nativeElement, this.lastChartLayout);
    }
    this.checkChanges();
  }

  public initializeFlowChart(_wait: boolean = true): void {
    let timeout = 1;
    if (_wait === true) {
      timeout = 1000;
    }
    setTimeout(() => {
      try {
        Plotly.purge(this.profileDiv.nativeElement);
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
      // Put the reference charts first, because they can then get overlayed from the other graphs
      this.chartData = [];

      this.weightTraceReference = undefined;
      this.flowPerSecondTraceReference = undefined;
      this.realtimeFlowTraceReference = undefined;
      this.pressureTraceReference = undefined;
      this.temperatureTraceReference = undefined;
      if (
        this.reference_profile_raw.weight.length > 0 ||
        this.reference_profile_raw.pressureFlow.length > 0 ||
        this.reference_profile_raw.temperatureFlow.length > 0
      ) {
        this.weightTraceReference = {
          x: [],
          y: [],
          name: this.translate.instant('BREW_FLOW_WEIGHT'),
          yaxis: 'y',
          type: 'scattergl',
          mode: 'lines',
          line: {
            shape: 'linear',
            color: '#ebe6dd',
            width: 2,
          },
          visible: this.graphSettings.weight,
          hoverinfo: this.isDetail ? 'all' : 'skip',
          showlegend: false,
        };
        this.flowPerSecondTraceReference = {
          x: [],
          y: [],
          name: this.translate.instant('BREW_FLOW_WEIGHT_PER_SECOND'),
          yaxis: 'y2',
          type: 'scattergl',
          mode: 'lines',
          line: {
            shape: 'linear',
            color: '#cbd5d9',
            width: 2,
          },
          visible: this.graphSettings.calc_flow,
          hoverinfo: this.isDetail ? 'all' : 'skip',
          showlegend: false,
        };

        this.realtimeFlowTraceReference = {
          x: [],
          y: [],
          name: this.translate.instant('BREW_FLOW_WEIGHT_REALTIME'),
          yaxis: 'y2',
          type: 'scattergl',
          mode: 'lines',
          line: {
            shape: 'linear',
            color: '#9cb5be',
            width: 2,
          },
          visible: this.graphSettings.realtime_flow,
          hoverinfo: this.isDetail ? 'all' : 'skip',
          showlegend: false,
        };

        this.pressureTraceReference = {
          x: [],
          y: [],
          name: this.translate.instant('BREW_PRESSURE_FLOW'),
          yaxis: 'y4',
          type: 'scattergl',
          mode: 'lines',
          line: {
            shape: 'linear',
            color: '#9be8d3',
            width: 2,
          },
          visible: this.graphSettings.pressure,
          hoverinfo: this.isDetail ? 'all' : 'skip',
          showlegend: false,
        };

        this.temperatureTraceReference = {
          x: [],
          y: [],
          name: this.translate.instant('BREW_TEMPERATURE_REALTIME'),
          yaxis: 'y5',
          type: 'scattergl',
          mode: 'lines',
          line: {
            shape: 'linear',
            color: '#eaad9f',
            width: 2,
          },
          visible: this.graphSettings.temperature,
          hoverinfo: this.isDetail ? 'all' : 'skip',
          showlegend: false,
        };

        const presetFlowProfile = this.reference_profile_raw;

        if (
          presetFlowProfile.weight.length > 0 ||
          presetFlowProfile.pressureFlow.length > 0 ||
          presetFlowProfile.temperatureFlow.length > 0
        ) {
          const startingDay = moment(new Date()).startOf('day');
          // IF brewtime has some seconds, we add this to the delay directly.

          let firstTimestamp;
          if (presetFlowProfile.weight.length > 0) {
            firstTimestamp = presetFlowProfile.weight[0].timestamp;
          } else if (presetFlowProfile.pressureFlow.length > 0) {
            firstTimestamp = presetFlowProfile.pressureFlow[0].timestamp;
          } else if (presetFlowProfile.temperatureFlow.length > 0) {
            firstTimestamp = presetFlowProfile.temperatureFlow[0].timestamp;
          }
          const delay =
            moment(firstTimestamp, 'HH:mm:ss.SSS').toDate().getTime() -
            startingDay.toDate().getTime();
          if (presetFlowProfile.weight.length > 0) {
            this.chartData.push(this.weightTraceReference);
            this.chartData.push(this.flowPerSecondTraceReference);
            this.chartData.push(this.realtimeFlowTraceReference);
            for (const data of presetFlowProfile.weight) {
              this.weightTraceReference.x.push(
                new Date(
                  moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() -
                    delay
                )
              );
              this.weightTraceReference.y.push(data.actual_weight);
            }
            for (const data of presetFlowProfile.waterFlow) {
              this.flowPerSecondTraceReference.x.push(
                new Date(
                  moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() -
                    delay
                )
              );
              this.flowPerSecondTraceReference.y.push(data.value);
            }
            if (presetFlowProfile.realtimeFlow) {
              for (const data of presetFlowProfile.realtimeFlow) {
                this.realtimeFlowTraceReference.x.push(
                  new Date(
                    moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() -
                      delay
                  )
                );
                this.realtimeFlowTraceReference.y.push(data.flow_value);
              }
            }
          }
          if (
            presetFlowProfile.pressureFlow &&
            presetFlowProfile.pressureFlow.length > 0
          ) {
            this.chartData.push(this.pressureTraceReference);
            for (const data of presetFlowProfile.pressureFlow) {
              this.pressureTraceReference.x.push(
                new Date(
                  moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() -
                    delay
                )
              );
              this.pressureTraceReference.y.push(data.actual_pressure);
            }
          }
          if (
            presetFlowProfile.temperatureFlow &&
            presetFlowProfile.temperatureFlow.length > 0
          ) {
            this.chartData.push(this.temperatureTraceReference);
            for (const data of presetFlowProfile.temperatureFlow) {
              this.temperatureTraceReference.x.push(
                new Date(
                  moment(data.timestamp, 'HH:mm:ss.SSS').toDate().getTime() -
                    delay
                )
              );
              this.temperatureTraceReference.y.push(data.actual_temperature);
            }
          }
        }
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
        hoverinfo: this.isDetail ? 'all' : 'skip',
        showlegend: false,
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
        hoverinfo: this.isDetail ? 'all' : 'skip',
        showlegend: false,
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
        hoverinfo: this.isDetail ? 'all' : 'skip',
        showlegend: false,
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
        hoverinfo: this.isDetail ? 'all' : 'skip',
        showlegend: false,
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
        hoverinfo: this.isDetail ? 'all' : 'skip',
        showlegend: false,
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

      this.chartData.push(this.weightTrace);
      this.chartData.push(this.flowPerSecondTrace);
      this.chartData.push(this.realtimeFlowTrace);

      this.lastChartLayout = this.getChartLayout();
      if (this.lastChartLayout['yaxis4']) {
        this.chartData.push(this.pressureTrace);
      }

      if (this.lastChartLayout['yaxis5']) {
        this.chartData.push(this.temperatureTrace);
      }

      try {
        Plotly.newPlot(
          this.profileDiv.nativeElement,
          this.chartData,
          this.lastChartLayout,
          this.getChartConfig()
        );

        this.lastChartRenderingInstance = -1;
        if (this.brewComponent.maximizeFlowGraphIsShown) {
          //After we don't know how long all scale events take, dispatch the resize event, after the flow component will then grab on and stretch the canva.
          window.dispatchEvent(new Event('resize'));
        }
        setTimeout(() => {
          if (
            this.flow_profile_raw.weight.length > 0 ||
            this.flow_profile_raw.pressureFlow.length > 0 ||
            this.flow_profile_raw.temperatureFlow.length > 0
          ) {
            this.updateChart();
          }
        }, 250);
      } catch (ex) {}
    }, timeout);
  }

  public displayOnceBeverageWeight() {
    setTimeout(() => {
      // Fix that you also see the brew weight
      try {
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
      } catch (ex) {}
    }, 350);
  }

  private getChartLayout() {
    let chartWidth: number = 300;
    try {
      chartWidth = this.canvaContainer.nativeElement.offsetWidth;
    } catch (ex) {}
    const chartHeight: number = 150;

    const tickFormat = '%M:%S';

    let layout: any;
    if (this.isDetail === false) {
      let graph_weight_settings;
      let graph_flow_settings;
      if (
        this.data.getPreparation().style_type ===
        PREPARATION_STYLE_TYPE.ESPRESSO
      ) {
        graph_weight_settings = this.settings.graph_weight.ESPRESSO;
        graph_flow_settings = this.settings.graph_flow.ESPRESSO;
      } else {
        graph_weight_settings = this.settings.graph_weight.FILTER;
        graph_flow_settings = this.settings.graph_flow.FILTER;
      }

      const suggestedMinFlow: number = graph_flow_settings.lower;
      const suggestedMaxFlow: number = graph_flow_settings.upper;

      const suggestedMinWeight: number = graph_weight_settings.lower;
      const suggestedMaxWeight: number = graph_weight_settings.upper;

      const startRange = moment(new Date()).startOf('day').toDate().getTime();

      let normalScreenTime: number;
      let fullScreenTime: number;
      if (
        this.getPreparation().style_type === PREPARATION_STYLE_TYPE.ESPRESSO
      ) {
        normalScreenTime = this.settings.graph_time.ESPRESSO.NORMAL_SCREEN;
        fullScreenTime = this.settings.graph_time.ESPRESSO.FULL_SCREEN;
      } else {
        normalScreenTime = this.settings.graph_time.FILTER.NORMAL_SCREEN;
        fullScreenTime = this.settings.graph_time.FILTER.FULL_SCREEN;
      }
      let addSecondsOfEndRange = normalScreenTime + 10;

      // When reset is triggered, we maybe are already in the maximized screen, so we go for the 70sec directly.
      if (this.brewComponent.maximizeFlowGraphIsShown === true) {
        addSecondsOfEndRange = fullScreenTime + 10;
      }
      const endRange: number = moment(new Date())
        .startOf('day')
        .add('seconds', addSecondsOfEndRange)
        .toDate()
        .getTime();

      layout = {
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
        hovermode: false,
        clickmode: 'none',
        extendtreemapcolors: false,
        extendiciclecolors: false,
        extendsunburstcolors: false,
        extendfunnelareacolors: false,
        extendpiecolors: false,
        hidesources: true,
        hoverdistance: 0,
        spikedistance: 0,
        autosize: false,
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
          this.getPreparation().style_type ===
            PREPARATION_STYLE_TYPE.ESPRESSO) ||
        this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() ||
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
      if (
        temperatureDevice != null ||
        this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() ||
        !this.platform.is('cordova')
      ) {
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
    } else {
      layout = {
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
        xaxis: {
          tickformat: tickFormat,
          visible: true,
          domain: [0, 1],
          type: 'date',
        },
        yaxis: {
          title: '',
          titlefont: { color: '#cdc2ac' },
          tickfont: { color: '#cdc2ac' },
          side: 'left',
          position: 0.05,
          visible: true,
        },
        yaxis2: {
          title: '',
          titlefont: { color: '#7F97A2' },
          tickfont: { color: '#7F97A2' },
          anchor: 'x',
          overlaying: 'y',
          side: 'right',
          position: 0.95,
          showgrid: false,
          visible: true,
        },
      };

      layout['yaxis4'] = {
        title: '',
        titlefont: { color: '#05C793' },
        tickfont: { color: '#05C793' },
        anchor: 'free',
        overlaying: 'y',
        side: 'right',
        showgrid: false,
        position: 0.93,
        range: [0, 12],
        visible: true,
      };

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
        range: [0, 100],
        visible: true,
      };

      if (this.weightTrace.x && this.weightTrace.x.length > 0) {
        layout['yaxis'].visible = true;
        layout['yaxis2'].visible = true;
      } else {
        layout['yaxis'].visible = false;
        layout['yaxis2'].visible = false;
      }
      if (this.pressureTrace.x && this.pressureTrace.x.length > 0) {
        layout['yaxis4'].visible = true;
      } else {
        layout['yaxis4'].visible = false;
      }

      if (this.temperatureTrace.x && this.temperatureTrace.x.length > 0) {
        layout['yaxis5'].visible = true;
      } else {
        layout['yaxis5'].visible = false;
      }
    }

    return layout;
  }

  private getChartConfig() {
    if (this.isDetail === true) {
      const config = {
        displayModeBar: false, // this is the line that hides the bar.
        responsive: true,
      };
      return config;
    } else {
      const config = {
        responsive: false,
        scrollZoom: false,
        displayModeBar: false, // this is the line that hides the bar.
      };
      return config;
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
      if (
        this.brewComponent?.timer?.isTimerRunning() === true &&
        _firstStart === false
      ) {
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
      if (
        this.brewComponent?.timer?.isTimerRunning() === true &&
        _firstStart === false
      ) {
        this.attachToTemperatureChange();
      } else if (this.settings.temperature_threshold_active) {
        this.attachToTemperatureChange();
      }

      this.checkChanges();
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
                if (this.brewComponent?.timer?.isTimerRunning() === false) {
                  this.brewComponent.timer.startTimer();
                  this.checkChanges();
                }
                break;
              case SCALE_TIMER_COMMAND.STOP:
                this.brewComponent.timer.pauseTimer();
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
                      this.brewComponent.timer.reset();
                      this.checkChanges();
                    },
                    () => {}
                  );

                break;
            }
          } else {
            if (this.brewComponent.timer.isTimerRunning() === true) {
              this.brewComponent.timer.pauseTimer();
            } else {
              this.brewComponent.timer.startTimer();
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
      if (
        this.brewComponent.timer?.isTimerRunning() === true &&
        _firstStart === false
      ) {
        this.attachToScaleWeightChange();
      }
      // Always attach flow.
      this.attachToFlowChange();

      this.checkChanges();
    }
  }

  public getActualSmoothedWeightPerSecond(): number {
    try {
      return this.uiHelper.toFixedIfNecessary(
        this.flow_profile_raw.realtimeFlow[
          this.flow_profile_raw.realtimeFlow.length - 1
        ].flow_value,
        2
      );
    } catch (ex) {
      return 0;
    }
  }

  public setActualTemperatureInformation(_temperature) {
    this.ngZone.runOutsideAngular(() => {
      if (this.brewComponent.maximizeFlowGraphIsShown === true) {
        this.brewComponent.brewTemperatureGraphSubject.next({
          temperature: _temperature,
        });
      }

      try {
        const temperatureEl = this.temperatureEl.nativeElement;

        temperatureEl.textContent = _temperature;
      } catch (ex) {}
    });
  }

  public setActualPressureInformation(_pressure) {
    this.ngZone.runOutsideAngular(() => {
      if (this.brewComponent.maximizeFlowGraphIsShown === true) {
        this.brewComponent.brewPressureGraphSubject.next({
          pressure: _pressure,
        });
      }

      try {
        const pressureEl = this.pressureEl.nativeElement;

        pressureEl.textContent = _pressure;
      } catch (ex) {}
    });
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

  public setActualSmartInformation(_weight: number = null) {
    this.ngZone.runOutsideAngular(() => {
      let actualScaleWeight = this.getActualScaleWeight();

      if (_weight !== null) {
        actualScaleWeight = _weight;
      }
      const actualSmoothedWeightPerSecond =
        this.getActualSmoothedWeightPerSecond();
      const avgFlow = this.uiHelper.toFixedIfNecessary(this.getAvgFlow(), 2);
      if (this.brewComponent.maximizeFlowGraphIsShown === true) {
        this.brewComponent.brewFlowGraphSubject.next({
          scaleWeight: actualScaleWeight,
          smoothedWeight: actualSmoothedWeightPerSecond,
          avgFlow: avgFlow,
        });
      }

      try {
        const weightEl = this.smartScaleWeightEl.nativeElement;
        const flowEl = this.smartScaleWeightPerSecondEl.nativeElement;
        const avgFlowEl = this.smartScaleAvgFlowPerSecondEl.nativeElement;

        weightEl.textContent = actualScaleWeight + ' g';
        flowEl.textContent = actualSmoothedWeightPerSecond + ' g/s';
        avgFlowEl.textContent = 'Ø ' + avgFlow + ' g/s';
      } catch (ex) {}
    });
  }

  public updateChart(_type: string = 'weight') {
    this.ngZone.runOutsideAngular(() => {
      try {
        let xData;
        let yData;
        let tracesData;
        if (_type === 'weight') {
          xData = [[], [], []];
          yData = [[], [], []];
          tracesData = [0, 1, 2];
        } else if (_type === 'pressure') {
          xData = [[], [], [], []];
          yData = [[], [], [], []];
          tracesData = [0, 1, 2, 3];
        } else if (_type === 'temperature') {
          if (this.lastChartLayout['yaxis4']) {
            // Pressure device is connected, we got 5 entries
            xData = [[], [], [], [], []];
            yData = [[], [], [], [], []];
            tracesData = [0, 1, 2, 3, 4];
          } else {
            // Pressure device is not connected, so temp takes his place
            xData = [[], [], [], []];
            yData = [[], [], [], []];
            tracesData = [0, 1, 2, 3];
          }
        }

        Plotly.extendTraces(
          this.profileDiv.nativeElement,
          {
            x: xData,
            y: yData,
          },
          tracesData
        );

        if (
          (this.brewComponent?.timer?.isTimerRunning() === true ||
            this.data.brew_time === 0) &&
          this.isDetail === false
        ) {
          setTimeout(() => {
            let newLayoutIsNeeded: boolean = false;
            /**Timeout is needed, because on mobile devices, the trace and the relayout bothers each other, which results into not refreshing the graph*/
            let newRenderingInstance = 0;

            let normalScreenTime: number;
            let fullScreenTime: number;
            if (
              this.getPreparation().style_type ===
              PREPARATION_STYLE_TYPE.ESPRESSO
            ) {
              normalScreenTime =
                this.settings.graph_time.ESPRESSO.NORMAL_SCREEN;
              fullScreenTime = this.settings.graph_time.ESPRESSO.FULL_SCREEN;
            } else {
              normalScreenTime = this.settings.graph_time.FILTER.NORMAL_SCREEN;
              fullScreenTime = this.settings.graph_time.FILTER.FULL_SCREEN;
            }

            if (this.brewComponent.maximizeFlowGraphIsShown === true) {
              newRenderingInstance = Math.floor(
                this.brewComponent.timer.getSeconds() / fullScreenTime
              );
            } else {
              newRenderingInstance = Math.floor(
                this.brewComponent.timer.getSeconds() / normalScreenTime
              );
            }

            if (
              newRenderingInstance > this.lastChartRenderingInstance ||
              this.lastChartRenderingInstance === -1
            ) {
              let subtractTime: number = this.brewComponent
                .maximizeFlowGraphIsShown
                ? fullScreenTime - 20
                : normalScreenTime - 10;
              const addTime: number = this.brewComponent
                .maximizeFlowGraphIsShown
                ? fullScreenTime + 10
                : normalScreenTime + 10;
              if (this.data.brew_time <= 10) {
                subtractTime = 0;
              }

              const delay = moment(new Date())
                .startOf('day')
                .add(
                  'seconds',
                  this.brewComponent.timer.getSeconds() - subtractTime
                )
                .toDate()
                .getTime();
              const delayedTime: number = moment(new Date())
                .startOf('day')
                .add('seconds', this.brewComponent.timer.getSeconds() + addTime)
                .toDate()
                .getTime();
              this.lastChartLayout.xaxis.range = [delay, delayedTime];
              newLayoutIsNeeded = true;
              this.lastChartRenderingInstance = newRenderingInstance;
            }

            if (this.weightTrace.y.length > 0) {
              const lastWeightData: number =
                this.weightTrace.y[this.weightTrace.y.length - 1];
              // add some tolerance
              let toleranceMinus = 10;
              if (
                this.data.getPreparation().style_type ===
                PREPARATION_STYLE_TYPE.ESPRESSO
              ) {
                toleranceMinus = 1;
              }
              if (
                lastWeightData >=
                this.lastChartLayout.yaxis.range[1] - toleranceMinus
              ) {
                // Scale a bit up
                if (
                  this.data.getPreparation().style_type ===
                  PREPARATION_STYLE_TYPE.ESPRESSO
                ) {
                  this.lastChartLayout.yaxis.range[1] = lastWeightData * 1.25;
                } else {
                  this.lastChartLayout.yaxis.range[1] = lastWeightData * 1.5;
                }

                newLayoutIsNeeded = true;
              }
            }
            if (this.realtimeFlowTrace.y.length > 0) {
              const lastRealtimeFlowVal: number =
                this.realtimeFlowTrace.y[this.realtimeFlowTrace.y.length - 1];
              // add some tolerance
              let toleranceMinus = 3;
              if (
                this.data.getPreparation().style_type ===
                PREPARATION_STYLE_TYPE.ESPRESSO
              ) {
                toleranceMinus = 0.5;
              }

              if (
                lastRealtimeFlowVal >=
                this.lastChartLayout.yaxis2.range[1] - toleranceMinus
              ) {
                // Scale a bit up
                if (
                  this.data.getPreparation().style_type ===
                  PREPARATION_STYLE_TYPE.ESPRESSO
                ) {
                  this.lastChartLayout.yaxis2.range[1] =
                    lastRealtimeFlowVal * 1.25;
                } else {
                  this.lastChartLayout.yaxis2.range[1] =
                    lastRealtimeFlowVal * 1.5;
                }
                newLayoutIsNeeded = true;
              }
            }
            if (newLayoutIsNeeded) {
              Plotly.relayout(
                this.profileDiv.nativeElement,
                this.lastChartLayout
              );
            }
          }, 25);
        } else {
          const delay = moment(new Date())
            .startOf('day')
            .add('seconds', 0)
            .toDate()
            .getTime();
          const delayedTime: number = moment(new Date())
            .startOf('day')
            .add('seconds', this.brewComponent.timer.getSeconds() + 5)
            .toDate()
            .getTime();
          this.lastChartLayout.xaxis.range = [delay, delayedTime];
          Plotly.relayout(this.profileDiv.nativeElement, this.lastChartLayout);
        }
      } catch (ex) {}
    });
  }

  public async timerReset(_event) {
    const scale: BluetoothScale = this.bleManager.getScale();
    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    const temperatureDevice: TemperatureDevice =
      this.bleManager.getTemperatureDevice();

    if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected()
    ) {
      // If users rests, we reset also drip time, else the script would not recognize it.
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
        // 551 - Always attach to flow change, even when reset is triggerd
        this.attachToFlowChange();
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

        //Check if we have an reference flow, and when reset, preset it again

        if (this.data.reference_flow_profile) {
          await this.readReferenceFlowProfile(this.data);
        }
      }

      this.flow_profile_raw = new BrewFlow();
      this.flowProfileTempAll = [];
      this.flowNCalculation = 0;

      // We just initialize flow chart for the pressure sensor when the type is espresso
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
      // The pressure or weight went down and we need to reset the graph now still
      this.flow_profile_raw = new BrewFlow();
      this.flowProfileTempAll = [];
      this.flowNCalculation = 0;
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

    // If machineStopScriptWasTriggered would be true, we would already hit the weight mark, and therefore the stop was fired, and we don't fire it twice.
    if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.XENIA &&
      this.machineStopScriptWasTriggered === false
    ) {
      // If the event is not xenia, we pressed buttons, if the event was triggerd by xenia, timer already stopped.
      // If we press pause, stop scripts.
      this.uiLog.log(`Xenia Script - Pause button pressed, stop script`);
      const prepDeviceCall: XeniaDevice = this.brewComponent
        ?.brewBrewingPreparationDeviceEl?.preparationDevice as XeniaDevice;
      prepDeviceCall.stopScript().catch((_msg) => {
        this.uiToast.showInfoToast(
          'We could not stop script - manual triggered: ' + _msg,
          false
        );
      });
      this.writeExecutionTimeToNotes(
        'Stop script (Pause button)',
        0,
        this.translate.instant(
          'PREPARATION_DEVICE.TYPE_XENIA.SCRIPT_LIST_GENERAL_STOP'
        )
      );
      this.stopFetchingAndSettingDataFromXenia();
    }
    if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.METICULOUS &&
      _event !== 'meticulous'
    ) {
      this.stopFetchingDataFromMeticulous();
    }

    if (!this.platform.is('cordova')) {
      window.clearInterval(this.graphTimerTest);
    }
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

  public startFetchingDataFromMeticulous() {
    const prepDeviceCall: MeticulousDevice = this.brewComponent
      .brewBrewingPreparationDeviceEl.preparationDevice as MeticulousDevice;

    this.stopFetchingDataFromMeticulous();

    let hasShotStarted: boolean = false;
    prepDeviceCall.connectToSocket().then(
      (_connected) => {
        if (_connected) {
          this.uiAlert.showLoadingSpinner(
            'Profile is loaded, shot is starting soon'
          );
          let lastState = '';
          this.meticulousInterval = setInterval(() => {
            const shotData: MeticulousShotData =
              prepDeviceCall.getActualShotData();

            if (shotData.shotTime >= 0 && hasShotStarted === false) {
              this.uiAlert.hideLoadingSpinner();
              this.uiToast.showInfoToast(
                'PREPARATION_DEVICE.TYPE_METICULOUS.SHOT_STARTED'
              );
              hasShotStarted = true;
              this.startingFlowTime = Date.now();
              const startingDay = moment(new Date()).startOf('day');
              // IF brewtime has some seconds, we add this to the delay directly.
              this.data.brew_time = 0;
              this.brewComponent.timer.initTimer(false);
              this.brewComponent.timer.startTimer(false, false);
              this.lastChartRenderingInstance = -1;
              this.updateChart();
            } else if (
              shotData.shotTime === -1 &&
              hasShotStarted === true &&
              lastState === 'retracting' &&
              shotData.status !== 'retracting'
            ) {
              hasShotStarted = false;

              this.brewComponent.timer.pauseTimer('meticulous');
              this.stopFetchingDataFromMeticulous();
              this.updateChart();
              this.uiToast.showInfoToast(
                'PREPARATION_DEVICE.TYPE_METICULOUS.SHOT_ENDED'
              );
              return;
            }
            if (hasShotStarted) {
              this.__setPressureFlow({
                actual: shotData.pressure,
                old: shotData.pressure,
              });
              this.__setTemperatureFlow({
                actual: shotData.temperature,
                old: shotData.temperature,
              });

              this.__setFlowProfile({
                actual: shotData.weight,
                old: shotData.oldWeight,
                smoothed: shotData.smoothedWeight,
                oldSmoothed: shotData.oldSmoothedWeight,
              });

              //this.__setMachineWeightFlow({ actual: shotData.weight, old: shotData.weight,smoothed:100,oldSmoothed:100 });
              //this.__setMachineWaterFlow({ actual: shotData.flow, old: shotData.flow });

              this.setActualSmartInformation(shotData.weight);
            }
            lastState = shotData.status;
          }, 100);
        }
      },
      () => {
        //Should never trigger
      }
    );
  }

  public startFetchingAndSettingDataFromXenia() {
    const prepDeviceCall: XeniaDevice = this.brewComponent
      ?.brewBrewingPreparationDeviceEl?.preparationDevice as XeniaDevice;

    this.stopFetchingAndSettingDataFromXenia();
    const setTempAndPressure = () => {
      const temp = prepDeviceCall.getTemperature();
      const press = prepDeviceCall.getPressure();
      this.__setPressureFlow({ actual: press, old: press });
      this.__setTemperatureFlow({ actual: temp, old: temp });
    };
    prepDeviceCall.fetchPressureAndTemperature(() => {
      // before we start the interval, we fetch the data once to overwrite, and set them.
      setTempAndPressure();
    });
    setTimeout(() => {
      // Give the machine some time :)
      prepDeviceCall.fetchAndSetDeviceTemperature(() => {
        try {
          const temp = prepDeviceCall.getDevicetemperature();
          if (temp > 70) {
            this.data.brew_temperature = this.uiHelper.toFixedIfNecessary(
              temp,
              2
            );
          }
        } catch (ex) {}
      });
    }, 100);

    this.xeniaOverviewInterval = setInterval(async () => {
      try {
        // We don't use the callback function to make sure we don't have to many performance issues
        prepDeviceCall.fetchPressureAndTemperature(() => {
          //before we start the interval, we fetch the data once to overwrite, and set them.
          setTempAndPressure();
        });
      } catch (ex) {}
    }, 500);
  }

  public stopFetchingAndSettingDataFromXenia() {
    if (this.xeniaOverviewInterval !== undefined) {
      clearInterval(this.xeniaOverviewInterval);
      this.xeniaOverviewInterval = undefined;
    }
  }

  public stopFetchingDataFromMeticulous() {
    if (this.meticulousInterval !== undefined) {
      clearInterval(this.meticulousInterval);
      this.meticulousInterval = undefined;
    }
  }

  public async timerStartPressed(_event) {
    if (
      _event !== 'AUTO_LISTEN_SCALE' &&
      _event !== 'AUTO_START_PRESSURE' &&
      _event !== 'AUTO_START_TEMPERATURE'
    ) {
      const scale: BluetoothScale = this.bleManager.getScale();
      if (scale) {
        if (
          this.settings.bluetooth_scale_tare_on_start_timer === true &&
          scale.supportsTaring
        ) {
          await new Promise(async (resolve) => {
            await this.uiAlert.showLoadingSpinner();
            scale.tare();
            let minimumWeightNullReports = 0;
            let weightReports = 0;
            this.deattachToScaleStartTareListening();
            this.scaleStartTareListeningSubscription =
              scale.flowChange.subscribe((_val) => {
                const weight: number = this.uiHelper.toFixedIfNecessary(
                  _val.actual,
                  1
                );
                weightReports = weightReports + 1;
                if (weight <= 0) {
                  minimumWeightNullReports = minimumWeightNullReports + 1;
                }
                if (minimumWeightNullReports >= 3) {
                  this.deattachToScaleStartTareListening();
                  resolve(undefined);
                } else if (weightReports > 20) {
                  // We hope this should be never called?!
                  this.deattachToScaleStartTareListening();
                  resolve(undefined);
                }
              });
            /** Maybe we have issues with scale sending weight reports (like on the acaia), so we set an timeout, if after 3 seconds nothing happends, we just deatach and resolve**/
            setTimeout(() => {
              if (weightReports <= 0) {
                this.deattachToScaleStartTareListening();
                resolve(undefined);
              }
            }, 3000);
          });
          await this.uiAlert.hideLoadingSpinner();
        }
      }
    }
  }

  public async timerStarted(_event) {
    if (this.brewComponent.timer.isTimerRunning()) {
      //Maybe we got temperature threshold, bar threshold, and weight threshold, it could be three triggers. so we ignore that one
      return;
    }
    const scale: BluetoothScale = this.bleManager.getScale();
    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    const temperatureDevice: TemperatureDevice =
      this.bleManager.getTemperatureDevice();
    if (true && !this.platform.is('cordova')) {
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

      weight = 0;
      const genRand = (min, max, decimalPlaces) => {
        const randomFloat =
          crypto.getRandomValues(new Uint8Array(1))[0] / Math.pow(2, 8);
        const rand = randomFloat * (max - min) + min;
        const power = Math.pow(10, decimalPlaces);
        return Math.floor(rand * power) / power;
      };
      this.graphTimerTest = setInterval(() => {
        flow = Math.floor(
          (crypto.getRandomValues(new Uint8Array(1))[0] / Math.pow(2, 8)) * 11
        );
        realtime_flow = Math.floor(
          (crypto.getRandomValues(new Uint8Array(1))[0] / Math.pow(2, 8)) * 11
        );
        weight = weight + genRand(0.1, 2, 2);
        pressure = Math.floor(
          (crypto.getRandomValues(new Uint8Array(1))[0] / Math.pow(2, 8)) * 11
        );
        temperature = Math.floor(
          (crypto.getRandomValues(new Uint8Array(1))[0] / Math.pow(2, 8)) * 90
        );

        this.__setPressureFlow({ actual: pressure, old: pressure });

        this.__setTemperatureFlow({ actual: temperature, old: temperature });
        this.__setFlowProfile({
          actual: weight,
          old: 1,
          smoothed: 1,
          oldSmoothed: 1,
        });
        this.setActualSmartInformation();
      }, 100);
    }

    if (scale || pressureDevice || temperatureDevice) {
      this.lastChartRenderingInstance = -1;
      if (
        this.settings.bluetooth_scale_maximize_on_start_timer === true &&
        this.brewComponent.maximizeFlowGraphIsShown === false
      ) {
        // If maximizeFlowGraphIsShown===true, we already started once and resetted, don't show overlay again
        // First maximize, then go on with the timer, else it will lag hard.

        if (scale || temperatureDevice) {
          this.brewComponent.maximizeFlowGraph();
        } else {
          if (
            this.data.getPreparation().style_type ===
              PREPARATION_STYLE_TYPE.ESPRESSO &&
            pressureDevice
          ) {
            this.brewComponent.maximizeFlowGraph();
          } else {
            //Don't maximize because pressure is connected, but preparation is not right
          }
        }
      }

      if (scale && _event !== 'AUTO_LISTEN_SCALE') {
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
      } else if (_event === 'AUTO_LISTEN_SCALE') {
        // Don't use awaits.
        const scaleType = this.bleManager.getScale()?.getScaleType();

        if (
          scaleType === ScaleType.DIFLUIDMICROBALANCETI ||
          scaleType === ScaleType.DIFLUIDMICROBALANCE
        ) {
          //The microbalance has somehow an firmware issue, that when starting on autolistening mode and don't delay the start commando, the scale goes corrupt.

          scale.setTimer(SCALE_TIMER_COMMAND.START);
        } else {
          scale.setTimer(SCALE_TIMER_COMMAND.START);
        }
      }
      if (
        pressureDevice &&
        this.settings.pressure_threshold_active === false &&
        _event !== 'AUTO_LISTEN_SCALE'
      ) {
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
        (this.settings.pressure_threshold_active === false ||
          _event !== 'AUTO_START_PRESSURE')
      ) {
        this.attachToPressureChange();
      }
      if (
        temperatureDevice &&
        (this.settings.temperature_threshold_active === false ||
          _event !== 'AUTO_START_TEMPERATURE')
      ) {
        this.attachToTemperatureChange();
      }
    }
    if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.XENIA
    ) {
      if (this.data.preparationDeviceBrew.params.scriptStartId > 0) {
        this.uiLog.log(`Xenia Script - Script start -  Trigger script`);
        const prepDeviceCall: XeniaDevice = this.brewComponent
          .brewBrewingPreparationDeviceEl.preparationDevice as XeniaDevice;
        prepDeviceCall
          .startScript(this.data.preparationDeviceBrew.params.scriptStartId)
          .catch((_msg) => {
            this.uiLog.log('We could not start script: ' + _msg);
            this.uiToast.showInfoToast(
              'We could not start script: ' + _msg,
              false
            );
          });
        this.writeExecutionTimeToNotes(
          'Start script',
          this.data.preparationDeviceBrew.params.scriptStartId,
          this.getScriptName(
            this.data.preparationDeviceBrew.params.scriptStartId
          )
        );
      }
      this.startFetchingAndSettingDataFromXenia();
    } else if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.METICULOUS
    ) {
      if (
        this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.METICULOUS
      ) {
        const prepDeviceCall: MeticulousDevice = this.brewComponent
          .brewBrewingPreparationDeviceEl.preparationDevice as MeticulousDevice;

        if (this.data.preparationDeviceBrew.params.chosenProfileId !== '') {
          this.uiLog.log(
            `A Meticulous profile was choosen, execute it - ${this.data.preparationDeviceBrew.params.chosenProfileId}`
          );
          await prepDeviceCall.loadProfileByID(
            this.data.preparationDeviceBrew.params.chosenProfileId
          );
          await prepDeviceCall.startExecute();
        } else {
          this.uiLog.log(
            'No Meticulous profile was selected, just listen for the start'
          );
        }

        if (
          this.settings.bluetooth_scale_maximize_on_start_timer === true &&
          this.brewComponent.maximizeFlowGraphIsShown === false
        ) {
          this.brewComponent.maximizeFlowGraph();
        }

        this.startFetchingDataFromMeticulous();
      }
    }
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

  public async startListeningToScaleChange($event) {
    const scale: BluetoothScale = this.bleManager.getScale();

    if (scale) {
      this.deattachToScaleListening();
      let scaleThresholdWasHit: boolean = false;
      await this.uiAlert.showLoadingSpinner();

      const pressureDevice: PressureDevice =
        this.bleManager.getPressureDevice();
      if (pressureDevice) {
        // Just update to zero if there is no threshold active
        pressureDevice.updateZero();
      }

      await this.timerReset(undefined);
      await this.brewComponent.timer.resetWithoutEmit(false);

      this.brewComponent.timer.checkChanges();
      this.checkChanges();

      await this.uiAlert.hideLoadingSpinner();

      this.uiToast.showInfoToast('We started now listening to scale changes');
      this.scaleListeningSubscription = scale.flowChange.subscribe((_val) => {
        const weight: number = this.uiHelper.toFixedIfNecessary(_val.actual, 1);

        if (this.brewComponent.timer.isTimerRunning()) {
          // Ignore.
        } else {
          if (
            scaleThresholdWasHit === false &&
            this.settings.bluetooth_scale_listening_threshold_start &&
            weight >= this.settings.bluetooth_scale_listening_threshold_start
          ) {
            scaleThresholdWasHit = true;
            this.ngZone.run(() => {
              this.brewComponent.timerStartPressed('AUTO_LISTEN_SCALE');
              // Deattach now directly.
              this.deattachToScaleListening();
              setTimeout(() => {
                this.changeDetectorRef.markForCheck();
                this.brewComponent.timer.checkChanges();
                this.checkChanges();
              });
            });
          }
        }
      });
    }
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

  public deattachToScaleListening() {
    if (this.scaleListeningSubscription) {
      this.scaleListeningSubscription.unsubscribe();
      this.scaleListeningSubscription = undefined;
    }
  }

  public deattachToScaleStartTareListening() {
    if (this.scaleStartTareListeningSubscription) {
      this.scaleStartTareListeningSubscription.unsubscribe();
      this.scaleStartTareListeningSubscription = undefined;
    }
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

  public attachToFlowChange() {
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale) {
      this.deattachToFlowChange();

      let didWeReceiveAnyFlow: boolean = false;
      this.scaleFlowChangeSubscription = scale.flowChange.subscribe((_val) => {
        this.setActualSmartInformation();
        didWeReceiveAnyFlow = true;
      });
      setTimeout(() => {
        if (
          didWeReceiveAnyFlow === false &&
          this.brewComponent.timer.isTimerRunning() === false
        ) {
          this.uiAlert.showMessage(
            'SMART_SCALE_DID_NOT_SEND_ANY_WEIGHT_DESCRIPTION',
            'SMART_SCALE_DID_NOT_SEND_ANY_WEIGHT_TITLE',
            undefined,
            true
          );
        }
      }, 2500);
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
          if (this.brewComponent.timer.isTimerRunning()) {
            this.__setPressureFlow(_val);
          } else {
            if (
              this.pressureThresholdWasHit === false &&
              this.settings.pressure_threshold_active &&
              _val.actual >= this.settings.pressure_threshold_bar
            ) {
              this.pressureThresholdWasHit = true;
              this.ngZone.run(() => {
                this.brewComponent.timerStartPressed('AUTO_START_PRESSURE');

                //User can press both, so deattach to scale listening, because pressure will hit before then first drops normaly.
                this.deattachToScaleListening();

                setTimeout(() => {
                  this.changeDetectorRef.markForCheck();
                  this.brewComponent.timer.checkChanges();
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
          if (this.brewComponent.timer.isTimerRunning()) {
            this.__setTemperatureFlow(_val);
          } else {
            if (
              this.temperatureThresholdWasHit === false &&
              this.settings.temperature_threshold_active &&
              _val.actual >= this.settings.temperature_threshold_temp
            ) {
              this.temperatureThresholdWasHit = true;
              this.ngZone.run(() => {
                this.brewComponent.timerStartPressed('AUTO_START_TEMPERATURE');

                setTimeout(() => {
                  this.changeDetectorRef.markForCheck();
                  this.brewComponent.timer.checkChanges();
                  this.checkChanges();
                });
              });
            }
          }
        });
    }
  }

  public smartScaleSupportsTaring() {
    try {
      return this.bleManager.getScale().supportsTaring;
    } catch (ex) {
      return false;
    }
  }

  public attachToScaleWeightChange() {
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale) {
      this.deattachToWeightChange();

      this.machineStopScriptWasTriggered = false;
      this.scaleFlowSubscription = scale.flowChange.subscribe((_val) => {
        if (
          this.brewComponent.timer.isTimerRunning() &&
          this.brewComponent.brewBrewingPreparationDeviceEl.preparationDeviceConnected() &&
          this.brewComponent.brewBrewingPreparationDeviceEl.getPreparationDeviceType() ===
            PreparationDeviceType.XENIA &&
          this.data.preparationDeviceBrew.params.scriptAtWeightReachedNumber > 0
        ) {
          if (this.isFirstXeniaScriptSet()) {
            let weight: number = this.uiHelper.toFixedIfNecessary(
              _val.actual,
              1
            );
            if (this.ignoreScaleWeight === true) {
              if (this.flowProfileTempAll.length > 0) {
                const oldFlowProfileTemp =
                  this.flowProfileTempAll[this.flowProfileTempAll.length - 1];
                weight = this.uiHelper.toFixedIfNecessary(
                  oldFlowProfileTemp.weight,
                  1
                );
              }
            }

            if (
              this.flow_profile_raw.realtimeFlow &&
              this.flow_profile_raw.realtimeFlow.length > 0
            ) {
              const prepDeviceCall: XeniaDevice = this.brewComponent
                .brewBrewingPreparationDeviceEl
                .preparationDevice as XeniaDevice;

              const targetWeight =
                this.data.preparationDeviceBrew.params
                  .scriptAtWeightReachedNumber;

              const brewByWeightActive: boolean =
                this.data.preparationDeviceBrew?.params?.brew_by_weight_active;

              let n = 3;
              if (this.flowNCalculation > 0) {
                n = this.flowNCalculation;
              } else {
                n = this.flowProfileTempAll.length;
              }
              const lag_time = this.uiHelper.toFixedIfNecessary(1 / n, 2);
              const residual_lag_time = prepDeviceCall.getResidualLagTime();

              let average_flow_rate = 0;
              let lastFlowValue = 0;

              const linearArray = [];

              const weightFlowCalc: Array<IBrewWeightFlow> =
                this.flow_profile_raw.weight.slice(-(n - 1));

              for (let i = 0; i < weightFlowCalc.length; i++) {
                if (weightFlowCalc[i] && weightFlowCalc[i].actual_weight) {
                  const linearArrayEntry = [i, weightFlowCalc[i].actual_weight];
                  linearArray.push(linearArrayEntry);
                }
              }
              linearArray.push([n - 1, weight]);

              const linearRegressionCalc = regression.linear(linearArray);
              average_flow_rate = linearRegressionCalc.equation[0] * n;

              /** Old calculcation
               try {
                lastFlowValue =
                  this.flow_profile_raw.realtimeFlow[
                    this.flow_profile_raw.realtimeFlow.length - 1
                  ].flow_value;

                const avgFlowValCalc: Array<IBrewRealtimeWaterFlow> =
                  this.flow_profile_raw.realtimeFlow.slice(-n);

                for (let i = 0; i < avgFlowValCalc.length; i++) {
                  if (avgFlowValCalc[i] && avgFlowValCalc[i].flow_value) {
                    average_flow_rate =
                      average_flow_rate + avgFlowValCalc[i].flow_value;
                  }
                }
                if (average_flow_rate > 0) {
                  average_flow_rate = this.uiHelper.toFixedIfNecessary(
                    average_flow_rate / n,
                    2
                  );
                }
              } catch (ex) {}**/

              const scaleType = scale.getScaleType();

              this.pushBrewByWeight(
                this.data.preparationDeviceBrew.params
                  .scriptAtWeightReachedNumber,
                lag_time,
                this.flowTime + '.' + this.flowSecondTick,
                lastFlowValue,
                weight,
                lag_time + residual_lag_time,
                weight + average_flow_rate * (lag_time + residual_lag_time) >=
                  targetWeight,
                average_flow_rate * (lag_time + residual_lag_time),
                residual_lag_time,
                average_flow_rate,
                scaleType
              );

              if (this.machineStopScriptWasTriggered === false) {
                let thresholdHit: boolean = false;
                if (brewByWeightActive) {
                  thresholdHit =
                    weight +
                      average_flow_rate * (lag_time + residual_lag_time) >=
                    targetWeight;
                } else {
                  thresholdHit = weight >= targetWeight;
                }

                if (thresholdHit) {
                  if (
                    this.data.preparationDeviceBrew.params
                      .scriptAtWeightReachedId > 0
                  ) {
                    this.uiLog.log(
                      `Xenia Script - Weight Reached: ${weight} - Trigger custom script`
                    );
                    prepDeviceCall
                      .startScript(
                        this.data.preparationDeviceBrew.params
                          .scriptAtWeightReachedId
                      )
                      .catch((_msg) => {
                        this.uiToast.showInfoToast(
                          'We could not start script at weight: ' + _msg,
                          false
                        );
                      });
                    this.writeExecutionTimeToNotes(
                      'Weight reached script',
                      this.data.preparationDeviceBrew.params
                        .scriptAtWeightReachedId,
                      this.getScriptName(
                        this.data.preparationDeviceBrew.params
                          .scriptAtWeightReachedId
                      )
                    );
                  } else {
                    this.uiLog.log(
                      `Xenia Script - Weight Reached - Trigger stop script`
                    );
                    prepDeviceCall.stopScript().catch((_msg) => {
                      this.uiToast.showInfoToast(
                        'We could not stop script at weight: ' + _msg,
                        false
                      );
                    });
                    this.writeExecutionTimeToNotes(
                      'Stop script (Weight reached)',
                      0,
                      this.translate.instant(
                        'PREPARATION_DEVICE.TYPE_XENIA.SCRIPT_LIST_GENERAL_STOP'
                      )
                    );
                  }
                  this.machineStopScriptWasTriggered = true;
                  // This will be just called once, we stopped the shot and now we check if we directly shall stop or not
                  if (
                    this.settings
                      .bluetooth_scale_espresso_stop_on_no_weight_change ===
                    false
                  ) {
                    this.stopFetchingAndSettingDataFromXenia();
                    this.brewComponent.timer.pauseTimer('xenia');
                  } else {
                    // We weight for the normal "setFlow" to stop the detection of the graph, there then aswell is the stop fetch of the xenia triggered.
                  }
                }
              }
            }
          }
        }
        if (this.ignoreScaleWeight === false) {
          this.__setFlowProfile(_val);
        } else {
          if (this.flowProfileTempAll.length > 0) {
            const oldFlowProfileTemp =
              this.flowProfileTempAll[this.flowProfileTempAll.length - 1];
            const passVal = {
              actual: oldFlowProfileTemp.weight,
              old: oldFlowProfileTemp.oldWeight,
              smoothed: oldFlowProfileTemp.smoothedWeight,
              oldSmoothed: oldFlowProfileTemp.oldSmoothedWeight,
            };
            this.__setFlowProfile(passVal);
          }
        }
      });
    }
  }

  public destroy() {
    if (this.bluetoothSubscription) {
      this.bluetoothSubscription.unsubscribe();
      this.bluetoothSubscription = undefined;
    }

    this.deattachToWeightChange();
    this.deattachToFlowChange();
    this.deattachToPressureChange();
    this.deattachToScaleEvents();
    this.deattachToTemperatureChange();

    this.deattachToScaleListening();
    this.deattachToScaleStartTareListening();
    this.stopFetchingAndSettingDataFromXenia();
    this.stopFetchingDataFromMeticulous();
  }

  public ngOnDestroy() {
    // We don't deattach the timer subscription in the deattach toscale events, else we couldn't start anymore.
    this.destroy();
  }

  private async returnFlowProfile(_flowProfile: string) {
    const promiseRtr = new Promise(async (resolve) => {
      if (this.platform.is('cordova')) {
        if (_flowProfile !== '') {
          try {
            const jsonParsed = await this.uiFileHelper.getJSONFile(
              _flowProfile
            );
            resolve(jsonParsed);
          } catch (ex) {}
        }
      } else {
        resolve(BeanconquerorFlowTestDataDummySecondDummy);
      }
    });
    return promiseRtr;
  }

  public async readFlowProfile() {
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

  private __setMachineWaterFlow(_flow: any) {
    /* Realtime flow start**/

    const actual: number = this.uiHelper.toFixedIfNecessary(_flow.actual, 2);
    const old: number = this.uiHelper.toFixedIfNecessary(_flow.old, 2);

    const actualUnixTime: number = moment(new Date())
      .startOf('day')
      .add('milliseconds', Date.now() - this.startingFlowTime)
      .toDate()
      .getTime();

    const flowObj = {
      unixTime: actualUnixTime,
      actual: actual,
      old: old,
      flowTime: this.flowTime,
      flowTimeSecond: this.flowTime + '.' + this.flowSecondTick,
      flowTimestamp: this.uiHelper.getActualTimeWithMilliseconds(),
    };

    const realtimeWaterFlow: IBrewRealtimeWaterFlow =
      {} as IBrewRealtimeWaterFlow;

    realtimeWaterFlow.brew_time = flowObj.flowTimeSecond;
    realtimeWaterFlow.timestamp = flowObj.flowTimestamp;
    realtimeWaterFlow.smoothed_weight = 0;
    realtimeWaterFlow.flow_value = flowObj.actual;

    this.realtimeFlowTrace.x.push(new Date(flowObj.unixTime));
    this.realtimeFlowTrace.y.push(realtimeWaterFlow.flow_value);

    this.flow_profile_raw.realtimeFlow.push(realtimeWaterFlow);
    /* Realtime flow End **/
  }

  private __setMachineWeightFlow(_weight: any) {
    // Nothing for storing etc. is done here actually
    const actual: number = this.uiHelper.toFixedIfNecessary(_weight.actual, 2);
    const old: number = this.uiHelper.toFixedIfNecessary(_weight.old, 2);

    if (this.flowTime === undefined) {
      this.flowTime = this.brewComponent.getTime();
      this.flowSecondTick = 0;
    }

    const flowObj = {
      unixTime: moment(new Date())
        .startOf('day')
        .add('milliseconds', Date.now() - this.startingFlowTime)
        .toDate()
        .getTime(),
      weight: actual,
      oldWeight: old,
      smoothedWeight: actual,
      oldSmoothedWeight: old,
      flowTime: this.flowTime,
      flowTimeSecond: this.flowTime + '.' + this.flowSecondTick,
      flowTimestamp: this.uiHelper.getActualTimeWithMilliseconds(),
      dateUnixTime: undefined,
    };
    flowObj.dateUnixTime = new Date(flowObj.unixTime);

    if (this.flowTime !== this.brewComponent.getTime()) {
      this.flowTime = this.brewComponent.getTime();
      this.flowSecondTick = 0;
    }

    this.weightTrace.x.push(flowObj.dateUnixTime);
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

    this.flowSecondTick++;
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
      this.flowTime = this.brewComponent.getTime();
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
      if (this.flowTime !== this.brewComponent.getTime()) {
        this.flowTime = this.brewComponent.getTime();
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
      this.flowTime = this.brewComponent.getTime();
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
      if (this.flowTime !== this.brewComponent.getTime()) {
        this.flowTime = this.brewComponent.getTime();
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

    this.setActualTemperatureInformation(temperatureObj.actual);
  }

  private __setFlowProfile(_scaleChange: any) {
    let weight: number = this.uiHelper.toFixedIfNecessary(
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
      this.flowTime = this.brewComponent.getTime();
    }
    const scaleType = this.bleManager.getScale()?.getScaleType();
    //Yeay yeay yeay, sometimes the lunar scale is reporting wrongly cause of closed api, therefore try to tackle this issues down with the lunar
    if (scaleType === ScaleType.LUNAR) {
      if (weight > 5000) {
        // Wrong scale values reported. - Fix it back
        weight = oldWeight;
      } else {
        if (weight <= 0) {
          if (this.flowProfileTempAll.length >= 3) {
            let weAreDecreasing: boolean = false;
            for (
              let i = this.flowProfileTempAll.length - 1;
              i >= this.flowProfileTempAll.length - 2;
              i--
            ) {
              if (
                this.flowProfileTempAll[i].weight <
                this.flowProfileTempAll[i - 1].weight
              ) {
                weAreDecreasing = true;
              } else {
                // We are decreasing, break directly, that the value is not overwritten again.
                weAreDecreasing = false;
                break;
              }
            }
            // We checked that we're not going to degreese
            if (weAreDecreasing === false) {
              // I don't know if old_weight could just be bigger then 0
              weight = oldWeight;
            }
          }
        } else {
          //Check if the weight before this actual weight is less then factor 2.
          //like we got jumps weight 25.8 grams, next was 259 grams.
          if (this.flowProfileTempAll.length >= 2) {
            if (oldWeight * 2 >= weight) {
              //All good factor is matched
            } else {
              //Nothing good, somehow we got spikes.
              weight = oldWeight;
            }
          }
        }
      }
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
      dateUnixTime: undefined,
    };
    flowObj.dateUnixTime = new Date(flowObj.unixTime);

    this.flowProfileTempAll.push(flowObj);

    if (this.flowTime !== this.brewComponent.getTime()) {
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

            let skip = false;
            if (scaleType === ScaleType.LUNAR) {
              let overNextVal = val - 0.2;
              if (i + 2 !== this.flowProfileArr.length - 1) {
                overNextVal = this.flowProfileArr[i + 2];
              }
              if (overNextVal >= nextVal) {
                skip = true;
              }
            }

            if (skip === false) {
              wrongFlow = true;
              weightDidntChange = false;
              break;
            }
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

        const realtimeFlowSplit: Array<IBrewRealtimeWaterFlow> =
          this.flow_profile_raw.realtimeFlow.slice(
            -this.flowProfileArrCalculated.length
          );
        const slopeWeight = 1 / realtimeFlowSplit.length;
        let avgCalculation: number = 0;
        for (const entry of realtimeFlowSplit) {
          avgCalculation = avgCalculation + slopeWeight * entry.flow_value;
        }
        calculatedFlowWeight = avgCalculation;

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

          this.weightTrace.x.push(item.dateUnixTime);
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

      for (const item of this.flowProfileArrObjs) {
        const waterFlow: IBrewWaterFlow = {} as IBrewWaterFlow;

        waterFlow.brew_time = this.flowTime.toString();
        waterFlow.timestamp = flowObj.flowTimestamp;
        waterFlow.value = actualFlowValue;
        this.flowPerSecondTrace.x.push(item.dateUnixTime);
        this.flowPerSecondTrace.y.push(actualFlowValue);
        this.flow_profile_raw.waterFlow.push(waterFlow);
      }

      this.__setScaleWeight(weight, wrongFlow, weightDidntChange);

      // Reset
      this.flowTime = this.brewComponent.getTime();
      this.flowSecondTick = 0;

      this.flowNCalculation = this.flowProfileArr.length;

      this.flowProfileArr = [];
      this.flowProfileArrObjs = [];
      this.flowProfileArrCalculated = [];

      this.updateChart();
    }

    this.flowProfileArr.push(weight);
    this.flowProfileArrObjs.push(flowObj);
    this.flowProfileArrCalculated.push(weight - oldWeight);

    /* Realtime flow start**/

    const newSmoothedWeight = flowObj.smoothedWeight;
    const realtimeWaterFlow: IBrewRealtimeWaterFlow =
      {} as IBrewRealtimeWaterFlow;

    realtimeWaterFlow.brew_time = flowObj.flowTimeSecond;
    realtimeWaterFlow.timestamp = flowObj.flowTimestamp;
    realtimeWaterFlow.smoothed_weight = newSmoothedWeight;

    let timeStampDelta: any = 0;
    let n: any = 3;

    if (this.flowNCalculation > 0 && this.flowNCalculation > 3) {
      n = this.flowNCalculation;
    } else {
      //Fallback if N cant be 3
      n = this.flowProfileTempAll.length;
    }

    // After the flowProfileTempAll will be stored directly, we'd have one entry at start already, but we need to wait for another one
    if (this.flowProfileTempAll.length > 2) {
      try {
        timeStampDelta =
          flowObj.unixTime -
          this.flowProfileTempAll[this.flowProfileTempAll.length - n].unixTime;
      } catch (ex) {}
    }

    realtimeWaterFlow.timestampdelta = timeStampDelta;

    let calcFlowValue = 0;
    try {
      calcFlowValue =
        (newSmoothedWeight -
          this.flowProfileTempAll[this.flowProfileTempAll.length - n]
            .smoothedWeight) *
        (1000 / timeStampDelta);
    } catch (ex) {}
    if (Number.isNaN(calcFlowValue)) {
      calcFlowValue = 0;
    }
    realtimeWaterFlow.flow_value = calcFlowValue;

    this.realtimeFlowTrace.x.push(flowObj.dateUnixTime);
    this.realtimeFlowTrace.y.push(realtimeWaterFlow.flow_value);

    this.flow_profile_raw.realtimeFlow.push(realtimeWaterFlow);
    /* Realtime flow End **/

    if (
      this.data.getPreparation().style_type ===
        PREPARATION_STYLE_TYPE.ESPRESSO &&
      flowObj.weight >= this.settings.bluetooth_scale_first_drip_threshold
    ) {
      // If the drip timer is showing, we can set the first drip and not doing a reference to the normal weight.
      if (
        this.brewComponent.timer.showDripTimer === true &&
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

          this.brewComponent.setCoffeeDripTime(undefined);

          this.checkChanges();
        }
      }
    }

    if (
      this.settings.bluetooth_ignore_anomaly_values === false &&
      this.settings.bluetooth_ignore_negative_values === false
    ) {
      this.weightTrace.x.push(flowObj.dateUnixTime);
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

    if (this.hasEspressoShotEnded()) {
      if (
        this.brewComponent.brewBrewingPreparationDeviceEl.preparationDeviceConnected() &&
        this.brewComponent.brewBrewingPreparationDeviceEl.getPreparationDeviceType() ===
          PreparationDeviceType.XENIA
      ) {
        this.stopFetchingAndSettingDataFromXenia();
      }

      let isMeticulous: boolean = false;

      if (
        this.brewComponent.brewBrewingPreparationDeviceEl.preparationDeviceConnected() &&
        this.brewComponent.brewBrewingPreparationDeviceEl.getPreparationDeviceType() ===
          PreparationDeviceType.METICULOUS
      ) {
        isMeticulous = true;
      }

      // Meticulous is stopped by status, not by Beanconqueror logic
      if (!isMeticulous) {
        // We have found a written weight which is above 5 grams at least
        this.__setScaleWeight(weight, false, false);
        this.brewComponent.timer.pauseTimer();
        this.changeDetectorRef.markForCheck();
        this.brewComponent.timer.checkChanges();
        this.checkChanges();
      }
    }

    this.flowSecondTick = this.flowSecondTick + 1;
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

  private hasEspressoShotEnded(): boolean {
    // Minimum 50 scale values which means atleast 5 seconds
    if (
      this.data.getPreparation().style_type !== PREPARATION_STYLE_TYPE.ESPRESSO
    ) {
      return false;
    }

    if (
      this.settings.bluetooth_scale_espresso_stop_on_no_weight_change ===
        false ||
      this.weightTrace.y.length < 50 ||
      this.data.brew_time <= 5
    ) {
      return false; // Not enough readings or start time not set yet, or we didn't elapse 5 seconds
    }

    let grindWeight = this.data.grind_weight;
    if (grindWeight && grindWeight > 0) {
    } else {
      grindWeight = 5;
    }
    const valFound = this.weightTrace.y.find((v) => v >= grindWeight);
    if (valFound === undefined || valFound === null) {
      return false; // We want to be atleast a ratio of 1:1
    }
    const flowThreshold: number =
      this.settings.bluetooth_scale_espresso_stop_on_no_weight_change_min_flow;
    if (
      this.realtimeFlowTrace.y[this.realtimeFlowTrace.y.length - 1] <=
      flowThreshold
    ) {
      return true;
    } else {
      return false;
    }
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

  private pushBrewByWeight(
    target_weight: number,
    lag_time: number,
    brew_time: string,
    last_flow_value: number,
    actual_scale_weight: number,
    calc_lag_time: number,
    calc_exceeds_weight: boolean,
    avg_flow_lag_residual_time: number,
    residual_lag_time: number,
    average_flow_rate: number,
    scaleType: string
  ) {
    const weightFlow: IBrewByWeight = {} as IBrewByWeight;
    weightFlow.timestamp = this.uiHelper.getActualTimeWithMilliseconds();
    weightFlow.brew_time = brew_time;
    weightFlow.target_weight = target_weight;
    weightFlow.lag_time = lag_time;
    weightFlow.last_flow_value = last_flow_value;
    weightFlow.actual_scale_weight = actual_scale_weight;
    weightFlow.calc_lag_time = calc_lag_time;
    weightFlow.calc_exceeds_weight = calc_exceeds_weight;
    weightFlow.avg_flow_lag_residual_time = avg_flow_lag_residual_time;
    weightFlow.residual_lag_time = residual_lag_time;
    weightFlow.average_flow_rate = average_flow_rate;
    weightFlow.scaleType = scaleType;

    this.flow_profile_raw.brewbyweight.push(weightFlow);
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

  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange() {
    if (
      this.smartScaleConnected() ||
      this.pressureDeviceConnected() ||
      this.temperatureDeviceConnected() ||
      this.isDetail
    ) {
      setTimeout(() => {
        try {
          this.lastChartLayout.height = 150;
          this.lastChartLayout.width =
            this.canvaContainer.nativeElement.offsetWidth;
          Plotly.relayout(this.profileDiv.nativeElement, this.lastChartLayout);
        } catch (ex) {}
      }, 50);
    }
  }

  public ignoreWeightClicked() {
    this.ignoreScaleWeight = true;
  }

  public unignoreWeightClicked() {
    this.ignoreScaleWeight = false;
  }

  private getScriptName(_index: number) {
    try {
      if (_index <= 2) {
        return this.translate.instant(
          'PREPARATION_DEVICE.TYPE_XENIA.SCRIPT_LIST_GENERAL_' + _index
        );
      } else {
        const prepDeviceCall: XeniaDevice = this.brewComponent
          .brewBrewingPreparationDeviceEl.preparationDevice as XeniaDevice;
        for (const script of prepDeviceCall?.scriptList) {
          if (script.INDEX === _index) {
            return script.TITLE;
          }
        }
      }
    } catch (ex) {
      return 'Script not found';
    }
  }

  private writeExecutionTimeToNotes(
    _message: string,
    _scriptId: number,
    _scriptName: string
  ) {
    let scriptInformation: string = '';

    let timestamp: string = this.data.brew_time + '';
    if (this.settings.brew_milliseconds) {
      timestamp = timestamp + '.' + this.data.brew_time_milliseconds;
    }
    scriptInformation =
      timestamp +
      ': ' +
      _message +
      ' - ' +
      _scriptName +
      ' (' +
      _scriptId +
      ')';

    if (this.data.note !== '') {
      this.data.note = this.data.note + '\r\n' + scriptInformation;
    } else {
      this.data.note = scriptInformation;
    }
  }

  public async chooseGraphToSetAsReference() {
    const modal = await this.modalController.create({
      component: BrewChooseGraphReferenceComponent,
      id: BrewChooseGraphReferenceComponent.COMPONENT_ID,
      componentProps: {
        brew: this.data,
      },
    });

    // will force rerender :D
    this.lastChartRenderingInstance = -1;
    await modal.present();
    const rData = await modal.onWillDismiss();
    if (rData?.data?.brew || rData?.data?.graph) {
      let flowProfileRtr: string = '';
      // Set the new reference flow profile
      const refGraph: ReferenceGraph = new ReferenceGraph();

      if (rData?.data?.brew) {
        refGraph.type = REFERENCE_GRAPH_TYPE.BREW;
        refGraph.uuid = rData?.data?.brew.config.uuid;
        flowProfileRtr = rData?.data?.brew.flow_profile;
      } else {
        refGraph.uuid = rData?.data?.graph.config.uuid;
        refGraph.type = REFERENCE_GRAPH_TYPE.GRAPH;
        flowProfileRtr = rData?.data?.graph.flow_profile;
      }
      this.data.reference_flow_profile = refGraph;

      const presetGraphData: any = await this.returnFlowProfile(flowProfileRtr);
      this.reference_profile_raw = presetGraphData;
      this.initializeFlowChart(true);
    } else if (rData?.data?.reset) {
      // Reset the reference flow profile
      this.data.reference_flow_profile = new ReferenceGraph();
      this.reference_profile_raw = new BrewFlow();
      this.initializeFlowChart(true);
    }
  }

  public setFirstDripFromMachine() {
    if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.XENIA &&
      this.data.preparationDeviceBrew.params.scriptAtFirstDripId > 0
    ) {
      if (this.isFirstXeniaScriptSet()) {
        this.uiLog.log(
          `Xenia Script - Script at first drip -  Trigger custom script`
        );
        const prepDeviceCall: XeniaDevice = this.brewComponent
          .brewBrewingPreparationDeviceEl.preparationDevice as XeniaDevice;
        prepDeviceCall
          .startScript(
            this.data.preparationDeviceBrew.params.scriptAtFirstDripId
          )
          .catch((_msg) => {
            this.uiToast.showInfoToast(
              'We could not start script at first drip: ' + _msg,
              false
            );
          });
        this.writeExecutionTimeToNotes(
          'First drip script',
          this.data.preparationDeviceBrew.params.scriptAtFirstDripId,
          this.getScriptName(
            this.data.preparationDeviceBrew.params.scriptAtFirstDripId
          )
        );
      }
    }
  }

  public coffeeFirstDripTimeChanged(_event): void {
    if (
      !this.smartScaleConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.XENIA
    ) {
      // If scale is not connected but the device, we can now choose that still the script is executed if existing.
      if (this.isFirstXeniaScriptSet()) {
        if (this.data.preparationDeviceBrew.params.scriptAtFirstDripId > 0) {
          this.uiLog.log(
            `Xenia Script - Script at first drip -  Trigger custom script`
          );
          const prepDeviceCall: XeniaDevice = this.brewComponent
            .brewBrewingPreparationDeviceEl.preparationDevice as XeniaDevice;
          prepDeviceCall
            .startScript(
              this.data.preparationDeviceBrew.params.scriptAtFirstDripId
            )
            .catch((_msg) => {
              this.uiToast.showInfoToast(
                'We could not start script at first drip - manual  triggered: ' +
                  _msg,
                false
              );
            });
          this.writeExecutionTimeToNotes(
            'First drip script',
            this.data.preparationDeviceBrew.params.scriptAtFirstDripId,
            this.getScriptName(
              this.data.preparationDeviceBrew.params.scriptAtFirstDripId
            )
          );
        }
      }
    }
  }

  public isFirstXeniaScriptSet() {
    if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.XENIA
    ) {
      if (this.data.preparationDeviceBrew.params.scriptStartId > 0) {
        return true;
      }
    }
    return false;
  }
}
