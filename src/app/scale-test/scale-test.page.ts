import { Component, OnInit } from '@angular/core';
import { BleManagerService } from '../../services/bleManager/ble-manager.service';
import { UIAlert } from '../../services/uiAlert';

@Component({
  selector: 'scale-teset-page',
  templateUrl: './scale-test.page.html',
  styleUrls: ['./scale-test.page.scss'],
})
export class ScaleTestPage implements OnInit {

  private interval: any = undefined;
  constructor(private readonly bleManager: BleManagerService, private readonly uiAlert: UIAlert) { }

  public ngOnInit() {
  }

  public async findAndConnectScale() {

    const hasLocationPermission: boolean = await this.bleManager.hasLocationPermission();
    if (!hasLocationPermission) {
      await this.uiAlert.showMessage('SCALE.REQUEST_PERMISSION.LOCATION', undefined, undefined, true);
      await this.bleManager.requestLocationPermissions();
    }

    const hasBluetoothPermission: boolean = await this.bleManager.hasBluetoothPermission();
    if (!hasBluetoothPermission) {
      await this.uiAlert.showMessage('SCALE.REQUEST_PERMISSION.BLUETOOTH', undefined, undefined, true);
      await this.bleManager.requestBluetoothPermissions();
    }


    const bleEnabled: boolean = await this.bleManager.isBleEnabled();
    if (bleEnabled === false) {
      await this.uiAlert.showMessage('SCALE.BLUETOOTH_NOT_ENABLED', undefined, undefined, true);
      return;
    }


    await this.uiAlert.showLoadingSpinner();
    const device: any = await this.bleManager.tryToFindScale();
    if (device) {
      await this.uiAlert.hideLoadingSpinner();
      // We don't need to retry for iOS, because we just did scan before.
      this.bleManager.autoConnectScale(device.type, device.id, false);
    } else {
      await this.uiAlert.hideLoadingSpinner();
      this.uiAlert.showMessage('SCALE.CONNECTION_NOT_ESTABLISHED', undefined, undefined, true);
    }
  }

  public sendLEDCommand() {
    const scale = this.bleManager.getScale();
    scale.connect().then(() => {

    });
    if (this.interval === undefined) {
      let weightOn: boolean = false;
      let timerOn: boolean = false;
      this.interval = setInterval(() => {
        weightOn = !weightOn;
        timerOn = !timerOn;
        scale.setLed(weightOn, timerOn);
      }, 1000);
    }

  }
  public stopLEDCommand() {
    if (this.interval !== undefined) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

}
