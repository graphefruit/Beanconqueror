import { Platforms } from '@ionic/core';
import { PeripheralData } from '../../classes/devices/ble.types';
import { Injectable } from '@angular/core';
import {
  BluetoothScale,
  ScaleType,
  makeDevice,
  LunarScale,
  DecentScale,
  JimmyScale,
  PressureType,
  makePressureDevice,
} from '../../classes/devices';
import { Platform } from '@ionic/angular';
import { UILog } from '../uiLog';
import { UIToast } from '../uiToast';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { Observable, Subject } from 'rxjs';
import { UIHelper } from '../uiHelper';
import FelicitaScale from '../../classes/devices/felicitaScale';
import PopsiclePressure from '../../classes/devices/popsiclePressure';
import { PressureDevice } from '../../classes/devices/pressureBluetoothDevice';
import TransducerDirectPressure from '../../classes/devices/transducerDirectPressure';

declare var ble;
declare var window;

@Injectable({
  providedIn: 'root',
})
export class BleManagerService {
  public scale: BluetoothScale = null;
  public pressureDevice: PressureDevice = null;
  public failed: boolean;
  public ready: boolean;

  private eventSubject = new Subject<any>();

  constructor(
    private readonly platform: Platform,
    private readonly uiLog: UILog,
    private readonly uiToast: UIToast,
    private androidPermissions: AndroidPermissions,
    private readonly uiHelper: UIHelper
  ) {
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
    this.eventSubject.next({ type: _type });
  }

