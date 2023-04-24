import { Injectable } from '@angular/core';
import { BluetoothScale } from 'src/classes/devices/bluetoothDevice';
import { TemperatureDevice } from 'src/classes/devices/temperatureBluetoothDevice';
import { ETITemperature } from 'src/classes/devices/etiTemperature';
import { Logger } from 'src/classes/devices/common/logger';
import { PressureDevice } from 'src/classes/devices/pressureBluetoothDevice';
import { PrsPressure } from 'src/classes/devices/prsPressure';
import { EurekaPrecisaScale } from '../../classes/devices/eurekaPrecisaScale';
import {
  makeDevice,
  makePressureDevice,
  makeTemperatureDevice,
  PressureType,
  ScaleType,
  TemperatureType,
} from '../../classes/devices';
import { DecentScale } from '../../classes/devices/decentScale';
import { TransducerDirectPressure } from '../../classes/devices/transducerDirectPressure';
import { FelicitaScale } from '../../classes/devices/felicitaScale';
import { PeripheralData } from '../../classes/devices/ble.types';
import { Observable, Subject } from 'rxjs';
import { LunarScale } from '../../classes/devices/lunarScale';
import { PopsiclePressure } from '../../classes/devices/popsiclePressure';
import { JimmyScale } from '../../classes/devices/jimmyScale';
import { SkaleScale } from '../../classes/devices/skale';

declare var device: any;
declare var ble: any;
declare var cordova: any;

export enum CoffeeBluetoothServiceEvent {
  CONNECTED_SCALE,
  DISCONNECTED_SCALE,
  CONNECTED_PRESSURE,
  DISCONNECTED_PRESSURE,
  CONNECTED_TEMPERATURE,
  DISCONNECTED_TEMPERATURE,
}

@Injectable({
  providedIn: 'root',
})
export class CoffeeBluetoothDevicesService {
  public scale: BluetoothScale | null = null;
  public pressureDevice: PressureDevice | null = null;
  public temperatureDevice: TemperatureDevice | null = null;
  public failed: boolean;
  public ready: boolean;
  private readonly logger: Logger;
  private eventSubject = new Subject<CoffeeBluetoothServiceEvent>();
  private androidPermissions: any = null;

  constructor() {
    this.logger = new Logger('CoffeeBluetoothDevices');
    this.failed = false;
    this.ready = true;

    if (
      typeof cordova !== 'undefined' &&
      typeof device !== 'undefined' &&
      device !== null &&
      device.platform === 'Android'
    ) {
      this.androidPermissions = cordova.plugins.permissions;
    }
  }

  public attachOnEvent(): Observable<CoffeeBluetoothServiceEvent> {
    return this.eventSubject.asObservable();
  }

  public async hasLocationPermission(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
        if (device !== null && device.platform === 'Android') {
          this.androidPermissions.hasPermission(
            this.androidPermissions.ACCESS_FINE_LOCATION,
            (_status: any) => {
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
      } catch (ex) {
        resolve(true);
      }
    });
  }

  public async hasBluetoothPermission(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
        if (device !== null && device.platform === 'Android') {
          this.androidPermissions.hasPermission(
            this.androidPermissions.BLUETOOTH_ADMIN,
            (_status: any) => {
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
      } catch (ex) {
        resolve(true);
      }
    });
  }

