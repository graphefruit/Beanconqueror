import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';
import { RefractometerDevice } from './refractometerBluetoothDevice';
import { diFluid } from './diFluid/protocol';

declare var ble: any;
export class DiFluidR2Refractometer extends RefractometerDevice {
  public static SERVICE_UUID = '00FF';
  public static CHAR_UUID = 'AA01';
  public static DEVICE_NAME = 'r2';

  public MODEL_NAME = '';
  public FIRMWARE_VERSION = '';
  public SERIAL_NUMBER = '               ';

  public TEMPERATURE_UNIT = 'C';
  public SCREEN_BRIGHTNESS = 0;
  public TEST_COUNT = 0;
  public CURRENT_TEST = null;

  private logger: Logger;

  constructor(data: PeripheralData) {
    super(data);
    this.logger = new Logger('DiFluid Refractometer');
    this.connect();
  }

  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      device.name.toLowerCase().includes(this.DEVICE_NAME)
    );
  }

  public override async connect() {
    this.logger.log('connecting...');
    this.attachNotification();
    await setTimeout(async () => {
      await this.setDeviceAutoNotification(diFluid.R2.settings.autoTest.Off);
    }, 100);
    await setTimeout(async () => {
      await this.setDeviceTemperatureUnit(
        diFluid.R2.settings.temperatureUnit.C,
      );
    }, 100);
  }

  public disconnect() {
    this.deattachNotification();
  }

  public override disconnectTriggered(): void {
    this.logger.log('Disconnecting...');

    this.deattachNotification();
  }

  public override async requestRead() {
    this.logger.log('requesting TDS reading');
    await this.write(
      diFluid.buildRawCmd({
        func: diFluid.func.DEVICE_ACTION,
        cmd: diFluid.R2.action.SINGLE_TEST,
        data: new Uint8Array([]),
      }),
    );
  }

  public async setDeviceAutoNotification(
    notifications: diFluid.R2.settings.autoTest,
  ) {
    this.logger.log('enabling auto notifications');
    await this.write(
      diFluid.buildRawCmd({
        func: diFluid.func.DEVICE_SETTINGS,
        cmd: diFluid.R2.settings.AUTO_TEST_STATUS,
        data: new Uint8Array([notifications]),
      }),
    );
  }

  public async setDeviceTemperatureUnit(
    unit: diFluid.R2.settings.temperatureUnit,
  ) {
    this.logger.log('set R2 to celsius');
    await this.write(
      diFluid.buildRawCmd({
        func: diFluid.func.DEVICE_SETTINGS,
        cmd: diFluid.R2.settings.TEMPERATURE_UNIT,
        data: new Uint8Array([unit]),
      }),
    );
  }

  private write(_bytes: Uint8Array) {
    return new Promise((resolve, reject) => {
      ble.write(
        this.device_id,
        DiFluidR2Refractometer.SERVICE_UUID,
        DiFluidR2Refractometer.CHAR_UUID,
        _bytes.buffer,
        (e: any) => {
          resolve(true);
        },
        (e: any) => {
          resolve(false);
        },
      );
    });
  }

  private async attachNotification() {
    ble.startNotification(
      this.device_id,
      DiFluidR2Refractometer.SERVICE_UUID,
      DiFluidR2Refractometer.CHAR_UUID,
      async (_data: any) => {
        this.parseStatusUpdate(new Uint8Array(_data));
      },
      (_data: any) => {},
    );
  }

  /**
   * @param rawStatus - Uint8Array bytes from device
   *
   * @see {@link https://github.com/DiFluid/difluid-sdk-demo/blob/master/docs/protocolR2.md | Protocol Documentation}
   */
  private async parseStatusUpdate(rawStatus: Uint8Array) {
    let status = null;
    try {
      status = diFluid.parseRawStatus(rawStatus);
    } catch (err) {
      this.logger.error(
        'Could not parse raw status message. Err: ' + err.message,
      );
      return;
    }

    if (status.func === diFluid.func.DEVICE_INFO) {
      if (status.cmd === diFluid.R2.info.SERIAL_NUMBER) {
        const part = status.data[0];
        this.SERIAL_NUMBER =
          this.SERIAL_NUMBER.substring(0, part * 5) +
          diFluid.parseString(status.data.slice(1)) +
          this.SERIAL_NUMBER.substring(part * 5 + 5);
        this.logger.log(
          'Serial Number (' + (status.data[0] + 1).toString() + '/3)',
        );
      } else if (status.cmd === diFluid.R2.info.DEVICE_MODEL) {
        this.MODEL_NAME = diFluid.parseString(status.data);
        this.logger.log('Device Model: ' + this.MODEL_NAME);
      } else if (status.cmd === diFluid.R2.info.FIRMWARE_VERSION) {
        this.FIRMWARE_VERSION = diFluid.parseString(status.data);
        this.logger.log('Firmware version: ' + this.FIRMWARE_VERSION);
      }
    } else if (status.func === diFluid.func.DEVICE_SETTINGS) {
      if (status.cmd === diFluid.R2.settings.TEMPERATURE_UNIT) {
        if (status.data[0] === diFluid.R2.settings.temperatureUnit.C) {
          this.TEMPERATURE_UNIT = 'C';
        } else if (status.data[0] === diFluid.R2.settings.temperatureUnit.F) {
          this.TEMPERATURE_UNIT = 'F';
        }
        this.logger.log('Temperature Unit: ' + this.TEMPERATURE_UNIT);
      } else if (status.cmd === diFluid.R2.settings.AUTO_TEST_STATUS) {
        if (status.data[0] === diFluid.R2.settings.autoTest.Off) {
          this.logger.log('Auto Test: Off');
        } else if (status.data[0] === diFluid.R2.settings.autoTest.On) {
          this.logger.log('Auto Test: On');
        }
      } else if (status.cmd === diFluid.R2.settings.SCREEN_BRIGHTNESS) {
        this.SCREEN_BRIGHTNESS = status.data[0];
        this.logger.log(
          'Screen Brightness: ' + this.SCREEN_BRIGHTNESS.toString() + '%',
        );
      } else if (status.cmd === diFluid.R2.settings.NUMBER_OF_TESTS) {
        this.TEST_COUNT = status.data[0];
        this.logger.log('Number of Tests: ' + this.TEST_COUNT.toString());
      }
    } else if (status.func === diFluid.func.DEVICE_ACTION) {
      if (
        status.cmd === diFluid.R2.action.SINGLE_TEST ||
        status.cmd === diFluid.R2.action.AVERAGE_TEST
      ) {
        if (status.data[0] === diFluid.R2.action.test.TEST_STATUS) {
          switch (status.data[1]) {
            case diFluid.R2.action.test.status.AVERAGE_TEST_FINISHED:
              this.CURRENT_TEST = null;
              this.logger.log('Test Finished');
              break;
            case diFluid.R2.action.test.status.AVERAGE_TEST_START:
              this.CURRENT_TEST = 'Average';
              this.logger.log('Average Test Started');
              break;
            case diFluid.R2.action.test.status.AVERAGE_TEST_ONGOING:
              this.CURRENT_TEST = 'Average';
              this.logger.log('Average Test Ongoing');
              break;
            case diFluid.R2.action.test.status.AVERAGE_TEST_FINISHED:
              this.CURRENT_TEST = null;
              this.logger.log('Average Test Finished');
              break;
            case diFluid.R2.action.test.status.LOOP_TEST_START:
              this.CURRENT_TEST = 'Loop';
              this.logger.log('Loop Test Started');
              break;
            case diFluid.R2.action.test.status.LOOP_TEST_ONGOING:
              this.CURRENT_TEST = 'Loop';
              this.logger.log('Loop Test Ongoing');
              break;
            case diFluid.R2.action.test.status.LOOP_TEST_FINISHED:
              this.CURRENT_TEST = null;
              this.logger.log('Loop Test Finished');
              break;
            case diFluid.R2.action.test.status.AVERAGE_TEST_ONGOING_INVALID:
              this.CURRENT_TEST = 'Average';
              this.logger.log(
                'Average Test Ongoing, but taking longer than expected',
              );
              break;
            case diFluid.R2.action.test.status.TEST_START:
              this.CURRENT_TEST = 'Single';
              this.logger.log('Test Started');
              break;
          }
        } else if (
          status.data[0] === diFluid.R2.action.test.TEMPERATURE_INFO ||
          status.data[0] === diFluid.R2.action.test.AVERAGE_TEMPERATURE_INFO
        ) {
          if (
            status.data[0] === diFluid.R2.action.test.AVERAGE_TEMPERATURE_INFO
          ) {
            this.logger.log('Average Temperature Received');
            this.logger.log(
              'Recieved Average Test (' +
                status.data[5].toString() +
                '/' +
                status.data[6].toString() +
                ')',
            );
          } else {
            this.logger.log('Temperature Received');
            if (status.data[5] === diFluid.R2.settings.temperatureUnit.C) {
              this.TEMPERATURE_UNIT = 'C';
            } else if (
              status.data[5] === diFluid.R2.settings.temperatureUnit.F
            ) {
              this.TEMPERATURE_UNIT = 'F';
            }
          }
          // Setting based on average of prism and tank, adjusted to remove 10* multiplier
          this.setTempReading(
            (this.getInt(status.data.slice(1, 3)) +
              this.getInt(status.data.slice(3, 5))) /
              20,
          );
        } else if (
          status.data[0] === diFluid.R2.action.test.TEST_RESULT ||
          status.data[0] === diFluid.R2.action.test.AVERAGE_RESULT
        ) {
          if (status.data[0] === diFluid.R2.action.test.AVERAGE_RESULT) {
            this.logger.log('Average TDS Received');
          } else {
            this.logger.log('TDS Received');
          }

          this.setTdsReading(this.getInt(status.data.slice(1, 3)) / 100);
          this.resultEvent.emit(null);
        }
      } else if (status.cmd === diFluid.R2.action.CALIBRATION_RESULT) {
        if (status.data[0] === diFluid.R2.action.test.TEST_STATUS) {
          switch (status.data[1]) {
            case diFluid.R2.action.test.status.CALIBRATION_FINISHED:
              this.logger.log('Calibration Finished');
              break;
            case diFluid.R2.action.test.status.CALIBRATION_START:
              this.logger.log('Calibration Started');
              break;
          }
        }
        // Not going to read TDS values, when they will always be zeroed.
      } else if (status.cmd === diFluid.R2.action.ERROR) {
        if (rawStatus[6] === diFluid.R2.action.errorClass.GENERAL) {
          if (rawStatus[7] === diFluid.R2.action.error.general.TEST_ERROR) {
            this.logger.log('Test Error');
          } else if (
            rawStatus[7] === diFluid.R2.action.error.general.CALIBRATION_FAILED
          ) {
            this.logger.log('Calibration Failed');
          } else if (
            rawStatus[7] === diFluid.R2.action.error.general.NO_LIQUID
          ) {
            this.logger.log('No Liquid');
          } else if (
            rawStatus[7] === diFluid.R2.action.error.general.BEYOND_RANGE
          ) {
            this.logger.log('Beyond Range');
          }
        } else if (rawStatus[6] === diFluid.R2.action.errorClass.HARDWARE) {
          this.logger.log('Hardware Error');
        }
      } else if (status.cmd === diFluid.R2.action.ERROR_UNKNOWN) {
        this.logger.log('Unknown Error');
      }
    }
  }

  /**
   * @param buffer - A Uint8Array to be parsed as a single integer
   * supports up to a 64bit int
   *
   * @returns a `number`
   */
  public getInt(buffer: Uint8Array): number {
    let sum = 0;
    buffer = buffer.reverse();
    for (let idx = 0; idx < buffer.length && idx <= 4; idx++) {
      sum += buffer[idx] << (8 * idx);
    }

    return sum;
  }

  private async deattachNotification() {
    ble.stopNotification(
      this.device_id,
      DiFluidR2Refractometer.SERVICE_UUID,
      DiFluidR2Refractometer.CHAR_UUID,
      (e: any) => {},
      (e: any) => {},
    );
  }
}
