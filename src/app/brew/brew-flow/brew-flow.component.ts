import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';

import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonChip,
  IonCol,
  IonContent,
  IonFooter,
  IonGrid,
  IonHeader,
  IonIcon,
  IonRow,
  ModalController,
  Platform,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  thermometerOutline,
  timeOutline,
  waterOutline,
} from 'ionicons/icons';

import { Capacitor } from '@capacitor/core';
import { CameraPreview } from '@capgo/camera-preview';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { TemperatureDevice } from 'src/classes/devices/temperatureBluetoothDevice';
import { UIHelper } from 'src/services/uiHelper';
import { UILog } from 'src/services/uiLog';
import { UIToast } from 'src/services/uiToast';
import { Brew } from '../../../classes/brew/brew';
import { BluetoothScale, sleep } from '../../../classes/devices';
import { PressureDevice } from '../../../classes/devices/pressureBluetoothDevice';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { Settings } from '../../../classes/settings/settings';
import { BrewBrewingComponent } from '../../../components/brews/brew-brewing/brew-brewing.component';
import { ChipButtonDirective } from '../../../directive/chip-button.directive';
import { BREW_FUNCTION_PIPE_ENUM } from '../../../enums/brews/brewFunctionPipe';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { BrewFunction } from '../../../pipes/brew/brewFunction';
import { CoffeeBluetoothDevicesService } from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'brew-flow',
  templateUrl: './brew-flow.component.html',
  styleUrls: ['./brew-flow.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    TranslatePipe,
    BrewFunction,
    IonHeader,
    IonGrid,
    IonRow,
    IonCol,
    IonChip,
    ChipButtonDirective,
    IonButton,
    IonIcon,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonFooter,
  ],
})
export class BrewFlowComponent implements OnDestroy, OnInit {
  private readonly modalController = inject(ModalController);
  readonly uiHelper = inject(UIHelper);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly bleManager = inject(CoffeeBluetoothDevicesService);
  private readonly platform = inject(Platform);
  private readonly ngZone = inject(NgZone);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly uiLog = inject(UILog);
  private readonly uiToast = inject(UIToast);

  public static readonly COMPONENT_ID: string = 'brew-flow';

  @ViewChild('brewFlowContent', { read: ElementRef })
  public brewFlowContent: ElementRef;
  @ViewChild('brewFlowContainer', { read: ElementRef })
  public brewFlowContainer: ElementRef<HTMLElement>;
  @ViewChild('informationContainer', { read: ElementRef })
  public informationContainer: ElementRef<HTMLElement>;

  public cameraIsVisible: boolean = false;
  public gaugeVisible: boolean = false;
  @Input() public flowChart: any;
  @Input() public flowChartEl: any;
  @Input() private brewFlowGraphEvent: EventEmitter<any>;
  @Input() private brewFlowGraphSecondEvent: EventEmitter<any>;

  @Input() private brewPressureGraphEvent: EventEmitter<any>;
  @Input() private brewTemperatureGraphEvent: EventEmitter<any>;
  @Input() private brewTimerTickedEvent: EventEmitter<any>;

  @Input() public brew: Brew;
  @Input() public brewComponent: BrewBrewingComponent;
  private brewFlowGraphSubscription: Subscription;
  private brewFlowGraphSecondSubscription: Subscription;
  private brewPressureGraphSubscription: Subscription;
  private brewTemperatureGraphSubscription: Subscription;
  private brewTimerTickedSubscription: Subscription;

  @ViewChild('timerElement', { static: false })
  public timerElement: ElementRef;

  public settings: Settings;
  public PREPARATION_DEVICE_TYPE_ENUM = PreparationDeviceType;
  public gaugeType = 'semi';
  public gaugeValue = 0;
  public gaugeLabel = '';
  public gaugeSize = 50;

  @ViewChild('smartScaleWeightDetail', { read: ElementRef })
  public smartScaleWeightDetail: ElementRef;
  @ViewChild('smartScaleWeightPerSecondDetail', { read: ElementRef })
  public smartScaleWeightPerSecondDetail: ElementRef;
  @ViewChild('smartScaleAvgFlowPerSecondDetail', { read: ElementRef })
  public smartScaleAvgFlowPerSecondDetail: ElementRef;
  @ViewChild('pressureDetail', { read: ElementRef })
  public pressureDetail: ElementRef;
  @ViewChild('temperatureDetail', { read: ElementRef })
  public temperatureDetail: ElementRef;

