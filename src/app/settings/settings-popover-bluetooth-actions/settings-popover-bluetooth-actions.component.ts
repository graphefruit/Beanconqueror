import { Component, OnInit, inject } from '@angular/core';
import { Settings } from '../../../classes/settings/settings';
import { ModalController } from '@ionic/angular/standalone';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIAlert } from '../../../services/uiAlert';
import {
  CoffeeBluetoothDevicesService,
  CoffeeBluetoothServiceEvent,
} from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { BluetoothTypes } from '../../../classes/devices';
import { AppEvent } from '../../../classes/appEvent/appEvent';
import { AppEventType } from '../../../enums/appEvent/appEvent';
import { EventQueueService } from '../../../services/queueService/queue-service.service';
import { BluetoothDeviceChooserPopoverComponent } from '../../../popover/bluetooth-device-chooser-popover/bluetooth-device-chooser-popover.component';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { bluetoothOutline } from 'ionicons/icons';
import {
  IonHeader,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-settings-popover-bluetooth-actions',
  templateUrl: './settings-popover-bluetooth-actions.component.html',
  styleUrls: ['./settings-popover-bluetooth-actions.component.scss'],
  imports: [
    TranslatePipe,
    IonHeader,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
  ],
})
export class SettingsPopoverBluetoothActionsComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiSettings = inject(UISettingsStorage);
  private readonly bluetoothService = inject(CoffeeBluetoothDevicesService);
  private readonly uiAlert = inject(UIAlert);
  private readonly eventQueue = inject(EventQueueService);

  public static COMPONENT_ID = 'settings-popover-bluetooth-actions';

  public settings: Settings;
  public readonly BluetoothTypes = BluetoothTypes;
  constructor() {
    this.settings = this.uiSettings.getSettings();
    addIcons({ bluetoothOutline });
  }

  public ionViewDidEnter(): void {}
  public ngOnInit() {}

  public async connectDevice(_type: BluetoothTypes) {
    const modal = await this.modalController.create({
      component: BluetoothDeviceChooserPopoverComponent,
      id: BluetoothDeviceChooserPopoverComponent.POPOVER_ID,
      componentProps: { bluetoothTypeSearch: _type },
    });
    await modal.present();
    await modal.onWillDismiss();
    this.settings = this.uiSettings.getSettings();
  }
  public async disconnectDevice(_type: BluetoothTypes) {
    /** Its true, because we try to disconnect, and if this is not possible, we just still forgot the device**/
    let disconnected: boolean = true;

    if (_type === BluetoothTypes.SCALE) {
      this.eventQueue.dispatch(
        new AppEvent(AppEventType.BLUETOOTH_SCALE_DISCONNECT, undefined),
      );
      if (this.settings.scale_id !== '' && this.bluetoothService.getScale()) {
        disconnected = await this.bluetoothService.disconnect(
          this.settings.scale_id,
        );
      }
      if (disconnected) {
        this.settings.scale_id = '';
        this.settings.scale_type = null;
      }
    } else if (_type === BluetoothTypes.PRESSURE) {
      this.eventQueue.dispatch(
        new AppEvent(
          AppEventType.BLUETOOTH_PRESSURE_DEVICE_DISCONNECT,
          undefined,
        ),
      );
      if (
        this.settings.pressure_id !== '' &&
        this.bluetoothService.getPressureDevice()
      ) {
        disconnected = await this.bluetoothService.disconnectPressureDevice(
          this.settings.pressure_id,
        );
      }

      if (disconnected) {
        this.settings.pressure_id = '';
        this.settings.pressure_type = null;
      }
    } else if (_type === BluetoothTypes.TEMPERATURE) {
      this.eventQueue.dispatch(
        new AppEvent(
          AppEventType.BLUETOOTH_TEMPERATURE_DEVICE_DISCONNECT,
          undefined,
        ),
      );
      if (
        this.settings.temperature_id !== '' &&
        this.bluetoothService.getTemperatureDevice()
      ) {
        disconnected = await this.bluetoothService.disconnectTemperatureDevice(
          this.settings.temperature_id,
        );
      }

      if (disconnected) {
        this.settings.temperature_id = '';
        this.settings.temperature_type = null;
      }
    } else if (_type === BluetoothTypes.TDS) {
      this.eventQueue.dispatch(
        new AppEvent(
          AppEventType.BLUETOOTH_REFRACTOMETER_DEVICE_DISCONNECT,
          undefined,
        ),
      );

      if (
        this.settings.refractometer_id !== '' &&
        this.bluetoothService.getRefractometerDevice()
      ) {
        disconnected =
          await this.bluetoothService.disconnectRefractometerDevice(
            this.settings.refractometer_id,
          );
      }

      if (disconnected) {
        this.settings.refractometer_id = '';
        this.settings.refractometer_type = null;
      }
    }

    if (disconnected) {
      await this.saveSettings();
    }
  }

  public async saveSettings() {
    await this.uiSettings.saveSettings(this.settings);
  }
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
        },
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
        },
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
        },
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

  public async reconnectRefractometer() {
    let timeoutVar: any = null;
    const refractometerId = this.settings.refractometer_id;
    const refractometerType = this.settings.refractometer_type;
    if (refractometerId && refractometerType) {
      await this.uiAlert.showLoadingSpinner();
      let subscrip = this.bluetoothService
        .attachOnEvent()
        .subscribe((_type) => {
          if (_type === CoffeeBluetoothServiceEvent.CONNECTED_REFRACTOMETER) {
            this.uiAlert.hideLoadingSpinner();
            if (subscrip) {
              subscrip.unsubscribe();
              subscrip = undefined;
            }
          }
        });
      this.bluetoothService.reconnectRefractometerDevice(
        refractometerType,
        refractometerId,
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
        },
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
