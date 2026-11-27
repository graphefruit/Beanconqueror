import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCheckbox,
  IonChip,
  IonCol,
  IonGrid,
  IonIcon,
  IonItem,
  IonRow,
  ModalController,
  Platform,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  beakerOutline,
  chevronCollapseOutline,
  chevronExpandOutline,
  thermometerOutline,
  timerOutline,
  waterOutline,
} from 'ionicons/icons';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import moment from 'moment/moment';
import regression from 'regression';
import { Subscription } from 'rxjs';

import { BrewChooseGraphReferenceComponent } from '../../../app/brew/brew-choose-graph-reference/brew-choose-graph-reference.component';
import {
  DEVICE_SILENCE_MS,
  deviceSilenceHint,
  SilentDevice,
} from '../../../brew-session/rules/deviceSilenceHint';
import { timeParameterHintDue } from '../../../brew-session/rules/timeParameterHint';
import { Brew } from '../../../classes/brew/brew';
import {
  BrewFlow,
  IBrewByWeight,
  IBrewPressureFlow,
  IBrewRealtimeWaterFlow,
  IBrewTemperatureFlow,
  IBrewWaterFlow,
  IBrewWeightFlow,
} from '../../../classes/brew/brewFlow';
import { ReferenceGraph } from '../../../classes/brew/referenceGraph';
import {
  BluetoothScale,
  SCALE_TIMER_COMMAND,
  ScaleType,
  sleep,
} from '../../../classes/devices';
import { PressureDevice } from '../../../classes/devices/pressureBluetoothDevice';
import { TemperatureDevice } from '../../../classes/devices/temperatureBluetoothDevice';
import { Preparation } from '../../../classes/preparation/preparation';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { MeticulousDevice } from '../../../classes/preparationDevice/meticulous/meticulousDevice';
import { MeticulousShotData } from '../../../classes/preparationDevice/meticulous/meticulousShotData';
import {
  Move2Device,
  Move2Params,
} from '../../../classes/preparationDevice/move2/move2Device';
import { SanremoShotData } from '../../../classes/preparationDevice/sanremo/sanremoShotData';
import { SanremoYOUDevice } from '../../../classes/preparationDevice/sanremo/sanremoYOUDevice';
import { XeniaDevice } from '../../../classes/preparationDevice/xenia/xeniaDevice';
import { triggerBrewByWeightWebhook } from '../../../classes/settings/brewByWeightWebhook';
import { Settings } from '../../../classes/settings/settings';
import { storedOrReported } from '../../../classes/storedOrReported';
import { ChipButtonDirective } from '../../../directive/chip-button.directive';
import { BREW_FUNCTION_PIPE_ENUM } from '../../../enums/brews/brewFunctionPipe';
import { REFERENCE_GRAPH_TYPE } from '../../../enums/brews/referenceGraphType';
import { SanremoYOUMode } from '../../../enums/preparationDevice/sanremo/sanremoYOUMode';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { BrewFunction } from '../../../pipes/brew/brewFunction';
import { Announcer } from '../../../services/a11y/announcer.service';
import {
  CoffeeBluetoothDevicesService,
  CoffeeBluetoothServiceEvent,
} from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import {
  spokenBrewValues,
  spokenWeight,
  spokenWeightDecimals,
} from '../../../services/textToSpeech/speech-options';
import { TextToSpeechService } from '../../../services/textToSpeech/text-to-speech.service';
import { ThemeService } from '../../../services/theme/theme.service';
import { UIAlert } from '../../../services/uiAlert';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIHelper } from '../../../services/uiHelper';
import { UILog } from '../../../services/uiLog';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIToast } from '../../../services/uiToast';
import {
  hasShotEndedByPressure,
  hasShotEndedByWeight,
  latestWeightAndFlow,
  machineFlow,
  scaleShowsShotEnd,
  shotEndMinimumWeight,
} from '../../../stores/brews/shot-end-rules';
import { BrewBrewingComponent } from '../brew-brewing/brew-brewing.component';
import { FlowProfileReader } from '../graph/flow-profile-reader.service';
import { FlowSeriesBuffer } from '../graph/flow-series-buffer';
import {
  FIXED_SERIES_IDS,
  fixedSeriesDef,
  graphSettingsFor,
  isCustomId,
  seriesDefsFor,
  type SeriesDef,
  type SeriesId,
  type Translate,
} from '../graph/series-def';
import { UplotRenderer } from '../graph/uplot-renderer';
import {
  initiallyHidden,
  liveSeriesId,
  liveSeriesState,
  liveViewport,
  shownReferenceDefs,
} from './live-series-state';

/** Height of the graph in the brew form. */
const GRAPH_HEIGHT = 150;

@Component({
  selector: 'brew-brewing-graph',
  templateUrl: './brew-brewing-graph.component.html',
  styleUrls: ['./brew-brewing-graph.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    TranslatePipe,
    BrewFunction,
    IonButton,
    IonCol,
    IonIcon,
    IonCardHeader,
    IonGrid,
    IonItem,
    IonRow,
    IonCardContent,
    IonCard,
    IonCheckbox,
    IonChip,
    ChipButtonDirective,
  ],
})
export class BrewBrewingGraphComponent implements OnInit, OnDestroy {
  private readonly platform = inject(Platform);
  private readonly bleManager = inject(CoffeeBluetoothDevicesService);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly translate = inject(TranslateService);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiToast = inject(UIToast);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiPreparationHelper = inject(UIPreparationHelper);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly modalController = inject(ModalController);
  private readonly uiLog = inject(UILog);
  readonly uiBrewHelper = inject(UIBrewHelper);
  private readonly textToSpeech = inject(TextToSpeechService);
  private readonly announcer = inject(Announcer);
  private readonly theme = inject(ThemeService);
  private readonly flowReader = inject(FlowProfileReader);

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

  @ViewChild('shotVolume', { read: ElementRef })
  public shotVolumeEl: ElementRef;

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

  @Input() public isEdit = false;

  @Input() public baristamode = false;
  public baristaModeTargetWeight: number = undefined;
  /**
   * This flag will toggle graph and the timer to be displayed.
   */
  public showAdvancedBarista = false;

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
  private flowSecondTick = 0;
  private flowNCalculation = 0;
  private startingFlowTime: number = undefined;

  /**
   * What the graph draws, from the start, so a reading before the graph is
   * shown is kept. flow_profile_raw stays what is saved; this only mirrors it.
   */
  private readonly liveBuffer = new FlowSeriesBuffer();
  private readonly referenceBuffer = new FlowSeriesBuffer();
  private renderer: UplotRenderer | null = null;
  private readonly seriesDefs = signal<readonly SeriesDef[]>([]);
  private readonly hiddenSeries = signal<ReadonlySet<SeriesId>>(new Set());
  /** Chip state of the live series; read this instead of the drawing internals. */
  public readonly seriesState = computed(() =>
    liveSeriesState(this.seriesDefs(), this.hiddenSeries(), this.theme.dark()),
  );
  /** Height the graph is drawn at in its own container; a host may set another. */
  private graphHeight = GRAPH_HEIGHT;
  /** The host the graph was moved to, e.g. the maximized view. */
  private graphHost: HTMLElement | null = null;
  /** From the start of the timer until its pause; the timer itself runs a moment later. */
  private recording = false;
  private graphSizes: ResizeObserver | null = null;

  private graphTimerTest: any = undefined;
  private pressureThresholdWasHit = false;
  private temperatureThresholdWasHit = false;
  private xeniaOverviewInterval: any = undefined;
  private meticulousInterval: any = undefined;
  private sanremoYOUFetchingInterval: any = undefined;
  private move2FetchingInterval: any = undefined;

  public ignoreScaleWeight = false;

  public settings: Settings = undefined;

  public machineStopScriptWasTriggered = false;

  // Separate flag so scale reconnect mid-shot cannot re-arm the webhook.
  private webhookFired = false;

  // Target weight captured once at brew start — brew_beverage_quantity
  // is overwritten with the live scale reading during the brew, so we
  // cannot use it as a stable threshold reference mid-shot.
  private webhookTargetWeight = 0;

  @ViewChild('canvaContainer', { read: ElementRef, static: true })
  private canvaContainer: ElementRef;
  @ViewChild('profileDiv', { read: ElementRef, static: true })
  private profileDiv: ElementRef;

  @ViewChild('graphContainer', { read: ElementRef, static: true })
  public graphContainerEl: ElementRef;

  @ViewChild('tileContainer', { read: ElementRef, static: false })
  public tileContainerEl: ElementRef;

