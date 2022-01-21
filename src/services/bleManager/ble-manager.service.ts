import { Platforms } from '@ionic/core';
import {PeripheralData} from './../../classes/devices/ble.types';
import {Injectable} from '@angular/core';
import {BluetoothScale, ScaleType, makeDevice, LunarScale, DecentScale, JimmyScale} from '../../classes/devices';
import {Platform} from '@ionic/angular';
import {UILog} from '../uiLog';
import {UIToast} from '../uiToast';
import {AndroidPermissions} from '@ionic-native/android-permissions/ngx';
import {Observable, Subject} from 'rxjs';

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

  private eventSubject = new Subject<any>();

  constructor(private readonly platform: Platform,
              private readonly uiLog: UILog,
              private readonly uiToast: UIToast,
              private androidPermissions: AndroidPermissions) {

    this.scales = [];
    this.failed = false;
    this.ready = true;
  }

  private stopScanning() {
    return new Promise((resolve, reject) => {
      return ble.stopScan(resolve, reject);
    });
  }


  public attachOnEvent(): Observable<any> {
    return this.eventSubject.asObservable();
  }

  private __sendEvent(_type: string) {
    this.eventSubject.next({type: _type});
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
        try {
          await this.stopScanning();
        } catch(ex) {
          // Grab error.
        }

        this.uiLog.log('Scales found ' + JSON.stringify(devices));
        resolve(devices);
      };


      ble.startScan([], async (device) => {
        this.uiLog.log('Device found ' + JSON.stringify(device));
        if (DecentScale.test(device) || LunarScale.test(device) || JimmyScale.test(device)) {
          // We found all needed devices.
          devices.push(device);

          this.uiLog.log('Supported Scale found ' + JSON.stringify(device));
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
          this.uiToast.showInfoToast('SCALE.DISCONNECTED_SUCCESSFULLY');
        }
        resolve(true);
      }, () => {
        resolve(false);
      });
    });
  }

  public isBleEnabled(): Promise<boolean> {
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
        } else {
          resolve(true);
        }

      } else {
        resolve(true);
      }
    });

  }

  public async tryToFindScale() {
    return new Promise<{ id: string, type: ScaleType }>(async (resolve, reject) => {
      const devices: Array<any> = await this.scanDevices();
      this.uiLog.log('BleManager - Loop through devices');
      for (const device of devices) {
        if (DecentScale.test(device)) {
          this.uiLog.log('BleManager - We found a decent scale');
          resolve({id: device.id, type: ScaleType.DECENT});
          return;
        }
        if (LunarScale.test(device)) {
          this.uiLog.log('BleManager - We found a lunar/acaia scale');
          resolve({id: device.id, type: ScaleType.LUNAR});
          return;
        }
        if (JimmyScale.test(device)) {
          this.uiLog.log('BleManager - We found a jimmy scale');
          resolve({id: device.id, type: ScaleType.JIMMY});
          return;
        }
      }
      resolve(undefined);
    });
  }

  private async __iOSAccessBleStackAndAutoConnect() {
    return await new Promise((resolve) => {
      let counter: number = 1;
      const iOSScanInterval = setInterval(async() => {
        try {
          this.uiLog.log('AutoConnectScale - Try to get bluetooth state');
          const enabled: boolean = await this.isBleEnabled();
          if (enabled === true) {
            clearInterval(iOSScanInterval);
            await this.__scanAutoConnectScaleIOS();
            this.uiLog.log('AutoConnectScale - Scale for iOS found, resolve now');
            resolve(null);
          } else {
            this.uiLog.log('AutoConnectScale - Bluetooth not enabled, try again');
          }
        }
        catch (ex) {
          this.uiLog.log('AutoConnectScale - Bluetooth error occured ' + JSON.stringify(ex));
        }
        counter ++;
        if (counter > 10) {
          this.uiLog.log('AutoConnectScale - iOS - Stop after 10 tries');
          clearInterval(iOSScanInterval);
          resolve(null);
        }

      },1000);
    });
  }

  public async autoConnectScale(deviceType: ScaleType, deviceId: string, _retryScanForIOS: boolean = false) {
    if (_retryScanForIOS) {
      // iOS needs to know the scale, before auto connect can be done
      await this.__iOSAccessBleStackAndAutoConnect();

    }

    this.uiLog.log('AutoConnectScale - We can start or we waited for iOS');

    return new Promise((resolve, reject) => {
      this.uiLog.log('AutoConnectScale - We created our promise, and try to autoconnect to device now.');
      ble.autoConnect(deviceId, this.connectCallback.bind(this, resolve, deviceType), this.disconnectCallback.bind(this, reject));
    });
  }

  private connectCallback(callback, deviceType: ScaleType, data: PeripheralData) {
    // wait for full data
    if (!this.scale || 'characteristics' in data) {
      this.scale = makeDevice(deviceType, data, this.platform.platforms() as Platforms[]);
      this.uiLog.log('Connected successfully');
      this.uiToast.showInfoToast('SCALE.CONNECTED_SUCCESSFULLY');
      callback();
      this.__sendEvent('CONNECT');
    }
  }


  private disconnectCallback(callback) {
    if (this.scale) {
      this.scale.disconnectTriggered();
      this.scale = null;
      this.uiToast.showInfoToast('SCALE.DISCONNECTED_UNPLANNED');
      this.uiLog.log('Disconnected successfully');
      callback();

    }
    //Send disconnect callback, even if scale is already null/not existing anymore
    this.__sendEvent('DISCONNECT');
  }
}
