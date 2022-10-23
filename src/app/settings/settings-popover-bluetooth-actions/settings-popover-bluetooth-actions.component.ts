import { Component, OnInit } from '@angular/core';
import { Settings } from '../../../classes/settings/settings';
import { ModalController, NavParams } from '@ionic/angular';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { CoffeeBluetoothDevicesService } from '@graphefruit/coffee-bluetooth-devices';
import { UIAlert } from '../../../services/uiAlert';

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

  public reconnectScale() {
    let timeoutVar: any = null;
    const scaleId = this.settings.scale_id;
    const scaleType = this.settings.scale_type;
    if (scaleId && scaleType) {
      this.uiAlert.showLoadingSpinner();
      this.bluetoothService.reconnectScale(
        scaleType,
        scaleId,
        () => {
          this.uiAlert.hideLoadingSpinner();
          clearTimeout(timeoutVar);
          timeoutVar = null;
        },
        () => {
          this.uiAlert.hideLoadingSpinner();
          clearTimeout(timeoutVar);
          timeoutVar = null;
        }
      );
    }

    timeoutVar = setTimeout(async () => {
      this.uiAlert.hideLoadingSpinner();
    }, 60000);
  }
  public reconnectPressureDevice() {
    let timeoutVar: any = null;
    const pressureId = this.settings.pressure_id;
    const pressureType = this.settings.pressure_type;
    if (pressureId && pressureType) {
      this.uiAlert.showLoadingSpinner();
      this.bluetoothService.reconnectPressureDevice(
        pressureType,
        pressureId,
        () => {
          this.uiAlert.hideLoadingSpinner();
          clearTimeout(timeoutVar);
          timeoutVar = null;
        },
        () => {
          this.uiAlert.hideLoadingSpinner();
          clearTimeout(timeoutVar);
          timeoutVar = null;
        }
      );
    }

    timeoutVar = setTimeout(async () => {
      this.uiAlert.hideLoadingSpinner();
    }, 60000);
  }

  public async choose(_type: string): Promise<void> {}
}