  private readonly silenceTimers: Record<
    SilentDevice,
    ReturnType<typeof setTimeout> | undefined
  > = { scale: undefined, pressure: undefined };
  private readonly silenceHints = {
    scale: signal<string | null>(null),
    pressure: signal<string | null>(null),
  };
  public readonly deviceSilenceHints = computed(() =>
    [this.silenceHints.scale(), this.silenceHints.pressure()].filter(
      (_key) => _key !== null,
    ),
  );

  public textToSpeechWeightInterval: any = undefined;

  public graphIconColSize = 2;

  public espressoJustOneCup = false;

  constructor() {
    addIcons({
      beakerOutline,
      chevronCollapseOutline,
      chevronExpandOutline,
      thermometerOutline,
      timerOutline,
      waterOutline,
    });
    effect(() => {
      // Lines, axes and grid are drawn in the colours of the theme.
      const dark = this.theme.dark();
      this.renderer?.setDark(dark);
    });
  }

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();

    // Pre-fill brew_beverage_quantity from the webhook default target weight
    // when the brew modal opens, so the user sees it before starting.
    //
    // This deliberately also overwrites a value carried over from a repeated
    // brew. That carried-over value is the previous shot's *actual yield*,
    // not a target, so the configured default is the more meaningful starting
    // point whenever the webhook is active.
    //
    // Per-brew override still works: timerStarted() reads whatever is in the
    // field at brew start, so anything the user types after the modal opens
    // takes precedence over this default.
    const cfg = this.settings?.brew_by_weight_webhook;
    if (this.data && cfg?.active && cfg.defaultTargetWeight > 0) {
      this.data.brew_beverage_quantity = cfg.defaultTargetWeight;
    }

