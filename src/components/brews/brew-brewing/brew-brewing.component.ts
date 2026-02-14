import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  NgZone,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonBadge,
  IonButton,
  IonCard,
  IonCol,
  IonGrid,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonRange,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  ModalController,
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  analyticsOutline,
  download,
  expandOutline,
  globeOutline,
} from 'ionicons/icons';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { NgxStarsComponent, NgxStarsModule } from 'ngx-stars';
import { Subscription } from 'rxjs';

import { BrewPopoverExtractionComponent } from 'src/app/brew/brew-popover-extraction/brew-popover-extraction.component';
import { RefractometerDevice } from 'src/classes/devices/refractometerBluetoothDevice';
import { BrewBeverageQuantityCalculatorComponent } from '../../../app/brew/brew-beverage-quantity-calculator/brew-beverage-quantity-calculator.component';
import { BrewBrixCalculatorComponent } from '../../../app/brew/brew-brix-calculator/brew-brix-calculator.component';
import { BrewFlowComponent } from '../../../app/brew/brew-flow/brew-flow.component';
import { BrewMaximizeControlsComponent } from '../../../app/brew/brew-maximize-controls/brew-maximize-controls.component';
import { BrewRatioCalculatorComponent } from '../../../app/brew/brew-ratio-calculator/brew-ratio-calculator.component';
import { AppEvent } from '../../../classes/appEvent/appEvent';
import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { BrewFlow } from '../../../classes/brew/brewFlow';
import { ReferenceGraph } from '../../../classes/brew/referenceGraph';
import { BluetoothScale, sleep } from '../../../classes/devices';
import { Preparation } from '../../../classes/preparation/preparation';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { MeticulousDevice } from '../../../classes/preparationDevice/meticulous/meticulousDevice';
import { SanremoYOUDevice } from '../../../classes/preparationDevice/sanremo/sanremoYOUDevice';
import { XeniaDevice } from '../../../classes/preparationDevice/xenia/xeniaDevice';
import { Settings } from '../../../classes/settings/settings';
import BREW_TRACKING from '../../../data/tracking/brewTracking';
import { BeanOverlayDirective } from '../../../directive/bean-overlay.directive';
import { MillOverlayDirective } from '../../../directive/mill-overlay.directive';
import { PreparationOverlayDirective } from '../../../directive/preparation-overlay.directive';
import { PreparationToolOverlayDirective } from '../../../directive/preparation-tool-overlay.directive';
import { PreventCharacterDirective } from '../../../directive/prevent-character.directive';
import { RemoveEmptyNumberDirective } from '../../../directive/remove-empty-number.directive';
import { TransformDateDirective } from '../../../directive/transform-date';
import { WaterOverlayDirective } from '../../../directive/water-overlay.directive';
import { AppEventType } from '../../../enums/appEvent/appEvent';
import { BREW_FUNCTION_PIPE_ENUM } from '../../../enums/brews/brewFunctionPipe';
import { BREW_QUANTITY_TYPES_ENUM } from '../../../enums/brews/brewQuantityTypes';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { IBean } from '../../../interfaces/bean/iBean';
import { IMill } from '../../../interfaces/mill/iMill';
import { IPreparation } from '../../../interfaces/preparation/iPreparation';
import { BrewFieldOrder } from '../../../pipes/brew/brewFieldOrder';
import { BrewFieldVisiblePipe } from '../../../pipes/brew/brewFieldVisible';
import { BrewFunction } from '../../../pipes/brew/brewFunction';
import { KeysPipe } from '../../../pipes/keys';
import { ToFixedPipe } from '../../../pipes/toFixed';
import { DatetimePopoverComponent } from '../../../popover/datetime-popover/datetime-popover.component';
import {
  CoffeeBluetoothDevicesService,
  CoffeeBluetoothServiceEvent,
} from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { HapticService } from '../../../services/hapticService/haptic.service';
import { EventQueueService } from '../../../services/queueService/queue-service.service';
import { TextToSpeechService } from '../../../services/textToSpeech/text-to-speech.service';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIExcel } from '../../../services/uiExcel';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIHelper } from '../../../services/uiHelper';
import { UILog } from '../../../services/uiLog';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIToast } from '../../../services/uiToast';
import { UIWaterStorage } from '../../../services/uiWaterStorage';
import { BrewTimerComponent } from '../../brew-timer/brew-timer.component';
import { PhotoAddComponent } from '../../photo-add/photo-add.component';
import { TimerComponent } from '../../timer/timer.component';
import { BrewBrewingGraphComponent } from '../brew-brewing-graph/brew-brewing-graph.component';
import { BrewBrewingPreparationDeviceComponent } from '../brew-brewing-preparation-device/brew-brewing-preparation-device.component';

declare var cordova;

