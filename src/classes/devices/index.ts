import { Platforms } from '@ionic/core';
import { PeripheralData } from './ble.types';
import { BluetoothScale } from './bluetoothDevice';
import DecentScale from './decentScale';
import LunarScale from './lunarScale';

export { BluetoothScale, SCALE_TIMER_COMMAND } from './bluetoothDevice';
export { default as DecentScale } from './decentScale';
export { default as LunarScale } from './lunarScale';

export enum ScaleType {
  DECENT = 'DECENT',
  LUNAR = 'LUNAR',
}

export function makeDevice(type: ScaleType, data: PeripheralData, platforms: Platforms[]): BluetoothScale {
  switch (type) {
    case ScaleType.DECENT:
      return new DecentScale(data, platforms);
    case ScaleType.LUNAR:
      return new LunarScale(data, platforms);
    default:
      return null;
  }
}
