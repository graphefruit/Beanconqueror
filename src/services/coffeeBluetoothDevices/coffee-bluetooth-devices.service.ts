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
import { UISettingsStorage } from '../uiSettingsStorage';

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

  private scanBluetoothTimeout: any = null;

  constructor(private readonly uiStettingsStorage: UISettingsStorage) {
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

  private clearScanAllBluetoothDevicesAndPassBackTimeout() {
    if (this.scanBluetoothTimeout !== null) {
      clearTimeout(this.scanBluetoothTimeout);
      this.scanBluetoothTimeout = null;
    }
  }
  public async scanAllBluetoothDevicesAndPassBack(
    _foundDeviceFunction = (foundDevice: any) => {},
    _finishedFunction = (finsishedDevices: any) => {},
    _timeout: number = 60000
  ) {
    const devicesFound: Array<any> = [];
    const stopScanningAndFinish = async () => {
      this.logger.log(
        'Error called or timeout' + _timeout + ' milliseconds exceeded'
      );
      this.stopScanning();
      if (_finishedFunction) {
        _finishedFunction(devicesFound);
      }
    };

    let searchOptions: any = {
      reportDuplicates: true,
    };
    if (device !== null && device.platform === 'Android') {
      searchOptions = {
        reportDuplicates: true,
      };
    }

    ble.startScanWithOptions(
      [],
      searchOptions,
      async (scanDevice: any) => {
        this.logger.log(
          Date().toString() + 'Device found ' + JSON.stringify(scanDevice)
        );
        devicesFound.push(scanDevice);
        if (_foundDeviceFunction) {
          _foundDeviceFunction(scanDevice);
        }
      },
      () => {
        this.clearScanAllBluetoothDevicesAndPassBackTimeout();
        stopScanningAndFinish();
      }
    );
    this.scanBluetoothTimeout = setTimeout(async () => {
      this.logger.log('scanAllBluetoothDevicesAndPassBack timeout triggered');
      stopScanningAndFinish();
    }, _timeout);
  }
  public async scanDevices(): Promise<Array<any>> {
    return new Promise<Array<any>>((resolve, reject) => {
      let promiseResolved: boolean = false;
      this.scanAllBluetoothDevicesAndPassBack(
        (scanDevice) => {
          if (
            DecentScale.test(scanDevice) ||
            LunarScale.test(scanDevice) ||
            JimmyScale.test(scanDevice) ||
            FelicitaScale.test(scanDevice) ||
            EurekaPrecisaScale.test(scanDevice) ||
            SkaleScale.test(scanDevice)
          ) {
            // We found all needed devices.
            promiseResolved = true;
            this.clearScanAllBluetoothDevicesAndPassBackTimeout();
            this.stopScanning();
            const devices = [scanDevice];
            resolve(devices);
            this.logger.log(
              'Supported Scale found ' + JSON.stringify(scanDevice)
            );
          }
        },
        (_devices: Array<any>) => {
          if (promiseResolved === false) {
            // If we didn't resolve, we didn't find a matching one.
            resolve([]);
          }
        }
      );
    });
  }

  public async scanPressureDevices(): Promise<Array<any>> {
    return new Promise<Array<any>>((resolve, reject) => {
      let promiseResolved: boolean = false;
      this.scanAllBluetoothDevicesAndPassBack(
        (scanDevice) => {
          if (
            PrsPressure.test(scanDevice) ||
            PopsiclePressure.test(scanDevice) ||
            TransducerDirectPressure.test(scanDevice)
          ) {
            // We found all needed devices.
            promiseResolved = true;
            this.clearScanAllBluetoothDevicesAndPassBackTimeout();
            this.stopScanning();
            const devices = [scanDevice];
            resolve(devices);
            this.logger.log(
              'Supported Presure found ' + JSON.stringify(scanDevice)
            );
          }
        },
        (_devices: Array<any>) => {
          if (promiseResolved === false) {
            // If we didn't resolve, we didn't find a matching one.
            resolve([]);
          }
        }
      );
    });
  }

  public async findDeviceWithDirectIds(
    _ids: Array<any>,
    _timeout: number = 60000
  ): Promise<boolean> {
    return await new Promise((resolve) => {
      let counter: number = 1;

      if (_ids && _ids.length <= 0) {
        resolve(false);
      }

      const iOSScanInterval = setInterval(async () => {
        try {
          this.logger.log(
            'findDeviceWithDirectIds - Try to get bluetooth state'
          );
          // We need to check iOS if bluetooth enabled, else devices would not get connected.
          const enabled: boolean = await this.isBleEnabled();
          if (enabled === true) {
            clearInterval(iOSScanInterval);

            const checkIds = {};
            for (const deviceId of _ids) {
              checkIds[deviceId.toLowerCase()] = false;
            }

            let promiseResolved: boolean = false;
            this.scanAllBluetoothDevicesAndPassBack(
              (scanDevice) => {
                if (
                  scanDevice.id &&
                  checkIds[scanDevice.id.toLowerCase()] === false
                ) {
                  checkIds[scanDevice.id.toLowerCase()] = true;
                  this.logger.log(
                    'findDeviceWithDirectIds - we found the exact searched device  ' +
                      JSON.stringify(scanDevice)
                  );

                  let areAllDevicesFound: boolean = true;
                  for (const deviceKey in checkIds) {
                    if (checkIds[deviceKey] === false) {
                      areAllDevicesFound = false;
                      return;
                    }
                  }

                  this.logger.log(
                    'findDeviceWithDirectIds - we found ALL to searching devices '
                  );

                  // We found all needed devices.
                  promiseResolved = true;
                  this.clearScanAllBluetoothDevicesAndPassBackTimeout();
                  this.stopScanning();
                  resolve(true);
                }
              },
              (_devices: Array<any>) => {
                if (promiseResolved === false) {
                  // If we didn't resolve, we didn't find a matching one.
                  resolve(false);
                }
              },
              _timeout
            );
          } else {
            this.logger.log(
              'findDeviceWithDirectId - Bluetooth not enabled, try again'
            );
          }
        } catch (ex) {
          this.logger.log(
            'findDeviceWithDirectId - Bluetooth error occured ' +
              JSON.stringify(ex)
          );
        }
        counter++;
        if (counter > 10) {
          this.logger.log(
            '__iOSAccessBleStackAndAutoConnect - iOS - Stop after 10 tries'
          );
          clearInterval(iOSScanInterval);
          resolve(false);
        }
      }, 1000);
    });
  }

  public async enableIOSBluetooth() {
    return await new Promise((resolve) => {
      let counter: number = 1;

      const iOSScanInterval = setInterval(async () => {
        try {
          this.logger.log(
            '__iOSAccessBleStackAndAutoConnect - Try to get bluetooth state'
          );
          // We need to check iOS if bluetooth enabled, else devices would not get connected.
          const enabled: boolean = await this.isBleEnabled();
          if (enabled === true) {
            clearInterval(iOSScanInterval);

            resolve(true);
          } else {
            this.logger.log(
              'findDeviceWithDirectId - Bluetooth not enabled, try again'
            );
          }
        } catch (ex) {
          this.logger.log(
            'findDeviceWithDirectId - Bluetooth error occured ' +
              JSON.stringify(ex)
          );
        }
        counter++;
        if (counter > 10) {
          this.logger.log(
            '__iOSAccessBleStackAndAutoConnect - iOS - Stop after 10 tries'
          );
          clearInterval(iOSScanInterval);
          resolve(false);
        }
      }, 1000);
    });
  }
  public async findDeviceWithDirectId(
    _id,
    _timeout: number = 15000
  ): Promise<boolean> {
    return await new Promise((resolve) => {
      let counter: number = 1;

      const iOSScanInterval = setInterval(async () => {
        try {
          this.logger.log(
            '__iOSAccessBleStackAndAutoConnect - Try to get bluetooth state'
          );
          // We need to check iOS if bluetooth enabled, else devices would not get connected.
          const enabled: boolean = await this.isBleEnabled();
          if (enabled === true) {
            clearInterval(iOSScanInterval);

            let promiseResolved: boolean = false;
            this.scanAllBluetoothDevicesAndPassBack(
              (scanDevice) => {
                if (
                  scanDevice.id &&
                  scanDevice.id.toLowerCase() === _id.toLowerCase()
                ) {
                  this.logger.log(
                    'findDeviceWithDirectId - we found the exact searched device  ' +
                      JSON.stringify(scanDevice)
                  );
                  // We found all needed devices.
                  promiseResolved = true;
                  this.clearScanAllBluetoothDevicesAndPassBackTimeout();
                  this.stopScanning();
                  resolve(true);
                }
              },
              (_devices: Array<any>) => {
                if (promiseResolved === false) {
                  // If we didn't resolve, we didn't find a matching one.
                  resolve(false);
                }
              },
              _timeout
            );
          } else {
            this.logger.log(
              'findDeviceWithDirectId - Bluetooth not enabled, try again'
            );
          }
        } catch (ex) {
          this.logger.log(
            'findDeviceWithDirectId - Bluetooth error occured ' +
              JSON.stringify(ex)
          );
        }
        counter++;
        if (counter > 10) {
          this.logger.log(
            '__iOSAccessBleStackAndAutoConnect - iOS - Stop after 10 tries'
          );
          clearInterval(iOSScanInterval);
          resolve(false);
        }
      }, 1000);
    });
  }

  public async scanTemperatureDevices(): Promise<Array<any>> {
    return new Promise<Array<any>>((resolve, reject) => {
      let promiseResolved: boolean = false;
      this.scanAllBluetoothDevicesAndPassBack(
        (scanDevice) => {
          if (ETITemperature.test(scanDevice)) {
            // We found all needed devices.
            promiseResolved = true;
            this.clearScanAllBluetoothDevicesAndPassBackTimeout();
            this.stopScanning();
            const devices = [scanDevice];
            resolve(devices);
            this.logger.log(
              'Temperature devices found ' + JSON.stringify(scanDevice)
            );
          }
        },
        (_devices: Array<any>) => {
          if (promiseResolved === false) {
            // If we didn't resolve, we didn't find a matching one.
            resolve([]);
          }
        }
      );
    });
  }

  public disconnect(
    deviceId: string,
    show_toast: boolean = true
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        await ble.withPromises.disconnect(deviceId);
        this.scale?.disconnectTriggered();
        this.scale = null;
        if (show_toast) {
          // this.uiToast.showInfoToast('SCALE.DISCONNECTED_SUCCESSFULLY');
        }
        resolve(true);
      } catch (ex) {
        resolve(false);
      }
    });
  }

  public disconnectPressureDevice(
    deviceId: string,
    show_toast: boolean = true
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        await ble.withPromises.disconnect(deviceId);
        this.pressureDevice = null;
        if (show_toast) {
          // this.uiToast.showInfoToast('SCALE.DISCONNECTED_SUCCESSFULLY');
        }
        resolve(true);
      } catch (ex) {
        resolve(false);
      }
    });
  }

  public disconnectTemperatureDevice(
    deviceId: string,
    show_toast: boolean = true
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        await ble.withPromises.disconnect(deviceId);
        this.temperatureDevice = null;
        if (show_toast) {
          // this.uiToast.showInfoToast('SCALE.DISCONNECTED_SUCCESSFULLY');
        }
        resolve(true);
      } catch (ex) {
        resolve(false);
      }
    });
  }

  public isBleEnabled(): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        await ble.withPromises.isEnabled();
        resolve(true);
      } catch (ex) {
        resolve(false);
      }
    });
  }

  public enableBLE(): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        // Or using await with promises
        ble.withPromises.enable();
        resolve(undefined);
      } catch (ex) {
        resolve(undefined);
      }
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

  public async reconnectScale(
    deviceType: ScaleType,
    deviceId: string,
    successCallback: any = () => {},
    errorCallback: any = () => {}
  ) {
    try {
      await ble.withPromises.disconnect(deviceId);
      setTimeout(() => {
        this.autoConnectScale(
          deviceType,
          deviceId,
          true,
          successCallback,
          errorCallback
        );
      }, 2000);
    } catch (ex) {
      errorCallback();
    }
  }

  public async reconnectPressureDevice(
    pressureType: PressureType,
    deviceId: string,
    successCallback: any = () => {},
    errorCallback: any = () => {}
  ) {
    try {
      await ble.withPromises.disconnect(deviceId);
      setTimeout(() => {
        this.autoConnectPressureDevice(
          pressureType,
          deviceId,
          true,
          successCallback,
          errorCallback,
          15000,
          0
        );
      }, 2000);
    } catch (ex) {
      errorCallback();
    }
  }

  public async reconnectTemperatureDevice(
    temperatureType: TemperatureType,
    deviceId: string,
    successCallback: any = () => {},
    errorCallback: any = () => {}
  ) {
    try {
      await ble.withPromises.disconnect(deviceId);
      setTimeout(() => {
        this.autoConnectTemperatureDevice(
          temperatureType,
          deviceId,
          true,
          successCallback,
          errorCallback
        );
      }, 2000);
    } catch (ex) {
      errorCallback();
    }
  }

  public async autoConnectScale(
    deviceType: ScaleType,
    deviceId: string,
    _scanForDevices: boolean = false,
    successCallback: any = () => {},
    errorCallback: any = () => {},
    _timeout: number = 60000
  ) {
    if (_scanForDevices) {
      this.logger.log('AutoConnectScale - Scan for device');
      // iOS needs to know the scale, before auto connect can be done
      await this.findDeviceWithDirectId(deviceId, _timeout);
    }

    this.logger.log(
      'AutoConnectScale - We can start to connect to the id ' +
        deviceId +
        ' and type ' +
        deviceType
    );
    try {
      ble.autoConnect(
        deviceId,
        (data: PeripheralData) => {
          this.logger.log('AutoConnectScale - Scale device connected.');
          this.connectCallback(deviceType, data);
          successCallback();
        },
        () => {
          this.logger.log('AutoConnectScale - Scale device disconnected.');
          this.disconnectCallback();
          errorCallback();
        }
      );
    } catch (ex) {}
  }

  public async autoConnectPressureDevice(
    pressureType: PressureType,
    deviceId: string,
    _scanForDevices: boolean = false,
    successCallback: any = () => {},
    errorCallback: any = () => {},
    _timeout: number = 15000,
    _connectionRetry: number = 0
  ) {
    if (_scanForDevices) {
      // iOS needs to know the scale, before auto connect can be done
      this.logger.log('AutoConnectPressureDevice - Scan for device');
      await this.findDeviceWithDirectId(deviceId, _timeout);
    }

    this.logger.log(
      'AutoConnectPressureDevice - We can start to connect to the id ' +
        deviceId +
        ' and type ' +
        pressureType
    );
    try {
    } catch (ex) {}
    try {
      ble.connect(
        deviceId,
        (data: PeripheralData) => {
          //Update the connection retry, because we're in
          _connectionRetry = _connectionRetry + 1;
          this.logger.log(
            'AutoConnectPressureDevice - Pressure device connected.'
          );
          this.connectPressureCallback(pressureType, data);
          successCallback();
        },
        async (e) => {
          this.logger.log(
            'AutoConnectPressureDevice - Pressure device disconnected.'
          );
          this.disconnectPressureCallback();
          errorCallback();

          const settings = this.uiStettingsStorage.getSettings();
          if (settings.pressure_id && settings.pressure_id === deviceId) {
            if (device !== null && device.platform === 'Android') {
              await this.findDeviceWithDirectId(deviceId, 6000);
              // Give it a short delay before reconnect
              await new Promise((resolve) => {
                setTimeout(async () => {
                  resolve(undefined);
                }, 500);
              });
            }
            // as long as the pressure id is known, and the device id is still the same try to reconnect.
            this.autoConnectPressureDevice(
              pressureType,
              deviceId,
              _scanForDevices,
              successCallback,
              errorCallback,
              _timeout,
              _connectionRetry + 1
            );
          }
        }
      );
    } catch (ex) {}
  }

  public async autoConnectTemperatureDevice(
    temperatureType: TemperatureType,
    deviceId: string,
    _scanForDevices: boolean = false,
    successCallback: any = () => {},
    errorCallback: any = () => {},
    _timeout: number = 15000
  ) {
    if (_scanForDevices) {
      // iOS needs to know the scale, before auto connect can be done
      this.logger.log('AutoConnectTemperatureDevice - Scan for device');
      await this.findDeviceWithDirectId(deviceId, _timeout);
    }

    this.logger.log(
      'AutoConnectTemperatureDevice - We can start to connect to the id ' +
        deviceId +
        ' and type ' +
        temperatureType
    );
    try {
      ble.autoConnect(
        deviceId,
        (data: PeripheralData) => {
          this.logger.log(
            'AutoConnectTemperatureDevice - Temperature device connected.'
          );
          this.connectTemperatureCallback(temperatureType, data);
          successCallback();
        },
        () => {
          this.logger.log(
            'AutoConnectTemperatureDevice - Temperature device disconnected.'
          );
          this.disconnectTemperatureCallback();
          errorCallback();
        }
      );
    } catch (ex) {}
  }

  private stopScanning() {
    return new Promise(async (resolve, reject) => {
      try {
        await ble.withPromises.stopScan();
        resolve(undefined);
      } catch (ex) {
        resolve(undefined);
      }
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
    _findSpecificDevice: string = 'scale'
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
            if (_findSpecificDevice === 'scale') {
              await this.__scanAutoConnectScaleIOS();
              this.logger.log(
                '__iOSAccessBleStackAndAutoConnect - Scale for iOS found, resolve now'
              );
            } else if (_findSpecificDevice === 'pressure') {
              await this.__scanAutoConnectPressureDeviceIOS();
              this.logger.log(
                '__iOSAccessBleStackAndAutoConnect - Pressure devices for iOS found, resolve now'
              );
            } else if (_findSpecificDevice === 'temperature') {
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
