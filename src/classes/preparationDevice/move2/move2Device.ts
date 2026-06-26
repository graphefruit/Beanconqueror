import { HttpClient } from '@angular/common/http';

import { IMove2Params } from '../../../interfaces/preparationDevices/move2/iMove2Params';
import { Logger } from '../../devices';
import { Preparation } from '../../preparation/preparation';
import { BluetoothPreparationDevice } from '../bluetoothPreparationDevice';

declare var ble: any;

export class Move2Device extends BluetoothPreparationDevice {
  public static DEVICE_NAME = 'MOVE2';
  public static SERVICE_UUID = '873ae82a-4c5a-4342-b539-9d900bf7ebd0';
  public static PRESSURE_CHAR_UUID = '873ae82b-4c5a-4342-b539-9d900bf7ebd0';
  public static ZERO_CHAR_UUID = '873ae82c-4c5a-4342-b539-9d900bf7ebd0';
  public static WRITE_REG_CHAR_UUID = '873ae834-4c5a-4342-b539-9d900bf7ebd0';
  public static TEMPERATURE_CHAR_UUID = '873ae833-4c5a-4342-b539-9d900bf7ebd0';
  public static OVERWRITE_SHOT_TIME_CHAR_UUID =
    '873ae837-4c5a-4342-b539-9d900bf7ebd0';
  private logger: Logger;

  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      device.name.toUpperCase().includes(Move2Device.DEVICE_NAME)
    );
  }

  private notificationAttached: boolean = false;

  constructor(
    protected httpClient: HttpClient,
    _preparation: Preparation,
  ) {
    super(httpClient, _preparation);
    this.logger = new Logger('MOVE2Device');

    // Keep deviceId in sync with bluetoothId (including backwards-compat value).
    this.deviceId = this.bluetoothId;

    window['move2Device'] = this; // Expose the device instance for debugging purposes
  }

  // ---------------------------------------------------------------------------
  // BluetoothPreparationDevice hooks
  // ---------------------------------------------------------------------------

  /**
   * Called by the superclass after a successful BLE connection.
   * Starts pressure and temperature notifications.
   */
  protected override onConnected(): void {
    if (!this.notificationAttached) {
      this.logger.log('onConnected: enabling value transmission');
      this.enableValueTransmission();
    }
  }

  /**
   * Called by the superclass at the start of destroy() before disconnecting.
   * Stops all notifications.
   */
  protected override onDestroy(): void {
    this.logger.log('onDestroy: disabling value transmission');
    this.disableValueTransmission();
  }

  // ---------------------------------------------------------------------------
  // Machine control
  // ---------------------------------------------------------------------------

  public async turnOnMachine(): Promise<boolean> {
    return true;
  }

  public async turnOffMachine(): Promise<boolean> {
    return true;
  }

  public getPressure(): number {
    return this.pressure;
  }

  public getTemperature(): number {
    return this.temperature;
  }

  /**public updateZero(): Promise<void> {
    const data = new Uint8Array([1]);

    return new Promise((resolve, reject) => {
      if (!this.deviceId) return reject();
      ble.writeWithoutResponse(
        this.deviceId,
        Move2Device.SERVICE_UUID,
        Move2Device.ZERO_CHAR_UUID,
        data.buffer,
        () => {
          resolve();
        },
        () => {
          reject();
        },
      );
    });
  }**/

  public async startShot(params?: Move2Params): Promise<void> {
    const wakeUpData = new Uint8Array([102 >> 8, 102 & 0xff, 0, 1]);
    const startData = new Uint8Array([101 >> 8, 101 & 0xff, 0, 8]);
    //const startData = new Uint8Array([101 >> 8, 101 & 0xff, 0, 1]);

    if (!this.deviceId) {
      throw new Error('No device ID');
    }

    this.logger.log('Start shot send');
    return new Promise((resolve, reject) => {
      // Wake up the machine
      ble.write(
        this.deviceId,
        Move2Device.SERVICE_UUID,
        Move2Device.WRITE_REG_CHAR_UUID,
        wakeUpData.buffer,
        async () => {
          try {
            if (params) {
              await this.setPreinfusionGlobalEnable(true).catch((error) => {
                this.logger.log(
                  'Failed to set preinfusion global enable on init',
                  error,
                );
              });

              await this.setRemotePreinfusionEnable(
                params.remotePreinfusionEnable === true,
              );
              if (params.remotePreinfusionEnable === true) {
                if (
                  params.preinfusionPauseStart !== undefined &&
                  params.preinfusionPauseStart !== null
                ) {
                  await this.setPreinfusionPauseStart(
                    params.preinfusionPauseStart,
                  );
                }
                if (
                  params.preinfusionPauseTime !== undefined &&
                  params.preinfusionPauseTime !== null
                ) {
                  await this.setPreinfusionPauseTime(
                    params.preinfusionPauseTime,
                  );
                }
              }
            }
          } catch (err) {
            this.logger.log(
              'Failed to write preinfusion settings before startShot',
              err,
            );
          }

          // Then send the start command
          ble.write(
            this.deviceId,
            Move2Device.SERVICE_UUID,
            Move2Device.WRITE_REG_CHAR_UUID,
            startData.buffer,
            () => {
              resolve();
            },
            () => {
              reject(new Error('Failed to write start command'));
            },
          );
        },
        () => {
          reject(new Error('Failed to write wake up command'));
        },
      );
    });
  }

  public async stopShot(): Promise<void> {
    const data = new Uint8Array([101 >> 8, 101 & 0xff, 0, 10]);
    this.logger.log('Stop shot send');
    return new Promise((resolve, reject) => {
      if (!this.deviceId) return reject();
      ble.write(
        this.deviceId,
        Move2Device.SERVICE_UUID,
        Move2Device.WRITE_REG_CHAR_UUID,
        data.buffer,
        () => {
          resolve();
        },
        () => {
          reject();
        },
      );
    });
  }

  public overWriteShotTime(value: boolean) {
    const data = new Uint8Array([value ? 1 : 0]);
    this.logger.log(`overWriteShotTime send: ${value}`);

    if (!this.deviceId) {
      return;
    }
    ble.write(
      this.deviceId,
      Move2Device.SERVICE_UUID,
      Move2Device.OVERWRITE_SHOT_TIME_CHAR_UUID,
      data.buffer,
      () => {
        this.logger.log(`overWriteShotTime successfully sent: ${value}`);
      },
      () => {
        this.logger.log(`overWriteShotTime send failed: ${value}`);
      },
    );
  }

  public async setPreinfusionGlobalEnable(enable: boolean): Promise<void> {
    const data = new Uint8Array([3022 >> 8, 3022 & 0xff, 0, enable ? 1 : 0]);
    this.logger.log(`setPreinfusionGlobalEnable: ${enable}`);
    return new Promise((resolve, reject) => {
      if (!this.deviceId) return reject(new Error('No device ID'));
      ble.write(
        this.deviceId,
        Move2Device.SERVICE_UUID,
        Move2Device.WRITE_REG_CHAR_UUID,
        data.buffer,
        () => resolve(),
        () => reject(new Error('Failed to write global preinfusion enable')),
      );
    });
  }

  public async setRemotePreinfusionEnable(enable: boolean): Promise<void> {
    const data = new Uint8Array([2011 >> 8, 2011 & 0xff, 0, enable ? 1 : 0]);
    this.logger.log(`setRemotePreinfusionEnable: ${enable}`);
    return new Promise((resolve, reject) => {
      if (!this.deviceId) return reject(new Error('No device ID'));
      ble.write(
        this.deviceId,
        Move2Device.SERVICE_UUID,
        Move2Device.WRITE_REG_CHAR_UUID,
        data.buffer,
        () => resolve(),
        () => reject(new Error('Failed to write remote preinfusion enable')),
      );
    });
  }

  /**
   * At which time the preinfusion pause shall start
   * @param seconds
   */
  public async setPreinfusionPauseStart(seconds: number): Promise<void> {
    const value = Math.round(seconds * 10);
    const highByte = (value >> 8) & 0xff;
    const lowByte = value & 0xff;
    const data = new Uint8Array([2012 >> 8, 2012 & 0xff, highByte, lowByte]);
    this.logger.log(
      `setPreinfusionPauseStart: ${seconds}s (value: ${value}, high: ${highByte}, low: ${lowByte})`,
    );
    return new Promise((resolve, reject) => {
      if (!this.deviceId) return reject(new Error('No device ID'));
      ble.write(
        this.deviceId,
        Move2Device.SERVICE_UUID,
        Move2Device.WRITE_REG_CHAR_UUID,
        data.buffer,
        () => resolve(),
        () => reject(new Error('Failed to write preinfusion pause start')),
      );
    });
  }

  /**
   * How long shall the preinfusion run
   * @param seconds
   */
  public async setPreinfusionPauseTime(seconds: number): Promise<void> {
    const value = Math.round(seconds * 10);
    const highByte = (value >> 8) & 0xff;
    const lowByte = value & 0xff;
    const data = new Uint8Array([2013 >> 8, 2013 & 0xff, highByte, lowByte]);
    this.logger.log(
      `setPreinfusionPauseTime: ${seconds}s (value: ${value}, high: ${highByte}, low: ${lowByte})`,
    );
    return new Promise((resolve, reject) => {
      if (!this.deviceId) return reject(new Error('No device ID'));
      ble.write(
        this.deviceId,
        Move2Device.SERVICE_UUID,
        Move2Device.WRITE_REG_CHAR_UUID,
        data.buffer,
        () => resolve(),
        () => reject(new Error('Failed to write preinfusion pause time')),
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Notification / value transmission
  // ---------------------------------------------------------------------------

  private toFixedIfNecessary(value: any, dp: number) {
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return 0;
    }
    return +parsedFloat.toFixed(dp);
  }

  public enableValueTransmission(): void {
    if (!this.deviceId) {
      return;
    }

    this.overWriteShotTime(true);
    ble.startNotification(
      this.deviceId,
      Move2Device.SERVICE_UUID,
      Move2Device.PRESSURE_CHAR_UUID,
      async (_data: any) => {
        this.notificationAttached = true;
        const pressureData = new Uint8Array(_data);
        const val = (pressureData[0] << 8) + pressureData[1];
        let actualPressure: any = 0;
        if (val >= 0x8000) {
          //Negative value
          actualPressure = -1 * (0xffff - val + 1);
        } else {
          //Positive value, nothing todos
          actualPressure = val;
        }

        actualPressure = actualPressure / 1000;
        actualPressure = this.toFixedIfNecessary(actualPressure, 1);
        this.pressure = actualPressure;
      },
      (_data: any) => {
        this.notificationAttached = false;
      },
    );

    ble.startNotification(
      this.deviceId,
      Move2Device.SERVICE_UUID,
      Move2Device.TEMPERATURE_CHAR_UUID,
      (_data: any) => {
        const tempData = new Uint8Array(_data);
        if (tempData.length >= 12 && tempData[0] === 0 && tempData[1] === 12) {
          const tempVal = (tempData[10] << 8) + tempData[11];
          // Assuming this gives the temperature directly
          this.temperature = tempVal;
        }
      },
      (_error: any) => {
        this.logger.log('Failed to start temperature notification');
      },
    );
  }

  public disableValueTransmission(): Promise<void> {
    return new Promise((resolve) => {
      this.notificationAttached = false;
      if (!this.deviceId) {
        return resolve();
      }
      this.overWriteShotTime(false);
      ble.stopNotification(
        this.deviceId,
        Move2Device.SERVICE_UUID,
        Move2Device.PRESSURE_CHAR_UUID,
        () => {},
        () => {},
      );
      ble.stopNotification(
        this.deviceId,
        Move2Device.SERVICE_UUID,
        Move2Device.TEMPERATURE_CHAR_UUID,
        () => {
          resolve();
        },
        () => {
          resolve();
        },
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Brew-by-weight helpers
  // ---------------------------------------------------------------------------

  public getResidualLagTime(): number {
    const customParams = this.getPreparation()?.connectedPreparationDevice
      ?.customParams as Move2Params;
    return customParams?.residualLagTime ? customParams.residualLagTime : 0.9;
  }
}

export class Move2Params implements IMove2Params {
  public bluetoothId: string = '';
  public bluetoothName: string = '';
  public residualLagTime: number = 0.9;
  public stopAtWeight: number = 0;
  public remotePreinfusionEnable: boolean = false;
  public preinfusionPauseStart: number = 0.1;
  public preinfusionPauseTime: number = 0.1;

  constructor() {}
}
