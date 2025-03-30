import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';
import { RefractometerDevice } from './refractometerBluetoothDevice';
import { diFluid } from './diFluid/protocol';
import { TEST_TYPE_ENUM } from 'src/enums/settings/refractometer';

declare var ble: any;
export class DiFluidR2Refractometer extends RefractometerDevice {
  public static SERVICE_UUID = '00FF';
  public static CHAR_UUID = 'AA01';
  public static DEVICE_NAME = 'r2';

  public MODEL_NAME = '';
  public FIRMWARE_VERSION = '';
  public SERIAL_NUMBER = '               ';

  public TemperatureUnit: string;
  public ScreenBrightness: number;
  public TestCount: number;
  public CurrentTest: string;
  public AutoTest: boolean;

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
    let cmd = null;
    switch (this.TestType) {
      case TEST_TYPE_ENUM.AVERAGE:
        cmd = diFluid.R2.action['Average Test'];
        break;
      case TEST_TYPE_ENUM.SINGLE:
      default: // In case `setTestType()` was not called on device connection
        cmd = diFluid.R2.action['Single Test'];
        break;
    }
    await this.write(
      diFluid.buildRawCmd({
        func: diFluid.func['Device Action'],
        cmd: cmd,
        data: new Uint8Array([]),
      }),
    );
  }

  public override async setTestType(testType: TEST_TYPE_ENUM) {
    // Because all test types are supported, we can directly set
    this.TestType = testType;
  }

  public override async setAutoTest(doAutoTest: boolean) {
    this.AutoTest = doAutoTest;
    this.setDeviceAutoTest(
      doAutoTest
        ? diFluid.R2.settings.autoTest.On
        : diFluid.R2.settings.autoTest.Off,
    );
  }

  public override async setTestNumber(count: number) {
    this.logger.log('setting number of tests: ' + count.toString());
    // Validating `count` is within acceptable range
    if (count < 1) {
      count = 1;
    } else if (count > 10) {
      count = 10;
    }

    await this.write(
      diFluid.buildRawCmd({
        func: diFluid.func['Device Settings'],
        cmd: diFluid.R2.settings['Number of Tests'],
        data: new Uint8Array([count]),
      }),
    );
  }

  public async setDeviceAutoTest(status: diFluid.R2.settings.autoTest) {
    this.logger.log(
      'setting auto test status: ' + diFluid.R2.settings.autoTest[status],
    );
    await this.write(
      diFluid.buildRawCmd({
        func: diFluid.func['Device Settings'],
        cmd: diFluid.R2.settings['Auto Test Status'],
        data: new Uint8Array([status]),
      }),
    );
  }

  public async setDeviceTemperatureUnit(
    unit: diFluid.R2.settings.temperatureUnit,
  ) {
    this.logger.log('set R2 to celsius');
    await this.write(
      diFluid.buildRawCmd({
        func: diFluid.func['Device Settings'],
        cmd: diFluid.R2.settings['Temperature Unit'],
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

    switch (diFluid.func[status.func]) {
      case 'Device Info':
        switch (diFluid.R2.info[status.cmd]) {
          case 'Serial Number':
            const part = status.data[0];
            this.SERIAL_NUMBER =
              this.SERIAL_NUMBER.substring(0, part * 5) +
              diFluid.parseString(status.data.slice(1)) +
              this.SERIAL_NUMBER.substring(part * 5 + 5);
            this.logger.log(
              'Serial Number (' + (status.data[0] + 1).toString() + '/3)',
            );
            break;
          case 'Device Model':
            this.MODEL_NAME = diFluid.parseString(status.data);
            this.logger.log('Device Model: ' + this.MODEL_NAME);
            break;
          case 'Firmware Version':
            this.FIRMWARE_VERSION = diFluid.parseString(status.data);
            this.logger.log('Firmware version: ' + this.FIRMWARE_VERSION);
            break;
        }
        break;
      case 'Device Settings':
        switch (diFluid.R2.settings[status.cmd]) {
          case 'Temperature Unit':
            this.TemperatureUnit =
              diFluid.R2.settings.temperatureUnit[status.data[0]];
            this.logger.log('Temperature Unit: ' + this.TemperatureUnit);
            break;
          case 'Auto Test Status':
            this.AutoTest =
              diFluid.R2.settings.autoTest[status.data[0]] === 'Off'
                ? false
                : true;
            this.logger.log('Auto Test: ' + this.AutoTest);
            break;
          case 'Screen Brightness':
            this.ScreenBrightness = status.data[0];
            this.logger.log(
              'Screen Brightness: ' + this.ScreenBrightness.toString() + '%',
            );
            break;
          case 'Number of Tests':
            this.TestCount = status.data[0];
            this.logger.log('Number of Tests: ' + this.TestCount.toString());
            break;
        }
        break;
      case 'Device Action':
        switch (diFluid.R2.action[status.cmd]) {
          case 'Single Test':
          case 'Average Test':
            switch (diFluid.R2.action.test[status.data[0]]) {
              case 'Test Status':
                switch (diFluid.R2.action.test.status[status.data[1]]) {
                  case 'Test Finished':
                  case 'Average Test Finished':
                  case 'Loop Test Finished':
                    this.CurrentTest = null;
                    break;
                  case 'Average Test Started':
                  case 'Average Test Ongoing':
                  case 'Average Test Ongoing: Timout':
                    this.CurrentTest = 'Average';
                    break;
                  case 'Loop Test Started':
                  case 'Loop Test Ongoing':
                    this.CurrentTest = 'Loop';
                    break;
                  case 'Test Started':
                    this.CurrentTest = 'Single';
                    break;
                }
                this.logger.log(diFluid.R2.action.test.status[status.data[1]]);
                break;
              case 'Temperature Info':
              case 'Average Temperature Info':
                if (
                  diFluid.R2.action.test[status.data[0]] ===
                  'Average Temperature and Info'
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
                  this.TemperatureUnit =
                    diFluid.R2.settings.temperatureUnit[status.data[5]];
                }
                // Setting based on average of prism and tank, adjusted to remove 10* multiplier
                this.setTempReading(
                  (this.getInt(status.data.slice(1, 3)) +
                    this.getInt(status.data.slice(3, 5))) /
                    20,
                );
                break;
              case 'Average Result':
              case 'Test Result':
                if (
                  (diFluid.R2.action[status.cmd] === 'Average Test' &&
                    diFluid.R2.action.test[status.data[0]] ===
                      'Average Result') ||
                  (diFluid.R2.action[status.cmd] === 'Single Test' &&
                    diFluid.R2.action.test[status.data[0]] === 'Test Result')
                ) {
                  this.logger.log(
                    diFluid.R2.action[status.cmd].slice(0, -5) +
                      ' TDS Received',
                  );
                  this.setTdsReading(
                    this.getInt(status.data.slice(1, 3)) / 100,
                  );
                  this.resultEvent.emit(null);
                }
                break;
              default:
                // Possibly Loop test
                this.logger.log('Unexpected data: ' + status.data);
                break;
            }
            break;
          case 'Calibration Result':
            if (diFluid.R2.action.test[status.data[0]] === 'Test Status') {
              this.logger.log(diFluid.R2.action.test.status[status.data[1]]);
            }
            // Not going to read TDS values when they will always be zeroed
            break;
          case 'Error':
            switch (diFluid.R2.action.errorClass[rawStatus[6]]) {
              case 'General':
                this.logger.log(diFluid.R2.action.error.general[rawStatus[7]]);
                break;
              case 'Hardware':
                this.logger.log('Hardware Error');
                break;
            }
            break;
          case 'Error Unknown':
            this.logger.log('Unknown Error');
            break;
        }
        break;
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
