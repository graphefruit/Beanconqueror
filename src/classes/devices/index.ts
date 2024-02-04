import { PeripheralData } from './ble.types';
import { BluetoothScale } from './bluetoothDevice';
import { DecentScale } from './decentScale';
import { FelicitaScale } from './felicitaScale';
import { JimmyScale } from './jimmyScale';
import { LunarScale } from './lunarScale';
import { PressureDevice } from './pressureBluetoothDevice';
import { PopsiclePressure } from './popsiclePressure';
import { TransducerDirectPressure } from './transducerDirectPressure';
import { EurekaPrecisaScale } from './eurekaPrecisaScale';
import { PrsPressure } from './prsPressure';
import { SkaleScale } from './skale';
import { TemperatureDevice } from './temperatureBluetoothDevice';
import { ETITemperature } from './etiTemperature';
import { SmartchefScale } from './smartchefScale';
import { DifluidMicrobalance } from './difluidMicrobalance';
import { RefractometerDevice } from './refractometerBluetoothDevice';
import { DiFluidR2Refractometer } from './difluidR2Refractometer';
import { BlackcoffeeScale } from './blackcoffeeScale';
import { DifluidMicrobalanceTi } from './difluidMicrobalanceTi';
import { DiyPythonCoffeeScale } from './diyPythonCoffeeScale';
import { DiyRustCoffeeScale } from './diyRustCoffeeScale';
export { BluetoothScale, SCALE_TIMER_COMMAND } from './bluetoothDevice';

export enum ScaleType {
  DECENT = 'DECENT',
  LUNAR = 'LUNAR',
  JIMMY = 'JIMMY',
  FELICITA = 'FELICITA',
  EUREKAPRECISA = 'EUREKAPRECISA',
  SKALE = 'SKALE',
  SMARTCHEF = 'SMARTCHEF',
  DIFLUIDMICROBALANCE = 'DIFLUIDMIRCROBALANCE',
  DIFLUIDMICROBALANCETI = 'DIFLUIDMIRCROBALANCETI',
  BLACKCOFFEE = 'BLACKCOFFEE',
  DIYPYTHONCOFFEESCALE = 'DIYPYTHONCOFFEESCALE',
  DIYRUSTCOFFEESCALE = 'DIYRUSTCOFFEESCALE',
}

export enum PressureType {
  POPSICLE = 'POPSICLE',
  DIRECT = 'DIRECT',
  PRS = 'PRS',
}

export enum TemperatureType {
  ETI = 'ETI',
}

export enum RefractometerType {
  R2 = 'R2',
}

export function makeDevice(
  type: ScaleType,
  data: PeripheralData
): BluetoothScale | null {
  switch (type) {
    case ScaleType.DECENT:
      return new DecentScale(data, type);
    case ScaleType.LUNAR:
      return new LunarScale(data, type);
    case ScaleType.JIMMY:
      return new JimmyScale(data, type);
    case ScaleType.FELICITA:
      return new FelicitaScale(data, type);
    case ScaleType.EUREKAPRECISA:
      return new EurekaPrecisaScale(data, type);
    case ScaleType.SKALE:
      return new SkaleScale(data, type);
    case ScaleType.SMARTCHEF:
      return new SmartchefScale(data, type);
    case ScaleType.DIFLUIDMICROBALANCE:
      return new DifluidMicrobalance(data, type);
    case ScaleType.DIFLUIDMICROBALANCETI:
      return new DifluidMicrobalanceTi(data, type);
    case ScaleType.BLACKCOFFEE:
      return new BlackcoffeeScale(data, type);
    case ScaleType.DIYPYTHONCOFFEESCALE:
      return new DiyPythonCoffeeScale(data, type);
    case ScaleType.DIYRUSTCOFFEESCALE:
      return new DiyRustCoffeeScale(data, type);
    default:
      return null;
  }
}

export function makePressureDevice(
  type: PressureType,
  data: PeripheralData
): PressureDevice | null {
  switch (type) {
    case PressureType.POPSICLE:
      return new PopsiclePressure(data);
    case PressureType.DIRECT:
      return new TransducerDirectPressure(data);
    case PressureType.PRS:
      return new PrsPressure(data);
    default:
      return null;
  }
}

export function makeTemperatureDevice(
  type: TemperatureType,
  data: PeripheralData
): TemperatureDevice | null {
  switch (type) {
    case TemperatureType.ETI:
      return new ETITemperature(data);
    default:
      return null;
  }
}

export function makeRefractometerDevice(
  type: RefractometerType,
  data: PeripheralData
): RefractometerDevice | null {
  switch (type) {
    case RefractometerType.R2:
      return new DiFluidR2Refractometer(data);
    default:
      return null;
  }
}