    this.graphSizes = new ResizeObserver(([entry]) => {
      // In another host the graph takes that host's size.
      if (!this.graphHost) {
        this.renderer?.resize(entry.contentRect.width, this.graphHeight);
      }
    });
    this.graphSizes.observe(this.canvaContainer.nativeElement);
  }

  public async instance() {
    if (this.isEdit) {
      // This needs to be done before initialize the flow chart
      if (this.data.flow_profile !== '') {
        // We had a flow profile, so read data now.
        await this.readFlowProfile();

        if (this.data.reference_flow_profile) {
          await this.readReferenceFlowProfile(this.data);
        }

        this.redrawGraph();
      }
    }

    this.toggleGraphElementsOnBaristaMode();
    let isSomethingConnected = false;
    if (this.smartScaleConnected()) {
      await this.__connectSmartScale(true);
      isSomethingConnected = true;
    }
    if (
      this.pressureDeviceConnected() &&
      this.data.getPreparation().style_type === PREPARATION_STYLE_TYPE.ESPRESSO
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
        prepDeviceType === PreparationDeviceType.SANREMO_YOU ||
        prepDeviceType === PreparationDeviceType.MOVE2)
    ) {
      isSomethingConnected = true;
    }
    if (isSomethingConnected === true) {
      this.redrawGraph();
      void this.hintTimeParameter();
    }

    this.bluetoothSubscription = this.bleManager
      .attachOnEvent()
      .subscribe((_type) => {
        let disconnectTriggered = false;
        let connectTriggered = false;

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
          if (this.brewComponent.timer?.isTimerRunning() !== true) {
            this.redrawGraph();
          }
          void this.hintTimeParameter();
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

  private timeParameterHinted = false;

  /** Offers to show the brew time, see timeParameterHintDue. */
  private async hintTimeParameter(): Promise<void> {
    const preparation = this.brewComponent?.choosenPreparation;
    if (!preparation) {
      return;
    }
    const parameters = preparation.use_custom_parameters
      ? preparation.manage_parameters
      : this.settings.manage_parameters;
    if (
      !timeParameterHintDue({
        parameters,
        baristaMode: this.baristamode,
        editing: this.isEdit,
        hinted: this.timeParameterHinted,
      })
    ) {
      return;
    }
    this.timeParameterHinted = true;
    try {
      const choice = await this.uiAlert.showConfirmWithYesNoTranslation(
        'TIME_PARAMETER_HINT_DESCRIPTION',
        'TIME_PARAMETER_HINT_TITLE',
        'TIME_PARAMETER_HINT_SHOW',
        'TIME_PARAMETER_HINT_NOT_NOW',
        true,
      );
      if (choice !== 'YES') {
        return;
      }
      parameters.brew_time = true;
      // The brew form lays out its fields again once the change is stored.
      const saved = await storedOrReported(this.uiAlert, () =>
        preparation.use_custom_parameters
          ? this.uiPreparationStorage.update(preparation)
          : this.uiSettingsStorage.saveSettings(this.settings),
      );
      if (!saved) {
        parameters.brew_time = false;
      }
    } catch (ex) {
      this.uiLog.error('Brew - Time parameter hint failed', ex);
    }
  }

  // Known from the first render: the form swaps its header buttons once a
  // device counts as connected, and a swapped button loses the focus.
  public uiSmartScaleConnected: boolean = this.smartScaleConnected();
  public uiSmartScaleSupportsTaring: boolean = undefined;
  public uiPressureConnected: boolean = this.pressureDeviceConnected();
  public uiTemperatureConnected: boolean = this.temperatureDeviceConnected();
  public uiPreparationDeviceConnected: boolean = undefined;
  public uiPreparationDeviceType: PreparationDeviceType = undefined;
  public uiSmartScaleConnectedSupportsTwoWeights: boolean = undefined;
  public uiCustomMetricsKeys: string[] = [];

  private async setUIParams() {
    this.uiSmartScaleConnected = this.smartScaleConnected();
    this.uiCustomMetricsKeys = this.getCustomTraceKeys();
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

  /** Loads the reference the brew was made against; see loadReference. */
  private async readReferenceFlowProfile(_brew: Brew): Promise<void> {
    const reference = _brew.reference_flow_profile;
    if (!reference || reference.type === REFERENCE_GRAPH_TYPE.NONE) {
      return;
    }
    await this.uiAlert.showLoadingSpinner();
    try {
      await this.loadReference(this.flowReader.referencePath(reference) ?? '');
    } finally {
      await this.uiAlert.hideLoadingSpinner();
    }
  }

  /**
   * Reads a reference graph. One that cannot be read, e.g. because its brew
   * was deleted, is reported and leaves the current reference as it is.
   */
  private async loadReference(path: string): Promise<boolean> {
    const flow = await this.flowReader.read(path);
    if (!flow) {
      void this.uiToast.showInfoToast('REFERENCE_GRAPH_NOT_READ');
      return false;
    }
    this.reference_profile_raw = flow;
    return true;
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
    if (scale?.supportsTwoWeights === true) {
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
    let smartScaleConnected = false;
    let pressureConnected = false;
    let tempConnected = false;

    if (
      (this.pressureDeviceConnected() ||
        this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected()) &&
      this.data.getPreparation().style_type === PREPARATION_STYLE_TYPE.ESPRESSO
    ) {
      bluetoothDeviceConnections += 1;
      pressureConnected = true;
    }
    if (
      this.temperatureDeviceConnected() ||
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected()
    ) {
      bluetoothDeviceConnections += 1;
      tempConnected = true;
    }
    if (this.smartScaleConnected()) {
      bluetoothDeviceConnections += 1;
      smartScaleConnected = true;
    }

    let visualTilesCount =
      (smartScaleConnected ? 2 : 0) +
      (pressureConnected ? 1 : 0) +
      (tempConnected ? 1 : 0);

    if (visualTilesCount >= 4) {
      return 3;
    } else if (visualTilesCount === 3) {
      return 4;
    } else if (visualTilesCount === 2) {
      return 6;
    }
    return 12;
  }

  private toggleGraphElementsOnBaristaMode() {
    if (this.baristamode == true) {
      if (!this.showAdvancedBarista) {
        this.tileContainerEl.nativeElement.style.display = 'none';
        this.graphContainerEl.nativeElement.style.display = 'none';
      } else {
        this.tileContainerEl.nativeElement.style.display = 'block';
        this.graphContainerEl.nativeElement.style.display = 'block';
      }
    }
  }

  public toggleGraphOnBaristaMode() {
    this.showAdvancedBarista = !this.showAdvancedBarista;
    this.toggleGraphElementsOnBaristaMode();
  }

  public toggleChartLines(_type: string) {
    const id = liveSeriesId(_type);
    const hidden = new Set(this.hiddenSeries());
    const visible = hidden.has(id);
    if (visible) {
      hidden.delete(id);
    } else {
      hidden.add(id);
    }
    this.hiddenSeries.set(hidden);
    // Hides or shows the reference line of the series too.
    this.renderer?.setVisible(id, visible);
    this.checkChanges();
  }

  /** Keys of the custom metrics of the recorded brew. */
  public getCustomTraceKeys(): string[] {
    return this.liveBuffer
      .seriesIds()
      .filter(isCustomId)
      .map((id) => id.slice('custom:'.length));
  }

  /** Shows a shot imported from a machine in place of what was recorded. */
  public showShot(flow: BrewFlow): void {
    this.flow_profile_raw = flow;
    this.redrawGraph();
  }

  /**
   * Draws flow_profile_raw and reference_profile_raw anew, e.g. after a brew
   * was loaded or imported, a reference chosen or a device connected.
   */
  public redrawGraph(): void {
    this.graphIconColSize = this.getGraphIonColSize();
    void this.setUIParams();
    this.liveBuffer.load(this.flow_profile_raw);
    this.referenceBuffer.load(this.reference_profile_raw);
    this.setUpSeries();
    void this.mountGraph();
    this.updateChart();
    if (this.brewComponent?.maximizeFlowGraphIsShown) {
      // The maximized view sizes the graph on a resize.
      window.dispatchEvent(new Event('resize'));
    }
  }

  /** The series of the live graph, every fixed one and the recorded custom metrics. */
  private setUpSeries(): void {
    const colors = this.settings.graph_colors;
    const translate: Translate = (key) => String(this.translate.instant(key));
    const live: SeriesDef[] = [
      ...FIXED_SERIES_IDS.map((id) =>
        fixedSeriesDef(id, 'live', colors, translate),
      ),
      ...seriesDefsFor(this.liveBuffer, 'live', colors, translate).filter(
        (def) => isCustomId(def.id),
      ),
    ];
    const machine =
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() ===
      true;
    const browser = !this.platform.is('capacitor');
    const references = shownReferenceDefs(
      seriesDefsFor(this.referenceBuffer, 'reference', colors, translate),
      live,
      {
        pressure:
          (!!this.bleManager.getPressureDevice() &&
            this.getPreparation().style_type ===
              PREPARATION_STYLE_TYPE.ESPRESSO) ||
          machine ||
          browser,
        temperature:
          !!this.bleManager.getTemperatureDevice() || machine || browser,
      },
    );
    const defs = [...live, ...references];
    const hidden = initiallyHidden(
      live,
      graphSettingsFor(this.settings.graph, this.getPreparation().style_type),
    );
    this.seriesDefs.set(defs);
    this.hiddenSeries.set(hidden);
    this.uiCustomMetricsKeys = this.getCustomTraceKeys();
    this.showSeries();
  }

  /** Hands the series, their buffers and their visibility to the renderer. */
  private showSeries(): void {
    const renderer = this.renderer;
    if (!renderer) {
      return;
    }
    const defs = this.seriesDefs();
    const hidden = this.hiddenSeries();
    renderer.setSeries(defs);
    renderer.attach(this.liveBuffer);
    renderer.setReferences(
      defs.some((def) => def.kind === 'reference')
        ? this.referenceBuffer
        : null,
    );
    for (const def of defs) {
      renderer.setVisible(def.id, !hidden.has(def.id));
    }
  }

  /** Loads the chart library once and draws into the graph container. */
  private async mountGraph(): Promise<void> {
    if (this.renderer) {
      return;
    }
    const renderer = new UplotRenderer([], {
      minDrawIntervalMs: this.settings.graph_threshold_frequency_update
        ? this.settings.graph_threshold_frequency_interval
        : 0,
    });
    this.renderer = renderer;
    const el: HTMLElement = this.profileDiv.nativeElement;
    const host = this.graphHost ?? this.canvaContainer.nativeElement;
    try {
      await renderer.mount(el, {
        width: host.offsetWidth,
        height: this.graphHost ? host.offsetHeight : this.graphHeight,
        dark: this.theme.dark(),
        mode: 'live',
        axisSettings: this.settings,
        style: this.getPreparation().style_type,
      });
    } catch (error) {
      // Without the chart library the form works on without a graph.
      this.uiLog.error('Live graph could not be drawn', error);
      if (this.renderer === renderer) {
        this.renderer = null;
      }
      return;
    }
    if (this.renderer === renderer) {
      this.showSeries();
      this.updateChart();
    }
  }

  /** Redraws the live graph at the given size, e.g. after the host changed. */
  public resize(width: number, height: number): void {
    if (!this.graphHost) {
      this.graphHeight = height;
    }
    this.renderer?.resize(width, height);
  }

  /** Position and width of the graph inside its own container. */
  public graphBox(): { top: number; width: number } {
    const container: HTMLElement = this.canvaContainer.nativeElement;
    return { top: container.offsetTop, width: container.offsetWidth };
  }

  /** Shows the live graph in another host, e.g. the maximized view. */
  public moveGraphTo(host: HTMLElement): void {
    this.graphHost = host;
    host.append(this.profileDiv.nativeElement);
  }

  /** Puts the live graph back into its own container. */
  public restoreGraph(): void {
    this.graphHost = null;
    this.canvaContainer.nativeElement.append(this.profileDiv.nativeElement);
  }

  private async __connectPressureDevice(_firstStart: boolean) {
    // pressureDeviceConnected() is always true in the browser to preview the
    // graph, so only the real device decides whether there is one to talk to.
    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    if (pressureDevice) {
      this.deattachToPressureChange();

      if (!_firstStart) {
        /** IF we're a PRS or Bookoo-device we stop the transmission and start it after 300ms again **/
        try {
          await pressureDevice.disableValueTransmission();
        } catch (ex) {
          // A failed BLE write must not keep the brew from switching.
          this.uiLog.error('Pressure device - disable transmission failed', ex);
        }
        await sleep(300);
        if (this.bleManager.getPressureDevice() !== pressureDevice) {
          // Disconnected or replaced while waiting.
          return;
        }
      }
      if (_firstStart) {
        pressureDevice.updateZero();
      }
      pressureDevice.enableValueTransmission();
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
                  this.brewComponent.timer?.startTimer();
                  this.checkChanges();
                }
                break;
              case SCALE_TIMER_COMMAND.STOP:
                this.brewComponent.timer?.pauseTimer();
                this.checkChanges();
                break;
              case SCALE_TIMER_COMMAND.RESET:
                // HACK: We don't handle the rejection case for this promise
                //       for now, as that would require refactoring this event
                //       handler completely. Also, there really isn't much to
                //       do in case the dialog can't be shown?
                void this.uiAlert
                  .showConfirm(
                    'SCALE_RESET_TRIGGERED_DESCRIPTION',
                    'SCALE_RESET_TRIGGERED_TITLE',
                    true,
                  )
                  .then((choice) => {
                    if (choice === 'YES') {
                      this.brewComponent.timer?.reset();
                      this.checkChanges();
                    }
                  });

                break;
            }
          } else {
            if (this.brewComponent.timer?.isTimerRunning() === true) {
              this.brewComponent.timer?.pauseTimer();
            } else {
              this.brewComponent.timer?.startTimer();
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
            scale.tare();
          }
          await sleep(this.settings.bluetooth_command_delay);
        }

        if (this.settings.bluetooth_scale_stop_timer_on_brew === true) {
          if (scale) {
            scale.setTimer(SCALE_TIMER_COMMAND.STOP);
          }
          await sleep(this.settings.bluetooth_command_delay);
        }

        if (this.settings.bluetooth_scale_reset_timer_on_brew === true) {
          if (scale) {
            scale.setTimer(SCALE_TIMER_COMMAND.RESET);
          }
          await sleep(this.settings.bluetooth_command_delay);
        }
      }
      const brewRunning =
        this.brewComponent.timer?.isTimerRunning() === true &&
        _firstStart === false;
      if (brewRunning) {
        this.attachToScaleWeightChange();
      }
      // Always attach flow.
      this.attachToFlowChange();
      this.attachToTextToSpeechChange();

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
    if (!this.canWePlot()) {
      //Ignore this method
      return;
    }
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
          const grindWeight = this.data.grind_weight;
          let ratioText = '1 / ?';
          if (actualScaleWeight > 0 && grindWeight > 0) {
            ratioText = '1 / ' + (actualScaleWeight / grindWeight).toFixed(2);
          }
          ratioEl.textContent = '(' + ratioText + ')';
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

  /**
   * Sets the visible time range for the timer and the maximized view; the
   * renderer draws new samples on its own, at most once per frame.
   */
  public updateChart(): void {
    this.renderer?.setViewport(
      liveViewport({
        graphTime: this.settings.graph_time,
        style: this.getPreparation().style_type,
        maximized: this.brewComponent?.maximizeFlowGraphIsShown === true,
        timerRunning:
          this.recording ||
          this.brewComponent?.timer?.isTimerRunning() === true,
        hasSamples: this.liveBuffer.seriesIds().length > 0,
      }),
    );
  }

  private canWePlot(): boolean {
    if (!this.baristamode || (this.baristamode && this.showAdvancedBarista)) {
      return true;
    }
    return false;
  }

  public async timerReset(_event) {
    this.machineStopScriptWasTriggered = false;
    this.recording = false;
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
        this.stopFetchingAndSettingDataFromXenia();
      } else if (deviceType === PreparationDeviceType.METICULOUS) {
        this.stopFetchingDataFromMeticulous();
      } else if (deviceType === PreparationDeviceType.SANREMO_YOU) {
        this.stopFetchingDataFromSanremoYOU();

        if (this.baristamode) {
          this.startFetchingDataFromSanremoYOU();
        }
      } else if (deviceType === PreparationDeviceType.MOVE2) {
        this.stopFetchingDataFromMove2();
      }
    }

    if (scale || pressureDevice || temperatureDevice) {
      await this.uiAlert.showLoadingSpinner();
      if (scale) {
        scale.tare();
        await sleep(this.settings.bluetooth_command_delay);

        scale.setTimer(SCALE_TIMER_COMMAND.STOP);
        await sleep(this.settings.bluetooth_command_delay);

        scale.setTimer(SCALE_TIMER_COMMAND.RESET);
        await sleep(this.settings.bluetooth_command_delay);

        this.deattachToWeightChange();
        this.deattachToFlowChange();
        this.deattachToTextToSpeedChange();
        // 551 - Always attach to flow change, even when reset is triggerd
        this.attachToFlowChange();
        this.attachToTextToSpeechChange();
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
        // The file of the stored brew stays until the brew is saved, so
        // that leaving the form without saving keeps its graph.
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
        this.redrawGraph();
      }
      // Give the buttons a bit of time, 100ms won't be an issue for user flow
      await sleep(200);
      await this.uiAlert.hideLoadingSpinner();
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
      this.redrawGraph();

      // Give the buttons a bit of time, 100ms won't be an issue for user flow
      await sleep(200);
      await this.uiAlert.hideLoadingSpinner();
    }
  }

  public async timerPaused(_event) {
    this.recording = false;
    this.speakBrewEnd();
    const scale: BluetoothScale = this.bleManager.getScale();
    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    const temperatureDevice: TemperatureDevice =
      this.bleManager.getTemperatureDevice();
    if (scale || pressureDevice || temperatureDevice) {
      if (scale) {
        scale.setTimer(SCALE_TIMER_COMMAND.STOP);
        this.deattachToWeightChange();
        this.deattachToFlowChange();
        // The spoken weight stays attached: it is silent while paused, and a resume
        // from the scale button does not call timerResumed.
      }
      if (pressureDevice) {
        this.deattachToPressureChange();
      }
      if (temperatureDevice) {
        this.deattachToTemperatureChange();
      }
    }
    // A stopped brew is shown whole.
    this.updateChart();

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
          'PREPARATION_DEVICE.TYPE_XENIA.SCRIPT_STOP_FAILED',
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
      //Let this timeout stand, we don't want to have an await
      setTimeout(() => {
        this.brewComponent.timer?.reset();
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

    if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.MOVE2
    ) {
      if (
        _event !== 'shot_ended' &&
        this.machineStopScriptWasTriggered === false
      ) {
        this.machineStopScriptWasTriggered = true;
        this.uiLog.log(`MOVE2 - Pause button pressed, stop shot`);
        const prepDeviceCall: Move2Device = this.brewComponent
          ?.brewBrewingPreparationDeviceEl?.preparationDevice as Move2Device;
        prepDeviceCall.stopShot();
      }
      this.stopFetchingDataFromMove2();
    }

    if (!this.platform.is('capacitor')) {
      window.clearInterval(this.graphTimerTest);
    }
  }

  public async timerResumed(_event) {
    this.machineStopScriptWasTriggered = false;
    this.recording = true;
    const scale: BluetoothScale = this.bleManager.getScale();
    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    const temperatureDevice: TemperatureDevice =
      this.bleManager.getTemperatureDevice();
    const prepDeviceConnected =
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected();

    if (scale || pressureDevice || temperatureDevice || prepDeviceConnected) {
      if (scale) {
        scale.setTimer(SCALE_TIMER_COMMAND.START);
      }
      this.startingFlowTime = Date.now();

      // IF brewtime has some seconds, we add this to the delay directly.
      if (this.data.brew_time > 0) {
        this.startingFlowTime = moment()
          .subtract('seconds', this.data.brew_time)
          .toDate()
          .getTime();
      }

      if (scale) {
        this.attachToScaleWeightChange();
        this.attachToFlowChange();
        this.attachToTextToSpeechChange();
      }
      if (pressureDevice) {
        this.attachToPressureChange();
      }
      if (temperatureDevice) {
        this.attachToTemperatureChange();
      }
    }
    this.updateChart();
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

    let hasShotStarted = false;
    prepDeviceCall.connectToSocket().then((_connected) => {
      if (_connected) {
        this.uiLog.log(
          'Brew-Brewing-Graph - SanremoYOU - We connected to websocket',
        );
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
              if (this.baristamode) {
                return;
              } else {
                if (shotData.groupStatus === 6) {
                  //Accept this one, because user is doing a paddel
                } else {
                  return;
                }
              }
            }
            if (shotData.statusPhase != 0 && hasShotStarted === false) {
              if (this.baristamode) {
                if (this.smartScaleConnected()) {
                  const scale: BluetoothScale = this.bleManager.getScale();
                  if (scale.getWeight() !== 0) {
                    //Just tare if the scale is not zero yet.
                    scale.tare();
                  }
                }
              }
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
              this.brewComponent.timer?.initTimer(false);
              if (this.baristamode === true) {
                this.timerStarted('sanremo_barista_mode');
              }

              this.brewComponent.timer?.startTimer(false, false);

              this.updateChart();
              this.changeDetectorRef.detectChanges();
            } else if (shotData.statusPhase == 0 && hasShotStarted === true) {
              //The shot has been finished
              const smartScaleConnected: boolean = this.smartScaleConnected();
              if (this.baristamode && smartScaleConnected === false) {
                //If the barista mode is running and a smartscale is not connected, the timer would run endless, so we stop if there is no smart scale connected at all.
                this.brewComponent.timer?.pauseTimer('sanremo_you');
                this.stopFetchingDataFromSanremoYOU();
                this.updateChart();
                this.uiToast.showInfoToast(
                  'PREPARATION_DEVICE.TYPE_METICULOUS.SHOT_ENDED',
                );
                return;
              } else if (this.baristamode) {
                if (
                  this.brewComponent.timer?.isTimerRunning() === true &&
                  scaleShowsShotEnd(this.flow_profile_raw.weight)
                ) {
                  this.brewComponent.timer?.pauseTimer('sanremo_you');
                  this.stopFetchingDataFromSanremoYOU();
                  this.updateChart();
                  return;
                }
              }
            }

            if (hasShotStarted) {
              const temp = prepDeviceCall.getActualShotData().tempBoilerCoffe;
              const press = prepDeviceCall.getActualShotData().pumpPress;
              this.__setPressureFlow({ actual: press, old: press });
              this.__setTemperatureFlow({ actual: temp, old: temp });
              const waterDispensed =
                prepDeviceCall.getActualShotData().counterVol;
              this.__setWaterDispensedFlow({
                actual: waterDispensed,
                old: waterDispensed,
              });

              const realtimeFlowSecond =
                prepDeviceCall.getActualShotData().realtimeFlow;
              this.__setWaterDispensedFlowSecond({
                actual: realtimeFlowSecond,
                old: realtimeFlowSecond,
              });
            }
          }, 100);
        });
      } else {
        this.uiLog.error(
          'Brew-Brewing-Graph - SanremoYOU - We could not connect to websocket',
        );
        this.uiAlert.showMessage(
          'PREPARATION_DEVICE.TYPE_SANREMO_YOU.WE_COULD_NOT_CONNECT',
          undefined,
          undefined,
          true,
        );
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

    let hasShotStarted = false;
    prepDeviceCall.connectToSocket().then(
      (_connected) => {
        if (_connected) {
          void this.uiAlert.showLoadingSpinner(
            'PREPARATION_DEVICE.TYPE_METICULOUS.PROFILE_LOADED_SHOT_STARTING',
          );
          let lastState = '';
          this.meticulousInterval = setInterval(() => {
            const shotData: MeticulousShotData =
              prepDeviceCall.getActualShotData();

            if (shotData.extracting === true && hasShotStarted === false) {
              this.data.pressure_profile = shotData.loaded_profile;
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

              this.brewComponent.timer?.initTimer(false);
              this.brewComponent.timer?.startTimer(false, false);
              this.updateChart();
            } else if (
              shotData.extracting === false &&
              hasShotStarted === true
            ) {
              hasShotStarted = false;

              this.brewComponent.timer?.pauseTimer('meticulous');
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

              // Override weight-based flow with Meticulous gravimetric flow if available
              const flow = machineFlow(shotData.gravimetric_flow);
              if (flow !== undefined) {
                const lastRealtimeFlow =
                  this.flow_profile_raw.realtimeFlow[
                    this.flow_profile_raw.realtimeFlow.length - 1
                  ];
                if (lastRealtimeFlow) {
                  lastRealtimeFlow.flow_value = flow;
                  this.liveBuffer.replaceLast('realtimeFlow', flow);
                }
              }

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

  public startFetchingDataFromMove2() {
    const prepDeviceCall: Move2Device = this.brewComponent
      ?.brewBrewingPreparationDeviceEl?.preparationDevice as Move2Device;

    // To continuously poll the updated pressure from the class property:
    this.stopFetchingDataFromMove2();
    let grabbedFirstTimeTemperature = undefined;
    this.ngZone.runOutsideAngular(() => {
      this.move2FetchingInterval = setInterval(() => {
        const pressure = prepDeviceCall.getPressure();

        if (grabbedFirstTimeTemperature === undefined) {
          grabbedFirstTimeTemperature = prepDeviceCall.getTemperature();
        }
        //The temperature would drop, because the temperature is taken out of the boiler, so we sample the first grabbed temperature.
        const temperature: number = grabbedFirstTimeTemperature;

        this.__setPressureFlow({ actual: pressure, old: pressure });
        if (temperature !== undefined) {
          this.__setTemperatureFlow({ actual: temperature, old: temperature });
        }
      }, 100);
    });
  }

  public stopFetchingDataFromMove2() {
    if (this.move2FetchingInterval !== undefined) {
      clearInterval(this.move2FetchingInterval);
      this.move2FetchingInterval = undefined;
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
              scale.tare();
              await sleep(this.settings.bluetooth_command_delay);
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
    if (this.brewComponent.timer?.isTimerRunning()) {
      //Maybe we got temperature threshold, bar threshold, and weight threshold, it could be three triggers. so we ignore that one
      return;
    }
    this.machineStopScriptWasTriggered = false;
    this.recording = true;

    // Reset webhook flag here (not in attachToScaleWeightChange) so a
    // scale reconnect mid-shot cannot re-arm the webhook.
    this.webhookFired = false;

    const webhookCfg = this.settings?.brew_by_weight_webhook;

    // Capture target weight now, before brew_beverage_quantity gets
    // overwritten with the live scale reading during the shot.
    // Priority: field already set on this brew > defaultTargetWeight in settings.
    this.webhookTargetWeight =
      this.data.brew_beverage_quantity > 0
        ? this.data.brew_beverage_quantity
        : (webhookCfg?.defaultTargetWeight ?? 0);
    if (spokenBrewValues(this.settings).startAndEnd) {
      this.textToSpeech.speakInFull(
        this.translate.instant('TEXT_TO_SPEECH.BREW_STARTED'),
      );
    }
    const scale: BluetoothScale = this.bleManager.getScale();
    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    const temperatureDevice: TemperatureDevice =
      this.bleManager.getTemperatureDevice();
    const prepDeviceConnected =
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected();
    if (!this.platform.is('capacitor')) {
      let weight = 0;
      let realtime_flow = 0;
      let flow = 0;
      let pressure = 0;
      let temperature = 0;
      this.startingFlowTime = Date.now();

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
          if (spokenBrewValues(this.settings).weight) {
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

    if (scale || pressureDevice || temperatureDevice || prepDeviceConnected) {
      if (
        this.settings.bluetooth_scale_maximize_on_start_timer === true &&
        this.brewComponent.maximizeFlowGraphIsShown === false
      ) {
        // If maximizeFlowGraphIsShown===true, we already started once and resetted, don't show overlay again
        // First maximize, then go on with the timer, else it will lag hard.

        if (!this.baristamode) {
          //Just show overlay if not in barista mode
          if (scale || temperatureDevice || prepDeviceConnected) {
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
              'PREPARATION_DEVICE.TYPE_XENIA.SCRIPT_START_FAILED',
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
                  'PREPARATION_DEVICE.TYPE_XENIA.SCRIPT_START_RETRY',
                );
                prepDeviceCall
                  .startScript(
                    this.data.preparationDeviceBrew.params.scriptStartId,
                  )
                  .catch((_msg) => {
                    this.uiLog.log('We could not start script: ' + _msg);
                    this.uiToast.showInfoToast(
                      'PREPARATION_DEVICE.TYPE_XENIA.SCRIPT_START_FAILED',
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
            this.uiToast.showInfoToast('PREPARATION_DEVICE.SHOT_START_FAILED');
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
    } else if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.MOVE2
    ) {
      const prepDeviceCall: Move2Device = this.brewComponent
        .brewBrewingPreparationDeviceEl.preparationDevice as Move2Device;

      prepDeviceCall
        .startShot(this.data.preparationDeviceBrew.params as Move2Params)
        .catch((_msg) => {
          this.uiLog.log('We could not start shot on move2: ' + _msg);
          this.uiToast.showInfoToast('PREPARATION_DEVICE.SHOT_START_FAILED');
        });

      if (
        this.settings.bluetooth_scale_maximize_on_start_timer === true &&
        this.brewComponent.maximizeFlowGraphIsShown === false &&
        !this.baristamode
      ) {
        this.brewComponent.maximizeFlowGraph();
      }

      this.startFetchingDataFromMove2();
    }
  }

  public getAvgFlow(): number {
    const waterFlows: IBrewWaterFlow[] = this.flow_profile_raw.waterFlow;
    let calculatedFlow = 0;
    let foundEntries = 0;
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
      let scaleThresholdWasHit = false;
      await this.uiAlert.showLoadingSpinner();

      const pressureDevice: PressureDevice =
        this.bleManager.getPressureDevice();
      if (pressureDevice) {
        // Just update to zero if there is no threshold active
        pressureDevice.updateZero();
      }

      await this.timerReset(undefined);
      await this.brewComponent.timer?.resetWithoutEmit(false);

      if (scale.getScaleType() === ScaleType.VARIA_AKU) {
        //#878 When we start listening to the varia scale, somehow the tare is to slow/sensetive, and the timer directly starts when starting to listening.
        await sleep(this.settings.bluetooth_command_delay + 500);
      }

      this.brewComponent.timer?.checkChanges();
      this.checkChanges();

      await this.uiAlert.hideLoadingSpinner();

      this.uiToast.showInfoToast('SMART_SCALE_LISTENING_STARTED');
      this.scaleListeningSubscription = scale.flowChange.subscribe((_val) => {
        const weight: number = this.uiHelper.toFixedIfNecessary(_val.actual, 1);

        if (this.brewComponent.timer?.isTimerRunning()) {
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
                this.brewComponent.timer?.checkChanges();
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
    this.endSilenceWatch('scale');
  }

  public deattachToTextToSpeedChange() {
    if (this.textToSpeechWeightInterval) {
      clearInterval(this.textToSpeechWeightInterval);
      this.textToSpeechWeightInterval = undefined;
    }
  }

  /** The brew end stops what is still said; the time is said by the timer. */
  private speakBrewEnd() {
    if (spokenBrewValues(this.settings).startAndEnd) {
      this.textToSpeech.speak(
        this.translate.instant('TEXT_TO_SPEECH.BREW_ENDED'),
        true,
      );
    } else if (this.settings.text_to_speech_active) {
      this.textToSpeech.end();
    }
  }

  public deattachToPressureChange() {
    if (this.pressureDeviceSubscription) {
      this.pressureDeviceSubscription.unsubscribe();
      this.pressureDeviceSubscription = undefined;
    }
    this.endSilenceWatch('pressure');
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

      this.scaleFlowChangeSubscription = scale.flowChange.subscribe((_val) => {
        this.setActualSmartInformation();
        this.endSilenceWatch('scale');
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

      this.startSilenceWatch(
        'scale',
        scale.device_name,
        scale.getScaleType?.() === ScaleType.FUTULA,
      );
    }
  }

  /**
   * Shows a hint when the device sends nothing within DEVICE_SILENCE_MS. The
   * first value, a disconnect, a new attach and leaving the page end the watch.
   */
  private startSilenceWatch(
    _device: SilentDevice,
    _deviceName: string,
    _sendsOnlyOnChange: boolean,
  ) {
    this.endSilenceWatch(_device);
    this.silenceTimers[_device] = setTimeout(() => {
      this.silenceTimers[_device] = undefined;
      const hint = deviceSilenceHint({
        device: _device,
        sendsOnlyOnChange: _sendsOnlyOnChange,
        timerRunning: this.brewComponent.timer?.isTimerRunning() === true,
      });
      if (hint === null) {
        return;
      }
      this.uiLog.warn(
        `Device silence - ${_device} "${_deviceName}" sent no value within ${DEVICE_SILENCE_MS} ms on ${this.platform.platforms().join(',')}`,
      );
      this.silenceHints[_device].set(hint);
      // Said once; the first value removes the hint without a word.
      this.announcer.announce(
        this.translate.instant(hint),
        'polite',
        `device-silence-${_device}`,
      );
    }, DEVICE_SILENCE_MS);
  }

  private endSilenceWatch(_device: SilentDevice) {
    clearTimeout(this.silenceTimers[_device]);
    this.silenceTimers[_device] = undefined;
    if (this.silenceHints[_device]() !== null) {
      this.silenceHints[_device].set(null);
    }
  }

  /**
   * Says the weight the scale shows, before and during the brew. The graph value
   * is filtered and can freeze, and a start from the scale button skips timerStarted.
   */
  public attachToTextToSpeechChange() {
    this.deattachToTextToSpeedChange();
    if (
      !this.bleManager.getScale() ||
      !spokenBrewValues(this.settings).weight
    ) {
      return;
    }
    this.ngZone.runOutsideAngular(() => {
      this.textToSpeechWeightInterval = setInterval(() => {
        const timer = this.brewComponent.timer;
        const scale: BluetoothScale = this.bleManager.getScale();
        // A paused brew is silent.
        if (
          !scale ||
          (timer?.timer?.hasStarted === true && timer.isTimerRunning() !== true)
        ) {
          return;
        }
        this.textToSpeech.speak(
          spokenWeight(
            scale.getWeight(),
            spokenWeightDecimals(this.settings.text_to_speech_whole_grams),
            this.settings.language,
          ),
        );
      }, this.settings.text_to_speech_interval_rate);
    });
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
          this.endSilenceWatch('pressure');
          const actual: number = _val.actual;
          //Reset to 0, as a temporary fix to exclude the "451" bar
          if (actual > 15) {
            _val.actual = 0;
          }
          if (this.brewComponent.timer?.isTimerRunning()) {
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
                  this.brewComponent.timer?.checkChanges();
                  this.checkChanges();
                });
              });
            }
          }
        },
      );
      this.startSilenceWatch('pressure', pressureDevice.device_name, false);
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
          if (this.brewComponent.timer?.isTimerRunning()) {
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
                      scale.tare();
                      await sleep(this.settings.bluetooth_command_delay);
                    }
                  } catch (ex) {}
                }
                this.brewComponent.timerStartPressed('AUTO_START_TEMPERATURE');

                setTimeout(() => {
                  this.changeDetectorRef.markForCheck();
                  this.brewComponent.timer?.checkChanges();
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

    if (this.baristamode && this.brewComponent.getTime() <= 6) {
      /**Maybe the barista put on a new cup, which means the weight was before -XXX grams, and it may jump to like 5 grams then
       * this means we would regarding the rising factor never work correctly, so we ignore the first 6 seconds in barista mode and then we start**/

      return {
        actual: weight,
        old: oldWeight,
        smoothed: smoothedWeight,
        oldSmoothed: oldSmoothedWeight,
        notMutatedWeight: notMutatedWeight,
      };
    }
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
    /**
     * 11.05.25 - we've changed from weight<=0 to weight<0, to check the decrease.
     * Some scales need longer for a tare, so if you put something on, and you have a tare on new brew, it wouldn't trigger rightly here.
     * This was specialy on a varia scale, because the taring process takes like 1 sec actually, when you put like 60grams on the scale, the tared weight was zero, but the weight was <=0, and the decrease mechanismn thought that there is an issue
     */
    if (weight < 0 && isEspresso) {
      if (this.flowProfileTempAll.length >= 3) {
        let weAreDecreasing = false;
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
        // We checked that we're not going to decrease
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
          let risingFactorOK = true;

          /**
           * We try to match also turbo-shots which are like 7-8 grams.
           * Scales with just 3 values per second would be like 7 / 3 values per second = 2.33g increase each tick.
           * So we won't get jump from like 1 to 10 gram, then to like 40 grams
           * Update 26.08.24 - We change from 5 to 10, because we had one shot where the value jumped from 0 to 5,5 and we didn't track anymore
           */
          let plausibleEspressoWeightIncreaseBound = 10;
          if (this.baristamode) {
            /**
             * When we're in barista mode with the sanremo you, we don't support turbo shots actually, so having an increase of 3grams is plausible for each step
             * specially when using high precisioning scales and no poor scales
             */
            plausibleEspressoWeightIncreaseBound = 5;
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
    if (this.baristamode && this.brewComponent.getTime() <= 6) {
      // We don't want to calculcate the brew by weight in the first 6 seconds, because the scale can still reset
      return false;
    }
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
      const lastFlowValue = 0;

      const linearArray = [];

      const weightFlowCalc: IBrewWeightFlow[] =
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
      let thresholdHit = false;
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
            'PREPARATION_DEVICE.TYPE_XENIA.SCRIPT_START_FAILED',
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
          'PREPARATION_DEVICE.TYPE_XENIA.SCRIPT_STOP_FAILED',
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
      this.brewComponent.timer?.pauseTimer('xenia');
    } else {
      // We weight for the normal "setFlow" to stop the detection of the graph, there then aswell is the stop fetch of the xenia triggered.
    }
  }

  private triggerStopShotOnSanremoYOU(_actualScaleWeight) {
    const prepDeviceCall: SanremoYOUDevice = this.brewComponent
      .brewBrewingPreparationDeviceEl.preparationDevice as SanremoYOUDevice;

    this.uiLog.log(`Sanremo YOU Stop: ${_actualScaleWeight}`);
    prepDeviceCall.stopActualShot();
    this.uiToast.showInfoToast(
      'PREPARATION_DEVICE.TYPE_SANREMO_YOU.SHOT_ENDED',
    );

    // This will be just called once, we stopped the shot and now we check if we directly shall stop or not
    if (
      this.settings.bluetooth_scale_espresso_stop_on_no_weight_change === false
    ) {
      this.stopFetchingDataFromSanremoYOU();
      this.brewComponent.timer?.pauseTimer('sanremo_you');
    } else {
      // We weight for the normal "setFlow" to stop the detection of the graph, there then aswell is the stop fetch of the xenia triggered.
    }
  }

  private triggerStopShotOnMove2(_actualScaleWeight) {
    const prepDeviceCall: Move2Device = this.brewComponent
      .brewBrewingPreparationDeviceEl.preparationDevice as Move2Device;

    this.uiLog.log(`MOVE2 Stop: ${_actualScaleWeight}`);
    prepDeviceCall.stopShot();
    this.uiToast.showInfoToast('PREPARATION_DEVICE.TYPE_MOVE2.SHOT_ENDED');

    if (
      this.settings.bluetooth_scale_espresso_stop_on_no_weight_change === false
    ) {
      this.stopFetchingDataFromMove2();
      this.brewComponent.timer?.pauseTimer('shot_ended');
    } else {
      // We wait for the normal "hasEspressoShotEnded" to stop the graph and fetching
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
      this.baristaModeTargetWeight = undefined;
      let brewByWeightActive = false;
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
          case PreparationDeviceType.MOVE2:
            const prepMove2DeviceCall: Move2Device = this.brewComponent
              .brewBrewingPreparationDeviceEl.preparationDevice as Move2Device;
            residual_lag_time = prepMove2DeviceCall.getResidualLagTime();
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
        if (this.brewComponent.timer?.isTimerRunning() && prepDeviceConnected) {
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
              PreparationDeviceType.MOVE2 &&
            targetWeight > 0
          ) {
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
                this.triggerStopShotOnMove2(_val.actual);
              }
            }
          } else if (
            this.brewComponent.brewBrewingPreparationDeviceEl.getPreparationDeviceType() ===
              PreparationDeviceType.SANREMO_YOU &&
            this.data.preparationDeviceBrew.params.selectedMode !==
              SanremoYOUMode.LISTENING
          ) {
            if (this.baristamode) {
              if (this.baristaModeTargetWeight === undefined) {
                try {
                  const groupStatus = (
                    this.brewComponent.brewBrewingPreparationDeviceEl
                      .preparationDevice as SanremoYOUDevice
                  ).getActualShotData().groupStatus;
                  if (groupStatus !== 0) {
                    if (groupStatus === 1) {
                      this.baristaModeTargetWeight =
                        this.data.preparationDeviceBrew.params.stopAtWeightP1;
                    } else if (groupStatus === 2) {
                      this.baristaModeTargetWeight =
                        this.data.preparationDeviceBrew.params.stopAtWeightP2;
                    } else if (groupStatus === 3) {
                      this.baristaModeTargetWeight =
                        this.data.preparationDeviceBrew.params.stopAtWeightP3;
                    } else if (groupStatus === 4) {
                      this.baristaModeTargetWeight =
                        this.data.preparationDeviceBrew.params.stopAtWeightM;
                    }

                    //We overwrite for this shot the target weight, because we have a barista mode target weight
                    targetWeight = this.baristaModeTargetWeight;

                    residual_lag_time = (
                      this.brewComponent.brewBrewingPreparationDeviceEl
                        .preparationDevice as SanremoYOUDevice
                    ).getResidualLagTimeByProgram(groupStatus);

                    if (
                      document
                        .getElementById('statusPhase' + groupStatus)
                        .classList.contains('active') === false
                    ) {
                      document
                        .getElementById('statusPhase' + groupStatus)
                        .classList.add('active');
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

        // Generic brew-by-weight webhook. webhookFired is separate from
        // machineStopScriptWasTriggered so scale reconnect cannot re-arm it.
        // Predictive mode: uses calculateBrewByWeight with learnedLagTime,
        // pushing brewbyweight frames for post-brew lag learning. Only when
        // no prep device connected (avoids duplicate frames).
        // Direct mode: simple actual >= target.
        // Cheapest and most-selective check first: the large majority of
        // users never enable this, so bail out before doing any further work.
        if (
          this.settings.brew_by_weight_webhook?.active &&
          this.webhookFired === false &&
          this.webhookTargetWeight > 0 &&
          this.settings.brew_by_weight_webhook?.url?.trim() &&
          this.brewComponent.timer?.isTimerRunning()
        ) {
          const cfg = this.settings.brew_by_weight_webhook;
          let webhookThresholdHit: boolean;

          if (cfg.predictiveMode && !prepDeviceConnected) {
            webhookThresholdHit = this.calculateBrewByWeight(
              _val.actual,
              cfg.learnedLagTime ?? 0.5,
              this.webhookTargetWeight,
              true,
              scale,
            );
          } else {
            webhookThresholdHit = _val.actual >= this.webhookTargetWeight;
          }

          if (webhookThresholdHit) {
            this.webhookFired = true;
            triggerBrewByWeightWebhook(cfg, this.uiLog);
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

          const { weight, flow } = latestWeightAndFlow(
            this.flow_profile_raw.weight,
            this.flow_profile_raw.realtimeFlow,
          );
          (
            this.brewComponent.brewBrewingPreparationDeviceEl
              .preparationDevice as SanremoYOUDevice
          ).sendActualWeightAndFlowDataToMachine(
            weight,
            flow,
            this.baristaModeTargetWeight,
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
    this.stopFetchingDataFromMove2();

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

    if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.MOVE2
    ) {
      try {
        const prepDeviceCall: Move2Device = this.brewComponent
          .brewBrewingPreparationDeviceEl.preparationDevice as Move2Device;
        prepDeviceCall.destroy();
      } catch (ex) {}
    }
  }

  public ngOnDestroy() {
    // We don't deattach the timer subscription in the deattach toscale events, else we couldn't start anymore.
    this.destroy();
    this.graphSizes?.disconnect();
    this.renderer?.destroy();
    this.renderer = null;
  }

  /**
   * Loads the stored graph of the brew being edited. A file that cannot be
   * read is reported; it stays as it is, because an empty profile is not saved.
   */
  public async readFlowProfile(): Promise<void> {
    const flow = await this.flowReader.read(
      'brews/' + this.data.config.uuid + '_flow_profile.json',
    );
    if (flow) {
      this.flow_profile_raw = flow;
    } else {
      void this.uiToast.showInfoToast('BREW_GRAPH_NOT_READ');
    }
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

    const pressureObj = {
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

    this.pushPressureProfile(
      pressureObj.flowTimeSecond,
      pressureObj.actual,
      pressureObj.old,
    );

    if (!isSmartScaleConnected) {
      this.flowSecondTick++;

      /** We just support the end by pressure if no smart scale is connected, because the smart scale will be the master **/
      if (this.hasEspressoShotEndedWithPressure()) {
        this.brewComponent.timer?.pauseTimer('shot_ended');
        this.changeDetectorRef.markForCheck();
        this.brewComponent.timer?.checkChanges();
        this.checkChanges();
      }
    }

    this.setActualPressureInformation(pressureObj.actual);
  }

  private __setWaterDispensedFlow(_waterDispensed: any) {
    const actual: number = this.uiHelper.toFixedIfNecessary(
      _waterDispensed.actual,
      2,
    );

    const flowTimeSecond = (this.data.brew_time_milliseconds / 1000).toFixed(1);

    this.pushWaterDispensedProfile(flowTimeSecond, actual, _waterDispensed.old);
  }

  private __setWaterDispensedFlowSecond(_waterDispensedRealtime: any) {
    const actual: number = this.uiHelper.toFixedIfNecessary(
      _waterDispensedRealtime.actual,
      2,
    );

    const flowTimeSecond = (this.data.brew_time_milliseconds / 1000).toFixed(1);

    this.pushWaterDispensedFlowSecondProfile(
      flowTimeSecond,
      actual,
      _waterDispensedRealtime.old,
    );
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

    const temperatureObj = {
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

    this.pushTemperatureProfile(
      temperatureObj.flowTimeSecond,
      temperatureObj.actual,
      temperatureObj.old,
    );

    if (!isSmartScaleConnected) {
      this.flowSecondTick++;
    }

    this.setActualTemperatureInformation(temperatureObj.actual);
  }

  private __setFlowProfile(_scaleChange: any) {
    const weight: number = this.uiHelper.toFixedIfNecessary(
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
      notMutatedWeight: notMutatedWeight,
    };

    this.flowProfileTempAll.push(flowObj);

    if (this.flowTime !== this.brewComponent.getTime()) {
      // Old solution: We wait for 10 entries,
      // New solution: We wait for the new second, even when their are just 8 entries.
      let wrongFlow = false;
      let weightDidntChange = false;
      let sameFlowPerTenHerzCounter = 0;

      let flowHasSomeMinusValueInIt = false;

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

      let actualFlowValue = 0;

      if (wrongFlow === false) {
        // Overwrite to make sure to have the latest data to save.
        // Get the latest flow, why?? -> Because we're on a new time actually, and thats why we need to get the latest push value

        let calculatedFlowWeight = 0;
        for (const flowWeight of this.flowProfileArrCalculated) {
          calculatedFlowWeight += flowWeight;
        }

        const realtimeFlowSplit: IBrewRealtimeWaterFlow[] =
          this.flow_profile_raw.realtimeFlow.slice(
            -this.flowProfileArrCalculated.length,
          );
        const slopeWeight = 1 / realtimeFlowSplit.length;
        let avgCalculation = 0;
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

      for (const item of this.flowProfileArrObjs) {
        const waterFlow: IBrewWaterFlow = {} as IBrewWaterFlow;

        waterFlow.brew_time = this.flowTime.toString();
        waterFlow.timestamp = flowObj.flowTimestamp;
        waterFlow.value = actualFlowValue;
        this.flow_profile_raw.waterFlow.push(waterFlow);
        this.liveBuffer.appendSample(
          'flowPerSecond',
          waterFlow,
          actualFlowValue,
        );
      }

      this.__setScaleWeight(weight, wrongFlow, weightDidntChange);

      // Reset
      this.flowTime = this.brewComponent.getTime();
      this.flowSecondTick = 0;

      this.flowNCalculation = this.flowProfileArr.length;

      this.flowProfileArr = [];
      this.flowProfileArrObjs = [];
      this.flowProfileArrCalculated = [];
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

    this.flow_profile_raw.realtimeFlow.push(realtimeWaterFlow);
    this.liveBuffer.appendSample(
      'realtimeFlow',
      realtimeWaterFlow,
      realtimeWaterFlow.flow_value,
    );
    /* Realtime flow End **/

    if (
      prep.style_type === PREPARATION_STYLE_TYPE.ESPRESSO &&
      flowObj.weight >= this.settings.bluetooth_scale_first_drip_threshold
    ) {
      // If the drip timer is showing, we can set the first drip and not doing a reference to the normal weight.
      if (
        this.brewComponent.timer?.showDripTimer === true &&
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

    this.pushFlowProfile(
      flowObj.flowTimestamp,
      flowObj.flowTimeSecond,
      flowObj.weight,
      flowObj.oldWeight,
      flowObj.smoothedWeight,
      flowObj.oldSmoothedWeight,
      flowObj.notMutatedWeight,
    );

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
      if (
        this.brewComponent.brewBrewingPreparationDeviceEl.preparationDeviceConnected() &&
        this.brewComponent.brewBrewingPreparationDeviceEl.getPreparationDeviceType() ===
          PreparationDeviceType.MOVE2
      ) {
        this.stopFetchingDataFromMove2();
      }

      let isMeticulous = false;

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
        this.brewComponent.timer?.pauseTimer('shot_ended');
        this.changeDetectorRef.markForCheck();
        this.brewComponent.timer?.checkChanges();
        this.checkChanges();
      }
    }

    this.flowSecondTick = this.flowSecondTick + 1;
  }

  private __setFlowSecondProfile(_scaleChange: any) {
    const weight: number = this.uiHelper.toFixedIfNecessary(
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
      notMutatedWeight: notMutatedWeight,
    };

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

    this.flow_profile_raw.realtimeFlowSecond.push(realtimeWaterFlow);
    this.liveBuffer.appendSample(
      'realtimeFlowSecond',
      realtimeWaterFlow,
      realtimeWaterFlow.flow_value,
    );
    /* Realtime flow End **/

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

    // NEW GUARD: Do not end the shot if the machine is still actively extracting in Barista Mode
    if (this.baristamode) {
      const prepEl = this.brewComponent.brewBrewingPreparationDeviceEl;
      if (
        prepEl.preparationDeviceConnected() &&
        prepEl.getPreparationDeviceType() === PreparationDeviceType.SANREMO_YOU
      ) {
        const prepDevice = prepEl.preparationDevice as SanremoYOUDevice;
        if (prepDevice.getActualShotData().statusPhase !== 0) {
          return false;
        }
      }
    }

    return hasShotEndedByWeight(
      this.flow_profile_raw.weight,
      this.flow_profile_raw.realtimeFlow,
      {
        stopOnSteadyWeight:
          this.settings.bluetooth_scale_espresso_stop_on_no_weight_change,
        minFlow:
          this.settings
            .bluetooth_scale_espresso_stop_on_no_weight_change_min_flow,
        brewTime: this.data.brew_time,
        minimumWeight: shotEndMinimumWeight(
          this.data.grind_weight,
          this.baristamode,
          this.baristaModeTargetWeight,
        ),
        // A Sanremo YOU that stopped ends the shot below the minimum weight.
        endsBelowMinimumWeight: () =>
          this.baristamode &&
          (
            this.brewComponent.brewBrewingPreparationDeviceEl
              .preparationDevice as SanremoYOUDevice
          ).getActualShotData().statusPhase === 0,
      },
    );
  }

  private hasEspressoShotEndedWithPressure(): boolean {
    // Minimum 50 scale values which means atleast 5 seconds
    if (
      this.data.getPreparation().style_type !== PREPARATION_STYLE_TYPE.ESPRESSO
    ) {
      return false;
    }

    return hasShotEndedByPressure(this.flow_profile_raw.pressureFlow, {
      active: this.settings.pressure_threshold_stop_shot_active,
      thresholdBar: this.settings.pressure_threshold_stop_shot_bar,
      brewTime: this.data.brew_time,
    });
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
    this.liveBuffer.appendSample('weight', brewFlow, _actualWeight);
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
    this.liveBuffer.appendSample('weightSecond', brewFlow, _actualWeight);
  }

  private pushWaterDispensedProfile(
    _brewTime: string,
    _actual: number,
    _old: number,
  ) {
    if (!this.flow_profile_raw.waterDispensed) {
      this.flow_profile_raw.waterDispensed = [];
    }
    const waterDispensedFlow: any = {};
    waterDispensedFlow.timestamp =
      this.uiHelper.getActualTimeWithMilliseconds();
    waterDispensedFlow.brew_time = _brewTime;
    waterDispensedFlow.actual = _actual;
    waterDispensedFlow.old = _old;

    this.flow_profile_raw.waterDispensed.push(waterDispensedFlow);
    this.liveBuffer.appendSample('waterDispensed', waterDispensedFlow, _actual);
  }

  private pushWaterDispensedFlowSecondProfile(
    _brewTime: string,
    _actual: number,
    _old: number,
  ) {
    if (!this.flow_profile_raw.waterDispensedFlowSecond) {
      this.flow_profile_raw.waterDispensedFlowSecond = [];
    }
    const waterDispensedFlowSecond: any = {};
    waterDispensedFlowSecond.timestamp =
      this.uiHelper.getActualTimeWithMilliseconds();
    waterDispensedFlowSecond.brew_time = _brewTime;
    waterDispensedFlowSecond.actual = _actual;
    waterDispensedFlowSecond.old = _old;

    this.flow_profile_raw.waterDispensedFlowSecond.push(
      waterDispensedFlowSecond,
    );
    this.liveBuffer.appendSample(
      'waterDispensedFlowSecond',
      waterDispensedFlowSecond,
      _actual,
    );
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
    this.liveBuffer.appendSample('pressure', pressureFlow, _actualPressure);
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
    this.liveBuffer.appendSample(
      'temperature',
      temperatureFlow,
      _actualTemperature,
    );
  }

  /** Back in its own container the graph has the form's width and height. */
  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  public onOrientationChange() {
    if (this.baristamode === false && !this.graphHost) {
      this.resize(this.canvaContainer.nativeElement.offsetWidth, GRAPH_HEIGHT);
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
    let scriptInformation = '';

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

    await modal.present();
    const rData = await modal.onWillDismiss();
    if (rData?.data?.brew || rData?.data?.graph) {
      let flowProfileRtr = '';
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
      if (!(await this.loadReference(flowProfileRtr))) {
        return;
      }
      this.data.reference_flow_profile = refGraph;
      this.redrawGraph();
    } else if (rData?.data?.reset) {
      // Reset the reference flow profile
      this.data.reference_flow_profile = new ReferenceGraph();
      this.reference_profile_raw = new BrewFlow();
      this.redrawGraph();
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
              'PREPARATION_DEVICE.TYPE_XENIA.SCRIPT_START_FAILED',
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
                'PREPARATION_DEVICE.TYPE_XENIA.SCRIPT_START_FAILED',
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
    this.uiLog.log(
      `Setting last shot information: shotWeight=${shotWeight}, avgFlow=${avgFlow}, brewtime=${brewtime}`,
    );
    try {
      const prepDeviceCall: SanremoYOUDevice = this.brewComponent
        ?.brewBrewingPreparationDeviceEl?.preparationDevice as SanremoYOUDevice;

      this.smartScaleWeightPerSecondBaristaEl.nativeElement.innerText =
        shotWeight + 'g';
      this.smartScaleAvgFlowPerSecondBaristaEl.nativeElement.innerText =
        avgFlow + ' g/s';
      this.timerBaristaEl.nativeElement.innerText = brewtime + 's';
      this.lastShotEl.nativeElement.innerText =
        prepDeviceCall?.lastRunnedProgramm;
      if (prepDeviceCall.lastRunnedProgramm === 1) {
        this.lastShotEl.nativeElement.innerText = 'P1';
      } else if (prepDeviceCall.lastRunnedProgramm === 2) {
        this.lastShotEl.nativeElement.innerText = 'P2';
      } else if (prepDeviceCall.lastRunnedProgramm === 3) {
        this.lastShotEl.nativeElement.innerText = 'P3';
      } else if (prepDeviceCall.lastRunnedProgramm === 4) {
        this.lastShotEl.nativeElement.innerText = 'M';
      }

      this.shotVolumeEl.nativeElement.innerText =
        prepDeviceCall.getActualShotData().counterVol + 'ml';

      for (let i = 1; i < 5; i++) {
        document.getElementById('statusPhase' + i).classList.remove('active');
      }
    } catch (ex) {}
  }

  protected readonly BREW_FUNCTION_PIPE_ENUM = BREW_FUNCTION_PIPE_ENUM;
}
