import {
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
import { ModalController, Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Brew } from '../../../classes/brew/brew';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { Settings } from '../../../classes/settings/settings';
import { BrewBrewingComponent } from '../../../components/brews/brew-brewing/brew-brewing.component';
import { PressureDevice } from '../../../classes/devices/pressureBluetoothDevice';
import { TemperatureDevice } from 'src/classes/devices/temperatureBluetoothDevice';
import { CoffeeBluetoothDevicesService } from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { BluetoothScale } from '../../../classes/devices';
import { UIAlert } from '../../../services/uiAlert';

import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { UIHelper } from 'src/services/uiHelper';

declare var Plotly;

@Component({
  selector: 'brew-flow',
  templateUrl: './brew-flow.component.html',
  styleUrls: ['./brew-flow.component.scss'],
})
export class BrewFlowComponent implements OnDestroy, OnInit {
  public static readonly COMPONENT_ID: string = 'brew-flow';

  @ViewChild('brewFlowContent', { read: ElementRef })
  public brewFlowContent: ElementRef;

  public showBloomTimer: boolean = false;
  public showDripTimer: boolean = false;
  public gaugeVisible: boolean = false;
  @Input() public flowChart: any;
  @Input() public flowChartEl: any;
  @Input() private brewFlowGraphEvent: EventEmitter<any>;
  @Input() private brewPressureGraphEvent: EventEmitter<any>;
  @Input() private brewTemperatureGraphEvent: EventEmitter<any>;

  @Input() public brew: Brew;
  @Input() public brewComponent: BrewBrewingComponent;
  @Input() public isDetail: boolean = false;
  private brewFlowGraphSubscription: Subscription;
  private brewPressureGraphSubscription: Subscription;
  private brewTemperatureGraphSubscription: Subscription;

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
  private disableHardwareBack;
  protected readonly PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  protected heightInformationBlock: number = 50;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiHelper: UIHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiBrewHelper: UIBrewHelper,
    private readonly bleManager: CoffeeBluetoothDevicesService,
    private readonly platform: Platform,
    private readonly ngZone: NgZone,
    private readonly uiAlert: UIAlert
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public ngOnInit() {
    try {
      this.disableHardwareBack = this.platform.backButton.subscribeWithPriority(
        9999,
        (processNextHandler) => {
          this.dismiss();
        }
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
      return 2;
    }
    let bluetoothDeviceConnections = 0;
    let smartScaleConnected: boolean = false;
    if (
      (this.pressureDeviceConnected() ||
        this.brewComponent.brewBrewingPreparationDeviceEl.preparationDeviceConnected()) &&
      this.brew.getPreparation().style_type === PREPARATION_STYLE_TYPE.ESPRESSO
    ) {
      bluetoothDeviceConnections += 1;
    }
    if (
      this.temperatureDeviceConnected() ||
      this.brewComponent.brewBrewingPreparationDeviceEl.preparationDeviceConnected()
    ) {
      bluetoothDeviceConnections += 1;
    }
    if (this.smartScaleConnected()) {
      bluetoothDeviceConnections += 1;
      smartScaleConnected = true;
    }

    if (bluetoothDeviceConnections === 3) {
      return 2;
    } else if (bluetoothDeviceConnections === 2) {
      if (smartScaleConnected) {
        return 2;
      } else {
        return 4;
      }
    } else if (bluetoothDeviceConnections === 1) {
      if (smartScaleConnected) {
        return 3;
      } else {
        return 6;
      }
    }
  }
  public async ionViewDidEnter() {
    await new Promise((resolve) => {
      setTimeout(() => {
        document
          .getElementById('brewFlowContainer')
          .append(
            this.brewComponent.brewBrewingGraphEl.profileDiv.nativeElement
          );
        resolve(undefined);
      }, 50);
    });

    this.onOrientationChange();

    if (this.isDetail === false) {
      this.brewFlowGraphSubscription = this.brewFlowGraphEvent.subscribe(
        (_val) => {
          this.setActualScaleInformation(_val);
        }
      );
      this.brewPressureGraphSubscription =
        this.brewPressureGraphEvent.subscribe((_val) => {
          this.setActualPressureInformation(_val);
        });
      this.brewTemperatureGraphSubscription =
        this.brewTemperatureGraphEvent.subscribe((_val) => {
          this.setActualTemperatureInformation(_val);
        });

      this.showBloomTimer = this.uiBrewHelper.fieldVisible(
        this.settings.manage_parameters.coffee_blooming_time,
        this.brew.getPreparation().manage_parameters.coffee_blooming_time,
        this.brew.getPreparation().use_custom_parameters
      );

      this.showDripTimer =
        this.uiBrewHelper.fieldVisible(
          this.settings.manage_parameters.coffee_first_drip_time,
          this.brew.getPreparation().manage_parameters.coffee_first_drip_time,
          this.brew.getPreparation().use_custom_parameters
        ) &&
        this.brew.getPreparation().style_type ===
          PREPARATION_STYLE_TYPE.ESPRESSO;
    }
    setTimeout(() => {
      if (!this.isDetail) {
        this.brewComponent.brewBrewingGraphEl.updateChart();
      }
    }, 150);
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange() {
    setTimeout(() => {
      try {
        const flowHeight = this.brewFlowContent.nativeElement.offsetHeight;
        let informationContainerHeight = 0;
        try {
          informationContainerHeight = document.getElementById(
            'informationContainer'
          ).offsetHeight;
        } catch (ex) {
          informationContainerHeight = 0;
        }

        this.heightInformationBlock = informationContainerHeight;

        this.brewComponent.brewBrewingGraphEl.lastChartLayout.height =
          flowHeight - informationContainerHeight;

        this.brewComponent.brewBrewingGraphEl.lastChartLayout.width =
          document.getElementById('brewFlowContainer').offsetWidth;
        Plotly.relayout(
          this.brewComponent.brewBrewingGraphEl.profileDiv.nativeElement,
          this.brewComponent.brewBrewingGraphEl.lastChartLayout
        );
      } catch (ex) {}
    }, 50);
  }

  public pressureDeviceConnected() {
    if (!this.platform.is('cordova')) {
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
    if (!this.platform.is('cordova')) {
      return true;
    }

    const temperatureDevice: TemperatureDevice =
      this.bleManager.getTemperatureDevice();
    return !!temperatureDevice;
  }

  public smartScaleConnected() {
    if (!this.platform.is('cordova')) {
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

  private waitForPleaseWaitToBeFinished() {
    // #604
    return new Promise((resolve, reject) => {
      let waitForPleaseWaitInterval = setInterval(async () => {
        if (this.uiAlert.isLoadingSpinnerShown() === true) {
          // wait another round
        } else {
          clearInterval(waitForPleaseWaitInterval);
          waitForPleaseWaitInterval = undefined;
          resolve(undefined);
        }
      });
      setTimeout(() => {
        if (waitForPleaseWaitInterval !== undefined) {
          clearInterval(waitForPleaseWaitInterval);
          waitForPleaseWaitInterval = undefined;
          resolve(undefined);
        }
      }, 5000);
    });
  }

  public async resetTimer() {
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

  public setCoffeeDripTime(): void {
    this.brewComponent.setCoffeeDripTime(undefined);

    this.showDripTimer = false;
  }

  public setCoffeeBloomingTime(): void {
    //this.brew.coffee_blooming_time = this.brew.brew_time;
    this.brewComponent.setCoffeeBloomingTime(undefined);
    this.showBloomTimer = false;
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

  public async ngOnDestroy() {
    if (this.brewFlowGraphSubscription) {
      this.brewFlowGraphSubscription.unsubscribe();
      this.brewFlowGraphSubscription = undefined;
    }
    if (this.brewPressureGraphSubscription) {
      this.brewPressureGraphSubscription.unsubscribe();
      this.brewPressureGraphSubscription = undefined;
    }
    if (this.brewTemperatureGraphSubscription) {
      this.brewTemperatureGraphSubscription.unsubscribe();
      this.brewTemperatureGraphSubscription = undefined;
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
      this.brewComponent.brewBrewingGraphEl.profileDiv.nativeElement
    );
    try {
      this.disableHardwareBack.unsubscribe();
    } catch (ex) {}
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewFlowComponent.COMPONENT_ID
    );
  }
}
