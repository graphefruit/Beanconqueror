import {PeripheralData} from './../../classes/devices/ble.types';
import {Injectable} from '@angular/core';
import {BluetoothScale, ScaleType, makeDevice, LunarScale, DecentScale} from '../../classes/devices';
import {Platform} from '@ionic/angular';
import {UILog} from '../uiLog';
import {UIToast} from '../uiToast';
import {AndroidPermissions} from '@ionic-native/android-permissions/ngx';

declare var ble;
declare var window;

@Injectable({
  providedIn: 'root'
})
export class BleManagerService {
  public scale: BluetoothScale = null;
  public scales;
  public failed: boolean;
  public ready: boolean;

  constructor(private readonly platform: Platform,
              private readonly uiLog: UILog,
              private readonly uiToast: UIToast,
              private androidPermissions: AndroidPermissions) {

    this.scales = [];
    this.failed = false;
    this.ready = true;
  }

  private async stopScanning() {
    await ble.stopScan(() => {

    }, () => {

    });
  }

  public async hasLocationPermission(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      if (this.platform.is('android')) {
        this.androidPermissions.hasPermission(this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION).then((_status) => {
          if (_status.hasPermission === false) {
            resolve(false);
          } else {
            resolve(true);
          }
        }, () => {
          resolve(false);
        });
      } else {
        resolve(true);
      }
    });
  }

  public async hasBluetoothPermission(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      if (this.platform.is('android')) {
        this.androidPermissions.hasPermission(this.androidPermissions.PERMISSION.BLUETOOTH_ADMIN).then((_status) => {
          if (_status.hasPermission === false) {
            resolve(false);
          } else {
            resolve(true);
          }
        }, () => {
          resolve(false);
        });
      } else {
        resolve(true);
      }
    });
  }

  public async requestBluetoothPermissions() {
    return new Promise<boolean>((resolve, reject) => {
      this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.BLUETOOTH_ADMIN).then((_status) => {
        if (_status.hasPermission === false) {
          resolve(false);
        } else {
          resolve(true);
        }
      }, () => {
        resolve(false);
      });
    });
  }

  public async requestLocationPermissions() {
    return new Promise<boolean>((resolve, reject) => {
      this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION).then((_status) => {
        if (_status.hasPermission === false) {
          resolve(false);
        } else {
          resolve(true);
        }
      }, () => {
        resolve(false);
      });
    });
  }

  public async scanDevices(): Promise<Array<any>> {
    if (this.platform.is('android')) {
      /**  await this.bluetoothle.requestPermission().then(() => {
        }).catch(() => {
        });
       await this.bluetoothle.requestLocation().then(() => {
        }).catch(() => {
        });**/
    }

    return new Promise<Array<any>>((resolve, reject) => {
      const devices: Array<any> = [];

      let timeoutVar: any = null;
      const stopScanningAndResolve = async () => {
        await this.stopScanning();
        this.uiLog.log('Scales found ' + JSON.stringify(devices));
        resolve(devices);
      };

      ble.startScan([], async (device) => {
        devices.push(device);
        if (DecentScale.test(device) || LunarScale.test(device)) {
          // We found all needed devices.
          clearTimeout(timeoutVar);
          timeoutVar = null;
          await stopScanningAndResolve();
        }
      }, () => {
        resolve(devices);
      });
      timeoutVar = setTimeout(async () => {
        await stopScanningAndResolve();
      }, 60000);
    });
  }

  public disconnect(deviceId: string, show_toast: boolean = true): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      ble.disconnect(deviceId, () => {
        this.scale = null;
        if (show_toast) {
          this.uiToast.showInfoToastBottom('SCALE.DISCONNECTED_SUCCESSFULLY');
        }
        resolve(true);
      }, () => {
        resolve(false);
      });
    });
  }

  public async isBleEnabled(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      ble.isEnabled(
        () => {
          resolve(true);
        },
        () => {
          resolve(false);
        }
      );
    });
  }

  public getScale() {
    return this.scale;
  }

  private async __scanAutoConnectScaleIOS() {
    return new Promise<boolean>(async (resolve, reject) => {
      if (this.platform.is('ios')) {
        // We just need to scan, then we can auto connect for iOS (lol)
        this.uiLog.log('Try to find scale on iOS');
        const device = await this.tryToFindScale();
        if (device === undefined) {
          this.uiLog.log('Scale not found, retry');
          // Try every 11 seconds, because the search algorythm goes 10 seconds at all.
          const intV = setInterval(async () => {
            const scaleStub = await this.tryToFindScale();
            if (scaleStub !== undefined) {
              resolve(true);
              clearInterval(intV);
            } else {
              this.uiLog.log('Scale not found, retry');
            }
          }, 61000);
        }

      } else {
        resolve(true);
      }
    });

  }

  public async tryToFindScale() {
    return new Promise<{ id: string, type: ScaleType }>(async (resolve, reject) => {
      const devices: Array<any> = await this.scanDevices();
      for (const device of devices) {
        if (DecentScale.test(device)) {
          return resolve({id: device.id, type: ScaleType.DECENT});
        }
        if (LunarScale.test(device)) {
          return resolve({id: device.id, type: ScaleType.LUNAR});
        }
      }
      resolve(undefined);
    });
  }

  public async autoConnectScale(deviceType: ScaleType, deviceId: string, _retryScanForIOS: boolean = false,) {
    if (_retryScanForIOS === true) {
      // iOS needs to know the scale, before auto connect can be done
      await this.__scanAutoConnectScaleIOS();
    }

    ble.autoConnect(deviceId, this.connectCallback.bind(this, deviceType), this.disconnectCallback.bind(this));
  }

  private connectCallback(deviceType: ScaleType, data: PeripheralData) {
    // wait for full data
    if (!this.scale || 'characteristics' in data) {
      this.scale = makeDevice(deviceType, data);
      this.uiLog.log('Connected successfully');
      this.uiToast.showInfoToastBottom('SCALE.CONNECTED_SUCCESSFULLY');
    }
  }

  private disconnectCallback() {
    if (this.scale) {
      this.scale = null;
      this.uiToast.showInfoToastBottom('SCALE.DISCONNECTED_UNPLANNED');
      this.uiLog.log('Disconnected successfully');
    }
  }
}
