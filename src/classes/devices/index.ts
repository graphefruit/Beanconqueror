import { Platforms } from '@ionic/core';
import { PeripheralData } from './ble.types';
import { BluetoothScale } from './bluetoothDevice';
import DecentScale from './decentScale';
import FelicitaScale from './felicitaScale';
import JimmyScale from './jimmyScale';
import LunarScale from './lunarScale';
import { PressureDevice } from './pressureBluetoothDevice';
import PopsiclePressure from './popsiclePressure';
import TransducerDirectPressure from './transducerDirectPressure';
import EurekaPrecisaScale from './eurekaPrecisaScale';
export { BluetoothScale, SCALE_TIMER_COMMAND } from './bluetoothDevice';
export { default as DecentScale } from './decentScale';
export { default as LunarScale } from './lunarScale';
export { default as JimmyScale } from './jimmyScale';

export enum ScaleType {
  DECENT = 'DECENT',
  LUNAR = 'LUNAR',
  JIMMY = 'JIMMY',
  FELICITA = 'FELICITA',
  EUREKAPRECISA = 'EUREKAPRECISA',
}

export enum PressureType {
  POPSICLE = 'POPSICLE',
  DIRECT = 'DIRECT',
}

export function makeDevice(
  type: ScaleType,
  data: PeripheralData,
  platforms: Platforms[]
): BluetoothScale {
  switch (type) {
    case ScaleType.DECENT:
      return new DecentScale(data, platforms);
    case ScaleType.LUNAR:
      return new LunarScale(data, platforms);
    case ScaleType.JIMMY:
      return new JimmyScale(data, platforms);
    case ScaleType.FELICITA:
      return new FelicitaScale(data, platforms);
    case ScaleType.EUREKAPRECISA:
      return new EurekaPrecisaScale(data, platforms);
    default:
      return null;
  }
}

export function makePressureDevice(
  type: PressureType,
  data: PeripheralData,
  platforms: Platforms[]
): PressureDevice {
  switch (type) {
    case PressureType.POPSICLE:
      return new PopsiclePressure(data, platforms);
    case PressureType.DIRECT:
      return new TransducerDirectPressure(data, platforms);
    default:
      return null;
  }
}
