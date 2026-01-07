import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ModalController, Platform } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { Brew } from '../../../classes/brew/brew';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { Settings } from '../../../classes/settings/settings';
import { BrewBrewingComponent } from '../../../components/brews/brew-brewing/brew-brewing.component';
import { PressureDevice } from '../../../classes/devices/pressureBluetoothDevice';
import { TemperatureDevice } from 'src/classes/devices/temperatureBluetoothDevice';
import { CoffeeBluetoothDevicesService } from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { BluetoothScale } from '../../../classes/devices';

import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { UIHelper } from 'src/services/uiHelper';
import { BREW_FUNCTION_PIPE_ENUM } from '../../../enums/brews/brewFunctionPipe';

import { CameraPreview } from '@capgo/camera-preview';
import { Capacitor } from '@capacitor/core';
import { TranslatePipe } from '@ngx-translate/core';
import { BrewFunction } from '../../../pipes/brew/brewFunction';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  waterOutline,
  thermometerOutline,
  timeOutline,
} from 'ionicons/icons';
import {
  IonHeader,
  IonGrid,
  IonRow,
  IonCol,
  IonChip,
  IonButton,
  IonIcon,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonFooter,
} from '@ionic/angular/standalone';

declare var Plotly;
@Component({
  selector: 'brew-flow',
  templateUrl: './brew-flow.component.html',
  styleUrls: ['./brew-flow.component.scss'],
  imports: [
    TranslatePipe,
    BrewFunction,
    IonHeader,
    IonGrid,
    IonRow,
    IonCol,
    IonChip,
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
  public static readonly COMPONENT_ID: string = 'brew-flow';

  @ViewChild('brewFlowContent', { read: ElementRef })
  public brewFlowContent: ElementRef;

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
  @Input() public isDetail: boolean = false;
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
  protected readonly PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;

  public graphIconColSize: number = 2.4;
  public bluetoothSubscription: Subscription = undefined;
  constructor(
    private readonly modalController: ModalController,
    public readonly uiHelper: UIHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly bleManager: CoffeeBluetoothDevicesService,
    private readonly platform: Platform,
    private readonly ngZone: NgZone,
    private readonly changeDetectorRef: ChangeDetectorRef,
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
    addIcons({ closeOutline, waterOutline, thermometerOutline, timeOutline });
  }

  public ngOnInit() {
    window['bla'] = CameraPreview;
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
    await new Promise((resolve) => {
      setTimeout(() => {
        document
          .getElementById('brewFlowContainer')
          .append(
            this.brewComponent.brewBrewingGraphEl.profileDiv.nativeElement,
          );
        resolve(undefined);
      }, 50);
    });

    this.onOrientationChange();

    if (this.isDetail === false) {
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

      this.brewPressureGraphSubscription =
        this.brewPressureGraphEvent.subscribe((_val) => {
          this.setActualPressureInformation(_val);
        });
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
            this.onOrientationChange();
          }, 250);
        });
    }
    setTimeout(() => {
      if (!this.isDetail) {
        this.brewComponent.brewBrewingGraphEl.updateChart();
      }
    }, 150);
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

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  public onOrientationChange() {
    setTimeout(() => {
      try {
        const flowHeight = this.brewFlowContent.nativeElement.offsetHeight;
        let informationContainerHeight = 0;
        try {
          informationContainerHeight = document.getElementById(
            'informationContainer',
          ).offsetHeight;
        } catch (ex) {
          informationContainerHeight = 0;
        }

        this.brewComponent.brewBrewingGraphEl.lastChartLayout.height =
          flowHeight - informationContainerHeight;

        this.brewComponent.brewBrewingGraphEl.lastChartLayout.width =
          document.getElementById('brewFlowContainer').offsetWidth;
        Plotly.relayout(
          this.brewComponent.brewBrewingGraphEl.profileDiv.nativeElement,
          this.brewComponent.brewBrewingGraphEl.lastChartLayout,
        );
      } catch (ex) {}
    }, 50);
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

    // Looks funny but we need. if we would not calculate and substract 25px, the actual time graph would not be displayed :<
    setTimeout(() => {
      try {
        const newHeight =
          document.getElementById('brewFlowContainer').offsetHeight;
        document
          .getElementById('brewFlowContainer')
          .getElementsByTagName('canvas')[0].style.height =
          newHeight - 1 + 'px';
      } catch (ex) {}
    }, 250);
  }

  public pauseTimer() {
    this.brewComponent.timer.pauseTimer();
  }

  public async startListening() {
    this.brewComponent.timer.startListening();

    //await this.waitForPleaseWaitToBeFinished();
    //After start listening did a reset, we need to change orientation, else the graph is to small
    setTimeout(() => {
      this.onOrientationChange();
    }, 500);
  }

  public async resetTimer(_event) {
    this.brewComponent.timer.reset();
    //await this.waitForPleaseWaitToBeFinished();
    setTimeout(() => {
      this.onOrientationChange();
    }, 500);
  }

  public resumeTimer() {
    this.brewComponent.timerResumedPressed(undefined);
  }

  public __tareScale() {
    this.brewComponent.timer.__tareScale();
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
          ratioEl.textContent =
            '(' + this.brewComponent.data.getBrewRatio() + ')';
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
      setTimeout(async () => {
        const rect = document
          .getElementById('cameraPreview')
          .getBoundingClientRect();
        await CameraPreview.setPreviewSize({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          y: Math.round(rect.y),
          x: Math.round(rect.x),
        });
      }, 500);
    }
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
      setTimeout(async () => {
        let cameraPreviewOptions;
        let rect = document
          .getElementById('cameraPreview')
          .getBoundingClientRect();
        if (Capacitor.getPlatform() !== 'web') {
          cameraPreviewOptions = {
            disableAudio: true,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            y: Math.round(rect.y),
            x: Math.round(rect.x),
            parent: 'cameraPreview',
            position: 'front' as const,
            toBack: false,
          };
        } else {
          cameraPreviewOptions = {
            disableAudio: true,
            parent: 'cameraPreview',
            position: 'front' as const,
            toBack: false,
          };
        }

        await CameraPreview.start(cameraPreviewOptions);

        await CameraPreview.addListener(
          'screenResize',
          this.__resizeCamera.bind(this),
        );

        setTimeout(async () => {
          this.__resizeCamera();
        }, 250);
      }, 1000);
    }
    this.onOrientationChange();
  }

  public async ngOnDestroy() {
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

  public dismiss() {
    this.brewComponent.brewBrewingGraphEl.canvaContainer.nativeElement.append(
      this.brewComponent.brewBrewingGraphEl.profileDiv.nativeElement,
    );
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