@Component({
  selector: 'brew-brewing',
  templateUrl: './brew-brewing.component.html',
  styleUrls: ['./brew-brewing.component.scss'],
  imports: [
    FormsModule,
    PreventCharacterDirective,
    RemoveEmptyNumberDirective,
    PreparationOverlayDirective,
    BeanOverlayDirective,
    MillOverlayDirective,
    TimerComponent,
    PreparationToolOverlayDirective,
    WaterOverlayDirective,
    BrewBrewingPreparationDeviceComponent,
    BrewBrewingGraphComponent,
    BrewTimerComponent,
    NgxStarsModule,
    TransformDateDirective,
    PhotoAddComponent,
    TranslatePipe,
    KeysPipe,
    ToFixedPipe,
    BrewFieldVisiblePipe,
    BrewFieldOrder,
    BrewFunction,
    IonCard,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    IonSelect,
    IonList,
    IonLabel,
    IonRow,
    IonCol,
    IonSelectOption,
    IonBadge,
    IonRange,
    IonTextarea,
    IonGrid,
  ],
})
export class BrewBrewingComponent implements OnInit, AfterViewInit {
  private readonly platform = inject(Platform);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly translate = inject(TranslateService);
  private readonly modalController = inject(ModalController);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  readonly uiBrewHelper = inject(UIBrewHelper);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiWaterStorage = inject(UIWaterStorage);
  private readonly bleManager = inject(CoffeeBluetoothDevicesService);
  readonly uiHelper = inject(UIHelper);
  private readonly modalCtrl = inject(ModalController);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiExcel = inject(UIExcel);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiPreparationHelper = inject(UIPreparationHelper);
  private readonly ngZone = inject(NgZone);
  private readonly uiToast = inject(UIToast);
  private readonly uiLog = inject(UILog);
  private readonly eventQueue = inject(EventQueueService);
  private readonly hapticService = inject(HapticService);
  private readonly textToSpeech = inject(TextToSpeechService);

  @ViewChild('timer', { static: false }) public timer: BrewTimerComponent;
  @ViewChild('brewBrewingGraphEl', { static: false })
  public brewBrewingGraphEl: BrewBrewingGraphComponent;
  @ViewChild('brewBrewingPreparationDeviceEl', { static: false })
  public brewBrewingPreparationDeviceEl: BrewBrewingPreparationDeviceComponent;

  @ViewChild('brewTemperatureTime', { static: false })
  public brewTemperatureTime: TimerComponent;
  @ViewChild('brewCoffeeBloomingTime', { static: false })
  public brewCoffeeBloomingTime: TimerComponent;
  @ViewChild('brewFirstDripTime', { static: false })
  public brewFirstDripTime: TimerComponent;
  @ViewChild('brewStars', { read: NgxStarsComponent, static: false })
  public brewStars: NgxStarsComponent;
  @ViewChild('brewMillTimer', { static: false })
  public brewMillTimer: TimerComponent;
  @ViewChild('calculatedCoffeeBrewTime', { static: false })
  public calculatedCoffeeBrewTime: ElementRef;

  @Input() public data: Brew;
  @Input() public brewTemplate: Brew;
  @Input() public brewFlowPreset: BrewFlow;

  @Input() public beanPreset: Bean;

  @Input() public loadSpecificLastPreparation: Preparation;
  @Input() public isEdit: boolean = false;
  @Output() public dataChange = new EventEmitter<Brew>();

  @Input('baristamode') public baristamode: boolean = false;
  @Output() public lastShotInformation = new EventEmitter();

  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  public brewQuantityTypeEnums = BREW_QUANTITY_TYPES_ENUM;
  public settings: Settings;
  public customCreationDate: string = '';
  public displayingBrewTime: string = '';

  public maxBrewRating: number = 5;

  public refractometerDeviceSubscription: Subscription = undefined;
  private preparationMethodFocusedSubscription: Subscription = undefined;

  public brewFlowGraphSubject: EventEmitter<any> = new EventEmitter();
  public brewFlowGraphSecondSubject: EventEmitter<any> = new EventEmitter();
  public brewPressureGraphSubject: EventEmitter<any> = new EventEmitter();
  public brewTemperatureGraphSubject: EventEmitter<any> = new EventEmitter();
  public brewTimerTickedSubject: EventEmitter<any> = new EventEmitter();
  public maximizeFlowGraphIsShown: boolean = false;

  public preparationDevice: XeniaDevice | MeticulousDevice = undefined;

  public bluetoothSubscription: Subscription = undefined;

  public PREPARATION_DEVICE_TYPE_ENUM = PreparationDeviceType;
  public readonly PreparationDeviceType = PreparationDeviceType;

  public typeaheadSearch = {};

  public choosenPreparation: Preparation = undefined;

  public uiShowSectionAfterBrew: boolean = false;
  public uiShowSectionWhileBrew: boolean = false;
  public uiShowSectionBeforeBrew: boolean = false;
  public uiHasWaterEntries: boolean = false;
  public uiHasActivePreparationTools: boolean = false;
  public uiRefractometerConnected: boolean = false;

  constructor() {
    addIcons({ globeOutline, download, expandOutline, analyticsOutline });
  }