  public async hasLocationPermission(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      if (this.platform.is('android')) {
        this.androidPermissions
          .hasPermission(
            this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION
          )
          .then(
            (_status) => {
              if (_status.hasPermission === false) {
                resolve(false);
              } else {
                resolve(true);
              }
            },
            () => {
              resolve(false);
            }
          );
      } else {
        resolve(true);
      }
    });
  }

  public async hasBluetoothPermission(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      if (this.platform.is('android')) {
        this.androidPermissions
          .hasPermission(this.androidPermissions.PERMISSION.BLUETOOTH_ADMIN)
          .then(
            (_status) => {
              if (_status.hasPermission === false) {
                resolve(false);
              } else {
                resolve(true);
              }
            },
            () => {
              resolve(false);
            }
          );
      } else {
        resolve(true);
      }
    });
  }

  public async requestBluetoothPermissions() {
    return new Promise<boolean>((resolve, reject) => {
      this.androidPermissions
        .requestPermission(this.androidPermissions.PERMISSION.BLUETOOTH_ADMIN)
        .then(
          (_status) => {
            if (_status.hasPermission === false) {
              resolve(false);
            } else {
              resolve(true);
            }
          },
          () => {
            resolve(false);
          }
        );
    });
  }

  public async requestLocationPermissions() {
    return new Promise<boolean>((resolve, reject) => {
      this.androidPermissions
        .requestPermission(
          this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION
        )
        .then(
          (_status) => {
            if (_status.hasPermission === false) {
              resolve(false);
            } else {
              resolve(true);
            }
          },
          () => {
            resolve(false);
          }
        );
    });
  }

  public async scanDevices(): Promise<Array<any>> {
    return new Promise<Array<any>>((resolve, reject) => {
      const devices: Array<any> = [];

      let timeoutVar: any = null;
      const stopScanningAndResolve = async () => {
        try {
          await this.stopScanning();
        } catch (ex) {
          // Grab error.
        }

        this.uiLog.log('Scales found ' + JSON.stringify(devices));
        resolve(devices);
      };

      ble.startScan(
        [],
        async (device) => {
          this.uiLog.log('Device found ' + JSON.stringify(device));
          if (
            DecentScale.test(device) ||
            LunarScale.test(device) ||
            JimmyScale.test(device) ||
            FelicitaScale.test(device)
          ) {
            // We found all needed devices.
            devices.push(device);

            this.uiLog.log('Supported Scale found ' + JSON.stringify(device));
            clearTimeout(timeoutVar);
            timeoutVar = null;
            await stopScanningAndResolve();
          }
        },
        () => {
          resolve(devices);
        }
      );
      timeoutVar = setTimeout(async () => {
        await stopScanningAndResolve();
      }, 60000);
    });
  }

  public async scanPressureDevices(): Promise<Array<any>> {
    return new Promise<Array<any>>((resolve, reject) => {
      const devices: Array<any> = [];

      let timeoutVar: any = null;
      const stopScanningAndResolve = async () => {
        try {
          await this.stopScanning();
        } catch (ex) {
          // Grab error.
        }

        this.uiLog.log('Pressure devices found ' + JSON.stringify(devices));
        resolve(devices);
      };

      ble.startScan(
        [],
        async (device) => {
          this.uiLog.log('Pressure devices found ' + JSON.stringify(device));
          if (
            PopsiclePressure.test(device) ||
            TransducerDirectPressure.test(device)
          ) {
            // We found all needed devices.
            devices.push(device);

            this.uiLog.log(
              'Supported pressure devices found ' + JSON.stringify(device)
            );
            clearTimeout(timeoutVar);
            timeoutVar = null;
            await stopScanningAndResolve();
          }
        },
        () => {
          resolve(devices);
        }
      );
      timeoutVar = setTimeout(async () => {
        await stopScanningAndResolve();
      }, 60000);
    });
  }

  public disconnect(
    deviceId: string,
    show_toast: boolean = true
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      ble.disconnect(
        deviceId,
        () => {
          this.scale = null;
          if (show_toast) {
            this.uiToast.showInfoToast('SCALE.DISCONNECTED_SUCCESSFULLY');
          }
          resolve(true);
        },
        () => {
          resolve(false);
        }
      );
    });
  }

  public disconnectPressureDevice(
    deviceId: string,
    show_toast: boolean = true
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      ble.disconnect(
        deviceId,
        () => {
          this.pressureDevice = null;
          if (show_toast) {
            this.uiToast.showInfoToast('SCALE.DISCONNECTED_SUCCESSFULLY');
          }
          resolve(true);
        },
        () => {
          resolve(false);
        }
      );
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

  public getPressureDevice() {
    return this.pressureDevice;
  }

  public getPressure() {
    try {
      if (this.pressureDevice) {
        return this.uiHelper.toFixedIfNecessary(
          this.pressureDevice.getPressure(),
          2
        );
      }
      return 0;
    } catch (ex) {
      return 0;
    }
  }

  public getScaleWeight() {
    try {
      if (this.scale) {
        return this.uiHelper.toFixedIfNecessary(this.scale.getWeight(), 1);
      }
      return 0;
    } catch (ex) {
      return 0;
    }
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

  private async __scanAutoConnectPressureDeviceIOS() {
    return new Promise<boolean>(async (resolve, reject) => {
      if (this.platform.is('ios')) {
        // We just need to scan, then we can auto connect for iOS (lol)
        this.uiLog.log('Try to find pressure on iOS');
        const device = await this.tryToFindPressureDevice();
        if (device === undefined) {
          this.uiLog.log('Pressure device not found, retry');
          // Try every 61 seconds, because the search algorythm goes 60 seconds at all.
          const intV = setInterval(async () => {
            const pressureStub = await this.tryToFindPressureDevice();
            if (pressureStub !== undefined) {
              resolve(true);
              clearInterval(intV);
            } else {
              this.uiLog.log('Pressure device not found, retry');
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
    return new Promise<{ id: string; type: ScaleType }>(
      async (resolve, reject) => {
        const devices: Array<any> = await this.scanDevices();
        this.uiLog.log('BleManager - Loop through devices');
        for (const device of devices) {
          if (DecentScale.test(device)) {
            this.uiLog.log('BleManager - We found a decent scale');
            resolve({ id: device.id, type: ScaleType.DECENT });
            return;
          }
          if (LunarScale.test(device)) {
            this.uiLog.log('BleManager - We found a lunar/acaia scale');
            resolve({ id: device.id, type: ScaleType.LUNAR });
            return;
          }
          if (JimmyScale.test(device)) {
            this.uiLog.log('BleManager - We found a jimmy scale');
            resolve({ id: device.id, type: ScaleType.JIMMY });
            return;
          }
          if (FelicitaScale.test(device)) {
            this.uiLog.log('BleManager - We found a felicita scale');
            resolve({ id: device.id, type: ScaleType.FELICITA });
            return;
          }
        }
        resolve(undefined);
      }
    );
  }

  public async tryToFindPressureDevice() {
    return new Promise<{ id: string; type: PressureType }>(
      async (resolve, reject) => {
        const devices: Array<any> = await this.scanPressureDevices();
        this.uiLog.log('BleManager - Loop through pressure devices');
        for (const device of devices) {
          if (PopsiclePressure.test(device)) {
            this.uiLog.log('BleManager - We found a popsicle pressure device ');
            resolve({ id: device.id, type: PressureType.POPSICLE });
            return;
          } else if (TransducerDirectPressure.test(device)) {
            this.uiLog.log(
              'BleManager - We found a Transducer Direct pressure device '
            );
            resolve({ id: device.id, type: PressureType.DIRECT });
            return;
          }
        }
        resolve(undefined);
      }
    );
  }

  private async __iOSAccessBleStackAndAutoConnect(
    _findPressureDevice: boolean = false
  ) {
    return await new Promise((resolve) => {
      let counter: number = 1;
      const iOSScanInterval = setInterval(async () => {
        try {
          this.uiLog.log(
            '__iOSAccessBleStackAndAutoConnect - Try to get bluetooth state'
          );
          const enabled: boolean = await this.isBleEnabled();
          if (enabled === true) {
            clearInterval(iOSScanInterval);
            if (_findPressureDevice === false) {
              await this.__scanAutoConnectScaleIOS();
              this.uiLog.log(
                '__iOSAccessBleStackAndAutoConnect - Scale for iOS found, resolve now'
              );
            } else {
              await this.__scanAutoConnectPressureDeviceIOS();
              this.uiLog.log(
                '__iOSAccessBleStackAndAutoConnect - Pressure devices for iOS found, resolve now'
              );
            }

            resolve(null);
          } else {
            this.uiLog.log(
              '__iOSAccessBleStackAndAutoConnect - Bluetooth not enabled, try again'
            );
          }
        } catch (ex) {
          this.uiLog.log(
            '__iOSAccessBleStackAndAutoConnect - Bluetooth error occured ' +
              JSON.stringify(ex)
          );
        }
        counter++;
        if (counter > 10) {
          this.uiLog.log(
            '__iOSAccessBleStackAndAutoConnect - iOS - Stop after 10 tries'
          );
          clearInterval(iOSScanInterval);
          resolve(null);
        }
      }, 1000);
    });
  }

  public async autoConnectScale(
    deviceType: ScaleType,
    deviceId: string,
    _retryScanForIOS: boolean = false
  ) {
    if (_retryScanForIOS) {
      // iOS needs to know the scale, before auto connect can be done
      await this.__iOSAccessBleStackAndAutoConnect();
    }

    this.uiLog.log('AutoConnectScale - We can start or we waited for iOS');


    this.uiLog.log(
      'AutoConnectScale - We created our promise, and try to autoconnect to device now.'
    );
    ble.autoConnect(
      deviceId,
      this.connectCallback.bind(this, deviceType),
      this.disconnectCallback.bind(this)
    );

  }

  public async autoConnectPressureDevice(
    pressureType: PressureType,
    deviceId: string,
    _retryScanForIOS: boolean = false
  ) {
    if (_retryScanForIOS) {
      // iOS needs to know the scale, before auto connect can be done
      await this.__iOSAccessBleStackAndAutoConnect(true);
    }

    this.uiLog.log(
      'AutoConnectPressureDevice - We can start or we waited for iOS'
    );


    this.uiLog.log(
      'AutoConnectPressureDevice - We created our promise, and try to autoconnect to device now.'
    );
    ble.autoConnect(
      deviceId,
      this.connectPressureCallback.bind(this, pressureType),
      this.disconnectPressureCallback.bind(this)
    );

  }

  private connectCallback(
    deviceType: ScaleType,
    data: PeripheralData
  ) {
    // wait for full data
    if (!this.scale || 'characteristics' in data) {
      this.scale = makeDevice(
        deviceType,
        data,
        this.platform.platforms() as Platforms[]
      );
      this.uiLog.log('Connected successfully');
      this.uiToast.showInfoToast('SCALE.CONNECTED_SUCCESSFULLY');
      this.__sendEvent('CONNECT_SCALE');
    }
  }

  private disconnectCallback(callback) {
    if (this.scale) {
      this.scale.disconnectTriggered();
      this.scale = null;
      this.uiToast.showInfoToast('SCALE.DISCONNECTED_UNPLANNED');
      this.uiLog.log('Disconnected successfully');
    }
    // Send disconnect callback, even if scale is already null/not existing anymore
    this.__sendEvent('DISCONNECT_SCALE');
  }

  private connectPressureCallback(
    pressureTaype: PressureType,
    data: PeripheralData
  ) {
    // wait for full data
    if (!this.pressureDevice || 'characteristics' in data) {
      this.pressureDevice = makePressureDevice(
        pressureTaype,
        data,
        this.platform.platforms() as Platforms[]
      );
      this.uiLog.log('Pressure Connected successfully');
      this.uiToast.showInfoToast('PRESSURE.CONNECTED_SUCCESSFULLY');
      this.__sendEvent('CONNECT_PRESSURE');
    }
  }

  private disconnectPressureCallback() {
    if (this.scale) {
      this.pressureDevice.disconnect();
      this.pressureDevice = null;
      this.uiToast.showInfoToast('PRESSURE.DISCONNECTED_UNPLANNED');
      this.uiLog.log('Disconnected successfully');
    }
    // Send disconnect callback, even if scale is already null/not existing anymore
    this.__sendEvent('DISCONNECT_PRESSURE');
  }
}
