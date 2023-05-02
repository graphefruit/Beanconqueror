import { Component, OnInit } from '@angular/core';
import { Settings } from '../../../classes/settings/settings';
import { ModalController, NavParams } from '@ionic/angular';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIAlert } from '../../../services/uiAlert';
import {
  CoffeeBluetoothDevicesService,
  CoffeeBluetoothServiceEvent,
} from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';

@Component({
  selector: 'app-settings-popover-bluetooth-actions',
  templateUrl: './settings-popover-bluetooth-actions.component.html',
  styleUrls: ['./settings-popover-bluetooth-actions.component.scss'],
})
export class SettingsPopoverBluetoothActionsComponent implements OnInit {
  public static COMPONENT_ID = 'settings-popover-bluetooth-actions';

  public settings: Settings;

  constructor(
    private readonly modalController: ModalController,
    private readonly navParams: NavParams,
    private readonly uiHelper: UIHelper,
    private readonly uiSettings: UISettingsStorage,
    private readonly bluetoothService: CoffeeBluetoothDevicesService,
    private readonly uiAlert: UIAlert
  ) {
    this.settings = this.uiSettings.getSettings();
  }

  public ionViewDidEnter(): void {}
  public ngOnInit() {}

  public async reconnectScale() {
    let timeoutVar: any = null;
    const scaleId = this.settings.scale_id;
    const scaleType = this.settings.scale_type;
    if (scaleId && scaleType) {
      await this.uiAlert.showLoadingSpinner();
      let subscrip = this.bluetoothService
        .attachOnEvent()
        .subscribe((_type) => {
          if (_type === CoffeeBluetoothServiceEvent.CONNECTED_SCALE) {
            this.uiAlert.hideLoadingSpinner();
            if (subscrip) {
              subscrip.unsubscribe();
              subscrip = undefined;
            }
          }
        });

      this.bluetoothService.reconnectScale(
        scaleType,
        scaleId,
        () => {
          if (subscrip) {
            subscrip.unsubscribe();
            subscrip = undefined;
          }
          this.uiAlert.hideLoadingSpinner();
          clearTimeout(timeoutVar);
          timeoutVar = null;
        },
        () => {
          if (subscrip) {
            subscrip.unsubscribe();
            subscrip = undefined;
          }
          this.uiAlert.hideLoadingSpinner();
          clearTimeout(timeoutVar);
          timeoutVar = null;
        }
      );
      timeoutVar = setTimeout(async () => {
        this.uiAlert.hideLoadingSpinner();
      }, 60000);
    }
  }
  public async reconnectPressureDevice() {
    let timeoutVar: any = null;
    const pressureId = this.settings.pressure_id;
    const pressureType = this.settings.pressure_type;
    if (pressureId && pressureType) {
      await this.uiAlert.showLoadingSpinner();
      let subscrip = this.bluetoothService
        .attachOnEvent()
        .subscribe((_type) => {
          if (_type === CoffeeBluetoothServiceEvent.CONNECTED_PRESSURE) {
            this.uiAlert.hideLoadingSpinner();
            if (subscrip) {
              subscrip.unsubscribe();
              subscrip = undefined;
            }
          }
        });
      this.bluetoothService.reconnectPressureDevice(
        pressureType,
        pressureId,
        () => {
          if (subscrip) {
            subscrip.unsubscribe();
            subscrip = undefined;
          }
          this.uiAlert.hideLoadingSpinner();
          clearTimeout(timeoutVar);
          timeoutVar = null;
        },
        () => {
          if (subscrip) {
            subscrip.unsubscribe();
            subscrip = undefined;
          }
          this.uiAlert.hideLoadingSpinner();
          clearTimeout(timeoutVar);
          timeoutVar = null;
        }
      );
      timeoutVar = setTimeout(async () => {
        if (subscrip) {
          subscrip.unsubscribe();
          subscrip = undefined;
        }
        this.uiAlert.hideLoadingSpinner();
      }, 15000);
    }
  }
  public async reconnectTemperatureDevice() {
    let timeoutVar: any = null;
    const temperatureId = this.settings.temperature_id;
    const temperatureType = this.settings.temperature_type;
    if (temperatureId && temperatureType) {
      await this.uiAlert.showLoadingSpinner();
      let subscrip = this.bluetoothService
        .attachOnEvent()
        .subscribe((_type) => {
          if (_type === CoffeeBluetoothServiceEvent.CONNECTED_TEMPERATURE) {
            this.uiAlert.hideLoadingSpinner();
            if (subscrip) {
              subscrip.unsubscribe();
              subscrip = undefined;
            }
          }
        });
      this.bluetoothService.reconnectTemperatureDevice(
        temperatureType,
        temperatureId,
        () => {
          if (subscrip) {
            subscrip.unsubscribe();
            subscrip = undefined;
          }
          this.uiAlert.hideLoadingSpinner();
          clearTimeout(timeoutVar);
          timeoutVar = null;
        },
        () => {
          if (subscrip) {
            subscrip.unsubscribe();
            subscrip = undefined;
          }
          this.uiAlert.hideLoadingSpinner();
          clearTimeout(timeoutVar);
          timeoutVar = null;
        }
      );

      timeoutVar = setTimeout(async () => {
        if (subscrip) {
          subscrip.unsubscribe();
          subscrip = undefined;
        }
        this.uiAlert.hideLoadingSpinner();
      }, 15000);
    }
  }

  public async choose(_type: string): Promise<void> {}
}