  public async requestBluetoothPermissions() {
    return new Promise<boolean>((resolve, reject) => {
      try {
        this.androidPermissions.requestPermission(
          this.androidPermissions.BLUETOOTH_ADMIN,
          (_status: any) => {
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
      } catch (ex) {
        resolve(true);
      }
    });
  }

  public async requestLocationPermissions() {
    return new Promise<boolean>((resolve, reject) => {
      try {
        this.androidPermissions.requestPermission(
          this.androidPermissions.ACCESS_FINE_LOCATION,
          (_status: any) => {
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
      } catch (ex) {
        resolve(true);
      }
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

        this.logger.log('Scales found ' + JSON.stringify(devices));
        resolve(devices);
      };

      ble.startScanWithOptions(
        [],
        { reportDuplicates: true },
        async (scanDevice: any) => {
          this.logger.log('Device found ' + JSON.stringify(scanDevice));
          if (
            DecentScale.test(scanDevice) ||
            LunarScale.test(scanDevice) ||
            JimmyScale.test(scanDevice) ||
            FelicitaScale.test(scanDevice) ||
            EurekaPrecisaScale.test(scanDevice) ||
            SkaleScale.test(scanDevice)
          ) {
            // We found all needed devices.
            devices.push(scanDevice);

            this.logger.log(
              'Supported Scale found ' + JSON.stringify(scanDevice)
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

        this.logger.log('Pressure devices found ' + JSON.stringify(devices));
        resolve(devices);
      };

      ble.startScanWithOptions(
        [],
        { reportDuplicates: true },
        async (devicePressure: any) => {
          this.logger.log(
            'Pressure devices found ' + JSON.stringify(devicePressure)
          );
          if (
            PrsPressure.test(devicePressure) ||
            PopsiclePressure.test(devicePressure) ||
            TransducerDirectPressure.test(devicePressure)
          ) {
            // We found all needed devices.
            devices.push(devicePressure);

            this.logger.log(
              'Supported pressure devices found ' +
                JSON.stringify(devicePressure)
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

  public async scanTemperatureDevices(): Promise<Array<any>> {
    return new Promise<Array<any>>((resolve, reject) => {
      const devices: Array<any> = [];

      let timeoutVar: any = null;
      const stopScanningAndResolve = async () => {
        try {
          await this.stopScanning();
        } catch (ex) {
          // Grab error.
        }

        this.logger.log('Temperature devices found ' + JSON.stringify(devices));
        resolve(devices);
      };

      ble.startScan(
        [],
        async (deviceTemperature: any) => {
          this.logger.log(
            'Pressure devices found ' + JSON.stringify(deviceTemperature)
          );
          if (ETITemperature.test(deviceTemperature)) {
            // We found all needed devices.
            devices.push(deviceTemperature);

            this.logger.log(
              'Supported pressure devices found ' +
                JSON.stringify(deviceTemperature)
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
          this.scale?.disconnectTriggered();
          this.scale = null;
          if (show_toast) {
            // this.uiToast.showInfoToast('SCALE.DISCONNECTED_SUCCESSFULLY');
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
            // this.uiToast.showInfoToast('SCALE.DISCONNECTED_SUCCESSFULLY');
          }
          resolve(true);
        },
        () => {
          resolve(false);
        }
      );
    });
  }

  public disconnectTemperatureDevice(
    deviceId: string,
    show_toast: boolean = true
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      ble.disconnect(
        deviceId,
        () => {
          this.temperatureDevice = null;
          if (show_toast) {
            // this.uiToast.showInfoToast('SCALE.DISCONNECTED_SUCCESSFULLY');
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

  public getTemperatureDevice() {
    return this.temperatureDevice;
  }

  public getPressure() {
    try {
      if (this.pressureDevice) {
        return this.toFixedIfNecessary(this.pressureDevice.getPressure(), 2);
      }
      return 0;
    } catch (ex) {
      return 0;
    }
  }

  public getScaleWeight() {
    try {
      if (this.scale) {
        return this.toFixedIfNecessary(this.scale.getWeight(), 1);
      }
      return 0;
    } catch (ex) {
      return 0;
    }
  }

  public getTemperature() {
    try {
      if (this.temperatureDevice) {
        return this.toFixedIfNecessary(
          this.temperatureDevice.getTemperature(),
          2
        );
      }
      return 0;
    } catch (ex) {
      return 0;
    }
  }

  public async tryToFindScale() {
    return new Promise<{ id: string; type: ScaleType } | undefined>(
      async (resolve, reject) => {
        this.logger.log('BleManager - Start looping through devices');
        const devices: Array<any> = await this.scanDevices();
        this.logger.log('BleManager - Ended looping through devices');
        for (const deviceScale of devices) {
          if (DecentScale.test(deviceScale)) {
            this.logger.log('BleManager - We found a decent scale');
            resolve({ id: deviceScale.id, type: ScaleType.DECENT });
            return;
          }
          if (LunarScale.test(deviceScale)) {
            this.logger.log('BleManager - We found a lunar/acaia scale');
            resolve({ id: deviceScale.id, type: ScaleType.LUNAR });
            return;
          }
          if (JimmyScale.test(deviceScale)) {
            this.logger.log('BleManager - We found a jimmy scale');
            resolve({ id: deviceScale.id, type: ScaleType.JIMMY });
            return;
          }
          if (FelicitaScale.test(deviceScale)) {
            this.logger.log('BleManager - We found a felicita scale');
            resolve({ id: deviceScale.id, type: ScaleType.FELICITA });
            return;
          }
          if (EurekaPrecisaScale.test(deviceScale)) {
            this.logger.log('BleManager - We found a eureka scale');
            resolve({ id: deviceScale.id, type: ScaleType.EUREKAPRECISA });
            return;
          }
          if (SkaleScale.test(deviceScale)) {
            this.logger.log('BleManager - We found a skale scale');
            resolve({ id: deviceScale.id, type: ScaleType.SKALE });
            return;
          }
        }
        resolve(undefined);
      }
    );
  }

  public async tryToFindScales() {
    return new Promise<Array<{ id: string; type: ScaleType }> | undefined>(
      async (resolve, reject) => {
        const devices: Array<any> = await this.scanDevices();
        this.logger.log('BleManager - Loop through devices');
        const supportedDevices: Array<{ id: string; type: ScaleType }> = [];
        for (const deviceScale of devices) {
          if (DecentScale.test(deviceScale)) {
            this.logger.log('BleManager - We found a decent scale');
            supportedDevices.push({
              id: deviceScale.id,
              type: ScaleType.DECENT,
            });
          }
          if (LunarScale.test(deviceScale)) {
            this.logger.log('BleManager - We found a lunar/acaia scale');
            supportedDevices.push({
              id: deviceScale.id,
              type: ScaleType.LUNAR,
            });
          }
          if (JimmyScale.test(deviceScale)) {
            this.logger.log('BleManager - We found a jimmy scale');
            supportedDevices.push({
              id: deviceScale.id,
              type: ScaleType.JIMMY,
            });
          }
          if (FelicitaScale.test(deviceScale)) {
            this.logger.log('BleManager - We found a felicita scale');
            supportedDevices.push({
              id: deviceScale.id,
              type: ScaleType.FELICITA,
            });
          }
          if (EurekaPrecisaScale.test(deviceScale)) {
            this.logger.log('BleManager - We found a eureka scale');
            supportedDevices.push({
              id: deviceScale.id,
              type: ScaleType.EUREKAPRECISA,
            });
          }
          if (SkaleScale.test(deviceScale)) {
            this.logger.log('BleManager - We found a skale scale');
            supportedDevices.push({
              id: deviceScale.id,
              type: ScaleType.SKALE,
            });
          }
        }
        resolve(supportedDevices);
      }
    );
  }

  public async tryToFindPressureDevices() {
    return new Promise<Array<{ id: string; type: PressureType }> | undefined>(
      async (resolve, reject) => {
        const devices: Array<any> = await this.scanPressureDevices();
        this.logger.log('BleManager - Loop through pressure devices');
        const supportedDevices: Array<{ id: string; type: PressureType }> = [];
        for (const devicePressure of devices) {
          if (PrsPressure.test(devicePressure)) {
            this.logger.log(
              'BleManager - We found a PRS Direct pressure device ' +
                JSON.stringify(devicePressure)
            );
            supportedDevices.push({
              id: devicePressure.id,
              type: PressureType.PRS,
            });
          } else if (PopsiclePressure.test(devicePressure)) {
            this.logger.log(
              'BleManager - We found a popsicle pressure device ' +
                JSON.stringify(devicePressure)
            );
            supportedDevices.push({
              id: devicePressure.id,
              type: PressureType.POPSICLE,
            });
          } else if (TransducerDirectPressure.test(devicePressure)) {
            this.logger.log(
              'BleManager - We found a Transducer Direct pressure device ' +
                JSON.stringify(devicePressure)
            );
            supportedDevices.push({
              id: devicePressure.id,
              type: PressureType.DIRECT,
            });
          }
        }
        resolve(supportedDevices);
      }
    );
  }

  public async tryToFindPressureDevice() {
    return new Promise<{ id: string; type: PressureType } | undefined>(
      async (resolve, reject) => {
        const devices: Array<any> = await this.scanPressureDevices();
        this.logger.log('BleManager - Loop through pressure devices');
        for (const devicePressure of devices) {
          if (PopsiclePressure.test(devicePressure)) {
            this.logger.log(
              'BleManager - We found a popsicle pressure device '
            );
            resolve({ id: devicePressure.id, type: PressureType.POPSICLE });
            return;
          } else if (TransducerDirectPressure.test(devicePressure)) {
            this.logger.log(
              'BleManager - We found a Transducer Direct pressure device '
            );
            resolve({ id: devicePressure.id, type: PressureType.DIRECT });
            return;
          } else {
          }

          if (PrsPressure.test(devicePressure)) {
            this.logger.log(
              'BleManager - We found a PRS Direct pressure device '
            );
            resolve({ id: devicePressure.id, type: PressureType.PRS });
            return;
          }
        }
        resolve(undefined);
      }
    );
  }

  public async tryToFindTemperatureDevices() {
    return new Promise<
      Array<{ id: string; type: TemperatureType }> | undefined
    >(async (resolve, reject) => {
      const devices: Array<any> = await this.scanTemperatureDevices();
      this.logger.log('BleManager - Loop through temperature devices');
      const supportedDevices: Array<{ id: string; type: TemperatureType }> = [];
      for (const deviceTemperature of devices) {
        if (ETITemperature.test(deviceTemperature)) {
          this.logger.log(
            'BleManager - We found a ETI Ltd Thermometer device ' +
              JSON.stringify(deviceTemperature)
          );
          supportedDevices.push({
            id: deviceTemperature.id,
            type: TemperatureType.ETI,
          });
        }
      }
      resolve(supportedDevices);
    });
  }

  public async tryToFindTemperatureDevice() {
    return new Promise<{ id: string; type: TemperatureType } | undefined>(
      async (resolve, reject) => {
        const devices: Array<any> = await this.scanTemperatureDevices();
        this.logger.log('BleManager - Loop through temperature devices');
        for (const deviceTemperature of devices) {
          if (ETITemperature.test(deviceTemperature)) {
            this.logger.log(
              'BleManager - We found a ETI Ltd Thermometer device '
            );
            resolve({ id: deviceTemperature.id, type: TemperatureType.ETI });
            return;
          }
        }
        resolve(undefined);
      }
    );
  }

  public reconnectScale(
    deviceType: ScaleType,
    deviceId: string,
    successCallback: any = () => {},
    errorCallback: any = () => {}
  ) {
    ble.disconnect(
      deviceId,
      () => {
        // Success
        setTimeout(() => {
          this.autoConnectScale(
            deviceType,
            deviceId,
            true,
            successCallback,
            errorCallback
          );
        }, 1000);
      },
      () => {
        //Fail
        errorCallback();
      }
    );
  }

  public reconnectPressureDevice(
    pressureType: PressureType,
    deviceId: string,
    successCallback: any = () => {},
    errorCallback: any = () => {}
  ) {
    ble.disconnect(
      deviceId,
      () => {
        // Success
        setTimeout(() => {
          this.autoConnectPressureDevice(
            pressureType,
            deviceId,
            true,
            successCallback,
            errorCallback
          );
        }, 1000);
      },
      () => {
        //Fail
        errorCallback();
      }
    );
  }

  public reconnectTemperatureDevice(
    temperatureType: TemperatureType,
    deviceId: string,
    successCallback: any = () => {},
    errorCallback: any = () => {}
  ) {
    ble.disconnect(
      deviceId,
      () => {
        // Success
        setTimeout(() => {
          this.autoConnectTemperatureDevice(
            temperatureType,
            deviceId,
            true,
            successCallback,
            errorCallback
          );
        }, 1000);
      },
      () => {
        //Fail
        errorCallback();
      }
    );
  }

  public async autoConnectScale(
    deviceType: ScaleType,
    deviceId: string,
    _retryScanForIOS: boolean = false,
    successCallback: any = () => {},
    errorCallback: any = () => {}
  ) {
    if (_retryScanForIOS) {
      // iOS needs to know the scale, before auto connect can be done
      await this.__iOSAccessBleStackAndAutoConnect();
    }

    this.logger.log('AutoConnectScale - We can start or we waited for iOS');

    this.logger.log(
      'AutoConnectScale - We created our promise, and try to autoconnect to device now.'
    );
    ble.autoConnect(
      deviceId,
      (data: PeripheralData) => {
        this.connectCallback(deviceType, data);
        successCallback();
      },
      () => {
        this.disconnectCallback();
        errorCallback();
      }
    );
  }

  public async autoConnectPressureDevice(
    pressureType: PressureType,
    deviceId: string,
    _retryScanForIOS: boolean = false,
    successCallback: any = () => {},
    errorCallback: any = () => {}
  ) {
    if (_retryScanForIOS) {
      // iOS needs to know the scale, before auto connect can be done
      await this.__iOSAccessBleStackAndAutoConnect(true);
    }

    this.logger.log(
      'AutoConnectPressureDevice - We can start or we waited for iOS'
    );

    this.logger.log(
      'AutoConnectPressureDevice - We created our promise, and try to autoconnect to device now.'
    );
    ble.autoConnect(
      deviceId,
      (data: PeripheralData) => {
        this.connectPressureCallback(pressureType, data);
        successCallback();
      },
      () => {
        this.disconnectPressureCallback();
        errorCallback();
      }
    );
  }

  public async autoConnectTemperatureDevice(
    temperatureType: TemperatureType,
    deviceId: string,
    _retryScanForIOS: boolean = false,
    successCallback: any = () => {},
    errorCallback: any = () => {}
  ) {
    if (_retryScanForIOS) {
      // iOS needs to know the scale, before auto connect can be done
      await this.__iOSAccessBleStackAndAutoConnect(false, true);
    }

    this.logger.log(
      'AutoConnectTemperatureDevice - We can start or we waited for iOS'
    );

    this.logger.log(
      'AutoConnectTemperatureDevice - We created our promise, and try to autoconnect to device now.'
    );
    ble.autoConnect(
      deviceId,
      (data: PeripheralData) => {
        this.connectTemperatureCallback(temperatureType, data);
        successCallback();
      },
      () => {
        this.disconnectTemperatureCallback();
        errorCallback();
      }
    );
  }

  private stopScanning() {
    return new Promise((resolve, reject) => {
      return ble.stopScan(resolve, reject);
    });
  }

  private __sendEvent(_type: CoffeeBluetoothServiceEvent) {
    this.eventSubject.next(_type);
  }

  private toFixedIfNecessary(value: any, dp: any) {
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return 0;
    }
    return +parsedFloat.toFixed(dp);
  }

  private async __scanAutoConnectScaleIOS() {
    return new Promise<boolean>(async (resolve, reject) => {
      if (device !== null && device.platform === 'iOS') {
        // We just need to scan, then we can auto connect for iOS (lol)
        this.logger.log('Try to find scale on iOS');
        const deviceScale = await this.tryToFindScale();
        if (deviceScale === undefined) {
          this.logger.log('Scale not found, retry');
          // Try every 11 seconds, because the search algorythm goes 10 seconds at all.
          const intV = setInterval(async () => {
            const scaleStub = await this.tryToFindScale();
            if (scaleStub !== undefined) {
              resolve(true);
              clearInterval(intV);
            } else {
              this.logger.log('Scale not found, retry');
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
      if (device !== null && device.platform === 'iOS') {
        // We just need to scan, then we can auto connect for iOS (lol)
        this.logger.log('Try to find pressure on iOS');
        const devicePressure = await this.tryToFindPressureDevice();
        if (devicePressure === undefined) {
          this.logger.log('Pressure device not found, retry');
          // Try every 61 seconds, because the search algorythm goes 60 seconds at all.
          const intV = setInterval(async () => {
            const pressureStub = await this.tryToFindPressureDevice();
            if (pressureStub !== undefined) {
              resolve(true);
              clearInterval(intV);
            } else {
              this.logger.log('Pressure device not found, retry');
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

  private async __scanAutoConnectTemperatureDeviceIOS() {
    return new Promise<boolean>(async (resolve, reject) => {
      if (device !== null && device.platform === 'iOS') {
        // We just need to scan, then we can auto connect for iOS (lol)
        this.logger.log('Try to find temperature on iOS');
        const deviceTemperature = await this.tryToFindTemperatureDevice();
        if (deviceTemperature === undefined) {
          this.logger.log('Temperature device not found, retry');
          // Try every 61 seconds, because the search algorythm goes 60 seconds at all.
          const intV = setInterval(async () => {
            const temperatureStub = await this.tryToFindTemperatureDevice();
            if (temperatureStub !== undefined) {
              resolve(true);
              clearInterval(intV);
            } else {
              this.logger.log('Temperature device not found, retry');
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

  private async __iOSAccessBleStackAndAutoConnect(
    _findPressureDevice: boolean = false,
    _findTemperatureDevice: boolean = false
  ) {
    return await new Promise((resolve) => {
      let counter: number = 1;
      const iOSScanInterval = setInterval(async () => {
        try {
          this.logger.log(
            '__iOSAccessBleStackAndAutoConnect - Try to get bluetooth state'
          );
          const enabled: boolean = await this.isBleEnabled();
          if (enabled === true) {
            clearInterval(iOSScanInterval);
            if (_findPressureDevice === false) {
              await this.__scanAutoConnectScaleIOS();
              this.logger.log(
                '__iOSAccessBleStackAndAutoConnect - Scale for iOS found, resolve now'
              );
            } else {
              await this.__scanAutoConnectPressureDeviceIOS();
              this.logger.log(
                '__iOSAccessBleStackAndAutoConnect - Pressure devices for iOS found, resolve now'
              );
            }

            if (_findTemperatureDevice === true) {
              await this.__scanAutoConnectTemperatureDeviceIOS();
              this.logger.log(
                '__iOSAccessBleStackAndAutoConnect - Thermometer device for iOS found, resolve now'
              );
            }

            resolve(null);
          } else {
            this.logger.log(
              '__iOSAccessBleStackAndAutoConnect - Bluetooth not enabled, try again'
            );
          }
        } catch (ex) {
          this.logger.log(
            '__iOSAccessBleStackAndAutoConnect - Bluetooth error occured ' +
              JSON.stringify(ex)
          );
        }
        counter++;
        if (counter > 10) {
          this.logger.log(
            '__iOSAccessBleStackAndAutoConnect - iOS - Stop after 10 tries'
          );
          clearInterval(iOSScanInterval);
          resolve(null);
        }
      }, 1000);
    });
  }

  private connectCallback(deviceType: ScaleType, data: PeripheralData) {
    // wait for full data
    if (!this.scale || 'characteristics' in data) {
      this.scale = makeDevice(deviceType, data);
      this.logger.log('Connected successfully');
      // this.uiToast.showInfoToast('SCALE.CONNECTED_SUCCESSFULLY');
      this.__sendEvent(CoffeeBluetoothServiceEvent.CONNECTED_SCALE);
    }
  }

  private disconnectCallback() {
    if (this.scale) {
      this.scale.disconnectTriggered();
      this.scale = null;
      // this.uiToast.showInfoToast('SCALE.DISCONNECTED_UNPLANNED');
      this.logger.log('Disconnected successfully');
    }
    // Send disconnect callback, even if scale is already null/not existing anymore
    this.__sendEvent(CoffeeBluetoothServiceEvent.DISCONNECTED_SCALE);
  }

  private connectPressureCallback(
    pressureTaype: PressureType,
    data: PeripheralData
  ) {
    // wait for full data
    if (!this.pressureDevice || 'characteristics' in data) {
      this.pressureDevice = makePressureDevice(pressureTaype, data);
      this.logger.log('Pressure Connected successfully');
      // this.uiToast.showInfoToast('PRESSURE.CONNECTED_SUCCESSFULLY');
      this.__sendEvent(CoffeeBluetoothServiceEvent.CONNECTED_PRESSURE);
    }
  }

  private disconnectPressureCallback() {
    if (this.pressureDevice) {
      this.pressureDevice.disconnect();
      this.pressureDevice = null;
      // this.uiToast.showInfoToast('PRESSURE.DISCONNECTED_UNPLANNED');
      this.logger.log('Disconnected successfully');
    }
    // Send disconnect callback, even if scale is already null/not existing anymore
    this.__sendEvent(CoffeeBluetoothServiceEvent.DISCONNECTED_PRESSURE);
  }

  private connectTemperatureCallback(
    temperatureType: TemperatureType,
    data: PeripheralData
  ) {
    // wait for full data
    if (!this.temperatureDevice || 'characteristics' in data) {
      this.temperatureDevice = makeTemperatureDevice(temperatureType, data);
      this.logger.log('Temperature Connected successfully');
      // this.uiToast.showInfoToast('PRESSURE.CONNECTED_SUCCESSFULLY');
      this.__sendEvent(CoffeeBluetoothServiceEvent.CONNECTED_TEMPERATURE);
    }
  }

  private disconnectTemperatureCallback() {
    if (this.temperatureDevice) {
      this.temperatureDevice.disconnect();
      this.temperatureDevice = null;
      // this.uiToast.showInfoToast('PRESSURE.DISCONNECTED_UNPLANNED');
      this.logger.log('Disconnected successfully');
    }
    // Send disconnect callback, even if scale is already null/not existing anymore
    this.__sendEvent(CoffeeBluetoothServiceEvent.DISCONNECTED_TEMPERATURE);
  }
}
