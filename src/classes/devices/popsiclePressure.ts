import { Platforms } from '@ionic/core';
import {PeripheralData} from './ble.types';

import {PressureDevice, Pressure} from './pressureBluetoothDevice';

declare var ble;
export default class PopsiclePressure extends PressureDevice {
  public static WRITE_SERVICE_UUID = 'fff0';
  public static WRITE_CHAR_UUID = '36f5';

  public static READ_SERVICE_UUID = 'fff0';
  public static READ_CHAR_UUID = 'fff4';


  public static HEADER = 0x03;


  private buffer: Uint8Array;

  protected Pressure: Pressure = {
    actual: 0,
    old: 0,
  };

  public static notification_callback(event, scale) {

  }

  public static test(device) {
    return device && device.name && device.name.toLowerCase().startsWith('popsicle');
  }

  constructor(data: PeripheralData, platforms: Platforms[]) {
    super(data, platforms);
    this.buffer = new Uint8Array();
    this.connect();
  }

  private getXOR(_bytes) {
    return _bytes[0] ^ _bytes[1] ^ _bytes[2] ^ _bytes[3] ^ _bytes[4] ^ _bytes[5];
  }



  public async connect() {

    await this.attachNotification();
  }




  public getPressure() {
    return this.pressure.actual;
  }


  public getOldPressure() {
    return this.pressure.old;
  }

  private async attachNotification() {
    ble.startNotification(this.device_id, PopsiclePressure.READ_SERVICE_UUID, PopsiclePressure.READ_CHAR_UUID,
      async (_data) => {
        const scaleData = new Int8Array(_data);
        const uScaleData = new Uint8Array(_data);

        //You need to do the magic here to get the pressure information
        this.setPressure(1);


      }, (_data) => {

      }
    );
  }

  private async deattachNotification() {
    ble.stopNotification(this.device_id, PopsiclePressure.READ_SERVICE_UUID, PopsiclePressure.READ_CHAR_UUID,
      (e) => {

      },
      (e) => {

      });
  }
}