  public openURL(_url) {
    if (_url) {
      this.uiHelper.openExternalWebpage(_url);
    }
  }
  public setUIParams() {
    const _uiShowSectionAfterBrew = this.showSectionAfterBrew();
    const _uiShowSectionWhileBrew = this.showSectionWhileBrew();
    const _uiShowSectionBeforeBrew = this.showSectionBeforeBrew();
    this.uiShowSectionAfterBrew = _uiShowSectionAfterBrew;
    this.uiShowSectionWhileBrew = _uiShowSectionWhileBrew;
    this.uiShowSectionBeforeBrew = _uiShowSectionBeforeBrew;
    this.uiHasWaterEntries = this.hasWaterEntries();
    this.uiHasActivePreparationTools =
      this.getActivePreparationTools().length > 0;
    this.uiRefractometerConnected = this.refractometerConnected();
  }
  public pinFormatter(value: any) {
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return `${0}`;
    }
    const newValue = +parsedFloat.toFixed(2);
    return `${newValue}`;
  }

  public getActivePreparationTools() {
    return this.choosenPreparation.tools.filter((e) => e.archived === false);
  }

  private async _waiUntilGraphAndPreparationElementIsThere() {
    if (this.brewBrewingGraphEl && this.brewBrewingPreparationDeviceEl) {
      await this.brewBrewingPreparationDeviceEl.instancePreparationDevice();
    } else {
      for (let i = 0; i < 10; i++) {
        await sleep(250);
        if (this.brewBrewingGraphEl && this.brewBrewingPreparationDeviceEl) {
          await this.brewBrewingPreparationDeviceEl.instancePreparationDevice();
          break;
        }
      }
      return;
    }
  }

  public async ngAfterViewInit() {
    setTimeout(async () => {
      /**We need to track the state if the brewing was visible on start, because if not we need to give some time for the graph to start**/
      const uiSectionWhileBrewingVisibleOnStart = this.uiShowSectionWhileBrew;
      // If we wouldn't wait in the timeout, the components wouldnt be existing
      if (this.isEdit === false) {
        // We need a short timeout because of ViewChild, else we get an exception

        if (this.baristamode === false) {
          if (this.brewTemplate) {
            await this.__loadBrew(this.brewTemplate, true);
          } else if (this.loadSpecificLastPreparation) {
            const foundBrews: Array<Brew> = UIBrewHelper.sortBrews(
              this.uiBrewStorage
                .getAllEntries()
                .filter(
                  (e) =>
                    e.method_of_preparation ===
                    this.loadSpecificLastPreparation.config.uuid,
                ),
            );
            if (foundBrews.length > 0) {
              await this.__loadBrew(foundBrews[0], false);
            } else {
              /** We start an empty new brew, and set the preparation method for it
               * so when the next brew will come, data can or will be preset
               * **/
              const newBrew = new Brew();
              newBrew.method_of_preparation =
                this.loadSpecificLastPreparation.config.uuid;
              await this.__loadBrew(newBrew, false);
            }
          } else {
            await this.__loadLastBrew();
          }
        } else {
          await this._waiUntilGraphAndPreparationElementIsThere();
        }
        this.setChoosenPreparation();
      } else {
        this.setChoosenPreparation();
        if (this.timer) {
          this.timer.setTime(
            this.data.brew_time,
            this.data.brew_time_milliseconds,
          );
        }

        // If the preparation method is customized, and we're in the edit view, we need to check if custom parameters are used
        // #570
        let checkData;
        if (this.getPreparation().use_custom_parameters === true) {
          checkData = this.getPreparation();
        } else {
          checkData = this.settings;
        }

        if (this.brewMillTimer && checkData.manage_parameters.mill_timer) {
          this.brewMillTimer.setTime(
            this.data.mill_timer,
            this.data.mill_timer_milliseconds,
          );
        }

        if (
          this.brewTemperatureTime &&
          checkData.manage_parameters.brew_temperature_time
        ) {
          this.brewTemperatureTime.setTime(
            this.data.brew_temperature_time,
            this.data.brew_temperature_time_milliseconds,
          );
        }
        if (
          this.brewCoffeeBloomingTime &&
          checkData.manage_parameters.coffee_blooming_time
        ) {
          this.brewCoffeeBloomingTime.setTime(
            this.data.coffee_blooming_time,
            this.data.coffee_blooming_time_milliseconds,
          );
        }
        if (
          this.brewFirstDripTime &&
          checkData.manage_parameters.coffee_first_drip_time
        ) {
          this.brewFirstDripTime.setTime(
            this.data.coffee_first_drip_time,
            this.data.coffee_first_drip_time_milliseconds,
          );
        }
      }

      if (this.beanPreset && this.beanPreset?.config?.uuid) {
        /**We got called from an internal identifier to start a brew directly with this bean.**/
        this.data.bean = this.beanPreset.config.uuid;
      }

      /**
       * We removed this line, because we loaded the preparation device element twice, because it was already loaded fron the last brew
       */
      /** if (this.brewBrewingPreparationDeviceEl && !this.brewBrewingPreparationDeviceEl.hasAPreparationDeviceSet()) {
              await this.brewBrewingPreparationDeviceEl?.instance();
            }**/

      const uiSectionWhileBrewingVisibleOnEnd = this.uiShowSectionWhileBrew;
      if (
        uiSectionWhileBrewingVisibleOnStart === false &&
        uiSectionWhileBrewingVisibleOnEnd === true
      ) {
        //Ok we need to wait 250ms, because else the brewGraph won't be visible
        /**
         * This happens, when a preparation was customized and is on top to load, where the while brewing was not visible.
         * if you swap then to another preparation method, the graph will never be loaded.
         */
        await sleep(250);
      }

      if (this.brewBrewingGraphEl) {
        if (this.isEdit === false && this.brewFlowPreset) {
          this.brewBrewingGraphEl.reference_profile_raw =
            this.uiHelper.cloneData(this.brewFlowPreset);
        }

        await this.brewBrewingGraphEl?.instance();
      }

      this.bluetoothSubscription = this.bleManager
        .attachOnEvent()
        .subscribe((_type) => {
          if (_type === CoffeeBluetoothServiceEvent.CONNECTED_REFRACTOMETER) {
            this.__connectRefractometerDevice(false);
          } else if (
            _type === CoffeeBluetoothServiceEvent.DISCONNECTED_REFRACTOMETER
          ) {
            this.deattachToRefractometerChange();
          }
          this.setUIParams();
          this.checkChanges();
          /**THe check changes is needed, else the values are not interpolated to all other components**/
          this.timer.checkChanges();
        });

      if (this.refractometerConnected()) {
        await this.__connectRefractometerDevice(true);
      }

      // Trigger change rating
      this.changedRating();
    });
  }

  public resetPreparationTools() {
    setTimeout(() => {
      this.data.method_of_preparation_tools = [];

      if (this.brewBrewingPreparationDeviceEl) {
        this.brewBrewingPreparationDeviceEl.instancePreparationDevice().then(
          () => {
            this.checkChanges();
          },
          () => {
            this.checkChanges();
          },
        );
      }

      if (this.timer?.isTimerRunning() === false) {
        this.brewBrewingGraphEl.initializeFlowChart();
      }
    }, 150);
  }

  public async maximizeControlButtons() {
    const modal = await this.modalController.create({
      component: BrewMaximizeControlsComponent,

      id: BrewMaximizeControlsComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      componentProps: {
        brewComponent: this,
        brew: this.data,
        brewTimerTickedEvent: this.brewTimerTickedSubject,
      },
    });

    await modal.present();
    await modal.onWillDismiss().then(async () => {
      await sleep(50);
      this.brewBrewingGraphEl.onOrientationChange();
    });
  }

  public async chooseGraphToSetAsReference() {
    this.brewBrewingGraphEl.chooseGraphToSetAsReference();
  }

  public async maximizeFlowGraph() {
    if (this.maximizeFlowGraphIsShown === true) {
      return;
    }
    this.maximizeFlowGraphIsShown = true;

    const modal = await this.modalController.create({
      component: BrewFlowComponent,

      id: BrewFlowComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      componentProps: {
        brewComponent: this,
        brew: this.data,
        brewFlowGraphEvent: this.brewFlowGraphSubject,
        brewFlowGraphSecondEvent: this.brewFlowGraphSecondSubject,
        brewPressureGraphEvent: this.brewPressureGraphSubject,
        brewTemperatureGraphEvent: this.brewTemperatureGraphSubject,
        brewTimerTickedEvent: this.brewTimerTickedSubject,
      },
    });

    // will force rerender :D
    this.brewBrewingGraphEl.lastChartRenderingInstance = -1;

    await modal.present();
    this.brewBrewingGraphEl.checkChanges();
    await modal.onWillDismiss().then(async () => {
      this.maximizeFlowGraphIsShown = false;
      // will force rerender :D
      this.brewBrewingGraphEl.lastChartRenderingInstance = -1;
      // If responsive would be true, the add of the container would result into 0 width 0 height, therefore the hack
      this.brewBrewingGraphEl.updateChart();


      await sleep(50);
      this.brewBrewingGraphEl.onOrientationChange();
    });
  }

  public ngOnDestroy() {
    // We don't deattach the timer subscription in the deattach toscale events, else we couldn't start anymore.
    if (this.bluetoothSubscription) {
      this.bluetoothSubscription.unsubscribe();
      this.bluetoothSubscription = undefined;
    }
    this.deattachToRefractometerChange();
    this.deattachToPreparationMethodFocused();
    try {
      this.brewBrewingGraphEl?.destroy();
    } catch (ex) {}
  }

  public preparationMethodFocused() {
    this.deattachToPreparationMethodFocused();
    const eventSubs = this.eventQueue.on(
      AppEventType.PREPARATION_SELECTION_CHANGED,
    );
    this.preparationMethodFocusedSubscription = eventSubs.subscribe((next) => {
      this.setChoosenPreparation();
      this.resetPreparationTools();
      this.deattachToPreparationMethodFocused();
      /**If we change the preparation method, we need to inform our graph-element, because we may need to disconnect the pressure device**/
      this.brewBrewingGraphEl?.preparationChanged();
    });
  }

  public refractometerConnected() {
    if (!this.platform.is('capacitor')) {
      return true;
    }

    const refractometer: RefractometerDevice =
      this.bleManager.getRefractometerDevice();
    return !!refractometer;
  }

  public attachToRefractometerChanges() {
    if (this.refractometerConnected()) {
      this.deattachToRefractometerChange();
      const refractometerDevice = this.bleManager.getRefractometerDevice();
      this.refractometerDeviceSubscription =
        refractometerDevice.resultEvent.subscribe(async () => {
          this.uiLog.log('Got Refractometer Read');
          this.data.tds = refractometerDevice.getLastReading().tds;
          this.uiLog.log(
            'Got Refractometer Read - Set new value:' + this.data.tds,
          );
          await this.uiAlert.hideLoadingSpinner();
          this.uiToast.showInfoToastBottom('REFRACTOMETER.READ_END');
          this.checkChanges();
        });
    }
  }

  public setCoffeeDripTime($event): void {
    this.data.coffee_first_drip_time = this.getTime();
    if (this.settings.brew_milliseconds) {
      this.data.coffee_first_drip_time_milliseconds =
        this.timer.getMilliseconds();
    }
    this.brewFirstDripTime?.setTime(
      this.data.coffee_first_drip_time,
      this.data.coffee_first_drip_time_milliseconds,
    );

    this.brewBrewingGraphEl.setFirstDripFromMachine();
  }

  private speakCurrentScaleWeight(_value: number) {
    if (this.settings.text_to_speech_active) {
      this.textToSpeech.speak(
        this.translate.instant('BREW_FLOW_WEIGHT') + ' ' + _value.toString(),
        true,
      );
    }
  }

  public bluetoothScaleSetGrindWeight() {
    this.data.grind_weight = this.getActualBluetoothWeight();
    this.speakCurrentScaleWeight(this.data.grind_weight);
    this.checkChanges();
  }

  public bluetoothScaleSetBeanWeightIn() {
    this.data.bean_weight_in = this.getActualBluetoothWeight();
    this.speakCurrentScaleWeight(this.data.bean_weight_in);
    this.checkChanges();
  }

  public bluetoothScaleSetBrewQuantityWeight() {
    this.data.brew_quantity = this.getActualBluetoothWeight();
    this.speakCurrentScaleWeight(this.data.brew_quantity);
    this.checkChanges();
  }

  public bluetoothScaleSetBrewBeverageQuantityWeight() {
    let vesselWeight: number = 0;
    if (this.data.vessel_weight > 0) {
      vesselWeight = this.data.vessel_weight;
    }
    this.data.brew_beverage_quantity = this.uiHelper.toFixedIfNecessary(
      this.getActualBluetoothWeight() - vesselWeight,
      2,
    );
    this.checkChanges();
  }

  public deattachToRefractometerChange() {
    if (this.refractometerDeviceSubscription) {
      this.refractometerDeviceSubscription.unsubscribe();
      this.refractometerDeviceSubscription = undefined;
    }
  }

  public deattachToPreparationMethodFocused() {
    if (this.preparationMethodFocusedSubscription) {
      this.preparationMethodFocusedSubscription.unsubscribe();
      this.preparationMethodFocusedSubscription = undefined;
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
    /** if (this.loadSpecificLastPreparation) {
          this.forceSetPreparation(this.loadSpecificLastPreparation);
        } else {
          this.setChoosenPreparation();
        }**/
    this.setChoosenPreparation();
  }

  public getTime(): number {
    if (this.timer) {
      return this.timer.getSeconds();
    }

    return 0;
  }

  public async startListeningToScaleChange($event) {
    this.brewBrewingGraphEl.startListeningToScaleChange($event);
  }

  public async timerStarted(_event) {
    if (this.timer.isTimerRunning()) {
      //Maybe we got temperature threshold, bar threshold, and weight threshold, it could be three triggers. so we ignore that one
      return;
    }
    this.brewBrewingGraphEl.timerStarted(_event);
    if (
      this.settings.haptic_feedback_active &&
      this.settings.haptic_feedback_brew_started
    ) {
      this.hapticService.vibrate();
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
      this.data.coffee_blooming_time_milliseconds,
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
    this.writeCalculatedCoffeeBrewTime();
    this.brewTimerTickedSubject.next(true);
  }

  private writeCalculatedCoffeeBrewTime() {
    this.ngZone.runOutsideAngular(() => {
      if (this.calculatedCoffeeBrewTime?.nativeElement) {
        window.requestAnimationFrame(() => {
          this.calculatedCoffeeBrewTime.nativeElement.innerHTML =
            this.data.getFormattedCoffeeBrewTime();
        });
      }
    });
  }

  public async timerStartPressed(_event) {
    if (this.data.brew_time > 0) {
      if (
        this.brewBrewingGraphEl.smartScaleConnected() ||
        this.brewBrewingGraphEl.pressureDeviceConnected() ||
        this.brewBrewingGraphEl.temperatureDeviceConnected() ||
        !this.platform.is('capacitor')
      ) {
        this.uiAlert.showMessage(
          'BREW_CANT_START_BECAUSE_TIMER_NOT_RESETTED_DESCRIPTION',
          'BREW_CANT_START_BECAUSE_TIMER_NOT_RESETTED_TITLE',
          undefined,
          true,
        );
        return;
      } else if (
        this.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
        this.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
          PreparationDeviceType.METICULOUS
      ) {
        this.uiAlert.showMessage(
          'BREW_CANT_START_BECAUSE_TIMER_NOT_RESETTED_GENERAL_DESCRIPTION',
          'BREW_CANT_START_BECAUSE_TIMER_NOT_RESETTED_TITLE',
          undefined,
          true,
        );
        return;
      }
    }
    await this.brewBrewingGraphEl.timerStartPressed(_event);

    if (
      _event !== 'AUTO_LISTEN_SCALE' &&
      _event !== 'AUTO_START_PRESSURE' &&
      _event !== 'AUTO_START_TEMPERATURE'
    ) {
      if (this.settings.brew_timer_start_delay_active) {
        await new Promise((resolve) => {
          let delayCounter = this.settings.brew_timer_start_delay_time;
          this.uiAlert.showLoadingSpinner(
            this.translate.instant('STARTING_IN', {
              time: delayCounter,
            }),
          );
          const delayIntv = setInterval(() => {
            delayCounter = delayCounter - 1;
            if (delayCounter <= 0) {
              this.uiAlert.hideLoadingSpinner();
              clearInterval(delayIntv);
              resolve(undefined);
            } else {
              this.uiAlert.setLoadingSpinnerMessage(
                this.translate.instant('STARTING_IN', {
                  time: delayCounter,
                }),
                false,
              );
            }
          }, 1000);
        });
      }
    }

    /** We need to do check changes, because the resolve with the timer start delay, destroys the angualr focus, so the graph does not update anymore when you come from the Detail-Repeat view (Don't ask me why) **/
    this.checkChanges();

    await this.timerStarted(_event);
    this.timer.startTimer();
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

    this.brewBrewingGraphEl.coffeeFirstDripTimeChanged(_event);
  }

  public async timerResumedPressed(_event) {
    await this.timerResumed(_event);
    this.timer.resumeTimer();
  }

  public async timerResumed(_event) {
    await this.brewBrewingGraphEl.timerResumed(_event);
  }

  public ignoreWeightClicked() {
    this.brewBrewingGraphEl.ignoreWeightClicked();
  }

  public unignoreWeightClicked() {
    this.brewBrewingGraphEl.unignoreWeightClicked();
  }

  public async timerPaused(_event) {
    await this.brewBrewingGraphEl.timerPaused(_event);
    if (this.baristamode) {
      try {
        if (
          this.brewBrewingGraphEl.flow_profile_raw &&
          this.brewBrewingGraphEl.flow_profile_raw.weight.length > 0
        ) {
          const prepSanremoDeviceCall: SanremoYOUDevice = this
            .brewBrewingPreparationDeviceEl
            .preparationDevice as SanremoYOUDevice;

          const lastRunnedProgramm = prepSanremoDeviceCall.lastRunnedProgramm;
          let oldResidualLagTime =
            prepSanremoDeviceCall.getResidualLagTimeByProgram(
              lastRunnedProgramm,
            );

          // 1. Calculate the new value
          const newLagTime = this.calculateNextResidualLagTime(
            this.brewBrewingGraphEl.flow_profile_raw,
            oldResidualLagTime,
          );

          // 2. Update and Save if changed
          if (newLagTime !== oldResidualLagTime) {
            this.uiLog.log(
              `[BBW] Auto-adjusting Lag Time from ${oldResidualLagTime} to ${newLagTime}`,
            );
            await this.brewBrewingPreparationDeviceEl.setResidualLagTimeByProgram(
              lastRunnedProgramm,
              newLagTime,
            );
          }
        }
      } catch (ex) {}

      try {
        const shotWeight = this.data.brew_beverage_quantity;
        const avgFlow = this.uiHelper.toFixedIfNecessary(
          this.brewBrewingGraphEl.getAvgFlow(),
          2,
        );

        this.brewBrewingGraphEl.setLastShotInformation(
          shotWeight,
          avgFlow,
          this.data.brew_time,
        );
        this.lastShotInformation.emit({
          shotWeight: shotWeight,
          avgFlow: avgFlow,
          brewtime: this.data.brew_time,
        });
      } catch (ex) {}
    }
    if (
      this.settings.haptic_feedback_active &&
      this.settings.haptic_feedback_brew_stopped
    ) {
      this.hapticService.vibrate();
    }
    if (this.settings.brew_save_automatic_active && !this.baristamode) {
      const delayTimer = this.settings.brew_save_automatic_active_delay;
      const response = await this.uiToast.showAutomaticSaveTimer(delayTimer);
      if (response !== 'cancel') {
        this.eventQueue.dispatch(
          new AppEvent(AppEventType.BREW_AUTOMATIC_SAVE, undefined),
        );

        setTimeout(() => {
          try {
            this.modalController.dismiss(
              null,
              null,
              BrewFlowComponent.COMPONENT_ID,
            );
            this.modalController.dismiss(
              null,
              null,
              BrewMaximizeControlsComponent.COMPONENT_ID,
            );
          } catch (ex) {}
        }, 250);
      }
    }
  }

  private calculateNextResidualLagTime(
    history: BrewFlow,
    currentLag: number,
  ): number {
    const MIN_LAG = 0.1;
    const MAX_LAG = 2.0;
    const STEP_SIZE = 0.05;
    const SMOOTHING_FACTOR = 0.5;

    // 1. Find the trigger frame (when stop was requested)
    const triggerFrame = history.brewbyweight.find(
      (row) => row.calc_exceeds_weight === true,
    );

    // Safety: If manual stop (no trigger found), do nothing
    if (!triggerFrame) {
      return currentLag;
    }

    // 2. Get Data
    // Ensure we parse numbers correctly
    const flowAtTrigger = triggerFrame.average_flow_rate;
    const targetWeight = triggerFrame.target_weight;

    // Use the very last weight recorded as the final result
    const finalFrame = history.brewbyweight[history.brewbyweight.length - 1];
    const finalWeight: number = finalFrame.actual_scale_weight;

    // Safety: Invalid flow
    if (!flowAtTrigger || flowAtTrigger < 0.1) {
      return currentLag;
    }

    // 3. Calculate Logic
    const weightError = finalWeight - targetWeight;
    const timeCorrection = weightError / flowAtTrigger;
    const idealLag = currentLag + timeCorrection;

    // 4. Smoothing
    let newLag =
      currentLag * (1 - SMOOTHING_FACTOR) + idealLag * SMOOTHING_FACTOR;

    // 5. Constraints
    if (newLag < MIN_LAG) newLag = MIN_LAG;
    if (newLag > MAX_LAG) newLag = MAX_LAG;

    // 6. Rounding to 0.05
    return parseFloat(
      Number(Math.round(newLag / STEP_SIZE) * STEP_SIZE).toFixed(2),
    );
  }

  public async tareScale(_event) {
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale) {
      scale.tare();
      if (
        this.settings.haptic_feedback_active &&
        this.settings.haptic_feedback_tare
      ) {
        this.hapticService.vibrate();
      }
    }
  }

  public async timerReset(_event) {
    await this.brewBrewingGraphEl.timerReset(_event);
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

  public millTimerChanged(_event): void {
    if (this.brewMillTimer) {
      this.data.mill_timer = this.brewMillTimer.getSeconds();
      if (this.settings.brew_milliseconds) {
        this.data.mill_timer_milliseconds =
          this.brewMillTimer.getMilliseconds();
      }
    } else {
      this.data.mill_timer = 0;
      this.data.mill_timer_milliseconds = 0;
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

  public forceSetPreparation(_preparation: Preparation) {
    this.choosenPreparation = this.loadSpecificLastPreparation;
    this.data.method_of_preparation = this.choosenPreparation.config.uuid;
    this.setUIParams();
  }
  public setChoosenPreparation() {
    this.choosenPreparation = this.data.getPreparation();
    this.setUIParams();
  }
  public getPreparation(): Preparation {
    if (this.choosenPreparation === undefined) {
      this.setChoosenPreparation();
    }
    return this.choosenPreparation;
  }

  public chooseDateTime(_event) {
    if (this.platform.is('capacitor')) {
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
      animated: false,
      breakpoints: [0, 0.5, 0.75, 1],
      initialBreakpoint: 0.75,
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
            moment(modalData.data.displayingTime).startOf('day'),
          ),
        )
        .asSeconds();
    }
  }

  /**
   * This function is triggered outside of add/edit component, because the uuid is not existing on adding at start
   * @param _uuid
   */
  public async saveFlowProfile(_uuid: string): Promise<string> {
    try {
      const savingPath = 'brews/' + _uuid + '_flow_profile.json';
      await this.uiFileHelper.writeInternalFileFromText(
        JSON.stringify(this.brewBrewingGraphEl.flow_profile_raw),
        savingPath,
      );
      return savingPath;
    } catch (ex) {
      return '';
    }
  }

  /**
   * This function is triggered outside of add/edit component, because the uuid is not existing on adding at start
   * @param _uuid
   */
  public async saveReferenceFlowProfile(_uuid: string): Promise<string> {
    try {
      const savingPath = 'importedGraph/' + _uuid + '_flow_profile.json';
      await this.uiFileHelper.writeInternalFileFromText(
        JSON.stringify(this.brewBrewingGraphEl.reference_profile_raw),
        savingPath,
      );
      return savingPath;
    } catch (ex) {
      return '';
    }
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

  public async downloadFlowProfile() {
    await this.uiExcel.exportBrewFlowProfile(
      this.brewBrewingGraphEl.flow_profile_raw,
    );
  }

  public onSearchChange(_type: string, event: any) {
    if (!this.typeaheadSearch[_type + 'Focused']) {
      return;
    }
    let actualSearchValue = event.target.value;
    this.typeaheadSearch[_type + 'ResultsAvailable'] = false;
    this.typeaheadSearch[_type + 'Results'] = [];
    if (actualSearchValue === undefined || actualSearchValue === '') {
      return;
    }

    actualSearchValue = actualSearchValue.toLowerCase();
    let filteredEntries: Array<Brew>;

    let distictedValues = [];
    if (_type !== 'vessel') {
      filteredEntries = this.uiBrewStorage
        .getAllEntries()
        .filter((e) => e[_type].toLowerCase().includes(actualSearchValue));
      for (const entry of filteredEntries) {
        this.typeaheadSearch[_type + 'Results'].push(entry[_type]);
      }

      this.typeaheadSearch[_type + 'Results'].forEach((element) => {
        if (!distictedValues.includes(element.trim())) {
          distictedValues.push(element.trim());
        }
      });
    } else {
      filteredEntries = this.uiBrewStorage
        .getAllEntries()
        .filter(
          (e) =>
            e.vessel_name !== '' &&
            e.vessel_name.toLowerCase().includes(actualSearchValue),
        );

      for (const entry of filteredEntries) {
        if (
          distictedValues.filter(
            (e) =>
              e.name === entry.vessel_name && e.weight === entry.vessel_weight,
          ).length <= 0
        ) {
          distictedValues.push({
            name: entry.vessel_name,
            weight: entry.vessel_weight,
          });
        }
      }
    }

    // Distinct values
    this.typeaheadSearch[_type + 'Results'] = distictedValues;

    if (this.typeaheadSearch[_type + 'Results'].length > 0) {
      this.typeaheadSearch[_type + 'ResultsAvailable'] = true;
    } else {
      this.typeaheadSearch[_type + 'ResultsAvailable'] = false;
    }
  }

  public searchResultsAvailable(_type): boolean {
    if (this.typeaheadSearch[_type + 'Results']) {
      return this.typeaheadSearch[_type + 'Results'].length > 0;
    }
    return false;
  }

  public getResults(_type: string) {
    if (this.typeaheadSearch[_type + 'Results']) {
      return this.typeaheadSearch[_type + 'Results'];
    }
    return [];
  }

  public onSearchLeave(_type: string) {
    setTimeout(() => {
      this.typeaheadSearch[_type + 'ResultsAvailable'] = false;
      this.typeaheadSearch[_type + 'Results'] = [];
      this.typeaheadSearch[_type + 'Focused'] = false;
    }, 150);
  }

  public onSearchFocus(_type: string) {
    this.typeaheadSearch[_type + 'Focused'] = true;
  }

  public searchResultSelected(_type: string, selected: any): void {
    if (_type !== 'vessel') {
      this.data[_type] = selected;
    } else {
      this.data.vessel_name = selected['name'];
      this.data.vessel_weight = selected['weight'];
    }

    this.onSearchLeave(_type);
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
    if (this.getPreparation().style_type === PREPARATION_STYLE_TYPE.ESPRESSO) {
      waterQuantity = this.data.brew_beverage_quantity;
    } else {
      waterQuantity = this.data.brew_quantity;
    }
    const modal = await this.modalController.create({
      component: BrewRatioCalculatorComponent,
      cssClass: 'popover-actions',
      breakpoints: [0, 0.75],
      initialBreakpoint: 0.75,
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

  public async requestRefractometerRead() {
    if (this.refractometerConnected()) {
      await this.uiAlert.showLoadingSpinner();
      const refractometerDevice = this.bleManager.getRefractometerDevice();

      let refractometerSubscription;
      const hideLoadingSpinnerTimeout = setTimeout(async () => {
        try {
          await this.uiAlert.hideLoadingSpinner();
          refractometerSubscription.unsubscribe();
        } catch (ex) {}
      }, 5000);
      refractometerSubscription = refractometerDevice.resultEvent.subscribe(
        async () => {
          try {
            // We got triggered, cancel set timeout
            clearTimeout(hideLoadingSpinnerTimeout);
            refractometerSubscription.unsubscribe();
            await this.uiAlert.hideLoadingSpinner();
          } catch (ex) {}
        },
      );

      // Changed to the bottom, subscribe first, and start the loading spinner.
      refractometerDevice.requestRead();
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
        1,
      );
    }
  }

  private async __connectRefractometerDevice(_firstStart: boolean) {
    if (this.refractometerConnected()) {
      this.deattachToRefractometerChange();

      this.attachToRefractometerChanges();

      this.checkChanges();
    }
  }

  public checkChanges() {
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

  private async __loadLastBrew() {
    let wasAnythingLoaded: boolean = false;
    if (
      this.settings.manage_parameters.set_last_coffee_brew ||
      this.getPreparation().manage_parameters.set_last_coffee_brew
    ) {
      const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
      if (brews.length > 0) {
        const sortedBrews = UIBrewHelper.sortBrews(brews);
        const lastBrew: Brew = sortedBrews[0];
        await this.__loadBrew(lastBrew, false);
        wasAnythingLoaded = true;
      }
    }
    if (!wasAnythingLoaded) {
      //If we didn't load any brew, we didn't fire instancePreparationDevice with a brew, so we need to fire it here in the end at all.
      if (this.brewBrewingPreparationDeviceEl) {
        await this.brewBrewingPreparationDeviceEl.instancePreparationDevice();
      }
    }
  }

  private async __loadBrew(brew: Brew, _template: boolean) {
    if (
      this.settings.default_last_coffee_parameters.method_of_preparation ||
      _template === true
    ) {
      const brewPreparation: IPreparation = this.uiPreparationStorage.getByUUID(
        brew.method_of_preparation,
      );
      if (!brewPreparation.finished) {
        this.data.method_of_preparation = brewPreparation.config.uuid;
        /**We need to set the choosen preparation here, else we get the wrong reference,
         *  after we've changed the getPreparation to temporary store
         *  to not always request the database**/
        this.setChoosenPreparation();
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

    if (this.brewMillTimer) {
      if (
        (_template === false &&
          checkData.default_last_coffee_parameters.mill_timer) ||
        (_template === true && checkData.repeat_coffee_parameters.mill_timer)
      ) {
        this.data.mill_timer = brew.mill_timer;
        if (this.settings.brew_milliseconds) {
          this.data.mill_timer_milliseconds = brew.mill_timer_milliseconds;
        }
        setTimeout(() => {
          this.brewMillTimer.setTime(
            this.data.mill_timer,
            this.data.mill_timer_milliseconds,
          );
        }, 250);
      }
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
            this.data.brew_temperature_time_milliseconds,
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
            this.data.brew_time_milliseconds,
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
            this.data.coffee_first_drip_time_milliseconds,
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
            this.data.coffee_blooming_time_milliseconds,
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
        if (tool?.archived === false) {
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
    this.data.reference_flow_profile = new ReferenceGraph();

    if (this.brewBrewingPreparationDeviceEl) {
      await this.brewBrewingPreparationDeviceEl.instancePreparationDevice(brew);
    }
  }

  public async showExtractionChart(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.uiAnalytics.trackEvent(
      BREW_TRACKING.TITLE,
      BREW_TRACKING.ACTIONS.EXTRACTION_GRAPH,
    );
    //Animated false, else backdrop would sometimes not disappear and stay until user touches again.
    const popover = await this.modalCtrl.create({
      component: BrewPopoverExtractionComponent,
      animated: true,
      componentProps: { brew: this.data },
      id: BrewPopoverExtractionComponent.COMPONENT_ID,
      cssClass: 'popover-extraction',
      initialBreakpoint: 1,
    });
    await popover.present();
    const data = await popover.onWillDismiss();
  }

  protected readonly BREW_FUNCTION_PIPE_ENUM = BREW_FUNCTION_PIPE_ENUM;
}
