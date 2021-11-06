import {PeripheralData} from './ble.types';
import DecentScale from './decentScale';
import LunarScale from './lunarScale';
import {BluetoothScale} from './bluetoothDevice';

export {default as DecentScale} from './decentScale';
export {SCALE_TIMER_COMMAND, BluetoothScale} from './bluetoothDevice';
export {default as LunarScale} from './lunarScale';

export enum ScaleType {
  DECENT = 'DECENT',
  LUNAR = 'LUNAR',
}

export function makeDevice(type: ScaleType, data: PeripheralData): BluetoothScale {
  switch (type) {
    case ScaleType.DECENT:
      return new DecentScale(data);
    case ScaleType.LUNAR:
      return new LunarScale(data);
    default:
      return null;
  }
}
