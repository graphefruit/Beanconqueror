import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Brew } from '../../../classes/brew/brew';
import { UIHelper } from '../../../services/uiHelper';
import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { Settings } from '../../../classes/settings/settings';
import { BrewBrewingComponent } from '../../../components/brews/brew-brewing/brew-brewing.component';
import { TranslateService } from '@ngx-translate/core';
import { PressureDevice } from '../../../classes/devices/pressureBluetoothDevice';
import { TemperatureDevice } from 'src/classes/devices/temperatureBluetoothDevice';
import { CoffeeBluetoothDevicesService } from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { BluetoothScale } from '../../../classes/devices';
declare var Plotly;
@Component({
  selector: 'brew-flow',
  templateUrl: './brew-flow.component.html',
  styleUrls: ['./brew-flow.component.scss'],
})
export class BrewFlowComponent implements AfterViewInit, OnDestroy, OnInit {
  public static COMPONENT_ID: string = 'brew-flow';

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

  protected heightInformationBlock: number = 50;
  constructor(
    private readonly modalController: ModalController,
    private readonly screenOrientation: ScreenOrientation,
    private readonly uiHelper: UIHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiBrewHelper: UIBrewHelper,
    private readonly translate: TranslateService,
    private readonly bleManager: CoffeeBluetoothDevicesService,
    private readonly platform: Platform
  ) {}
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
    let bluetoothDeviceConnections = 0;
    let smartScaleConnected: boolean = false;
    if (
      this.pressureDeviceConnected() &&
      this.brew.getPreparation().style_type === PREPARATION_STYLE_TYPE.ESPRESSO
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

  public async ngAfterViewInit() {
    this.settings = this.uiSettingsStorage.getSettings();

    /*if (this.isDetail === false) {
      setTimeout(() => {
        const offsetWidth = document.getElementById('brewPanel').offsetWidth;

        // -16 because of padding
        this.gaugeSize = offsetWidth - 16;
      }, 1000);

      this.gaugeLabel = this.translate.instant('BREW_PRESSURE_FLOW');
    }*/
    await new Promise((resolve) => {
      setTimeout(() => {
        document
          .getElementById('brewFlowContainer')
          .append(document.getElementById('flowProfileChart'));
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

      const settings: Settings = this.uiSettingsStorage.getSettings();

      this.showBloomTimer = this.uiBrewHelper.fieldVisible(
        settings.manage_parameters.coffee_blooming_time,
        this.brew.getPreparation().manage_parameters.coffee_blooming_time,
        this.brew.getPreparation().use_custom_parameters
      );

      this.showDripTimer =
        this.uiBrewHelper.fieldVisible(
          settings.manage_parameters.coffee_first_drip_time,
          this.brew.getPreparation().manage_parameters.coffee_first_drip_time,
          this.brew.getPreparation().use_custom_parameters
        ) &&
        this.brew.getPreparation().style_type ===
          PREPARATION_STYLE_TYPE.ESPRESSO;
    }
    setTimeout(() => {
      if (this.isDetail) {
      } else {
        this.brewComponent.updateChart();
      }
    }, 150);
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange() {
    setTimeout(() => {
      try {
        const flowHeight = document.getElementById('flowCard').offsetHeight;
        let informationContainerHeight = 0;
        try {
          informationContainerHeight = document.getElementById(
            'informationContainer'
          ).offsetHeight;
        } catch (ex) {
          informationContainerHeight = 0;
        }

        this.heightInformationBlock = informationContainerHeight;

        this.brewComponent.lastChartLayout.height =
          flowHeight - informationContainerHeight;

        this.brewComponent.lastChartLayout.width =
          document.getElementById('brewFlowContainer').offsetWidth;
        Plotly.relayout('flowProfileChart', this.brewComponent.lastChartLayout);
      } catch (ex) {}
    }, 50);
  }

  public pressureDeviceConnected() {
    if (!this.platform.is('cordova')) {
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
  public resetTimer() {
    this.brewComponent.timer.reset();
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
    this.brew.coffee_first_drip_time = this.brew.brew_time;
    // Run first drip script
    if (
      !this.brewComponent.smartScaleConnected() &&
      this.brewComponent.preparationDeviceConnected()
    ) {
      // If scale is not connected but the device, we can now choose that still the script is executed if existing.
      if (this.brew.preparationDeviceBrew.params.scriptAtFirstDripId > 0) {
        this.brewComponent.preparationDevice.startScript(
          this.brew.preparationDeviceBrew.params.scriptAtFirstDripId
        );
      }
    }
    this.showDripTimer = false;
  }

  public setCoffeeBloomingTime(): void {
    this.brew.coffee_blooming_time = this.brew.brew_time;
    this.showBloomTimer = false;
  }

  public setActualScaleInformation(_val: any) {
    const weightEl = this.smartScaleWeightDetail.nativeElement;
    const flowEl = this.smartScaleWeightPerSecondDetail.nativeElement;
    const avgFlowEl = this.smartScaleAvgFlowPerSecondDetail.nativeElement;
    weightEl.textContent = _val.scaleWeight;
    flowEl.textContent = _val.smoothedWeight;
    avgFlowEl.textContent = 'Ø ' + _val.avgFlow;
  }

  public setActualPressureInformation(_val: any) {
    const pressureEl = this.pressureDetail.nativeElement;
    pressureEl.textContent = _val.pressure;
  }

  public setActualTemperatureInformation(_val: any) {
    const temperatureEl = this.temperatureDetail.nativeElement;
    temperatureEl.textContent = _val.temperature;
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
    document
      .getElementById('canvasContainerBrew')
      .append(document.getElementById('flowProfileChart'));
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

  protected readonly PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
}
