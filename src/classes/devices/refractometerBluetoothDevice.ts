import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';

export interface RefractometerReading {
  tds: number;
  temp: number;
}

declare var ble: any;
export abstract class RefractometerDevice {
  public device_id: string;
  public device_name: string;
  protected reading: RefractometerReading;
  public currentlyTesting: boolean;
  protected bluetoothParentLogger: Logger;

  constructor(data: PeripheralData) {
    this.device_id = data.id;
    try {
      this.device_name = data.name;
    } catch (ex) {}
    this.reading = {
      tds: 0,
      temp: 0,
    };
    this.bluetoothParentLogger = new Logger();
  }

  public abstract connect(): void;
  public abstract disconnect(): void;

  public getLastReading(): RefractometerReading {
    return this.reading;
  }

  public abstract requestRead(): void;

  public disconnectTriggered(): void {}

  protected setTdsReading(_tds: number) {
    this.bluetoothParentLogger.log(
      'Bluetooth Refractometer - New tds reading recieved ' + _tds
    );
    this.reading.tds = _tds;
  }
  protected setTempReading(_temp: number) {
    this.bluetoothParentLogger.log(
      'Bluetooth Refractometer - New temp reading recieved '
    );
    this.reading.temp = _temp;
  }
}
