import {
  ChangeDetectorRef,
  Component,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { BluetoothTypes, ScaleType } from '../../classes/devices';
import { CoffeeBluetoothDevicesService } from '../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { finalize, Subscription } from 'rxjs';
import { ModalController, Platform } from '@ionic/angular';
import { UIAlert } from '../../services/uiAlert';
import SETTINGS_TRACKING from '../../data/tracking/settingsTracking';
import { Settings } from '../../classes/settings/settings';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { Preparation } from '../../classes/preparation/preparation';

@Component({
  selector: 'app-bluetooth-device-chooser-popover',
  templateUrl: './bluetooth-device-chooser-popover.component.html',
  styleUrls: ['./bluetooth-device-chooser-popover.component.scss'],
})
export class BluetoothDeviceChooserPopoverComponent
  implements OnInit, OnDestroy
{
  public static POPOVER_ID: string = 'bluetooth-device-chooser-popover';
  @Input() public bluetoothTypeSearch: BluetoothTypes = undefined;

  private subscriptionToSearchDevices: Subscription;
  public deviceSelection: string;
  public foundDevices = [];
  private settings: Settings;
  public searchRunning: boolean = undefined;

  constructor(
    private readonly bleManager: CoffeeBluetoothDevicesService,
    private readonly modalController: ModalController,
    private readonly platform: Platform,
    private readonly uiAlert: UIAlert,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiAnalytics: UIAnalytics,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private ngZone: NgZone,
  ) {}

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
    this.searchDevices();
  }

  public research() {
    this.deviceSelection = '';
    this.foundDevices = [];
    this.searchDevices();
  }

  private async checkPermissions() {
    if (this.platform.is('ios')) {
      await this.uiAlert.showLoadingSpinner();
      await this.bleManager.enableIOSBluetooth();
      await this.uiAlert.hideLoadingSpinner();
    }

    const hasLocationPermission: boolean =
      await this.bleManager.hasLocationPermission();
    if (!hasLocationPermission) {
      await this.uiAlert.showMessage(
        'BLUETOOTH_REQUEST_PERMISSION.LOCATION',
        undefined,
        undefined,
        true,
      );
      await this.bleManager.requestLocationPermissions();
    }

    const hasBluetoothPermission: boolean =
      await this.bleManager.hasBluetoothPermission();
    if (!hasBluetoothPermission) {
      await this.uiAlert.showMessage(
        'BLUETOOTH_REQUEST_PERMISSION.BLUETOOTH',
        undefined,
        undefined,
        true,
      );
      await this.bleManager.requestBluetoothPermissions();
    }

    const bleEnabled: boolean = await this.bleManager.isBleEnabled();
    if (bleEnabled === false) {
      await this.uiAlert.showMessage(
        'BLUETOOTH_NOT_ENABLED',
        undefined,
        undefined,
        true,
      );
      return;
    }
  }

  private async searchDevices() {
    await this.checkPermissions();
    await this.destroySearchSubscription();

    let connectedId = '';
    if (this.bluetoothTypeSearch === BluetoothTypes.SCALE) {
      connectedId = this.settings.scale_id;
    } else if (this.bluetoothTypeSearch === BluetoothTypes.PRESSURE) {
      connectedId = this.settings.pressure_id;
    } else if (this.bluetoothTypeSearch === BluetoothTypes.TEMPERATURE) {
      connectedId = this.settings.temperature_id;
    } else if (this.bluetoothTypeSearch === BluetoothTypes.TDS) {
      connectedId = this.settings.refractometer_id;
    }

    this.searchRunning = true;
    this.subscriptionToSearchDevices = this.bleManager
      .scanForDevicesAndReport(this.bluetoothTypeSearch)
      .pipe(
        finalize(() => {
          this.searchRunning = false;
        }),
      )
      .subscribe((_device) => {
        /**Don't show a device which is currently connected**/
        let skipDevice: boolean = false;
        if (connectedId) {
          if (connectedId === _device.id) {
            skipDevice = true;
          }
        }
        if (skipDevice === false) {
          this.foundDevices.push(_device);
          this.checkChanges();
        }
      });
  }

  private async destroySearchSubscription() {
    await this.bleManager.stopScanning();
    if (this.subscriptionToSearchDevices) {
      this.subscriptionToSearchDevices.unsubscribe();
      this.subscriptionToSearchDevices = undefined;
    }
  }

  public ngOnDestroy() {
    this.destroySearchSubscription();
  }

  public checkChanges() {
    // #507 Wrapping check changes in set timeout so all values get checked
    setTimeout(() => {
      this.changeDetector.detectChanges();
      window.getComputedStyle(window.document.getElementsByTagName('body')[0]);
    }, 15);
  }

  public async close() {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BluetoothDeviceChooserPopoverComponent.POPOVER_ID,
    );
  }

  public async connect() {
    if (this.deviceSelection !== '') {
      let choosenDevice;
      for (const device of this.foundDevices) {
        if (device.id === this.deviceSelection) {
          choosenDevice = device;
          break;
        }
      }
      if (choosenDevice) {
        await this.uiAlert.showLoadingSpinner();
        if (this.bluetoothTypeSearch === BluetoothTypes.SCALE) {
          await this.connectScale(choosenDevice);
        } else if (this.bluetoothTypeSearch === BluetoothTypes.PRESSURE) {
          await this.connectPressure(choosenDevice);
        } else if (this.bluetoothTypeSearch === BluetoothTypes.TEMPERATURE) {
          await this.connectTemperature(choosenDevice);
        } else if (this.bluetoothTypeSearch === BluetoothTypes.TDS) {
          await this.connectRefractometer(choosenDevice);
        }
        await this.uiAlert.hideLoadingSpinner();
      }
    }
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BluetoothDeviceChooserPopoverComponent.POPOVER_ID,
    );
  }

  private async connectScale(_choosenDevice) {
    const scale = _choosenDevice;

    if (scale) {
      try {
        await this.uiAlert.showLoadingSpinner();
        // We don't need to retry for iOS, because we just did scan before.

        // NEVER!!! Await here, else the bluetooth logic will get broken.
        await new Promise(async (resolve) => {
          this.bleManager.autoConnectScale(
            scale.type,
            scale.id,
            false,
            () => {
              resolve(undefined);
            },
            () => {
              resolve(undefined);
            },
          );
        });
      } catch (ex) {}
      await this.uiAlert.hideLoadingSpinner();
      this.settings.scale_id = scale.id;
      this.settings.scale_type = scale.type;

      if (
        scale.type === ScaleType.DIFLUIDMICROBALANCE ||
        scale.type === ScaleType.DIFLUIDMICROBALANCETI
      ) {
        //If there are multiple commands, and also to reset the sclae, the difluid have issues with this, therefore set delay to 300ms
        this.settings.bluetooth_command_delay = 300;
      } else if (scale.type === ScaleType.FELICITA) {
        this.settings.bluetooth_command_delay = 100;
      }

      this.uiAnalytics.trackEvent(
        SETTINGS_TRACKING.TITLE,
        SETTINGS_TRACKING.ACTIONS.SCALE.CATEGORY,
        scale.type,
      );

      await this.saveSettings();

      if (scale.type === ScaleType.SKALE || scale.type === ScaleType.DECENT) {
        // Just skale and decent has an LED.
        let skipLoop = 0;
        for (let i = 0; i < 5; i++) {
          await new Promise((resolve) => {
            setTimeout(async () => {
              const connectedScale = this.bleManager.getScale();
              if (connectedScale !== null && connectedScale !== undefined) {
                skipLoop = 1;
                try {
                  connectedScale.setLed(true, true);
                } catch (ex) {}
              }
              resolve(undefined);
            }, 1000);
          });
          if (skipLoop === 1) {
            break;
          }
        }
      }
    } else {
      this.uiAlert.showMessage(
        'SCALE.CONNECTION_NOT_ESTABLISHED',
        undefined,
        undefined,
        true,
      );
    }
  }

  private async connectPressure(_choosenDevice) {
    const pressureDevice = _choosenDevice;
    if (pressureDevice) {
      await this.uiAlert.showLoadingSpinner();
      try {
        // We don't need to retry for iOS, because we just did scan before.

        await new Promise(async (resolve) => {
          this.bleManager.autoConnectPressureDevice(
            pressureDevice.type,
            pressureDevice.id,
            false,
            () => {
              resolve(undefined);
            },
            () => {
              resolve(undefined);
            },
          );
        });
        // NEVER!!! Await here, else the bluetooth logic will get broken.
      } catch (ex) {}
      await this.uiAlert.hideLoadingSpinner();

      this.settings.pressure_id = pressureDevice.id;
      this.settings.pressure_type = pressureDevice.type;

      //this.uiAnalytics.trackEvent(SETTINGS_TRACKING.TITLE, SETTINGS_TRACKING.ACTIONS.SCALE.CATEGORY,scale.type);

      await this.saveSettings();
    } else {
      this.uiAlert.showMessage(
        'PRESSURE.CONNECTION_NOT_ESTABLISHED',
        undefined,
        undefined,
        true,
      );
    }
  }

  private async connectTemperature(_choosenDevice) {
    const temperatureDevice = _choosenDevice;
    if (temperatureDevice) {
      try {
        await this.uiAlert.showLoadingSpinner();
        // We don't need to retry for iOS, because we just did scan before.

        // NEVER!!! Await here, else the bluetooth logic will get broken.
        await new Promise(async (resolve) => {
          this.bleManager.autoConnectTemperatureDevice(
            temperatureDevice.type,
            temperatureDevice.id,
            false,
            () => {
              resolve(undefined);
            },
            () => {
              resolve(undefined);
            },
          );
        });
      } catch (ex) {}
      await this.uiAlert.hideLoadingSpinner();
      this.settings.temperature_id = temperatureDevice.id;
      this.settings.temperature_type = temperatureDevice.type;

      //this.uiAnalytics.trackEvent(SETTINGS_TRACKING.TITLE, SETTINGS_TRACKING.ACTIONS.SCALE.CATEGORY,scale.type);

      await this.saveSettings();
    } else {
      this.uiAlert.showMessage(
        'TEMPERATURE.CONNECTION_NOT_ESTABLISHED',
        undefined,
        undefined,
        true,
      );
    }
  }

  private async connectRefractometer(_choosenDevice) {
    const refractometerDevice = _choosenDevice;
    if (refractometerDevice) {
      try {
        await this.uiAlert.showLoadingSpinner();
        // We don't need to retry for iOS, because we just did scan before.

        // NEVER!!! Await here, else the bluetooth logic will get broken.
        await new Promise(async (resolve) => {
          this.bleManager.autoConnectRefractometerDevice(
            refractometerDevice.type,
            refractometerDevice.id,
            false,
            () => {
              resolve(undefined);
            },
            () => {
              resolve(undefined);
            },
          );
        });
      } catch (ex) {}
      await this.uiAlert.hideLoadingSpinner();
      this.settings.refractometer_id = refractometerDevice.id;
      this.settings.refractometer_type = refractometerDevice.type;

      //this.uiAnalytics.trackEvent(SETTINGS_TRACKING.TITLE, SETTINGS_TRACKING.ACTIONS.SCALE.CATEGORY,scale.type);

      await this.saveSettings();

      await this.enableTdsParameter();
    } else {
      this.uiAlert.showMessage(
        'REFRACTOMETER.CONNECTION_NOT_ESTABLISHED',
        undefined,
        undefined,
        true,
      );
    }
  }

  private async enableTdsParameter() {
    await this.uiAlert.showLoadingSpinner();
    try {
      if (this.settings.manage_parameters.tds === false) {
        this.settings.manage_parameters.tds = true;
        await this.saveSettings();
      }

      const preps: Array<Preparation> =
        this.uiPreparationStorage.getAllEntries();
      if (preps.length > 0) {
        for (const prep of preps) {
          if (prep.manage_parameters.tds === false) {
            prep.manage_parameters.tds = true;
            await this.uiPreparationStorage.update(prep);
          }
        }
      }
    } catch (ex) {}

    await this.uiAlert.hideLoadingSpinner();
  }

  public async saveSettings() {
    await this.uiSettingsStorage.saveSettings(this.settings);
  }
}