  @ViewChild('smartScaleWeightSecondDetail', { read: ElementRef })
  public smartScaleWeightSecondDetail: ElementRef;
  @ViewChild('smartScaleRealtimeFlowSecondDetail', { read: ElementRef })
  public smartScaleRealtimeFlowSecondDetail: ElementRef;

  @ViewChild('smartScaleBrewRatio', { read: ElementRef })
  public smartScaleBrewRatio: ElementRef;

  private disableHardwareBack;
  /** Sizes the graph whenever the view, the tiles or the camera change. */
  private graphSizes: ResizeObserver | null = null;
  protected readonly PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;

  public graphIconColSize: number = 2.4;
  public bluetoothSubscription: Subscription = undefined;
  constructor() {
    this.settings = this.uiSettingsStorage.getSettings();
    addIcons({ closeOutline, waterOutline, thermometerOutline, timeOutline });
  }

  public ngOnInit() {
    try {
      this.disableHardwareBack = this.platform.backButton.subscribeWithPriority(
        9999,
        (processNextHandler) => {
          this.dismiss();
        },
      );
    } catch (ex) {}
  }

  public returnWantedDisplayFormat() {
    const showMinutes: boolean = true;
    let showHours: boolean = false;
    let showMilliseconds: boolean = false;
    if (this.brew.brew_time >= 3600) {
      showHours = true;
    }

    if (this.settings?.brew_milliseconds) {
      showMilliseconds = true;
    }

    let returnStr: string = '';
    if (showMilliseconds) {
      if (this.settings.brew_milliseconds_leading_digits === 3) {
        returnStr = '.SSS';
      } else if (this.settings.brew_milliseconds_leading_digits === 2) {
        returnStr = '.SS';
      } else {
        returnStr = '.S';
      }
    }
    if (showHours) {
      return 'H:mm:ss' + returnStr;
    } else if (showMinutes) {
      return 'mm:ss' + returnStr;
    } else {
      return 'ss' + returnStr;
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

    //One is the timer ;)
    let visibleTiles = 1;

    if (
      (this.pressureDeviceConnected() ||
        this.brewComponent.brewBrewingPreparationDeviceEl.preparationDeviceConnected()) &&
      this.brew.getPreparation().style_type === PREPARATION_STYLE_TYPE.ESPRESSO
    ) {
      visibleTiles += 1;
    }
    if (
      this.temperatureDeviceConnected() ||
      this.brewComponent.brewBrewingPreparationDeviceEl.preparationDeviceConnected()
    ) {
      visibleTiles += 1;
    }
    if (this.smartScaleConnected()) {
      visibleTiles += 2;
    }

    return this.uiHelper.toFixedIfNecessary(12 / visibleTiles, 1);
  }
  public async ionViewDidEnter() {
    const graph = this.brewComponent.brewBrewingGraphEl;
    const { width, height } = this.graphSize();
    await graph.showMaximized(
      this.brewFlowContainer.nativeElement,
      width,
      height,
    );
    this.graphSizes = new ResizeObserver(() => {
      const size = this.graphSize();
      graph.resizeMaximized(size.width, size.height);
    });
    for (const el of [
      this.brewFlowContent.nativeElement,
      this.brewFlowContainer.nativeElement,
      this.informationContainer.nativeElement,
    ]) {
      this.graphSizes.observe(el);
    }

    this.brewFlowGraphSubscription = this.brewFlowGraphEvent.subscribe(
      (_val) => {
        this.setActualScaleInformation(_val);
      },
    );

    if (this.smartScaleSupportsTwoWeight()) {
      this.brewFlowGraphSecondSubscription =
        this.brewFlowGraphSecondEvent.subscribe((_val) => {
          this.setActualScaleSecondInformation(_val);
        });
    }

    this.brewPressureGraphSubscription = this.brewPressureGraphEvent.subscribe(
      (_val) => {
        this.setActualPressureInformation(_val);
      },
    );
    this.brewTemperatureGraphSubscription =
      this.brewTemperatureGraphEvent.subscribe((_val) => {
        this.setActualTemperatureInformation(_val);
      });

    const wantedDisplayFormat = this.returnWantedDisplayFormat();
    this.__writeTimeNative(wantedDisplayFormat);
    this.brewTimerTickedSubscription = this.brewTimerTickedEvent.subscribe(
      (_val) => {
        this.__writeTimeNative(wantedDisplayFormat);
      },
    );

    this.graphIconColSize = this.getGraphIonColSize();
    this.bluetoothSubscription = this.bleManager
      .attachOnEvent()
      .subscribe((_type) => {
        //We need an delay of 250ms, because else the changes are not rightly triggered.
        setTimeout(() => {
          this.graphIconColSize = this.getGraphIonColSize();
          this.checkChanges();
        }, 250);
      });
  }

  private __writeTimeNative(_wantedDisplayFormat) {
    let writingVal = '';
    if (this.settings.brew_milliseconds === false) {
      writingVal = String(
        this.uiHelper.formatSeconds(this.brew.brew_time, 'mm:ss'),
      );
    } else {
      writingVal = String(
        this.uiHelper.formatSecondsAndMilliseconds(
          this.brew.brew_time,
          this.brew.brew_time_milliseconds,
          _wantedDisplayFormat,
        ),
      );
    }

    if (this.timerElement?.nativeElement) {
      window.requestAnimationFrame(() => {
        this.timerElement.nativeElement.innerHTML = writingVal;
      });
    }
  }

  public checkChanges() {
    // #507 Wrapping check changes in set timeout so all values get checked
    setTimeout(() => {
      this.changeDetectorRef.detectChanges();
      window.getComputedStyle(window.document.getElementsByTagName('body')[0]);
    }, 15);
  }

  /** The graph takes the width of its column and the height below the tiles. */
  private graphSize(): { width: number; height: number } {
    return {
      width: this.brewFlowContainer.nativeElement.offsetWidth,
      height:
        this.brewFlowContent.nativeElement.offsetHeight -
        this.informationContainer.nativeElement.offsetHeight,
    };
  }

  public pressureDeviceConnected() {
    if (!this.platform.is('capacitor')) {
      return true;
    }
    if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.METICULOUS
    ) {
      return true;
    }
    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    return !!pressureDevice;
  }

