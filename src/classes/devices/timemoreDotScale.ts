import { PeripheralData } from './ble.types';
import { BluetoothScale, SCALE_TIMER_COMMAND, Weight } from './bluetoothDevice';
import { sleep } from './common';
import { Logger } from './common/logger';
import { ScaleType } from './types';

declare var ble: any;

export class TimemoreDotScale extends BluetoothScale {
  public static DEVICE_NAME = 'dot';
  public static SERVICE_UUID = 'FFF0';
  public static CHAR_UUID = 'FFF1';
  public static CMD_UUID = 'FFF2';

  protected override weight: Weight = {
    actual: 0,
    old: 0,
    smoothed: 0,
    oldSmoothed: 0,
    notMutatedWeight: 0,
  };

  private logger: Logger;

  constructor(data: PeripheralData, type: ScaleType) {
    super(data, type);
    this.logger = new Logger('Timemore Dot Scale');
    this.connect();
  }

  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      (device.name.toLowerCase().includes('dot') ||
        device.name.toLowerCase().includes('tes017'))
    );
  }

  public override async connect() {
    this.logger.log('connecting...');
    await this.attachNotification();
    await sleep(500);
    await this.setWeightUnitToGram();
    await sleep(200);
    await this.setCurrentModeToStandard();
  }

  public override async tare() {
    this.weight.smoothed = 0;
    this.weight.actual = 0;
    this.weight.oldSmoothed = 0;
    this.weight.old = 0;
    this.setWeight(0);

    this.logger.log('Sending tare command...');
    const bytes = this.buildCommand(0x03, 0x0d, new Uint8Array([]));
    await this.write(bytes);
  }

  public override disconnectTriggered(): void {
    this.logger.log('Disconnecting...');
    this.deattachNotification();
  }

  public override async setTimer(_timer: SCALE_TIMER_COMMAND) {
    this.logger.log('Setting Timer command ' + _timer + '...');

    let timerState = 0;
    if (_timer === SCALE_TIMER_COMMAND.START) {
      timerState = 0x01;
    } else if (_timer === SCALE_TIMER_COMMAND.STOP) {
      timerState = 0x02;
    } else if (_timer === SCALE_TIMER_COMMAND.RESET) {
      timerState = 0x03;
    }

    if (timerState !== 0) {
      const bytes = this.buildCommand(0x03, 0x02, new Uint8Array([timerState]));
      await this.write(bytes);
    }
  }

  public override getWeight() {
    return this.weight.actual;
  }

  public override getSmoothedWeight() {
    return this.weight.smoothed;
  }

  public override getOldSmoothedWeight() {
    return this.weight.old;
  }

  private async setWeightUnitToGram() {
    this.logger.log('Setting weight unit to gram...');
    const bytes = this.buildCommand(0x03, 0x06, new Uint8Array([0x00]));
    await this.write(bytes);
  }

  private async setCurrentModeToStandard() {
    this.logger.log('Setting mode to standard...');
    const bytes = this.buildCommand(0x03, 0x08, new Uint8Array([0x01, 0x00]));
    await this.write(bytes);
  }

  private buildCommand(
    opcode: number,
    cmdId: number,
    data: Uint8Array,
  ): Uint8Array {
    const header = [0xa5, 0x5a];
    const len = data.length;
    const lenMsb = (len >> 8) & 0xff;
    const lenLsb = len & 0xff;

    const payload = new Uint8Array(6 + len);
    payload[0] = header[0];
    payload[1] = header[1];
    payload[2] = opcode;
    payload[3] = cmdId;
    payload[4] = lenMsb;
    payload[5] = lenLsb;
    payload.set(data, 6);

    const crc = this.crc16Ibm(payload);
    const finalFrame = new Uint8Array(8 + len);
    finalFrame.set(payload, 0);
    finalFrame[6 + len] = (crc >> 8) & 0xff;
    finalFrame[7 + len] = crc & 0xff;
    return finalFrame;
  }

  private crc16Ibm(data: Uint8Array): number {
    let crc = 0xffff;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x0001) !== 0) {
          crc = (crc >> 1) ^ 0xa001;
        } else {
          crc >>= 1;
        }
      }
    }
    return crc;
  }

  private write(_bytes: Uint8Array): Promise<boolean> {
    return new Promise((resolve) => {
      ble.writeWithoutResponse(
        this.device_id,
        TimemoreDotScale.SERVICE_UUID,
        TimemoreDotScale.CMD_UUID,
        _bytes.buffer,
        (e: any) => {
          resolve(true);
        },
        (e: any) => {
          this.logger.log('Write failed', e);
          resolve(false);
        },
      );
    });
  }

  private async attachNotification() {
    ble.startNotification(
      this.device_id,
      TimemoreDotScale.SERVICE_UUID,
      TimemoreDotScale.CHAR_UUID,
      async (_data: any) => {
        this.parseStatusUpdate(new Uint8Array(_data));
      },
      (_data: any) => {},
    );
  }

  private async parseStatusUpdate(rawStatus: Uint8Array) {
    if (rawStatus.length < 8) {
      return;
    }
    if (rawStatus[0] !== 0xa5 || rawStatus[1] !== 0x5a) {
      return;
    }
    const opcode = rawStatus[2];
    const cmdId = rawStatus[3];
    const dataLen = (rawStatus[4] << 8) | rawStatus[5];

    if (rawStatus.length < 8 + dataLen) {
      return;
    }

    const data = rawStatus.slice(6, 6 + dataLen);

    if (opcode === 0x01 || opcode === 0x02) {
      switch (cmdId) {
        case 0x01: // Weight, Flow Rate, Time
          if (data.length >= 8) {
            const rawWeight =
              (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3];
            const weight = rawWeight / 10;
            this.setWeight(weight);
          }
          break;
        case 0x05: // Battery Level
          if (data.length >= 2) {
            this.batteryLevel = data[1];
          }
          break;
      }
    }
  }

  private async deattachNotification() {
    ble.stopNotification(
      this.device_id,
      TimemoreDotScale.SERVICE_UUID,
      TimemoreDotScale.CHAR_UUID,
      (e: any) => {},
      (e: any) => {},
    );
  }
}
