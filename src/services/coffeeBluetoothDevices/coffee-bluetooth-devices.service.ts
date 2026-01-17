import { EventEmitter, Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BluetoothScale } from 'src/classes/devices/bluetoothDevice';
import { TemperatureDevice } from 'src/classes/devices/temperatureBluetoothDevice';
import { ETITemperature } from 'src/classes/devices/etiTemperature';
import { Logger } from 'src/classes/devices/common/logger';
import { PressureDevice } from 'src/classes/devices/pressureBluetoothDevice';
import { PrsPressure } from 'src/classes/devices/prsPressure';
import { EurekaPrecisaScale } from '../../classes/devices/eurekaPrecisaScale';
import {
  BluetoothTypes,
  makeDevice,
  makePressureDevice,
  makeRefractometerDevice,
  makeTemperatureDevice,
  PressureType,
  RefractometerType,
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
import { SmartchefScale } from 'src/classes/devices/smartchefScale';
import { DifluidMicrobalance } from 'src/classes/devices/difluidMicrobalance';
import { DiFluidR2Refractometer } from 'src/classes/devices/difluidR2Refractometer';
import { RefractometerDevice } from 'src/classes/devices/refractometerBluetoothDevice';
import { UISettingsStorage } from '../uiSettingsStorage';
import { TranslateService } from '@ngx-translate/core';
import { UIToast } from '../uiToast';
import { BlackcoffeeScale } from 'src/classes/devices/blackcoffeeScale';
import { DifluidMicrobalanceTi } from '../../classes/devices/difluidMicrobalanceTi';
import { DiyPythonCoffeeScale } from '../../classes/devices/diyPythonCoffeeScale';
import { DiyRustCoffeeScale } from '../../classes/devices/diyRustCoffeeScale';
import { BookooScale } from 'src/classes/devices/bokooScale';
import { BookooPressure } from 'src/classes/devices/bookooPressure';
import { BasicGrillThermometer } from 'src/classes/devices/basicGrillThermometer';
import { MeaterThermometer } from 'src/classes/devices/meaterThermometer';
import { CombustionThermometer } from '../../classes/devices/combustionThermometer';
import { ArgosThermometer } from '../../classes/devices/argosThermometer';
import { TimemoreScale } from 'src/classes/devices/timemoreScale';
import { VariaAkuScale } from '../../classes/devices/variaAku';
import { UIHelper } from '../uiHelper';
import BLUETOOTH_TRACKING from '../../data/tracking/bluetoothTracking';
import { UIAnalytics } from '../uiAnalytics';
import { EspressiScale } from '../../classes/devices/espressiScale';
import { WeighMyBruScale } from 'src/classes/devices/weighMyBruScale';

declare var ble: any;
declare var cordova: any;

export enum CoffeeBluetoothServiceEvent {
  CONNECTED_SCALE,
  DISCONNECTED_SCALE,
  CONNECTED_PRESSURE,
  DISCONNECTED_PRESSURE,
  CONNECTED_TEMPERATURE,
  DISCONNECTED_TEMPERATURE,
  CONNECTED_REFRACTOMETER,
  DISCONNECTED_REFRACTOMETER,
}

@Injectable({
  providedIn: 'root',
})
export class CoffeeBluetoothDevicesService {
  public scale: BluetoothScale | null = null;
  public pressureDevice: PressureDevice | null = null;
  public temperatureDevice: TemperatureDevice | null = null;
  public refractometerDevice: RefractometerDevice | null = null;
  public failed: boolean;
  public ready: boolean;
  private readonly logger: Logger;
  private eventSubject = new Subject<CoffeeBluetoothServiceEvent>();
  private androidPermissions: any = null;

  private scanBluetoothTimeout: any = null;

  constructor(
    private readonly uiStettingsStorage: UISettingsStorage,
    private readonly translate: TranslateService,
    private readonly uiToast: UIToast,
    private readonly uiHelper: UIHelper,
    private readonly uiAnalytics: UIAnalytics,
  ) {
    this.logger = new Logger('CoffeeBluetoothDevices');
    this.failed = false;
    this.ready = true;

    if (Capacitor.getPlatform() === 'android') {
      this.androidPermissions = cordova.plugins.permissions;
    }
  }

  public attachOnEvent(): Observable<CoffeeBluetoothServiceEvent> {
    return this.eventSubject.asObservable();
  }

  public async hasLocationPermission(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
        if (Capacitor.getPlatform() === 'android') {
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
            },
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
        if (Capacitor.getPlatform() === 'android') {
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
            },
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
          },
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
          },
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
    _timeout: number = 60000,
  ) {
    const devicesFound: Array<any> = [];
    const stopScanningAndFinish = async () => {
      this.logger.log(
        'Error called or timeout' + _timeout + ' milliseconds exceeded',
      );
      this.stopScanning();
      if (_finishedFunction) {
        _finishedFunction(devicesFound);
      }
    };

    let searchOptions: any = {
      reportDuplicates: true,
    };
    if (Capacitor.getPlatform() === 'android') {
      searchOptions = {
        reportDuplicates: true,
      };
    }

    ble.startScanWithOptions(
      [],
      searchOptions,
      async (scanDevice: any) => {
        this.logger.log(
          Date().toString() + 'Device found ' + JSON.stringify(scanDevice),
        );
        devicesFound.push(scanDevice);
        if (_foundDeviceFunction) {
          _foundDeviceFunction(scanDevice);
        }
      },
      () => {
        this.clearScanAllBluetoothDevicesAndPassBackTimeout();
        stopScanningAndFinish();
      },
    );
    this.scanBluetoothTimeout = setTimeout(async () => {
      this.logger.log('scanAllBluetoothDevicesAndPassBack timeout triggered');
      stopScanningAndFinish();
    }, _timeout);
  }

  public scanForDevicesAndReport(_searchingType: BluetoothTypes) {
    const observable: Observable<any> = new Observable((subscriber) => {
      const foundDevices = [];
      this.scanAllBluetoothDevicesAndPassBack(
        (scanDevice) => {
          let type;
          if (_searchingType === BluetoothTypes.SCALE) {
            type = this.getScaleDeviceType(scanDevice);
          } else if (_searchingType === BluetoothTypes.PRESSURE) {
            type = this.getPressureDeviceType(scanDevice);
          } else if (_searchingType === BluetoothTypes.TEMPERATURE) {
            type = this.getTemperatureDeviceType(scanDevice);
          } else if (_searchingType === BluetoothTypes.TDS) {
            type = this.getRefractometerDeviceType(scanDevice);
          }

          if (type) {
            if (scanDevice && scanDevice.name) {
              type.name = scanDevice.name;
            } else {
              type.name = '';
            }
            if (foundDevices.indexOf(type.id) === -1) {
              foundDevices.push(type.id);
              subscriber.next(type);

              this.logger.log(
                'Supported device found ' + JSON.stringify(scanDevice),
              );
            }
          }
        },
        (_devices: Array<any>) => {
          subscriber.complete();
        },
      );
    });
    return observable;
  }

  public async findDeviceWithDirectIds(
    _ids: Array<any>,
    _timeout: number = 60000,
  ): Promise<boolean> {
    return await new Promise((resolve) => {
      let counter: number = 1;

      if (_ids && _ids.length <= 0) {
        resolve(false);
      }

      const iOSScanInterval = setInterval(async () => {
        try {
          this.logger.log(
            'findDeviceWithDirectIds - Try to get bluetooth state',
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
                      JSON.stringify(scanDevice),
                  );

                  let areAllDevicesFound: boolean = true;
                  for (const deviceKey in checkIds) {
                    if (checkIds[deviceKey] === false) {
                      areAllDevicesFound = false;
                      return;
                    }
                  }

                  this.logger.log(
                    'findDeviceWithDirectIds - we found ALL to searching devices ',
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
              _timeout,
            );
          } else {
            this.logger.log(
              'findDeviceWithDirectId - Bluetooth not enabled, try again',
            );
          }
        } catch (ex) {
          this.logger.log(
            'findDeviceWithDirectId - Bluetooth error occured ' +
              JSON.stringify(ex),
          );
        }
        counter++;
        if (counter > 10) {
          this.logger.log(
            '__iOSAccessBleStackAndAutoConnect - iOS - Stop after 10 tries',
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
            '__iOSAccessBleStackAndAutoConnect - Try to get bluetooth state',
          );
          // We need to check iOS if bluetooth enabled, else devices would not get connected.
          const enabled: boolean = await this.isBleEnabled();
          if (enabled === true) {
            clearInterval(iOSScanInterval);

            resolve(true);
          } else {
            this.logger.log(
              'findDeviceWithDirectId - Bluetooth not enabled, try again',
            );
          }
        } catch (ex) {
          this.logger.log(
            'findDeviceWithDirectId - Bluetooth error occured ' +
              JSON.stringify(ex),
          );
        }
        counter++;
        if (counter > 10) {
          this.logger.log(
            '__iOSAccessBleStackAndAutoConnect - iOS - Stop after 10 tries',
          );
          clearInterval(iOSScanInterval);
          resolve(false);
        }
      }, 1000);
    });
  }
  public async findDeviceWithDirectId(
    _id,
    _timeout: number = 15000,
  ): Promise<boolean> {
    return await new Promise((resolve) => {
      let counter: number = 1;

      const iOSScanInterval = setInterval(async () => {
        try {
          this.logger.log(
            '__iOSAccessBleStackAndAutoConnect - Try to get bluetooth state',
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
                      JSON.stringify(scanDevice),
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
              _timeout,
            );
          } else {
            this.logger.log(
              'findDeviceWithDirectId - Bluetooth not enabled, try again',
            );
          }
        } catch (ex) {
          this.logger.log(
            'findDeviceWithDirectId - Bluetooth error occured ' +
              JSON.stringify(ex),
          );
        }
        counter++;
        if (counter > 10) {
          this.logger.log(
            '__iOSAccessBleStackAndAutoConnect - iOS - Stop after 10 tries',
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
          if (
            ETITemperature.test(scanDevice) ||
            BasicGrillThermometer.test(scanDevice) ||
            MeaterThermometer.test(scanDevice) ||
            CombustionThermometer.test(scanDevice) ||
            ArgosThermometer.test(scanDevice)
          ) {
            // We found all needed devices.
            promiseResolved = true;
            this.clearScanAllBluetoothDevicesAndPassBackTimeout();
            this.stopScanning();
            const devices = [scanDevice];
            resolve(devices);
            this.logger.log(
              'Temperature devices found ' + JSON.stringify(scanDevice),
            );
          }
        },
        (_devices: Array<any>) => {
          if (promiseResolved === false) {
            // If we didn't resolve, we didn't find a matching one.
            resolve([]);
          }
        },
      );
    });
  }

  public disconnect(
    deviceId: string,
    show_toast: boolean = true,
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        await ble.withPromises.disconnect(deviceId);
        this.scale?.disconnectTriggered();
        this.scale = null;
        if (show_toast) {
          this.uiToast.showInfoToast('SCALE.DISCONNECTED_SUCCESSFULLY');
        }
        resolve(true);
      } catch (ex) {
        resolve(false);
      }
    });
  }

  public disconnectPressureDevice(
    deviceId: string,
    show_toast: boolean = true,
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        await ble.withPromises.disconnect(deviceId);
        this.pressureDevice = null;
        if (show_toast) {
          this.uiToast.showInfoToast('PRESSURE.DISCONNECTED_SUCCESSFULLY');
        }
        resolve(true);
      } catch (ex) {
        resolve(false);
      }
    });
  }

  public disconnectTemperatureDevice(
    deviceId: string,
    show_toast: boolean = true,
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        await ble.withPromises.disconnect(deviceId);
        this.temperatureDevice = null;
        if (show_toast) {
          this.uiToast.showInfoToast('TEMPERATURE.DISCONNECTED_SUCCESSFULLY');
        }
        resolve(true);
      } catch (ex) {
        resolve(false);
      }
    });
  }

  public disconnectRefractometerDevice(
    deviceId: string,
    show_toast: boolean = true,
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        await ble.withPromises.disconnect(deviceId);
        this.refractometerDevice = null;
        if (show_toast) {
          this.uiToast.showInfoToast('REFRACTOMETER.DISCONNECTED_SUCCESSFULLY');
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

  public getScale() {
    return this.scale;
  }

  public getPressureDevice() {
    return this.pressureDevice;
  }

  public getTemperatureDevice() {
    return this.temperatureDevice;
  }

  public getRefractometerDevice() {
    return this.refractometerDevice;
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
          2,
        );
      }
      return 0;
    } catch (ex) {
      return 0;
    }
  }

  public getScaleDeviceType(deviceScale) {
    if (DecentScale.test(deviceScale)) {
      this.logger.log('BleManager - We found a decent scale');
      return { id: deviceScale.id, type: ScaleType.DECENT };
    }
    if (EspressiScale.test(deviceScale)) {
      this.logger.log('BleManager - We found a espressiscale scale');
      return { id: deviceScale.id, type: ScaleType.ESPRESSI };
    }
    if (LunarScale.test(deviceScale)) {
      this.logger.log('BleManager - We found a lunar/acaia scale');
      return { id: deviceScale.id, type: ScaleType.LUNAR };
    }
    if (JimmyScale.test(deviceScale)) {
      this.logger.log('BleManager - We found a jimmy scale');
      return { id: deviceScale.id, type: ScaleType.JIMMY };
    }
    if (FelicitaScale.test(deviceScale)) {
      this.logger.log('BleManager - We found a felicita scale');
      return { id: deviceScale.id, type: ScaleType.FELICITA };
    }
    if (EurekaPrecisaScale.test(deviceScale)) {
      this.logger.log('BleManager - We found a eureka scale');
      return { id: deviceScale.id, type: ScaleType.EUREKAPRECISA };
    }
    if (SkaleScale.test(deviceScale)) {
      this.logger.log('BleManager - We found a skale scale');
      return { id: deviceScale.id, type: ScaleType.SKALE };
    }
    if (SmartchefScale.test(deviceScale)) {
      this.logger.log('BleManager - We found a smartchef scale');
      return { id: deviceScale.id, type: ScaleType.SMARTCHEF };
    }
    if (DifluidMicrobalance.test(deviceScale)) {
      this.logger.log('BleManager - We found a difluid scale');
      return {
        id: deviceScale.id,
        type: ScaleType.DIFLUIDMICROBALANCE,
      };
    }
    if (DifluidMicrobalanceTi.test(deviceScale)) {
      this.logger.log('BleManager - We found a difluid ti scale');
      return {
        id: deviceScale.id,
        type: ScaleType.DIFLUIDMICROBALANCETI,
      };
    }
    if (BlackcoffeeScale.test(deviceScale)) {
      this.logger.log('BleManager - We found a blackcoffee scale');
      return { id: deviceScale.id, type: ScaleType.BLACKCOFFEE };
    }
    if (DiyPythonCoffeeScale.test(deviceScale)) {
      this.logger.log('BleManager - We found a diy python coffee scale');
      return {
        id: deviceScale.id,
        type: ScaleType.DIYPYTHONCOFFEESCALE,
      };
    }
    if (DiyRustCoffeeScale.test(deviceScale)) {
      this.logger.log('BleManager - We found a diy rust coffee scale');
      return {
        id: deviceScale.id,
        type: ScaleType.DIYRUSTCOFFEESCALE,
      };
    }
    if (BookooScale.test(deviceScale)) {
      this.logger.log('BleManager - We found a Bokoo scale');
      return {
        id: deviceScale.id,
        type: ScaleType.BOKOOSCALE,
      };
    }
    if (TimemoreScale.test(deviceScale)) {
      this.logger.log('BleManager - We found a Timemore scale');
      return {
        id: deviceScale.id,
        type: ScaleType.TIMEMORESCALE,
      };
    }
    if (VariaAkuScale.test(deviceScale)) {
      this.logger.log('BleManager - We found a Varia AKU scale');
      return {
        id: deviceScale.id,
        type: ScaleType.VARIA_AKU,
      };
    }
    if (WeighMyBruScale.test(deviceScale)) {
      this.logger.log('BleManager - We found a WeighMyBru scale');
      return {
        id: deviceScale.id,
        type: ScaleType.WEIGHMYBRUSCALE,
      };
    }

    return undefined;
  }

  public getPressureDeviceType(devicePressure) {
    if (PopsiclePressure.test(devicePressure)) {
      this.logger.log('BleManager - We found a popsicle pressure device ');
      return { id: devicePressure.id, type: PressureType.POPSICLE };
    } else if (TransducerDirectPressure.test(devicePressure)) {
      this.logger.log(
        'BleManager - We found a Transducer Direct pressure device ',
      );
      return { id: devicePressure.id, type: PressureType.DIRECT };
    } else if (PrsPressure.test(devicePressure)) {
      this.logger.log('BleManager - We found a PRS Direct pressure device ');
      return { id: devicePressure.id, type: PressureType.PRS };
    } else if (BookooPressure.test(devicePressure)) {
      this.logger.log('BleManager - We found a Bokoo pressure device ');
      return {
        id: devicePressure.id,
        type: PressureType.BOKOOPRESSURE,
      };
    }

    return undefined;
  }

  public getTemperatureDeviceType(deviceTemperature) {
    if (ETITemperature.test(deviceTemperature)) {
      this.logger.log('BleManager - We found a ETI Ltd Thermometer device ');
      return { id: deviceTemperature.id, type: TemperatureType.ETI };
    } else if (BasicGrillThermometer.test(deviceTemperature)) {
      this.logger.log(
        'BleManager - We found a Basic Grill Thermometer device ',
      );
      return {
        id: deviceTemperature.id,
        type: TemperatureType.BASICGRILL,
      };
    } else if (MeaterThermometer.test(deviceTemperature)) {
      this.logger.log(
        'BleManager - We found a Meater Grill Thermometer device ',
      );
      return {
        id: deviceTemperature.id,
        type: TemperatureType.MEATER,
      };
    } else if (CombustionThermometer.test(deviceTemperature)) {
      this.logger.log(
        'BleManager - We found a Combustion Grill Thermometer device ',
      );
      return {
        id: deviceTemperature.id,
        type: TemperatureType.COMBUSTION,
      };
    } else if (ArgosThermometer.test(deviceTemperature)) {
      this.logger.log('BleManager - We found a Argos Thermometer device ');
      return {
        id: deviceTemperature.id,
        type: TemperatureType.ARGOS,
      };
    }

    return undefined;
  }
  public getRefractometerDeviceType(deviceRefractometer) {
    if (DiFluidR2Refractometer.test(deviceRefractometer)) {
      this.logger.log('BleManager - We found a Difluid R2 device ');
      return { id: deviceRefractometer.id, type: RefractometerType.R2 };
    }

    return undefined;
  }

  public async reconnectScale(
    deviceType: ScaleType,
    deviceId: string,
    successCallback: any = () => {},
    errorCallback: any = () => {},
  ) {
    try {
      await ble.withPromises.disconnect(deviceId);
      setTimeout(() => {
        this.autoConnectScale(
          deviceType,
          deviceId,
          true,
          successCallback,
          errorCallback,
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
    errorCallback: any = () => {},
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
    errorCallback: any = () => {},
  ) {
    try {
      await ble.withPromises.disconnect(deviceId);
      setTimeout(() => {
        this.autoConnectTemperatureDevice(
          temperatureType,
          deviceId,
          true,
          successCallback,
          errorCallback,
        );
      }, 2000);
    } catch (ex) {
      errorCallback();
    }
  }

  public async reconnectRefractometerDevice(
    refractometerType: RefractometerType,
    deviceId: string,
    successCallback: any = () => {},
    errorCallback: any = () => {},
  ) {
    try {
      await ble.withPromises.disconnect(deviceId);
      setTimeout(() => {
        this.autoConnectRefractometerDevice(
          refractometerType,
          deviceId,
          true,
          successCallback,
          errorCallback,
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
    _timeout: number = 60000,
    _wasConnected: boolean = false,
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
        deviceType,
    );
    try {
      ble.connect(
        deviceId,
        (data: PeripheralData) => {
          this.logger.log('AutoConnectScale - Scale device connected.');
          _wasConnected = true;
          this.uiAnalytics.trackEvent(
            BLUETOOTH_TRACKING.TITLE,
            BLUETOOTH_TRACKING.ACTIONS.SCALE_USED,
            deviceType,
          );
          this.connectCallback(deviceType, data);
          successCallback();

          try {
            const settings = this.uiStettingsStorage.getSettings();
            if (settings.bluetooth_devices_show_connection_messages === true) {
              this.uiToast.showInfoToast(
                this.translate.instant('SCALE.CONNECTED_SUCCESSFULLY') +
                  ' - ' +
                  this.getScale().device_name +
                  ' / ' +
                  this.getScale().device_id,
                false,
              );
            }
          } catch (ex) {}
        },
        async () => {
          const settings = this.uiStettingsStorage.getSettings();
          if (
            this.uiHelper.isActualAppStateActive() === false &&
            settings.bluetooth_scale_stay_connected === false
          ) {
            //The app is actually not active, so we ignore the whole disconnect call, because we will connect again when we go active.
            return;
          }
          this.logger.log('AutoConnectScale - Scale device disconnected.');
          if (_wasConnected === true && settings.scale_id) {
            if (settings.bluetooth_devices_show_connection_messages === true) {
              this.uiToast.showInfoToast('SCALE.DISCONNECTED_UNPLANNED');
            }
            _wasConnected = false;
          }

          this.disconnectCallback();
          errorCallback();

          if (settings.scale_id && settings.scale_id === deviceId) {
            if (Capacitor.getPlatform() === 'android') {
              await this.findDeviceWithDirectId(deviceId, 6000);
              // Give it a short delay before reconnect
              await new Promise((resolve) => {
                setTimeout(async () => {
                  resolve(undefined);
                }, 500);
              });
            } else if (Capacitor.getPlatform() === 'ios') {
              if (settings?.scale_type === ScaleType.LUNAR) {
                await this.enableIOSBluetooth();
                await this.findDeviceWithDirectId(deviceId, 6000);
                // Give it a short delay before reconnect
                await new Promise((resolve) => {
                  setTimeout(async () => {
                    resolve(undefined);
                  }, 500);
                });
              }
            }

            await new Promise((resolve) => {
              setTimeout(async () => {
                resolve(undefined);
              }, 2000);
            });

            // as long as the pressure id is known, and the device id is still the same try to reconnect.
            this.autoConnectScale(
              deviceType,
              deviceId,
              _scanForDevices,
              successCallback,
              errorCallback,
              _timeout,
              _wasConnected,
            );
          }
        },
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
    _wasConnected: boolean = false,
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
        pressureType,
    );
    try {
    } catch (ex) {}
    try {
      ble.connect(
        deviceId,
        (data: PeripheralData) => {
          // Update the connection retry, because we're in
          _wasConnected = true;
          this.logger.log(
            'AutoConnectPressureDevice - Pressure device connected.',
          );
          this.uiAnalytics.trackEvent(
            BLUETOOTH_TRACKING.TITLE,
            BLUETOOTH_TRACKING.ACTIONS.PRESSURE_USED,
            pressureType,
          );
          this.connectPressureCallback(pressureType, data);
          successCallback();

          try {
            const settings = this.uiStettingsStorage.getSettings();
            if (settings.bluetooth_devices_show_connection_messages === true) {
              this.uiToast.showInfoToast(
                this.translate.instant('PRESSURE.CONNECTED_SUCCESSFULLY') +
                  ' - ' +
                  this.getPressureDevice().device_name +
                  ' / ' +
                  this.getPressureDevice().device_id,
                false,
              );
            }
          } catch (ex) {}
        },
        async (e) => {
          const settings = this.uiStettingsStorage.getSettings();
          if (
            this.uiHelper.isActualAppStateActive() === false &&
            settings.pressure_stay_connected === false
          ) {
            //The app is actually not active, so we ignore the whole disconnect call, because we will connect again when we go active.
            return;
          }
          this.logger.log(
            'AutoConnectPressureDevice - Pressure device disconnected.',
          );
          if (_wasConnected === true && settings.pressure_id) {
            if (settings.bluetooth_devices_show_connection_messages === true) {
              this.uiToast.showInfoToast('PRESSURE.DISCONNECTED_UNPLANNED');
            }
            _wasConnected = false;
          }

          this.disconnectPressureCallback();
          errorCallback();

          if (settings.pressure_id && settings.pressure_id === deviceId) {
            if (Capacitor.getPlatform() === 'android') {
              await this.findDeviceWithDirectId(deviceId, 6000);
              // Give it a short delay before reconnect
              await new Promise((resolve) => {
                setTimeout(async () => {
                  resolve(undefined);
                }, 500);
              });
            }

            await new Promise((resolve) => {
              setTimeout(async () => {
                resolve(undefined);
              }, 2000);
            });

            // as long as the pressure id is known, and the device id is still the same try to reconnect.
            this.autoConnectPressureDevice(
              pressureType,
              deviceId,
              _scanForDevices,
              successCallback,
              errorCallback,
              _timeout,
              _wasConnected,
            );
          }
        },
      );
    } catch (ex) {}
  }

  public async autoConnectTemperatureDevice(
    temperatureType: TemperatureType,
    deviceId: string,
    _scanForDevices: boolean = false,
    successCallback: any = () => {},
    errorCallback: any = () => {},
    _timeout: number = 15000,
    _wasConnected: boolean = false,
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
        temperatureType,
    );
    try {
      ble.autoConnect(
        deviceId,
        (data: PeripheralData) => {
          this.logger.log(
            'AutoConnectTemperatureDevice - Temperature device connected.',
          );
          this.uiAnalytics.trackEvent(
            BLUETOOTH_TRACKING.TITLE,
            BLUETOOTH_TRACKING.ACTIONS.TEMPERATURE_USED,
            temperatureType,
          );
          this.connectTemperatureCallback(temperatureType, data);
          successCallback();

          try {
            const settings = this.uiStettingsStorage.getSettings();
            settings.temperature_graph_source = this.getTemperatureDevice().getDefaultTempeatureSource();
            if (settings.bluetooth_devices_show_connection_messages === true) {
              this.uiToast.showInfoToast(
                this.translate.instant('TEMPERATURE.CONNECTED_SUCCESSFULLY') +
                  ' - ' +
                  this.getTemperatureDevice().device_name +
                  ' / ' +
                  this.getTemperatureDevice().device_id,
                false,
              );
            }
          } catch (ex) {}
        },
        () => {
          this.logger.log(
            'AutoConnectTemperatureDevice - Temperature device disconnected.',
          );
          const settings = this.uiStettingsStorage.getSettings();
          if (settings.bluetooth_devices_show_connection_messages === true) {
            this.uiToast.showInfoToast('TEMPERATURE.DISCONNECTED_UNPLANNED');
          }
          this.disconnectTemperatureCallback();
          errorCallback();
        },
      );
    } catch (ex) {}
  }

  public async autoConnectRefractometerDevice(
    refractometerType: RefractometerType,
    deviceId: string,
    _scanForDevices: boolean = false,
    successCallback: any = () => {},
    errorCallback: any = () => {},
    _timeout: number = 15000,
    _connectionRetry: number = 0,
  ) {
    if (_scanForDevices) {
      // iOS needs to know the scale, before auto connect can be done
      this.logger.log('AutoConnectRefractometerDevice - Scan for device');
      await this.findDeviceWithDirectId(deviceId, _timeout);
    }

    this.logger.log(
      'AutoConnectRefractometerDevice - We can start to connect to the id ' +
        deviceId +
        ' and type ' +
        refractometerType,
    );
    try {
      ble.autoConnect(
        deviceId,
        (data: PeripheralData) => {
          this.logger.log(
            'AutoConnectRefractometerDevice - Refractometer device connected.',
          );

          this.uiAnalytics.trackEvent(
            BLUETOOTH_TRACKING.TITLE,
            BLUETOOTH_TRACKING.ACTIONS.REFRACTOMETER_USED,
            refractometerType,
          );
          this.connectRefractometerCallback(refractometerType, data);
          successCallback();

          try {
            const settings = this.uiStettingsStorage.getSettings();
            let device = this.getRefractometerDevice();
            device.setTestType(settings.refractometer_test_type);
            device.setAutoTest(settings.refractometer_auto_test);
            device.setTestNumber(settings.refractometer_test_number);

            this.uiToast.showInfoToast(
              this.translate.instant('REFRACTOMETER.CONNECTED_SUCCESSFULLY') +
                ' - ' +
                this.getRefractometerDevice().device_name +
                ' / ' +
                this.getRefractometerDevice().device_id,
              false,
            );
          } catch (ex) {}
        },
        () => {
          this.logger.log(
            'AutoConnectRefractometerDevice - Refractometer device disconnected.',
          );
          const settings = this.uiStettingsStorage.getSettings();
          if (settings.bluetooth_devices_show_connection_messages === true) {
            this.uiToast.showInfoToast('REFRACTOMETER.DISCONNECTED_UNPLANNED');
          }
          this.disconnectRefractometerCallback();
          errorCallback();
        },
      );
    } catch (ex) {}
  }

  public stopScanning() {
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
    data: PeripheralData,
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
    data: PeripheralData,
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

  private connectRefractometerCallback(
    refractometerType: RefractometerType,
    data: PeripheralData,
  ) {
    // wait for full data
    if (!this.refractometerDevice || 'characteristics' in data) {
      this.refractometerDevice = makeRefractometerDevice(
        refractometerType,
        data,
      );
      this.logger.log('Refractometer Connected successfully');
      this.__sendEvent(CoffeeBluetoothServiceEvent.CONNECTED_REFRACTOMETER);
    }
  }

  private disconnectRefractometerCallback() {
    if (this.refractometerDevice) {
      this.refractometerDevice.disconnect();
      this.refractometerDevice = null;
      this.logger.log('Disconnected successfully');
    }
    // Send disconnect callback, even if scale is already null/not existing anymore
    this.__sendEvent(CoffeeBluetoothServiceEvent.DISCONNECTED_REFRACTOMETER);
  }
}