  public temperatureDeviceConnected() {
    if (!this.platform.is('capacitor')) {
      return true;
    }

    const temperatureDevice: TemperatureDevice =
      this.bleManager.getTemperatureDevice();
    return !!temperatureDevice;
  }

  public smartScaleConnected() {
    if (!this.platform.is('capacitor')) {
      return true;
    }
    if (
      this.brewComponent?.brewBrewingPreparationDeviceEl?.preparationDeviceConnected() &&
      this.brewComponent?.brewBrewingPreparationDeviceEl?.getPreparationDeviceType() ===
        PreparationDeviceType.METICULOUS
    ) {
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

  public async startTimer() {
    await this.brewComponent.timerStartPressed(undefined);
  }

  public pauseTimer() {
    this.brewComponent.timer.pauseTimer();
  }

  public startListening() {
    this.brewComponent.timer.startListening();
  }

  public resetTimer(_event) {
    this.brewComponent.timer.reset();
  }

  public resumeTimer() {
    this.brewComponent.timerResumedPressed(undefined);
  }

  public __tareScale() {
    void this.brewComponent.tareScale(undefined);
  }

  public setActualScaleInformation(_val: any) {
    this.ngZone.runOutsideAngular(() => {
      if (this.smartScaleWeightDetail?.nativeElement) {
        const weightEl = this.smartScaleWeightDetail.nativeElement;
        const flowEl = this.smartScaleWeightPerSecondDetail.nativeElement;
        const avgFlowEl = this.smartScaleAvgFlowPerSecondDetail.nativeElement;

        weightEl.textContent = _val.scaleWeight;
        flowEl.textContent = _val.smoothedWeight;
        avgFlowEl.textContent = 'Ø ' + _val.avgFlow;

        const ratioEl = this.smartScaleBrewRatio?.nativeElement;
        if (ratioEl) {
          const grindWeight = this.brewComponent.data.grind_weight;
          let ratioText = '1 / ?';
          const scaleWeight = _val.scaleWeight;
          if (scaleWeight > 0 && grindWeight > 0) {
            ratioText = '1 / ' + (scaleWeight / grindWeight).toFixed(2);
          }
          ratioEl.textContent = '(' + ratioText + ')';
        }
      }
    });
  }
  public setActualScaleSecondInformation(_val: any) {
    this.ngZone.runOutsideAngular(() => {
      if (this.smartScaleWeightDetail?.nativeElement) {
        const weightEl = this.smartScaleWeightSecondDetail.nativeElement;
        const flowEl = this.smartScaleRealtimeFlowSecondDetail.nativeElement;
        weightEl.textContent = _val.scaleWeight;
        flowEl.textContent = _val.smoothedWeight;
      }
    });
  }

  public setActualPressureInformation(_val: any) {
    this.ngZone.runOutsideAngular(() => {
      if (this.pressureDetail?.nativeElement) {
        const pressureEl = this.pressureDetail.nativeElement;
        pressureEl.textContent = _val.pressure;
      }
    });
  }

  public setActualTemperatureInformation(_val: any) {
    this.ngZone.runOutsideAngular(() => {
      if (this.temperatureDetail?.nativeElement) {
        const temperatureEl = this.temperatureDetail.nativeElement;
        temperatureEl.textContent = _val.temperature;
      }
    });
  }

  public isIOS() {
    return Capacitor.getPlatform() === 'ios';
  }

  private async __resizeCamera() {
    if (this.cameraIsVisible && Capacitor.getPlatform() !== 'web') {
      await sleep(500);
      const rect = document
        .getElementById('cameraPreview')
        ?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      await CameraPreview.setPreviewSize({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        y: Math.round(rect.y),
        x: Math.round(rect.x),
      }).catch((error: unknown) => {
        this.uiLog.error('Camera preview could not be resized', error);
      });
    }
  }

  /** Starts the camera beside the graph; a camera that fails is reported. */
  private async startCamera(): Promise<void> {
    if (!this.cameraIsVisible) {
      return;
    }
    try {
      const rect = document
        .getElementById('cameraPreview')
        .getBoundingClientRect();
      await CameraPreview.start({
        disableAudio: true,
        parent: 'cameraPreview',
        position: 'front',
        toBack: false,
        ...(Capacitor.getPlatform() === 'web'
          ? {}
          : {
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              y: Math.round(rect.y),
              x: Math.round(rect.x),
            }),
      });
      await CameraPreview.addListener(
        'screenResize',
        this.__resizeCamera.bind(this),
      );
    } catch (error) {
      this.uiLog.error('Camera could not be started', error);
      this.cameraIsVisible = false;
      this.checkChanges();
      void this.uiToast.showInfoToast('CAMERA_COULD_NOT_BE_STARTED');
      return;
    }
    setTimeout(() => {
      void this.__resizeCamera();
    }, 250);
  }

  private async stopCamera() {
    if (this.cameraIsVisible) {
      await CameraPreview.stop();
      await CameraPreview.removeAllListeners();
      this.cameraIsVisible = false;
    }
  }
  public async toggleCamera() {
    if (this.cameraIsVisible) {
      await this.stopCamera();
    } else {
      this.cameraIsVisible = true;
      setTimeout(() => {
        void this.startCamera();
      }, 1000);
    }
  }

  public async ngOnDestroy() {
    this.releaseGraph();
    if (this.cameraIsVisible) {
      await CameraPreview.stop();
    }
    if (this.bluetoothSubscription) {
      this.bluetoothSubscription.unsubscribe();
      this.bluetoothSubscription = undefined;
    }
    if (this.brewFlowGraphSubscription) {
      this.brewFlowGraphSubscription.unsubscribe();
      this.brewFlowGraphSubscription = undefined;
    }
    if (this.brewFlowGraphSecondSubscription) {
      this.brewFlowGraphSecondSubscription.unsubscribe();
      this.brewFlowGraphSecondSubscription = undefined;
    }

    if (this.brewPressureGraphSubscription) {
      this.brewPressureGraphSubscription.unsubscribe();
      this.brewPressureGraphSubscription = undefined;
    }
    if (this.brewTemperatureGraphSubscription) {
      this.brewTemperatureGraphSubscription.unsubscribe();
      this.brewTemperatureGraphSubscription = undefined;
    }
    if (this.brewTimerTickedSubscription) {
      this.brewTimerTickedSubscription.unsubscribe();
      this.brewTimerTickedSubscription = undefined;
    }
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

  /** The brew form's own graph stays where it is; only the second one goes. */
  private releaseGraph(): void {
    this.graphSizes?.disconnect();
    this.graphSizes = null;
    this.brewComponent?.brewBrewingGraphEl?.closeMaximized();
  }

  public dismiss() {
    this.releaseGraph();
    try {
      this.disableHardwareBack.unsubscribe();
      this.stopCamera();
    } catch (ex) {}
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewFlowComponent.COMPONENT_ID,
    );
  }

  protected readonly BREW_FUNCTION_PIPE_ENUM = BREW_FUNCTION_PIPE_ENUM;
}
