import { Injectable } from '@angular/core';
import DecentScale from '../../classes/devices/decentScale';
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
  public decentScale: DecentScale = null;
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

    },() => {

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
      ble.startScan([], async (device)=>  {
        devices.push(device);
        let deviceName = '';
        if (device && device.name && device.name !== '') {
          deviceName = device && device.name && device.name.toLowerCase();
        }
        if (deviceName.startsWith('decent')) {
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
      },60000);
    });
  }

  public connectDevice(device: any): Promise<boolean> {
    return new Promise((resolve, reject) => {

      if (device && device.id) {
        ble.connect(device.id, (e) => {
          resolve(true);
          this.uiLog.log('Decent scale connected');
        }, () => {
          this.uiLog.log('Decent scale NOT connected');
          resolve(false);
        });
      }
    });
  }
  public disconnect(deviceId): Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      ble.disconnect(deviceId, () => {
        this.decentScale = null;
        this.uiToast.showInfoToastBottom('SCALE_DISCONNECTED_SUCCESSFULLY');
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

  public getDecentScale() {
    return this.decentScale;
  }

  private async __scanAutoConnectDecentScaleIOS() {
    return new Promise<boolean>(async (resolve, reject) => {
      if (this.platform.is('ios')) {
        // We just need to scan, then we can auto connect for iOS (lol)
        this.uiLog.log('Try to find scale on iOS');
        const decentScale = await this.tryToFindDecentScale();
        if (decentScale === undefined) {
          this.uiLog.log('Scale not found, retry');
          // Try every 11 seconds, because the search algorythm goes 10 seconds at all.
          const intV = setInterval(async () => {

            const decentScaleSub = await this.tryToFindDecentScale();
            if (decentScaleSub !== undefined) {
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

  public async tryToFindDecentScale() {
    return new Promise<string>(async (resolve, reject) => {
      const devices: Array<any> = await this.scanDevices();
      for (const device of devices) {
        if (device && device.name && device.name.toLowerCase().startsWith('decent')) {
          resolve(device.id);
          return;
        }
      }
      resolve(undefined);
    });
  }
  public async autoConnectDecentScale(deviceId: string,_retryScanForIOS: boolean = false) {
    if (_retryScanForIOS === true) {
      // iOS needs to know the scale, before auto connect can be done
      await this.__scanAutoConnectDecentScaleIOS();
    }

    ble.autoConnect(deviceId, () => {
      this.decentScale = new DecentScale(deviceId);
      this.uiLog.log('Connected successfully');
      this.uiToast.showInfoToastBottom('SCALE.CONNECTED_SUCCESSFULLY');
    }, () => {
      if (this.decentScale !== null) {
        // The disconnect event was already called
        this.decentScale = null;
        this.uiToast.showInfoToastBottom('SCALE.DISCONNECTED_UNPLANNED');
        this.uiLog.log('Disconnected successfully');
      }
    });
  }

}
