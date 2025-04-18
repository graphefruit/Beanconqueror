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
  sleep,
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
import { TextToSpeechService } from '../../../services/textToSpeech/text-to-speech.service';
import { SanremoYOUDevice } from '../../../classes/preparationDevice/sanremo/sanremoYOUDevice';
import { SanremoYOUMode } from '../../../enums/preparationDevice/sanremo/sanremoYOUMode';
import { GraphHelperService } from '../../../services/graphHelper/graph-helper.service';
import { BREW_FUNCTION_PIPE_ENUM } from '../../../enums/brews/brewFunctionPipe';
import { BREW_GRAPH_TYPE } from '../../../enums/brews/brewGraphType';
import { SanremoShotData } from '../../../classes/preparationDevice/sanremo/sanremoShotData';

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

  /** Barista mode **/

  @ViewChild('smartScaleWeightPerSecondBarista', { read: ElementRef })
  public smartScaleWeightPerSecondBaristaEl: ElementRef;
  @ViewChild('smartScaleAvgFlowPerSecondBarista', { read: ElementRef })
  public smartScaleAvgFlowPerSecondBaristaEl: ElementRef;
  @ViewChild('timerBarista', { read: ElementRef })
  public timerBaristaEl: ElementRef;
  @ViewChild('lastShot', { read: ElementRef })
  public lastShotEl: ElementRef;

  /** Barista mode end **/

  @ViewChild('smartScaleSecondWeight', { read: ElementRef })
  public smartScaleSecondWeightEl: ElementRef;

  @ViewChild('smartScaleBrewRatio', { read: ElementRef })
  public smartScaleBrewRatio: ElementRef;

  @ViewChild('smartScaleWeightSecondPerSecond', { read: ElementRef })
  public smartScaleWeightSecondPerSecondEl: ElementRef;

  @ViewChild('pressure', { read: ElementRef })
  public pressureEl: ElementRef;

  @ViewChild('temperature', { read: ElementRef })
  public temperatureEl: ElementRef;

  @Input() public brewComponent: BrewBrewingComponent;

  @Input() public data: Brew;
  @Output() public dataChange = new EventEmitter<Brew>();

  @Input() public isEdit: boolean = false;
  @Input() public isDetail: boolean = false;

  @Input() public baristamode: boolean = false;

  public PREPARATION_DEVICE_TYPE_ENUM = PreparationDeviceType;
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;

  public scaleTimerSubscription: Subscription = undefined;
  public scaleTareSubscription: Subscription = undefined;
  public scaleFlowSubscription: Subscription = undefined;
  public bluetoothSubscription: Subscription = undefined;

  public scaleFlowSecondSubscription: Subscription = undefined;

  public flow_profile_raw: BrewFlow = new BrewFlow();
  public reference_profile_raw: BrewFlow = new BrewFlow();

  public pressureDeviceSubscription: Subscription = undefined;
  public temperatureDeviceSubscription: Subscription = undefined;
  private scaleFlowChangeSubscription: Subscription = undefined;
  private scaleFlowChangeSecondSubscription: Subscription = undefined;
  private scaleListeningSubscription: Subscription = undefined;
  private scaleStartTareListeningSubscription: Subscription = undefined;

  private flowProfileArr = [];
  private flowProfileArrObjs = [];
  private flowProfileArrCalculated = [];
  private flowProfileTempAll = [];
  private flowProfileSecondTempAll = [];

  private flowTime: number = undefined;
  private flowSecondTick: number = 0;
  private flowNCalculation: number = 0;
  private startingFlowTime: number = undefined;

  public traces: any = {};
  public traceReferences: any = {};

  private graphTimerTest: any = undefined;
  private pressureThresholdWasHit: boolean = false;
  private temperatureThresholdWasHit: boolean = false;
  private xeniaOverviewInterval: any = undefined;
  private meticulousInterval: any = undefined;
  private sanremoYOUFetchingInterval: any = undefined;

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

  public textToSpeechWeightInterval: any = undefined;
  public textToSpeechTimerInterval: any = undefined;

  public graphIconColSize: number = 2;

  public espressoJustOneCup: boolean = false;
  public graphUpdateChartTimestamp = 0;
  public graph_threshold_frequency_update_active: boolean = false;
  public graph_frequency_update_interval: number = 150;

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
    private readonly uiGraphStorage: UIGraphStorage,
    private readonly textToSpeech: TextToSpeechService,
    private readonly graphHelper: GraphHelperService,
  ) {}

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
    if (this.settings.text_to_speech_active) {
      this.textToSpeech.readAndSetTTLSettings();
    }
    this.graph_threshold_frequency_update_active =
      this.settings.graph_threshold_frequency_update;
    this.graph_frequency_update_interval =
      this.settings.graph_threshold_frequency_interval;
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
      const prepDeviceType =
        this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType();
      if (
        this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
        (prepDeviceType === PreparationDeviceType.METICULOUS ||
          prepDeviceType === PreparationDeviceType.XENIA ||
          prepDeviceType === PreparationDeviceType.SANREMO_YOU)
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
            this.deattachToTextToSpeedChange();
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
            this.graphIconColSize = this.getGraphIonColSize();
            this.setUIParams();
            this.checkChanges();
          }, 200);
          this.brewComponent?.brewBrewingPreparationDeviceEl?.checkChanges();
          this.brewComponent?.checkChanges();
        });
    }
  }

  public uiSmartScaleConnected: boolean = undefined;
  public uiSmartScaleSupportsTaring: boolean = undefined;
  public uiPressureConnected: boolean = undefined;
  public uiTemperatureConnected: boolean = undefined;
  public uiPreparationDeviceConnected: boolean = undefined;
  public uiPreparationDeviceType: PreparationDeviceType = undefined;
  public uiSmartScaleConnectedSupportsTwoWeights: boolean = undefined;

  private async setUIParams() {
    this.uiSmartScaleConnected = this.smartScaleConnected();
    this.uiPressureConnected = this.pressureDeviceConnected();
    this.uiTemperatureConnected = this.temperatureDeviceConnected();
    this.uiPreparationDeviceConnected =
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected();
    this.uiPreparationDeviceType =
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType();
    this.uiSmartScaleConnectedSupportsTwoWeights =
      this.smartScaleSupportsTwoWeight();
    this.uiSmartScaleSupportsTaring = this.smartScaleSupportsTaring();
  }

  private async readReferenceFlowProfile(_brew: Brew) {
    if (this.platform.is('capacitor')) {
      if (_brew.reference_flow_profile.type !== REFERENCE_GRAPH_TYPE.NONE) {
        let referencePath: string = '';
        const uuid = _brew.reference_flow_profile.uuid;
        let referenceObj: Brew | Graph = null;
        if (
          _brew.reference_flow_profile.type === REFERENCE_GRAPH_TYPE.BREW ||
          _brew.reference_flow_profile.type ===
            REFERENCE_GRAPH_TYPE.IMPORTED_GRAPH
        ) {
          referenceObj = this.uiBrewStorage.getEntryByUUID(uuid);

          if (
            _brew.reference_flow_profile.type ===
            REFERENCE_GRAPH_TYPE.IMPORTED_GRAPH
          ) {
            referencePath = referenceObj.getGraphPath(
              BREW_GRAPH_TYPE.IMPORTED_GRAPH,
            );
          } else {
            referencePath = referenceObj.getGraphPath(BREW_GRAPH_TYPE.BREW);
          }
        } else {
          referenceObj = this.uiGraphStorage.getEntryByUUID(uuid);
          referencePath = referenceObj.getGraphPath();
        }
        if (referenceObj) {
          await this.uiAlert.showLoadingSpinner();
          try {
            const jsonParsed =
              await this.uiFileHelper.readInternalJSONFile(referencePath);
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
    if (!this.platform.is('capacitor')) {
      return true;
    }

    const scale: BluetoothScale = this.bleManager.getScale();
    return !!scale;
  }

  public smartScaleSupportsTwoWeight() {
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale && scale.supportsTwoWeights === true) {
      return true;
    }
    return false;
  }

  public temperatureDeviceConnected() {
    if (!this.platform.is('capacitor')) {
      return true;
    }

    const temperatureDevice: TemperatureDevice =
      this.bleManager.getTemperatureDevice();
    return !!temperatureDevice;
  }

  public pressureDeviceConnected() {
    if (!this.platform.is('capacitor')) {
      return true;
    }

    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    return !!pressureDevice;
  }

  public shallFlowProfileBeHidden(): boolean {
    try {
      if (
        this.uiSmartScaleConnected === true ||
        this.uiTemperatureConnected === true ||
        (this.uiPressureConnected === true &&
          this.brewComponent.choosenPreparation?.style_type ===
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
    return this.data.getPreparation();
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
      return 4;
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
      this.traces.weightTrace.visible = !this.traces.weightTrace.visible;
      if (this.traceReferences.weightTrace) {
        this.traceReferences.weightTrace.visible =
          !this.traceReferences.weightTrace.visible;
      }
    } else if (_type === 'calc_flow') {
      this.traces.flowPerSecondTrace.visible =
        !this.traces.flowPerSecondTrace.visible;
      if (this.traceReferences.flowPerSecondTrace) {
        this.traceReferences.flowPerSecondTrace.visible =
          !this.traceReferences.flowPerSecondTrace.visible;
      }
    } else if (_type === 'realtime_flow') {
      this.traces.realtimeFlowTrace.visible =
        !this.traces.realtimeFlowTrace.visible;
      if (this.traceReferences.realtimeFlowTrace) {
        this.traceReferences.realtimeFlowTrace.visible =
          !this.traceReferences.realtimeFlowTrace.visible;
      }
    } else if (_type === 'pressure') {
      this.traces.pressureTrace.visible = !this.traces.pressureTrace.visible;
      if (this.traceReferences.pressureTrace) {
        this.traceReferences.pressureTrace.visible =
          !this.traceReferences.pressureTrace.visible;
      }
    } else if (_type === 'temperature') {
      this.traces.temperatureTrace.visible =
        !this.traces.temperatureTrace.visible;
      if (this.traceReferences.temperatureTrace) {
        this.traceReferences.temperatureTrace.visible =
          !this.traceReferences.temperatureTrace.visible;
      }
    } else if (_type === 'weightSecond') {
      this.traces.weightTraceSecond.visible =
        !this.traces.weightTraceSecond.visible;
      if (this.traceReferences.weightTraceSecond) {
        this.traceReferences.weightTraceSecond.visible =
          !this.traceReferences.weightTraceSecond.visible;
      }
    } else if (_type === 'realtimeFlowSecond') {
      this.traces.realtimeFlowTraceSecond.visible =
        !this.traces.realtimeFlowTraceSecond.visible;
      if (this.traceReferences.realtimeFlowTraceSecond) {
        this.traceReferences.realtimeFlowTraceSecond.visible =
          !this.traceReferences.realtimeFlowTraceSecond.visible;
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
      this.graphIconColSize = this.getGraphIonColSize();
      this.setUIParams();
      try {
        Plotly.purge(this.profileDiv.nativeElement);
      } catch (ex) {}
      this.graphSettings = this.uiHelper.cloneData(this.settings.graph.FILTER);
      if (
        this.data.getPreparation().style_type ===
        PREPARATION_STYLE_TYPE.ESPRESSO
      ) {
        this.graphSettings = this.uiHelper.cloneData(
          this.settings.graph.ESPRESSO,
        );
      }
      // Put the reference charts first, because they can then get overlayed from the other graphs
      this.chartData = [];

      this.__setupReferenceGraphs();
      this.__setupGraphs();

      this.graphHelper.fillDataIntoTraces(
        this.reference_profile_raw,
        this.traceReferences,
      );
      this.graphHelper.fillDataIntoTraces(this.flow_profile_raw, this.traces);

      if (
        this.traceReferences.weightTrace &&
        this.traceReferences.weightTrace.x?.length > 0
      ) {
        this.chartData.push(this.traceReferences.weightTrace);
        this.chartData.push(this.traceReferences.flowPerSecondTrace);
        this.chartData.push(this.traceReferences.realtimeFlowTrace);
      }

      const pressureDevice = this.bleManager.getPressureDevice();
      if (
        ((pressureDevice != null &&
          this.getPreparation().style_type ===
            PREPARATION_STYLE_TYPE.ESPRESSO) ||
          this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() ||
          !this.platform.is('capacitor')) &&
        this.traceReferences.pressureTrace &&
        this.traceReferences.pressureTrace.x?.length > 0
      ) {
        this.chartData.push(this.traceReferences.pressureTrace);
      }
      const temperatureDevice = this.bleManager.getTemperatureDevice();
      if (
        (temperatureDevice != null ||
          this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() ||
          !this.platform.is('capacitor')) &&
        this.traceReferences.temperatureTrace &&
        this.traceReferences.temperatureTrace.x?.length > 0
      ) {
        this.chartData.push(this.traceReferences.temperatureTrace);
      }

      this.chartData.push(this.traces.weightTrace);
      this.chartData.push(this.traces.flowPerSecondTrace);
      this.chartData.push(this.traces.realtimeFlowTrace);

      this.lastChartLayout = this.getChartLayout();

      if (this.lastChartLayout['yaxisWeightSecond']) {
        this.chartData.push(this.traces.weightTraceSecond);
        this.chartData.push(this.traces.realtimeFlowTraceSecond);
      }
      if (this.lastChartLayout['yaxis4']) {
        this.chartData.push(this.traces.pressureTrace);
      }

      if (this.lastChartLayout['yaxis5']) {
        this.chartData.push(this.traces.temperatureTrace);
      }

      try {
        Plotly.newPlot(
          this.profileDiv.nativeElement,
          this.chartData,
          this.lastChartLayout,
          this.getChartConfig(),
        );

        setTimeout(() => {
          /** On big tablets, the chart is not resized, so trigger the resize event**/
          window.dispatchEvent(new Event('resize'));
          //Do this after the plot.
          if (
            this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected()
          ) {
            if (
              this.brewComponent?.brewBrewingPreparationDeviceEl?.hasTargetWeightActive()
            ) {
              this.drawTargetWeight(
                this.brewComponent?.brewBrewingPreparationDeviceEl?.getTargetWeight(),
              );
            }
          }
        }, 50);

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
            this.updateChart(true);
          }
        }, 250);
      } catch (ex) {}
    }, timeout);
  }

  private __setupGraphs() {
    this.traces = this.graphHelper.initializeTraces();
    this.traces = this.graphHelper.fillTraces(
      this.traces,
      this.graphSettings,
      this.isDetail,
    );
  }

  private __setupReferenceGraphs() {
    this.traceReferences = this.graphHelper.initializeTraces();
    this.traceReferences = this.graphHelper.fillTraces(
      this.traceReferences,
      this.graphSettings,
      this.isDetail,
      true,
    );
  }

  private getChartLayout() {
    let chartWidth: number = 300;
    try {
      chartWidth = this.canvaContainer.nativeElement.offsetWidth;
    } catch (ex) {}
    const chartHeight: number = 150;

    const layout = this.graphHelper.getChartLayout(
      this.traces,
      this.getPreparation().style_type,
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected(),
      this.brewComponent.maximizeFlowGraphIsShown,
      this.isDetail,
      chartWidth,
      chartHeight,
    );

    return layout;
  }

  public drawTargetWeight(_targetWeight: number) {
    /**We disabled this function right now, sadly it does performance-harm, you can't toggle buttons anymore in a performant way**/
    return;
    if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.SANREMO_YOU ||
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.XENIA
    ) {
      if (!('shapes' in this.lastChartLayout)) {
        this.lastChartLayout['shapes'] = [];
      }
      let didWeAlreadyHaveAshape: boolean = false;
      for (const [index, shape] of this.lastChartLayout['shapes'].entries()) {
        if (shape['customId'] === 'targetWeightLine') {
          if (_targetWeight > 0) {
            //We have already one shape.
            shape['y0'] = _targetWeight;
            shape['y1'] = _targetWeight;
          } else {
            this.lastChartLayout['shapes'].splice(index, 1);
          }
          didWeAlreadyHaveAshape = true;

          break;
        }
      }
      if (didWeAlreadyHaveAshape === false && _targetWeight > 0) {
        this.lastChartLayout['shapes'].push({
          type: 'line',
          x0: 0, // Anfang der x-Achse (in Bezug auf die Daten)
          x1: 1, // Ende der x-Achse (1 = 100% der Breite)
          y0: _targetWeight, // Y-Position der Linie (auf der Datenachse)
          y1: _targetWeight, // gleiche Y-Position, um eine horizontale Linie zu erzeugen
          xref: 'paper', // Verweise auf das gesamte Diagramm (nicht nur den Datenbereich)
          yref: 'y', // Y-Achse bezieht sich auf den Datenwert
          line: {
            color: 'rgb(193, 160, 80)',
            width: 2,
            dash: 'dot', // Stil der Linie (optional)
          },
          customId: 'targetWeightLine',
        });
      }

      Plotly.relayout(this.profileDiv.nativeElement, this.lastChartLayout);
    }
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

      const pressureDevice: PressureDevice =
        this.bleManager.getPressureDevice();
      if (!_firstStart) {
        /** IF we're a PRS or Bookoo-device we stop the transmission and start it after 300ms again **/
        await pressureDevice.disableValueTransmission();
        await sleep(300);
      }
      if (_firstStart) {
        if (pressureDevice) {
          pressureDevice.updateZero();
        }
      }
      pressureDevice?.enableValueTransmission();
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
                    true,
                  )
                  .then(
                    () => {
                      this.brewComponent.timer.reset();
                      this.checkChanges();
                    },
                    () => {},
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
        2,
      );
    } catch (ex) {
      return 0;
    }
  }

  public getActualSmoothedWeightSecondPerSecond(): number {
    try {
      return this.uiHelper.toFixedIfNecessary(
        this.flow_profile_raw.realtimeFlowSecond[
          this.flow_profile_raw.realtimeFlowSecond.length - 1
        ].flow_value,
        2,
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
        1,
      );
    } catch (ex) {
      return 0;
    }
  }

  public getActualScaleSecondWeight() {
    try {
      return this.uiHelper.toFixedIfNecessary(
        this.bleManager.getScale().getSecondWeight(),
        1,
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
        const ratioEl = this.smartScaleBrewRatio?.nativeElement;
        if (ratioEl) {
          ratioEl.textContent = '(' + this.data.getBrewRatio() + ')';
        }
      } catch (ex) {}
    });
  }

  public setActualSmartSecondInformation(_weight: number = null) {
    this.ngZone.runOutsideAngular(() => {
      let actualScaleWeight = this.getActualScaleSecondWeight();

      if (_weight !== null) {
        actualScaleWeight = _weight;
      }
      const actualSmoothedWeightPerSecond =
        this.getActualSmoothedWeightSecondPerSecond();
      if (this.brewComponent.maximizeFlowGraphIsShown === true) {
        this.brewComponent.brewFlowGraphSecondSubject.next({
          scaleWeight: actualScaleWeight,
          smoothedWeight: actualSmoothedWeightPerSecond,
        });
      }

      try {
        const weightEl = this.smartScaleSecondWeightEl.nativeElement;
        weightEl.textContent = actualScaleWeight + ' g';
        const flowEl = this.smartScaleWeightSecondPerSecondEl.nativeElement;
        flowEl.textContent = actualSmoothedWeightPerSecond + ' g/s';
      } catch (ex) {}
    });
  }

  public updateChart(_force: boolean = false) {
    /**
     * This solution is specially for very poor performing devices.
     */
    if (this.graph_threshold_frequency_update_active === true) {
      if (_force === true) {
        //ignore this call, and just update the chart timestamp
      } else {
        if (
          Date.now() - this.graphUpdateChartTimestamp <
          this.graph_frequency_update_interval
        ) {
          return;
        }
      }

      this.graphUpdateChartTimestamp = Date.now();
    }
    this.ngZone.runOutsideAngular(() => {
      try {
        const xData = [[]];
        const yData = [[]];
        const tracesData = [0];

        Plotly.extendTraces(
          this.profileDiv.nativeElement,
          {
            x: xData,
            y: yData,
          },
          tracesData,
        );

        if (
          (this.brewComponent?.timer?.isTimerRunning() === true ||
            this.data.brew_time === 0) &&
          this.isDetail === false
        ) {
          setTimeout(() => {
            const prepStyle = this.brewComponent.choosenPreparation.style_type;
            let newLayoutIsNeeded: boolean = false;
            /**Timeout is needed, because on mobile devices, the trace and the relayout bothers each other, which results into not refreshing the graph*/
            let newRenderingInstance = 0;

            let normalScreenTime: number;
            let fullScreenTime: number;
            if (prepStyle === PREPARATION_STYLE_TYPE.ESPRESSO) {
              normalScreenTime =
                this.settings.graph_time.ESPRESSO.NORMAL_SCREEN;
              fullScreenTime = this.settings.graph_time.ESPRESSO.FULL_SCREEN;
            } else {
              normalScreenTime = this.settings.graph_time.FILTER.NORMAL_SCREEN;
              fullScreenTime = this.settings.graph_time.FILTER.FULL_SCREEN;
            }

            if (this.brewComponent.maximizeFlowGraphIsShown === true) {
              newRenderingInstance = Math.floor(
                this.brewComponent.timer.getSeconds() / fullScreenTime,
              );
            } else {
              newRenderingInstance = Math.floor(
                this.brewComponent.timer.getSeconds() / normalScreenTime,
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
                  this.brewComponent.timer.getSeconds() - subtractTime,
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

            if (this.traces.weightTrace.y.length > 0) {
              const lastWeightData: number =
                this.traces.weightTrace.y[this.traces.weightTrace.y.length - 1];
              // add some tolerance
              let toleranceMinus = 10;
              if (prepStyle === PREPARATION_STYLE_TYPE.ESPRESSO) {
                toleranceMinus = 1;
              }
              if (
                lastWeightData >=
                this.lastChartLayout.yaxis.range[1] - toleranceMinus
              ) {
                // Scale a bit up
                if (prepStyle === PREPARATION_STYLE_TYPE.ESPRESSO) {
                  this.lastChartLayout.yaxis.range[1] = lastWeightData * 1.25;
                } else {
                  this.lastChartLayout.yaxis.range[1] = lastWeightData * 1.5;
                }

                newLayoutIsNeeded = true;
              }
            }
            if (this.traces.realtimeFlowTrace.y.length > 0) {
              const lastRealtimeFlowVal: number =
                this.traces.realtimeFlowTrace.y[
                  this.traces.realtimeFlowTrace.y.length - 1
                ];
              // add some tolerance
              let toleranceMinus = 3;
              if (prepStyle === PREPARATION_STYLE_TYPE.ESPRESSO) {
                toleranceMinus = 0.5;
              }

              if (
                lastRealtimeFlowVal >=
                this.lastChartLayout.yaxis2.range[1] - toleranceMinus
              ) {
                // Scale a bit up
                if (prepStyle === PREPARATION_STYLE_TYPE.ESPRESSO) {
                  this.lastChartLayout.yaxis2.range[1] =
                    lastRealtimeFlowVal * 1.25;
                } else {
                  this.lastChartLayout.yaxis2.range[1] =
                    lastRealtimeFlowVal * 1.5;
                }
                newLayoutIsNeeded = true;
              }
            }
            if (this.traces.pressureTrace?.y?.length > 0) {
              // #783
              const lastPressureData: number =
                this.traces.pressureTrace.y[
                  this.traces.pressureTrace.y.length - 1
                ];
              if (lastPressureData > this.lastChartLayout.yaxis4.range[1]) {
                this.lastChartLayout.yaxis4.range[1] = Math.ceil(
                  lastPressureData + 1,
                );
                newLayoutIsNeeded = true;
              }
            }

            if (newLayoutIsNeeded) {
              Plotly.relayout(
                this.profileDiv.nativeElement,
                this.lastChartLayout,
              );
            }
          }, 25);
        } else {
          // Not needed anymore
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

      const deviceType =
        this.brewComponent?.brewBrewingPreparationDeviceEl?.getDataPreparationDeviceType();
      if (deviceType === PreparationDeviceType.XENIA) {
        this.stopFetchingDataFromSanremoYOU();
      } else if (deviceType === PreparationDeviceType.METICULOUS) {
        this.stopFetchingDataFromMeticulous();
      } else if (deviceType === PreparationDeviceType.SANREMO_YOU) {
        this.stopFetchingDataFromSanremoYOU();

        if (
          this.data.preparationDeviceBrew.params.selectedMode ===
          SanremoYOUMode.LISTENING_AND_CONTROLLING
        ) {
          this.startFetchingDataFromSanremoYOU();
        }
      }
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
        this.deattachToTextToSpeedChange();
        // 551 - Always attach to flow change, even when reset is triggerd
        this.attachToFlowChange();
      }

      if (pressureDevice) {
        /**for the PRS and the bookoo, we maybe just resetted the timer,
         *  because of preset, and we still want that the values keep sending,
         *  therefore we don't use disableValueTransmission here
         *  pressureDevice.disableValueTransmission();
         *  **/

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
      this.flowProfileSecondTempAll = [];
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
      this.flowProfileSecondTempAll = [];
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
        this.deattachToTextToSpeedChange();
        if (this.settings.text_to_speech_active) {
          this.textToSpeech.speak(
            this.translate.instant('TEXT_TO_SPEECH.BREW_ENDED'),
            true,
          );
        }
      }
      if (pressureDevice) {
        this.deattachToPressureChange();
      }
      if (temperatureDevice) {
        this.deattachToTemperatureChange();
      }
      this.updateChart(true);
    }

    // If machineStopScriptWasTriggered would be true, we would already hit the weight mark, and therefore the stop was fired, and we don't fire it twice.
    if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.XENIA &&
      this.machineStopScriptWasTriggered === false
    ) {
      this.machineStopScriptWasTriggered = true;
      // If the event is not xenia, we pressed buttons, if the event was triggerd by xenia, timer already stopped.
      // If we press pause, stop scripts.
      this.uiLog.log(`Xenia Script - Pause button pressed, stop script`);
      const prepDeviceCall: XeniaDevice = this.brewComponent
        ?.brewBrewingPreparationDeviceEl?.preparationDevice as XeniaDevice;
      prepDeviceCall.stopScript().catch((_msg) => {
        this.uiToast.showInfoToast(
          'We could not stop script - manual triggered: ' + _msg,
          false,
        );
        this.uiLog.log('We could not stop script - manual triggered: ' + _msg);
      });
      this.writeExecutionTimeToNotes(
        'Stop script (Pause button)',
        0,
        this.translate.instant(
          'PREPARATION_DEVICE.TYPE_XENIA.SCRIPT_LIST_GENERAL_STOP',
        ),
      );
      this.stopFetchingAndSettingDataFromXenia();
    }
    if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.SANREMO_YOU &&
      _event !== 'sanremo_you' &&
      _event !== 'shot_ended' &&
      this.machineStopScriptWasTriggered === false &&
      this.data.preparationDeviceBrew.params.selectedMode !==
        SanremoYOUMode.LISTENING
    ) {
      //User pressed the pause button, or the stopAtWeight is bigger then 0
      this.machineStopScriptWasTriggered = true;
      this.uiLog.log(`Sanremo YOU - Pause button pressed, stop shot`);
      const prepDeviceCall: SanremoYOUDevice = this.brewComponent
        ?.brewBrewingPreparationDeviceEl?.preparationDevice as SanremoYOUDevice;
      prepDeviceCall.stopActualShot();
      this.stopFetchingDataFromSanremoYOU();
    }

    if (
      this.baristamode === true &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.SANREMO_YOU
    ) {
      setTimeout(() => {
        this.brewComponent.timer.reset();
      }, 1000);
    }

    if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.METICULOUS &&
      _event !== 'meticulous'
    ) {
      this.stopFetchingDataFromMeticulous();
    }

    if (!this.platform.is('capacitor')) {
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

      this.updateChart(true);

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

  /**Called from the preparation device**/
  public sanremoYOUModeSelected() {
    if (
      this.data.preparationDeviceBrew?.params.selectedMode ===
      SanremoYOUMode.LISTENING_AND_CONTROLLING
    ) {
      this.startFetchingDataFromSanremoYOU();
    }
  }

  public startFetchingDataFromSanremoYOU() {
    const prepDeviceCall: SanremoYOUDevice = this.brewComponent
      .brewBrewingPreparationDeviceEl.preparationDevice as SanremoYOUDevice;

    this.stopFetchingDataFromSanremoYOU();

    /**const setSanremoData = () => {
      this.ngZone.runOutsideAngular(() => {
        const temp = prepDeviceCall.getTemperature();
        const press = prepDeviceCall.getPressure();
        this.__setPressureFlow({ actual: press, old: press });
        this.__setTemperatureFlow({ actual: temp, old: temp });
      });
    };**/

    let hasShotStarted: boolean = false;
    prepDeviceCall.connectToSocket().then((_connected) => {
      if (_connected) {
        this.ngZone.runOutsideAngular(() => {
          this.sanremoYOUFetchingInterval = setInterval(() => {
            const shotData: SanremoShotData =
              prepDeviceCall.getActualShotData();

            if (shotData.groupStatus > 4) {
              //Ignore everything above 4
              /**
               * 1 = p1
               * 2 = p2
               * 3 = p3
               * 4 = m
               * 5 = purge
               * 6 = paddeling
               */
              return;
            }
            if (shotData.statusPhase != 0 && hasShotStarted === false) {
              this.uiAlert.hideLoadingSpinner();
              this.uiToast.showInfoToast(
                'PREPARATION_DEVICE.TYPE_SANREMO_YOU.SHOT_STARTED',
              );
              hasShotStarted = true;
              this.startingFlowTime = Date.now();
              // IF brewtime has some seconds, we add this to the delay directly.
              this.data.brew_time = 0;
              this.data.brew_time_milliseconds = 0;

              this.data.coffee_first_drip_time = 0;
              this.data.coffee_first_drip_time_milliseconds = 0;
              this.data.coffee_blooming_time = 0;
              this.data.coffee_blooming_time_milliseconds = 0;
              if (this.baristamode === true) {
                this.timerStarted('sanremo_barista_mode');
              }
              this.brewComponent.timer.initTimer(false);
              this.brewComponent.timer.startTimer(false, false);

              this.lastChartRenderingInstance = -1;
              this.updateChart();
              this.changeDetectorRef.detectChanges();
            } else if (shotData.statusPhase == 0 && hasShotStarted === true) {
              //The shot has been finished
              const smartScaleConnected: boolean = this.smartScaleConnected();
              if (this.baristamode && smartScaleConnected === false) {
                //If the barista mode is running and a smartscale is not connected, the timer would run endless, so we stop if there is no smart scale connected at all.
                this.brewComponent.timer.pauseTimer('sanremo_you');
                this.stopFetchingDataFromSanremoYOU();
                this.updateChart();
                this.uiToast.showInfoToast(
                  'PREPARATION_DEVICE.TYPE_METICULOUS.SHOT_ENDED',
                );
                return;
              } else if (this.baristamode) {
                if (this.brewComponent.timer.isTimerRunning() === true) {
                  if (
                    this.traces.weightTrace.y.length > 40 &&
                    ((this.traces.weightTrace.y[
                      this.traces.weightTrace.y.length - 1
                    ] >= 0 &&
                      this.traces.weightTrace.y[
                        this.traces.weightTrace.y.length - 1
                      ] <= 0.5) ||
                      this.traces.weightTrace.y[
                        this.traces.weightTrace.y.length - 1
                      ] <= -2)
                  ) {
                    //Something happend, we tared... so we stop the timer
                    this.brewComponent.timer.pauseTimer('sanremo_you');
                    this.stopFetchingDataFromSanremoYOU();
                    this.updateChart();
                    return;
                  }
                }
              }
            }

            if (hasShotStarted) {
              const temp = prepDeviceCall.getActualShotData().tempBoilerCoffe;
              const press = prepDeviceCall.getActualShotData().pumpPress;
              this.__setPressureFlow({ actual: press, old: press });
              this.__setTemperatureFlow({ actual: temp, old: temp });
            }
          }, 100);
        });
      }
    });

    /**
     * This doesn't need to be awaited, we get the data from the device when it happens.
     * When we would await it we would maybe build in very big lag potential
     */
    /**prepDeviceCall.fetchRuntimeData(() => {
      // before we start the interval, we fetch the data once to overwrite, and set them.
      setSanremoData();
    });**/

    /**this.ngZone.runOutsideAngular(() => {
      this.sanremoYOUFetchingInterval = setInterval(async () => {
        try {
          //const apiThirdCallDelayStart = moment(); // create a moment with the current time
          //let apiDelayEnd;

          // We don't use the callback function to make sure we don't have to many performance issues
          prepDeviceCall.fetchRuntimeData(() => {
            //apiDelayEnd = moment();

            //before we start the interval, we fetch the data once to overwrite, and set them.
            //const delta = apiDelayEnd.diff(apiThirdCallDelayStart, 'milliseconds'); // get the millisecond difference
            //console.log(delta);
            setSanremoData();
          });
        } catch (ex) {}
      }, 250);
    });**/
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
            'Profile is loaded, shot is starting soon',
          );
          let lastState = '';
          this.meticulousInterval = setInterval(() => {
            const shotData: MeticulousShotData =
              prepDeviceCall.getActualShotData();

            if (shotData.extracting === true && hasShotStarted === false) {
              this.uiAlert.hideLoadingSpinner();
              this.uiToast.showInfoToast(
                'PREPARATION_DEVICE.TYPE_METICULOUS.SHOT_STARTED',
              );
              hasShotStarted = true;
              this.startingFlowTime = Date.now();
              // IF brewtime has some seconds, we add this to the delay directly.
              this.data.brew_time = 0;
              this.data.brew_time_milliseconds = 0;

              this.data.coffee_first_drip_time = 0;
              this.data.coffee_first_drip_time_milliseconds = 0;
              this.data.coffee_blooming_time = 0;
              this.data.coffee_blooming_time_milliseconds = 0;

              this.brewComponent.timer.initTimer(false);
              this.brewComponent.timer.startTimer(false, false);
              this.lastChartRenderingInstance = -1;
              this.updateChart();
            } else if (
              shotData.extracting === false &&
              hasShotStarted === true
            ) {
              hasShotStarted = false;

              this.brewComponent.timer.pauseTimer('meticulous');
              this.stopFetchingDataFromMeticulous();
              this.updateChart();
              this.uiToast.showInfoToast(
                'PREPARATION_DEVICE.TYPE_METICULOUS.SHOT_ENDED',
              );
              return;
            }
            if (hasShotStarted) {
              this.__setPressureFlow({
                actual: shotData.pressure,
                old: shotData.pressure,
              });

              /** this.__setTemperatureFlow({
                actual: shotData.temperature,
                old: shotData.temperature,
              });**/

              this.__setFlowProfile({
                actual: shotData.weight,
                old: shotData.oldWeight,
                smoothed: shotData.smoothedWeight,
                oldSmoothed: shotData.oldSmoothedWeight,
              });

              //this.__setMachineWeightFlow({ actual: shotData.weight, old: shotData.weight,smoothed:100,oldSmoothed:100 });
              //this.__setMachineWaterFlow({ actual: shotData.flow, old: shotData.flow });

              this.setActualSmartInformation(shotData.weight);

              // We have found a written weight which is above 5 grams at least
              this.__setScaleWeight(shotData.weight, false, false);
            }
            lastState = shotData.status;
          }, 100);
        }
      },
      () => {
        //Should never trigger
      },
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
    /**
     * This doesn't need to be awaited, we get the data from the device when it happens.
     * When we would await it we would maybe build in very big lag potential
     */
    prepDeviceCall.fetchPressureAndTemperature(() => {
      // before we start the interval, we fetch the data once to overwrite, and set them.
      setTempAndPressure();
    });
    setTimeout(() => {
      // Give the machine some time :)
      // After discussion with Holger we set this to 1s to give the machine more time
      prepDeviceCall.fetchAndSetDeviceTemperature(() => {
        try {
          const temp = prepDeviceCall.getDevicetemperature();
          if (temp > 70) {
            this.data.brew_temperature = this.uiHelper.toFixedIfNecessary(
              temp,
              2,
            );
          }
        } catch (ex) {}
      });
    }, 2500);

    this.ngZone.runOutsideAngular(() => {
      this.xeniaOverviewInterval = setInterval(async () => {
        try {
          // We don't use the callback function to make sure we don't have to many performance issues
          prepDeviceCall.fetchPressureAndTemperature(() => {
            //before we start the interval, we fetch the data once to overwrite, and set them.
            setTempAndPressure();
          });
        } catch (ex) {}
      }, 500);
    });
  }

  public stopFetchingAndSettingDataFromXenia() {
    if (this.xeniaOverviewInterval !== undefined) {
      clearInterval(this.xeniaOverviewInterval);
      this.xeniaOverviewInterval = undefined;
    }
  }

  public stopFetchingDataFromSanremoYOU() {
    if (this.sanremoYOUFetchingInterval !== undefined) {
      clearInterval(this.sanremoYOUFetchingInterval);
      this.sanremoYOUFetchingInterval = undefined;
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
          if (scale && scale.getWeight() !== 0) {
            await new Promise(async (resolve) => {
              await this.uiAlert.showLoadingSpinner();
              await new Promise((_internalResolve) => {
                scale.tare();
                setTimeout(async () => {
                  _internalResolve(undefined);
                }, this.settings.bluetooth_command_delay);
              });
              let minimumWeightNullReports = 0;
              let weightReports = 0;
              this.deattachToScaleStartTareListening();
              this.scaleStartTareListeningSubscription =
                scale.flowChange.subscribe((_val) => {
                  const weight: number = this.uiHelper.toFixedIfNecessary(
                    _val.actual,
                    1,
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
          }
          this.brewComponent.checkChanges();
          this.checkChanges();
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
    if (!this.platform.is('capacitor')) {
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
      this.ngZone.runOutsideAngular(() => {
        this.graphTimerTest = setInterval(() => {
          flow = Math.floor(
            (crypto.getRandomValues(new Uint8Array(1))[0] / Math.pow(2, 8)) *
              11,
          );
          realtime_flow = Math.floor(
            (crypto.getRandomValues(new Uint8Array(1))[0] / Math.pow(2, 8)) *
              11,
          );
          weight = weight + genRand(0.1, 2, 2);
          pressure = Math.floor(
            (crypto.getRandomValues(new Uint8Array(1))[0] / Math.pow(2, 8)) *
              16,
          );
          temperature = Math.floor(
            (crypto.getRandomValues(new Uint8Array(1))[0] / Math.pow(2, 8)) *
              90,
          );
          if (this.settings.text_to_speech_active) {
            this.textToSpeech.speak(weight.toString());
          }

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
      });
    }

    if (scale || pressureDevice || temperatureDevice) {
      this.lastChartRenderingInstance = -1;
      if (
        this.settings.bluetooth_scale_maximize_on_start_timer === true &&
        this.brewComponent.maximizeFlowGraphIsShown === false
      ) {
        // If maximizeFlowGraphIsShown===true, we already started once and resetted, don't show overlay again
        // First maximize, then go on with the timer, else it will lag hard.

        if (!this.baristamode) {
          //Just show overlay if not in barista mode
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
      }

      if (scale) {
        /** We don't need any delay here anymore, because all taring action was already done before, so just trigger the start
         * This will also reduce the issue that the DiFluid reports the Start and we don't attach anymore to changes.
         * **/
        scale.setTimer(SCALE_TIMER_COMMAND.START);
      }

      if (
        pressureDevice &&
        this.settings.pressure_threshold_active === false &&
        _event !== 'AUTO_LISTEN_SCALE'
      ) {
        // Just update to zero if there is no threshold active
        pressureDevice.updateZero();
      }
      if (pressureDevice) {
        /**We don't need the enableValueTransmission here, because we do it on the connect pressure, more reliable**/
        //pressureDevice.enableValueTransmission();
      }

      this.startingFlowTime = Date.now();

      this.updateChart();

      if (scale) {
        this.attachToScaleWeightChange();
        this.attachToFlowChange();
        this.attachToTextToSpeechChange();

        if (this.settings.text_to_speech_active) {
          this.textToSpeech.speak(
            this.translate.instant('TEXT_TO_SPEECH.BREW_STARTED'),
          );
        }
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
              false,
            );
          });

        setTimeout(() => {
          prepDeviceCall.getOverview().then(
            (_jsonResp: any) => {
              this.uiLog.log(
                'Check of xenia answer if script started MA_STATUS: ' +
                  _jsonResp.MA_Status,
              );
              if (_jsonResp.MA_STATUS === 3) {
                //Great we started.
              } else {
                //Oh no... lets try it again
                this.uiToast.showInfoToast(
                  'We tried to start the xenia script again',
                );
                prepDeviceCall
                  .startScript(
                    this.data.preparationDeviceBrew.params.scriptStartId,
                  )
                  .catch((_msg) => {
                    this.uiLog.log('We could not start script: ' + _msg);
                    this.uiToast.showInfoToast(
                      'We could not start script - second try: ' + _msg,
                      false,
                    );
                  });
                try {
                  this.writeExecutionTimeToNotes(
                    'Start script - again',
                    this.data.preparationDeviceBrew.params.scriptStartId,
                    this.getScriptName(
                      this.data.preparationDeviceBrew.params.scriptStartId,
                    ),
                  );
                } catch (ex) {}
              }
            },
            () => {
              //Error... ignore
            },
          );
        }, 2000);
        this.writeExecutionTimeToNotes(
          'Start script',
          this.data.preparationDeviceBrew.params.scriptStartId,
          this.getScriptName(
            this.data.preparationDeviceBrew.params.scriptStartId,
          ),
        );
      }
      this.startFetchingAndSettingDataFromXenia();
    } else if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.METICULOUS
    ) {
      const prepDeviceCall: MeticulousDevice = this.brewComponent
        .brewBrewingPreparationDeviceEl.preparationDevice as MeticulousDevice;

      if (this.data.preparationDeviceBrew.params.chosenProfileId !== '') {
        this.uiLog.log(
          `A Meticulous profile was choosen, execute it - ${this.data.preparationDeviceBrew.params.chosenProfileId}`,
        );
        await prepDeviceCall.loadProfileByID(
          this.data.preparationDeviceBrew.params.chosenProfileId,
        );
        await prepDeviceCall.startExecute();
      } else {
        this.uiLog.log(
          'No Meticulous profile was selected, just listen for the start',
        );
      }

      if (
        this.settings.bluetooth_scale_maximize_on_start_timer === true &&
        this.brewComponent.maximizeFlowGraphIsShown === false &&
        !this.baristamode
      ) {
        this.brewComponent.maximizeFlowGraph();
      }

      this.startFetchingDataFromMeticulous();
    } else if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.SANREMO_YOU
    ) {
      const prepDeviceCall: SanremoYOUDevice = this.brewComponent
        .brewBrewingPreparationDeviceEl.preparationDevice as SanremoYOUDevice;

      if (
        this.data.preparationDeviceBrew?.params.selectedMode !==
          SanremoYOUMode.LISTENING &&
        this.data.preparationDeviceBrew?.params.selectedMode !==
          SanremoYOUMode.LISTENING_AND_CONTROLLING
      ) {
        prepDeviceCall
          .startShot(this.data.preparationDeviceBrew?.params.selectedMode)
          .catch((_msg) => {
            this.uiLog.log('We could not start shot on sanremo: ' + _msg);
            this.uiToast.showInfoToast(
              'We could not start shot on sanremo: ' + _msg,
              false,
            );
          });
      }

      if (
        this.settings.bluetooth_scale_maximize_on_start_timer === true &&
        this.brewComponent.maximizeFlowGraphIsShown === false &&
        !this.baristamode
      ) {
        this.brewComponent.maximizeFlowGraph();
      }

      if (this.baristamode === false) {
        this.startFetchingDataFromSanremoYOU();
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

      if (scale.getScaleType() === ScaleType.VARIA_AKU) {
        //#878 When we start listening to the varia scale, somehow the tare is to slow/sensetive, and the timer directly starts when starting to listening.
        await new Promise((resolve) => {
          setTimeout(async () => {
            resolve(undefined);
          }, this.settings.bluetooth_command_delay + 500);
        });
      }

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
    if (this.scaleFlowSecondSubscription) {
      this.scaleFlowSecondSubscription.unsubscribe();
      this.scaleFlowSecondSubscription = undefined;
    }
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale) {
      scale.setDoubleWeight(false);
    }
  }

  public deattachToFlowChange() {
    if (this.scaleFlowChangeSubscription) {
      this.scaleFlowChangeSubscription.unsubscribe();
      this.scaleFlowChangeSubscription = undefined;
    }
    if (this.scaleFlowChangeSecondSubscription) {
      this.scaleFlowChangeSecondSubscription.unsubscribe();
      this.scaleFlowChangeSecondSubscription = undefined;
    }
  }

  public deattachToTextToSpeedChange() {
    if (this.textToSpeechWeightInterval) {
      clearInterval(this.textToSpeechWeightInterval);
      this.textToSpeechWeightInterval = undefined;
    }
    if (this.textToSpeechTimerInterval) {
      clearInterval(this.textToSpeechTimerInterval);
      this.textToSpeechTimerInterval = undefined;
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

      const isEspressoBrew: boolean =
        this.data.getPreparation().style_type ===
        PREPARATION_STYLE_TYPE.ESPRESSO;
      if (scale.supportsTwoWeights === true && isEspressoBrew === false) {
        this.scaleFlowChangeSecondSubscription =
          scale.flowSecondChange.subscribe((_val) => {
            this.setActualSmartSecondInformation();
          });
      }

      /** on iPad and connecting an acaia lunar 2021, the popup was display always, even so after it had values after 3 seconds
       * thats why we update to 4 seconds
       * **/
      setTimeout(() => {
        if (
          didWeReceiveAnyFlow === false &&
          this.brewComponent.timer.isTimerRunning() === false
        ) {
          this.uiAlert.showMessage(
            'SMART_SCALE_DID_NOT_SEND_ANY_WEIGHT_DESCRIPTION',
            'SMART_SCALE_DID_NOT_SEND_ANY_WEIGHT_TITLE',
            undefined,
            true,
          );
        }
      }, 4000);
    }
  }

  public attachToTextToSpeechChange() {
    this.deattachToTextToSpeedChange();
    if (this.settings.text_to_speech_active === true) {
      const isEspressoBrew: boolean =
        this.data.getPreparation().style_type ===
        PREPARATION_STYLE_TYPE.ESPRESSO;
      this.ngZone.runOutsideAngular(() => {
        this.textToSpeechWeightInterval = setInterval(() => {
          if (this.flowProfileTempAll.length > 0) {
            const actualScaleWeight =
              this.flowProfileTempAll.slice(-1)[0].weight;
            if (actualScaleWeight !== null && actualScaleWeight !== undefined) {
              if (isEspressoBrew) {
                this.textToSpeech.speak(
                  this.uiHelper
                    .toFixedIfNecessary(actualScaleWeight, 1)
                    .toString(),
                );
              } else {
                this.textToSpeech.speak(
                  this.uiHelper
                    .toFixedIfNecessary(actualScaleWeight, 0)
                    .toString(),
                );
              }
            }
          }
        }, this.settings.text_to_speech_interval_rate);
        this.textToSpeechTimerInterval = setInterval(() => {
          this.textToSpeech.speak(
            this.translate.instant('TEXT_TO_SPEECH.TIME') +
              ' ' +
              this.data.brew_time,
          );
        }, 5000);
      });
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
              this.ngZone.run(async () => {
                if (
                  this.settings.bluetooth_scale_tare_on_start_timer === true
                ) {
                  try {
                    const scale: BluetoothScale = this.bleManager.getScale();
                    if (scale) {
                      if (scale.getWeight() !== 0) {
                        //Just tare if the scale is not zero yet.
                        scale.tare();
                      }
                    }
                  } catch (ex) {}
                }
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
        },
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
              this.ngZone.run(async () => {
                if (
                  this.settings.bluetooth_scale_tare_on_start_timer === true
                ) {
                  try {
                    const scale: BluetoothScale = this.bleManager.getScale();
                    if (scale && scale.getWeight() !== 0) {
                      await new Promise((resolve) => {
                        scale.tare();
                        setTimeout(async () => {
                          resolve(undefined);
                        }, this.settings.bluetooth_command_delay);
                      });
                    }
                  } catch (ex) {}
                }
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

  private mutateWeightAndSeeAnomalys(
    _scaleChange: any,
    _scale: BluetoothScale,
    _styleType: PREPARATION_STYLE_TYPE,
  ) {
    let weight: number = this.uiHelper.toFixedIfNecessary(
      _scaleChange.actual,
      1,
    );
    let oldWeight: number = this.uiHelper.toFixedIfNecessary(
      _scaleChange.old,
      1,
    );
    let smoothedWeight: number = this.uiHelper.toFixedIfNecessary(
      _scaleChange.smoothed,
      1,
    );
    let oldSmoothedWeight: number = this.uiHelper.toFixedIfNecessary(
      _scaleChange.oldSmoothed,
      1,
    );
    const notMutatedWeight: number = this.uiHelper.toFixedIfNecessary(
      _scaleChange.notMutatedWeight,
      1,
    );
    const isEspresso = _styleType === PREPARATION_STYLE_TYPE.ESPRESSO;
    const scaleType = this.bleManager.getScale()?.getScaleType();
    //Yeay yeay yeay, sometimes the lunar scale is reporting wrongly cause of closed api, therefore try to tackle this issues down with the lunar
    if (scaleType === ScaleType.LUNAR) {
      if (weight > 5000) {
        // Wrong scale values reported. - Fix it back
        if (this.flowProfileTempAll.length > 0) {
          const lastEntry = this.flowProfileTempAll.slice(-1);
          weight = lastEntry[0].weight;
        } else {
          weight = oldWeight;
        }
      }
    } else if (isEspresso) {
      /** We have an reported issue on a decent scale, that when a weight drops to less then zero, it sticks to like -25.9,
       * but the not mutated weight is bigger or same like 0, we set the
       * We make this for all scales available.
       */
      if (weight < 0 && notMutatedWeight >= 0) {
        weight = notMutatedWeight;
      }
    }
    if (weight <= 0 && isEspresso) {
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
          const entryBefore =
            this.flowProfileTempAll[this.flowProfileTempAll.length - 1];
          // I don't know if old_weight could just be bigger then 0
          weight = entryBefore.weight;
          if (_scale) {
            _scale.setOldWeight(weight);
            oldWeight = weight;
          }
        }
      }
    } else {
      if (isEspresso) {
        //Check if the weight before this actual weight is less then factor X
        //like we got jumps weight 25.8 grams, next was 259 grams.
        if (this.flowProfileTempAll.length >= 2) {
          const entryBefore =
            this.flowProfileTempAll[this.flowProfileTempAll.length - 1];
          const entryBeforeVal = entryBefore.weight;
          let risingFactorOK: boolean = true;

          /**
           * We try to match also turbo-shots which are like 7-8 grams.
           * Scales with just 3 values per second would be like 7 / 3 values per second = 2.33g increase each tick.
           * So we won't get jump from like 1 to 10 gram, then to like 40 grams
           * Update 26.08.24 - We change from 5 to 10, because we had one shot where the value jumped from 0 to 5,5 and we didn't track anymore
           */
          let plausibleEspressoWeightIncreaseBound: number = 10;
          if (this.baristamode) {
            /**
             * When we're in barista mode with the sanremo you, we don't support turbo shots actually, so having an increase of 3grams is plausible for each step
             * specially when using high precisioning scales and no poor scales
             */
            plausibleEspressoWeightIncreaseBound = 3;
          }
          risingFactorOK =
            entryBeforeVal + plausibleEspressoWeightIncreaseBound >= weight;

          if (risingFactorOK) {
            //All good factor is matched
          } else {
            //Nothing good, somehow we got spikes.
            weight = entryBeforeVal;
            //Reset old weight.
            if (_scale) {
              _scale.setOldWeight(weight);
              oldWeight = weight;
            }
          }
        }
      }
    }

    if (isEspresso && _scale && weight <= 0) {
      _scale.resetSmoothedValue();
      smoothedWeight = 0;
      oldSmoothedWeight = 0;
    }

    return {
      actual: weight,
      old: oldWeight,
      smoothed: smoothedWeight,
      oldSmoothed: oldSmoothedWeight,
      notMutatedWeight: notMutatedWeight,
    };
  }

  private calculateBrewByWeight(
    _currentWeightValue: number,
    _residualLagTime: number,
    _targetWeight: number,
    _brewByWeightActive: boolean,
    _scale: BluetoothScale,
  ) {
    let weight: number = this.uiHelper.toFixedIfNecessary(
      _currentWeightValue,
      1,
    );
    if (this.ignoreScaleWeight === true) {
      if (this.flowProfileTempAll.length > 0) {
        const oldFlowProfileTemp =
          this.flowProfileTempAll[this.flowProfileTempAll.length - 1];
        weight = this.uiHelper.toFixedIfNecessary(oldFlowProfileTemp.weight, 1);
      }
    }

    if (
      this.flow_profile_raw.realtimeFlow &&
      this.flow_profile_raw.realtimeFlow.length > 0
    ) {
      const targetWeight = _targetWeight;

      const brewByWeightActive: boolean = _brewByWeightActive;

      let n = 3;
      if (this.flowNCalculation > 0) {
        n = this.flowNCalculation;
      } else {
        n = this.flowProfileTempAll.length;
      }
      const lag_time = this.uiHelper.toFixedIfNecessary(1 / n, 2);

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

      const scaleType = _scale.getScaleType();

      this.pushBrewByWeight(
        targetWeight,
        lag_time,
        this.flowTime + '.' + this.flowSecondTick,
        lastFlowValue,
        weight,
        lag_time + _residualLagTime,
        weight + average_flow_rate * (lag_time + _residualLagTime) >=
          targetWeight,
        average_flow_rate * (lag_time + _residualLagTime),
        _residualLagTime,
        average_flow_rate,
        scaleType,
      );
      let thresholdHit: boolean = false;
      if (brewByWeightActive) {
        thresholdHit =
          weight + average_flow_rate * (lag_time + _residualLagTime) >=
          targetWeight;
      } else {
        thresholdHit = weight >= targetWeight;
      }
      return thresholdHit;
    }
    return false;
  }

  private triggerStopShotOnXenia(_actualScaleWeight) {
    const prepDeviceCall: XeniaDevice = this.brewComponent
      .brewBrewingPreparationDeviceEl.preparationDevice as XeniaDevice;
    if (this.data.preparationDeviceBrew.params.scriptAtWeightReachedId > 0) {
      this.uiLog.log(
        `Xenia Script - Weight Reached: ${_actualScaleWeight} - Trigger custom script`,
      );
      prepDeviceCall
        .startScript(
          this.data.preparationDeviceBrew.params.scriptAtWeightReachedId,
        )
        .catch((_msg) => {
          this.uiToast.showInfoToast(
            'We could not start script at weight: ' + _msg,
            false,
          );
          this.uiLog.log('We could not start script at weight: ' + _msg);
        });
      this.writeExecutionTimeToNotes(
        'Weight reached script',
        this.data.preparationDeviceBrew.params.scriptAtWeightReachedId,
        this.getScriptName(
          this.data.preparationDeviceBrew.params.scriptAtWeightReachedId,
        ),
      );
    } else {
      this.uiLog.log(`Xenia Script - Weight Reached - Trigger stop script`);
      prepDeviceCall.stopScript().catch((_msg) => {
        this.uiToast.showInfoToast(
          'We could not stop script at weight: ' + _msg,
          false,
        );
        this.uiLog.log('We could not stop script at weight: ' + _msg);
      });
      this.writeExecutionTimeToNotes(
        'Stop script (Weight reached)',
        0,
        this.translate.instant(
          'PREPARATION_DEVICE.TYPE_XENIA.SCRIPT_LIST_GENERAL_STOP',
        ),
      );
    }

    // This will be just called once, we stopped the shot and now we check if we directly shall stop or not
    if (
      this.settings.bluetooth_scale_espresso_stop_on_no_weight_change === false
    ) {
      this.stopFetchingAndSettingDataFromXenia();
      this.brewComponent.timer.pauseTimer('xenia');
    } else {
      // We weight for the normal "setFlow" to stop the detection of the graph, there then aswell is the stop fetch of the xenia triggered.
    }
  }

  private triggerStopShotOnSanremoYOU(_actualScaleWeight) {
    const prepDeviceCall: SanremoYOUDevice = this.brewComponent
      .brewBrewingPreparationDeviceEl.preparationDevice as SanremoYOUDevice;

    this.uiLog.log(`Sanremo YOU Stop: ${_actualScaleWeight}`);
    prepDeviceCall.stopActualShot();

    // This will be just called once, we stopped the shot and now we check if we directly shall stop or not
    if (
      this.settings.bluetooth_scale_espresso_stop_on_no_weight_change === false
    ) {
      this.stopFetchingDataFromSanremoYOU();
      this.brewComponent.timer.pauseTimer('sanremo_you');
    } else {
      // We weight for the normal "setFlow" to stop the detection of the graph, there then aswell is the stop fetch of the xenia triggered.
    }
  }

  public attachToScaleWeightChange() {
    const scale: BluetoothScale = this.bleManager.getScale();
    const preparationStyleType = this.data.getPreparation().style_type;
    if (scale) {
      this.deattachToWeightChange();

      //Sometimes the smoothed value is not zero, we try to fix this with this.
      if (scale.getWeight() <= 0) {
        scale.resetSmoothedValue();
      }

      this.machineStopScriptWasTriggered = false;

      const prepDeviceConnected =
        this.brewComponent.brewBrewingPreparationDeviceEl.preparationDeviceConnected();
      let residual_lag_time = 1.35;
      let targetWeight = 0;
      let baristaModeTargetWeight = undefined;
      let brewByWeightActive: boolean = false;
      let preparationDeviceType: PreparationDeviceType;

      if (prepDeviceConnected) {
        preparationDeviceType =
          this.brewComponent.brewBrewingPreparationDeviceEl.getPreparationDeviceType();
        switch (preparationDeviceType) {
          case PreparationDeviceType.XENIA:
            const prepXeniaDeviceCall: XeniaDevice = this.brewComponent
              .brewBrewingPreparationDeviceEl.preparationDevice as XeniaDevice;
            residual_lag_time = prepXeniaDeviceCall.getResidualLagTime();
            targetWeight =
              this.data.preparationDeviceBrew.params
                .scriptAtWeightReachedNumber;
            brewByWeightActive =
              this.data.preparationDeviceBrew?.params?.brew_by_weight_active;
            break;
          case PreparationDeviceType.SANREMO_YOU:
            const prepSanremoDeviceCall: SanremoYOUDevice = this.brewComponent
              .brewBrewingPreparationDeviceEl
              .preparationDevice as SanremoYOUDevice;
            residual_lag_time = prepSanremoDeviceCall.getResidualLagTime();
            targetWeight = this.data.preparationDeviceBrew.params.stopAtWeight;
            brewByWeightActive = true;
            break;
        }
      }

      if (
        this.espressoJustOneCup === true &&
        this.data.getPreparation().style_type ===
          PREPARATION_STYLE_TYPE.ESPRESSO
      ) {
        scale.setDoubleWeight(true);
      } else {
        scale.setDoubleWeight(false);
      }

      this.scaleFlowSubscription = scale.flowChange.subscribe((_valChange) => {
        let _val;
        if (this.ignoreScaleWeight === false) {
          _val = this.mutateWeightAndSeeAnomalys(
            _valChange,
            scale,
            preparationStyleType,
          );
        } else {
          _val = _valChange;
        }

        if (this.brewComponent.timer.isTimerRunning() && prepDeviceConnected) {
          if (
            preparationDeviceType === PreparationDeviceType.XENIA &&
            this.data.preparationDeviceBrew.params.scriptAtWeightReachedNumber >
              0 &&
            this.isFirstXeniaScriptSet()
          ) {
            /**We call this function before the if, because we still log the data**/
            const thresholdHit = this.calculateBrewByWeight(
              _val.actual,
              residual_lag_time,
              targetWeight,
              brewByWeightActive,
              scale,
            );

            if (this.machineStopScriptWasTriggered === false) {
              if (thresholdHit) {
                this.machineStopScriptWasTriggered = true;
                this.triggerStopShotOnXenia(_val.actual);
              }
            }
          } else if (
            this.brewComponent.brewBrewingPreparationDeviceEl.getPreparationDeviceType() ===
              PreparationDeviceType.SANREMO_YOU &&
            this.data.preparationDeviceBrew.params.selectedMode !==
              SanremoYOUMode.LISTENING
          ) {
            if (this.baristamode) {
              if (baristaModeTargetWeight === undefined) {
                try {
                  let groupStatus = (
                    this.brewComponent.brewBrewingPreparationDeviceEl
                      .preparationDevice as SanremoYOUDevice
                  ).getActualShotData().groupStatus;
                  if (groupStatus !== 0) {
                    if (groupStatus === 1) {
                      baristaModeTargetWeight =
                        this.data.preparationDeviceBrew.params.stopAtWeightP1;
                    } else if (groupStatus === 2) {
                      baristaModeTargetWeight =
                        this.data.preparationDeviceBrew.params.stopAtWeightP2;
                    } else if (groupStatus === 3) {
                      baristaModeTargetWeight =
                        this.data.preparationDeviceBrew.params.stopAtWeightP3;
                    } else if (groupStatus === 4) {
                      baristaModeTargetWeight =
                        this.data.preparationDeviceBrew.params.stopAtWeightM;
                    }

                    //We overwrite for this shot the target weight, because we have a barista mode target weight
                    targetWeight = baristaModeTargetWeight;
                    if (
                      document
                        .getElementById('statusPhase' + groupStatus)
                        .classList.contains('active') === false
                    ) {
                      document
                        .getElementById('statusPhase' + groupStatus)
                        .classList.add('active');
                    } else {
                      document
                        .getElementById('statusPhase' + groupStatus)
                        .classList.remove('active');
                    }
                  }
                } catch (ex) {}
              }
            }
            /**We call this function before the if, because we still log the data**/
            const thresholdHit = this.calculateBrewByWeight(
              _val.actual,
              residual_lag_time,
              targetWeight,
              brewByWeightActive,
              scale,
            );
            if (this.machineStopScriptWasTriggered === false) {
              //Don't stop the machine when the target weight is 0
              if (thresholdHit && targetWeight > 0) {
                this.machineStopScriptWasTriggered = true;
                this.triggerStopShotOnSanremoYOU(_val.actual);
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
              notMutatedWeight: _val.notMutatedWeight,
            };
            this.__setFlowProfile(passVal);
          }
        }
        if (this.baristamode) {
          //sendActualWeightAndFlowDataToMachine

          let lastFlowEntry =
            this.traces.realtimeFlowTrace.y[
              this.traces.realtimeFlowTrace.y.length - 1
            ];
          let lastWeightEntry =
            this.traces.weightTrace.y[this.traces.weightTrace.y.length - 1];
          (
            this.brewComponent.brewBrewingPreparationDeviceEl
              .preparationDevice as SanremoYOUDevice
          ).sendActualWeightAndFlowDataToMachine(
            lastWeightEntry,
            lastFlowEntry,
            baristaModeTargetWeight,
          );
        }
      });

      const isEspressoBrew: boolean =
        this.data.getPreparation().style_type ===
        PREPARATION_STYLE_TYPE.ESPRESSO;
      if (scale.supportsTwoWeights && isEspressoBrew === false) {
        this.scaleFlowSecondSubscription = scale.flowSecondChange.subscribe(
          (_valChange) => {
            const _val = _valChange;

            if (this.ignoreScaleWeight === false) {
              this.__setFlowSecondProfile(_val);
            } else {
              if (this.flowProfileSecondTempAll.length > 0) {
                const oldFlowProfileTemp =
                  this.flowProfileSecondTempAll[
                    this.flowProfileSecondTempAll.length - 1
                  ];
                const passVal = {
                  actual: oldFlowProfileTemp.weight,
                  old: oldFlowProfileTemp.oldWeight,
                  smoothed: oldFlowProfileTemp.smoothedWeight,
                  oldSmoothed: oldFlowProfileTemp.oldSmoothedWeight,
                  notMutatedWeight: _val.notMutatedWeight,
                };
                this.__setFlowSecondProfile(passVal);
              }
            }
          },
        );
      }
    }
  }

  public destroy() {
    if (this.bluetoothSubscription) {
      this.bluetoothSubscription.unsubscribe();
      this.bluetoothSubscription = undefined;
    }

    this.deattachToWeightChange();
    this.deattachToFlowChange();
    this.deattachToTextToSpeedChange();
    this.deattachToPressureChange();
    this.deattachToScaleEvents();
    this.deattachToTemperatureChange();

    this.deattachToScaleListening();
    this.deattachToScaleStartTareListening();
    this.stopFetchingAndSettingDataFromXenia();
    this.stopFetchingDataFromMeticulous();
    this.stopFetchingDataFromSanremoYOU();

    if (this.settings?.text_to_speech_active) {
      this.textToSpeech.end();
    }

    /**
     * After we want to save battery capacity here, we disconnect now specially on the PRS and on the BOOKOO device, so no values are send anymore.
     */
    if (this.pressureDeviceConnected()) {
      const pressureDevice: PressureDevice =
        this.bleManager.getPressureDevice();
      pressureDevice?.disableValueTransmission();
    }

    if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.SANREMO_YOU
    ) {
      try {
        const prepDeviceCall: SanremoYOUDevice = this.brewComponent
          .brewBrewingPreparationDeviceEl.preparationDevice as SanremoYOUDevice;
        prepDeviceCall.disconnectSocket();
      } catch (ex) {}
    }
  }

  public ngOnDestroy() {
    // We don't deattach the timer subscription in the deattach toscale events, else we couldn't start anymore.
    this.destroy();
  }

  private async returnFlowProfile(_flowProfile: string) {
    const promiseRtr = new Promise(async (resolve) => {
      if (this.platform.is('capacitor')) {
        if (_flowProfile !== '') {
          try {
            const jsonParsed =
              await this.uiFileHelper.readInternalJSONFile(_flowProfile);
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
      const jsonParsed =
        await this.uiFileHelper.readInternalJSONFile(flowProfilePath);
      this.flow_profile_raw = jsonParsed;
    } catch (ex) {}
  }

  private async deleteFlowProfile() {
    try {
      if (this.data.flow_profile !== '') {
        const flowProfilePath =
          'brews/' + this.data.config.uuid + '_flow_profile.json';
        await this.uiFileHelper.deleteInternalFile(flowProfilePath);
      }
    } catch (ex) {}
  }

  private __setPressureFlow(_pressure: any) {
    // Nothing for storing etc. is done here actually
    const actual: number = this.uiHelper.toFixedIfNecessary(
      _pressure.actual,
      2,
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

    this.traces.pressureTrace.x.push(new Date(pressureObj.unixTime));
    this.traces.pressureTrace.y.push(pressureObj.actual);

    this.pushPressureProfile(
      pressureObj.flowTimeSecond,
      pressureObj.actual,
      pressureObj.old,
    );

    if (!isSmartScaleConnected) {
      //Just update the chart if a smart scale is not connected - else it has huge performance issues on android
      this.updateChart();
      this.flowSecondTick++;

      /** We just support the end by pressure if no smart scale is connected, because the smart scale will be the master **/
      if (this.hasEspressoShotEndedWithPressure()) {
        this.brewComponent.timer.pauseTimer('shot_ended');
        this.changeDetectorRef.markForCheck();
        this.brewComponent.timer.checkChanges();
        this.checkChanges();
      }
    }

    this.setActualPressureInformation(pressureObj.actual);
  }

  private __setTemperatureFlow(_temperature: any) {
    // Nothing for storing etc. is done here actually
    const actual: number = this.uiHelper.toFixedIfNecessary(
      _temperature.actual,
      2,
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

    this.traces.temperatureTrace.x.push(new Date(temperatureObj.unixTime));
    this.traces.temperatureTrace.y.push(temperatureObj.actual);

    this.pushTemperatureProfile(
      temperatureObj.flowTimeSecond,
      temperatureObj.actual,
      temperatureObj.old,
    );

    if (!isSmartScaleConnected) {
      //Just update the chart if a smart scale is not connected - else it has huge performance issues on android
      this.updateChart();
      this.flowSecondTick++;
    }

    this.setActualTemperatureInformation(temperatureObj.actual);
  }

  private __setFlowProfile(_scaleChange: any) {
    let weight: number = this.uiHelper.toFixedIfNecessary(
      _scaleChange.actual,
      1,
    );
    const oldWeight: number = this.uiHelper.toFixedIfNecessary(
      _scaleChange.old,
      1,
    );
    const smoothedWeight: number = this.uiHelper.toFixedIfNecessary(
      _scaleChange.smoothed,
      1,
    );
    const oldSmoothedWeight: number = this.uiHelper.toFixedIfNecessary(
      _scaleChange.oldSmoothed,
      1,
    );
    const notMutatedWeight: number = this.uiHelper.toFixedIfNecessary(
      _scaleChange.notMutatedWeight,
      1,
    );

    if (this.flowTime === undefined) {
      this.flowTime = this.brewComponent.getTime();
    }
    const scaleType = this.bleManager.getScale()?.getScaleType();
    const prep = this.brewComponent.choosenPreparation;

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
      notMutatedWeight: notMutatedWeight,
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

          if (prep.style_type !== PREPARATION_STYLE_TYPE.ESPRESSO) {
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

        if (prep.style_type !== PREPARATION_STYLE_TYPE.ESPRESSO) {
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
            -this.flowProfileArrCalculated.length,
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
      for (let i = this.traces.weightTrace.y.length - 1; i >= 0; i--) {
        const dataVal = this.traces.weightTrace.y[i];
        if (dataVal !== null) {
          lastFoundRightValue = dataVal;
          break;
        }
      }

      for (const item of this.flowProfileArrObjs) {
        const waterFlow: IBrewWaterFlow = {} as IBrewWaterFlow;

        waterFlow.brew_time = this.flowTime.toString();
        waterFlow.timestamp = flowObj.flowTimestamp;
        waterFlow.value = actualFlowValue;
        this.traces.flowPerSecondTrace.x.push(item.dateUnixTime);
        this.traces.flowPerSecondTrace.y.push(actualFlowValue);
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

      /**We exclude the chart update because its update below aswell, after we've removed the ignore anomaly function**/
      //this.updateChart();
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

    this.traces.realtimeFlowTrace.x.push(flowObj.dateUnixTime);
    this.traces.realtimeFlowTrace.y.push(realtimeWaterFlow.flow_value);

    this.flow_profile_raw.realtimeFlow.push(realtimeWaterFlow);
    /* Realtime flow End **/

    if (
      prep.style_type === PREPARATION_STYLE_TYPE.ESPRESSO &&
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
            prep.manage_parameters.coffee_first_drip_time,
            prep.use_custom_parameters,
          )
        ) {
          // The first time we set the weight, we have one sec delay, because of this do it -1 second

          this.brewComponent.setCoffeeDripTime(undefined);

          this.checkChanges();
        }
      }
    }

    this.traces.weightTrace.x.push(flowObj.dateUnixTime);
    this.traces.weightTrace.y.push(flowObj.weight);

    this.pushFlowProfile(
      flowObj.flowTimestamp,
      flowObj.flowTimeSecond,
      flowObj.weight,
      flowObj.oldWeight,
      flowObj.smoothedWeight,
      flowObj.oldSmoothedWeight,
      flowObj.notMutatedWeight,
    );

    this.updateChart();

    if (this.hasEspressoShotEnded()) {
      if (
        this.brewComponent.brewBrewingPreparationDeviceEl.preparationDeviceConnected() &&
        this.brewComponent.brewBrewingPreparationDeviceEl.getPreparationDeviceType() ===
          PreparationDeviceType.XENIA
      ) {
        this.stopFetchingAndSettingDataFromXenia();
      }
      if (
        this.brewComponent.brewBrewingPreparationDeviceEl.preparationDeviceConnected() &&
        this.brewComponent.brewBrewingPreparationDeviceEl.getPreparationDeviceType() ===
          PreparationDeviceType.SANREMO_YOU
      ) {
        this.stopFetchingDataFromSanremoYOU();
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
        this.brewComponent.timer.pauseTimer('shot_ended');
        this.changeDetectorRef.markForCheck();
        this.brewComponent.timer.checkChanges();
        this.checkChanges();
      }
    }

    this.flowSecondTick = this.flowSecondTick + 1;
  }

  private __setFlowSecondProfile(_scaleChange: any) {
    let weight: number = this.uiHelper.toFixedIfNecessary(
      _scaleChange.actual,
      1,
    );
    const oldWeight: number = this.uiHelper.toFixedIfNecessary(
      _scaleChange.old,
      1,
    );
    const smoothedWeight: number = this.uiHelper.toFixedIfNecessary(
      _scaleChange.smoothed,
      1,
    );
    const oldSmoothedWeight: number = this.uiHelper.toFixedIfNecessary(
      _scaleChange.oldSmoothed,
      1,
    );
    const notMutatedWeight: number = this.uiHelper.toFixedIfNecessary(
      _scaleChange.notMutatedWeight,
      1,
    );

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
      notMutatedWeight: notMutatedWeight,
    };
    flowObj.dateUnixTime = new Date(flowObj.unixTime);

    this.flowProfileSecondTempAll.push(flowObj);

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
      n = this.flowProfileSecondTempAll.length;
    }

    // After the flowProfileSecondTempAll will be stored directly, we'd have one entry at start already, but we need to wait for another one
    if (this.flowProfileSecondTempAll.length > 2) {
      try {
        timeStampDelta =
          flowObj.unixTime -
          this.flowProfileSecondTempAll[
            this.flowProfileSecondTempAll.length - n
          ].unixTime;
      } catch (ex) {}
    }

    realtimeWaterFlow.timestampdelta = timeStampDelta;

    let calcFlowValue = 0;
    try {
      calcFlowValue =
        (newSmoothedWeight -
          this.flowProfileSecondTempAll[
            this.flowProfileSecondTempAll.length - n
          ].smoothedWeight) *
        (1000 / timeStampDelta);
    } catch (ex) {}
    if (Number.isNaN(calcFlowValue)) {
      calcFlowValue = 0;
    }
    realtimeWaterFlow.flow_value = calcFlowValue;

    this.traces.realtimeFlowTraceSecond.x.push(flowObj.dateUnixTime);
    this.traces.realtimeFlowTraceSecond.y.push(realtimeWaterFlow.flow_value);

    this.flow_profile_raw.realtimeFlowSecond.push(realtimeWaterFlow);
    /* Realtime flow End **/

    this.traces.weightTraceSecond.x.push(flowObj.dateUnixTime);
    this.traces.weightTraceSecond.y.push(flowObj.weight);

    this.pushFlowProfileSecond(
      flowObj.flowTimestamp,
      flowObj.flowTimeSecond,
      flowObj.weight,
      flowObj.oldWeight,
      flowObj.smoothedWeight,
      flowObj.oldSmoothedWeight,
      flowObj.notMutatedWeight,
    );
    this.__setScaleSecondWeight(weight);
    this.updateChart();
  }

  private __setScaleWeight(
    _weight: number,
    _wrongFlow: boolean,
    _weightDidntChange: boolean,
  ) {
    if (_wrongFlow === false || _weightDidntChange === true) {
      if (
        this.data.getPreparation().style_type !==
        PREPARATION_STYLE_TYPE.ESPRESSO
      ) {
        if (_weight > 0) {
          this.data.brew_quantity = this.uiHelper.toFixedIfNecessary(
            _weight,
            1,
          );
        }
      } else {
        if (_weight > 0) {
          // If the drip timer is showing, we can set the first drip and not doing a reference to the normal weight.
          this.data.brew_beverage_quantity = this.uiHelper.toFixedIfNecessary(
            _weight,
            1,
          );
        }
      }
      this.brewComponent.checkChanges();
    } else {
      // Pah. Shit here.
    }
  }

  private __setScaleSecondWeight(_weight: number) {
    if (
      this.data.getPreparation().style_type !== PREPARATION_STYLE_TYPE.ESPRESSO
    ) {
      if (_weight > 0) {
        // If the drip timer is showing, we can set the first drip and not doing a reference to the normal weight.
        this.data.brew_beverage_quantity = this.uiHelper.toFixedIfNecessary(
          _weight,
          1,
        );
      }
      this.checkChanges();
    } else {
      // Pah. Shit here.
    }
  }

  public async preparationChanged() {
    if (
      this.data.getPreparation().style_type === PREPARATION_STYLE_TYPE.ESPRESSO
    ) {
      await this.__connectPressureDevice(false);
    } else {
      /**If we changed from espresso to filter e.g. we want to disable the value transmission**/
      if (this.pressureDeviceConnected()) {
        const pressureDevice: PressureDevice =
          this.bleManager.getPressureDevice();
        pressureDevice?.disableValueTransmission();
      }
    }
    await this.setUIParams();
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
      this.traces.weightTrace.y.length < 50 ||
      this.data.brew_time <= 5
    ) {
      return false; // Not enough readings or start time not set yet, or we didn't elapse 5 seconds
    }

    let grindWeight = this.data.grind_weight;
    if (grindWeight && grindWeight > 0) {
    } else {
      grindWeight = 5;
    }
    if (this.baristamode) {
      /**A bit more threshold for preinfusion**/
      grindWeight = 10;
    }

    //#875 - ignore the first 5 weights, because sometimes when starting with a pressure, weight reset is sometimes not zero
    const slicedTraceWeight = this.traces.weightTrace.y.slice(5);
    const valFound = slicedTraceWeight.find((v) => v >= grindWeight);
    if (valFound === undefined || valFound === null) {
      return false; // We want to be atleast a ratio of 1:1
    }
    const flowThreshold: number =
      this.settings.bluetooth_scale_espresso_stop_on_no_weight_change_min_flow;
    if (
      this.traces.realtimeFlowTrace.y[
        this.traces.realtimeFlowTrace.y.length - 1
      ] <= flowThreshold
    ) {
      return true;
    } else {
      return false;
    }
  }

  private hasEspressoShotEndedWithPressure(): boolean {
    // Minimum 50 scale values which means atleast 5 seconds
    if (
      this.data.getPreparation().style_type !== PREPARATION_STYLE_TYPE.ESPRESSO
    ) {
      return false;
    }

    if (
      this.settings.pressure_threshold_stop_shot_active === false ||
      this.traces.pressureTrace.y.length < 100 ||
      this.data.brew_time <= 10
    ) {
      return false; // Not enough readings or start time not set yet, or we didn't elapse 5 seconds
    }

    const barFoundAboveOne = this.traces.pressureTrace.y.find((v) => v >= 1);
    if (barFoundAboveOne !== undefined) {
      //User minimum got up to 1 bar

      const pressureStopThreshold: number =
        this.settings.pressure_threshold_stop_shot_bar;
      if (
        this.traces.pressureTrace.y[this.traces.pressureTrace.y.length - 1] <=
        pressureStopThreshold
      ) {
        return true;
      } else {
        return false;
      }
    }
    return false;
  }

  private pushFlowProfile(
    _timestamp: string,
    _brewTime: string,
    _actualWeight: number,
    _oldWeight: number,
    _actualSmoothedWeight: number,
    _oldSmoothedWeight: number,
    _notMutatedWeight: number,
  ) {
    const brewFlow: IBrewWeightFlow = {} as IBrewWeightFlow;
    brewFlow.timestamp = _timestamp;
    brewFlow.brew_time = _brewTime;
    brewFlow.actual_weight = _actualWeight;
    brewFlow.old_weight = _oldWeight;
    brewFlow.actual_smoothed_weight = _actualSmoothedWeight;
    brewFlow.old_smoothed_weight = _oldSmoothedWeight;
    brewFlow.not_mutated_weight = _notMutatedWeight;
    this.flow_profile_raw.weight.push(brewFlow);
  }

  private pushFlowProfileSecond(
    _timestamp: string,
    _brewTime: string,
    _actualWeight: number,
    _oldWeight: number,
    _actualSmoothedWeight: number,
    _oldSmoothedWeight: number,
    _notMutatedWeight: number,
  ) {
    const brewFlow: IBrewWeightFlow = {} as IBrewWeightFlow;
    brewFlow.timestamp = _timestamp;
    brewFlow.brew_time = _brewTime;
    brewFlow.actual_weight = _actualWeight;
    brewFlow.old_weight = _oldWeight;
    brewFlow.actual_smoothed_weight = _actualSmoothedWeight;
    brewFlow.old_smoothed_weight = _oldSmoothedWeight;
    brewFlow.not_mutated_weight = _notMutatedWeight;
    this.flow_profile_raw.weightSecond.push(brewFlow);
  }

  private pushPressureProfile(
    _brewTime: string,
    _actualPressure: number,
    _oldPressure: number,
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
    scaleType: string,
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
    _oldTemperature: number,
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
      (this.smartScaleConnected() ||
        this.pressureDeviceConnected() ||
        this.temperatureDeviceConnected() ||
        this.isDetail) &&
      this.baristamode === false
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
          'PREPARATION_DEVICE.TYPE_XENIA.SCRIPT_LIST_GENERAL_' + _index,
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
    _scriptName: string,
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
          `Xenia Script - Script at first drip -  Trigger custom script`,
        );
        const prepDeviceCall: XeniaDevice = this.brewComponent
          .brewBrewingPreparationDeviceEl.preparationDevice as XeniaDevice;
        prepDeviceCall
          .startScript(
            this.data.preparationDeviceBrew.params.scriptAtFirstDripId,
          )
          .catch((_msg) => {
            this.uiToast.showInfoToast(
              'We could not start script at first drip: ' + _msg,
              false,
            );
            this.uiLog.log('We could not start script at first drip: ' + _msg);
          });
        this.writeExecutionTimeToNotes(
          'First drip script',
          this.data.preparationDeviceBrew.params.scriptAtFirstDripId,
          this.getScriptName(
            this.data.preparationDeviceBrew.params.scriptAtFirstDripId,
          ),
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
            `Xenia Script - Script at first drip -  Trigger custom script`,
          );
          const prepDeviceCall: XeniaDevice = this.brewComponent
            .brewBrewingPreparationDeviceEl.preparationDevice as XeniaDevice;
          prepDeviceCall
            .startScript(
              this.data.preparationDeviceBrew.params.scriptAtFirstDripId,
            )
            .catch((_msg) => {
              this.uiToast.showInfoToast(
                'We could not start script at first drip - manual  triggered: ' +
                  _msg,
                false,
              );
              this.uiLog.log(
                'We could not start script at first drip - manual  triggered: ' +
                  _msg,
              );
            });
          this.writeExecutionTimeToNotes(
            'First drip script',
            this.data.preparationDeviceBrew.params.scriptAtFirstDripId,
            this.getScriptName(
              this.data.preparationDeviceBrew.params.scriptAtFirstDripId,
            ),
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

  public setLastShotInformation(
    shotWeight: number,
    avgFlow: number,
    brewtime: number,
  ) {
    try {
      const prepDeviceCall: SanremoYOUDevice = this.brewComponent
        ?.brewBrewingPreparationDeviceEl?.preparationDevice as SanremoYOUDevice;

      this.smartScaleWeightPerSecondBaristaEl.nativeElement.innerText =
        shotWeight + 'g';
      this.smartScaleAvgFlowPerSecondBaristaEl.nativeElement.innerText =
        'Ø ' + avgFlow + ' g/s';
      this.timerBaristaEl.nativeElement.innerText = brewtime + 's';
      this.lastShotEl.nativeElement.innerText =
        prepDeviceCall?.lastRunnedProgramm;
      if (prepDeviceCall.lastRunnedProgramm === 1) {
        this.lastShotEl.nativeElement.innerText = 'P1';
      }
      if (prepDeviceCall.lastRunnedProgramm === 2) {
        this.lastShotEl.nativeElement.innerText = 'P2';
      }
      if (prepDeviceCall.lastRunnedProgramm === 3) {
        this.lastShotEl.nativeElement.innerText = 'P3';
      }
      if (prepDeviceCall.lastRunnedProgramm === 4) {
        this.lastShotEl.nativeElement.innerText = 'M';
      }

      for (let i = 1; i++; i < 5) {
        document.getElementById('statusPhase' + i).classList.remove('active');
      }
    } catch (ex) {}
  }

  protected readonly BREW_FUNCTION_PIPE_ENUM = BREW_FUNCTION_PIPE_ENUM;
}
