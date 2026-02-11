import { ArgosThermometer } from './argosThermometer';
import { BasicGrillThermometer } from './basicGrillThermometer';
import { BlackcoffeeScale } from './blackcoffeeScale';
import { PeripheralData } from './ble.types';
import { BluetoothScale } from './bluetoothDevice';
import { BookooScale } from './bokooScale';
import { BookooPressure } from './bookooPressure';
import { CombustionThermometer } from './combustionThermometer';
import { DecentScale } from './decentScale';
import { DifluidMicrobalance } from './difluidMicrobalance';
import { DifluidMicrobalanceTi } from './difluidMicrobalanceTi';
import { DiFluidR2Refractometer } from './difluidR2Refractometer';
import { DiyPythonCoffeeScale } from './diyPythonCoffeeScale';
import { DiyRustCoffeeScale } from './diyRustCoffeeScale';
import { EspressiScale } from './espressiScale';
import { ETITemperature } from './etiTemperature';
import { EurekaPrecisaScale } from './eurekaPrecisaScale';
import { FelicitaScale } from './felicitaScale';
import { GeisingerThermometer } from './geisingerThermometer';
import { JimmyScale } from './jimmyScale';
import { LunarScale } from './lunarScale';
import { MeaterThermometer } from './meaterThermometer';
import { PopsiclePressure } from './popsiclePressure';
import { PressureDevice } from './pressureBluetoothDevice';
import { PrsPressure } from './prsPressure';
import { RefractometerDevice } from './refractometerBluetoothDevice';
import { SkaleScale } from './skale';
import { SmartchefScale } from './smartchefScale';
import { TemperatureDevice } from './temperatureBluetoothDevice';
import { TimemoreScale } from './timemoreScale';
import { TransducerDirectPressure } from './transducerDirectPressure';
import { VariaAkuScale } from './variaAku';
import { WeighMyBruScale } from './weighMyBruScale';
import { FutulaScale } from './futulaScale';
import { GeisingerThermometer } from './geisingerThermometer';

export { BluetoothScale, SCALE_TIMER_COMMAND } from './bluetoothDevice';
export * from './common';

export enum BluetoothTypes {
  SCALE = 'SCALE',
  PRESSURE = 'PRESSURE',
  TEMPERATURE = 'TEMPERATURE',
  TDS = 'TDS',
}

export enum ScaleType {
  DECENT = 'DECENT',
  LUNAR = 'LUNAR',
  JIMMY = 'JIMMY',
  FELICITA = 'FELICITA',
  FUTULA = 'FUTULA',
  EUREKAPRECISA = 'EUREKAPRECISA',
  SKALE = 'SKALE',
  SMARTCHEF = 'SMARTCHEF',
  DIFLUIDMICROBALANCE = 'DIFLUIDMIRCROBALANCE',
  DIFLUIDMICROBALANCETI = 'DIFLUIDMIRCROBALANCETI',
  BLACKCOFFEE = 'BLACKCOFFEE',
  DIYPYTHONCOFFEESCALE = 'DIYPYTHONCOFFEESCALE',
  DIYRUSTCOFFEESCALE = 'DIYRUSTCOFFEESCALE',
  BOKOOSCALE = 'BOOKOOSCALE',
  TIMEMORESCALE = 'TIMEMORESCALE',
  VARIA_AKU = 'VARIA_AKU',
  ESPRESSI = 'ESPRESSI',
  WEIGHMYBRUSCALE = 'WEIGHMYBRUSCALE',
}

export enum PressureType {
  POPSICLE = 'POPSICLE',
  DIRECT = 'DIRECT',
  PRS = 'PRS',
  BOKOOPRESSURE = 'BOKOOPRESSURE',
}

export enum TemperatureType {
  ETI = 'ETI',
  BASICGRILL = 'BASICGRILL',
  MEATER = 'MEATER',
  COMBUSTION = 'COMBUSTION',
  ARGOS = 'ARGOS',
  GEISINGER = 'GEISINGER',
}

export enum RefractometerType {
  R2 = 'R2',
}

export function makeDevice(
  type: ScaleType,
  data: PeripheralData,
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
    case ScaleType.FUTULA:
      return new FutulaScale(data, type);
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
    case ScaleType.BOKOOSCALE:
      return new BookooScale(data, type);
    case ScaleType.TIMEMORESCALE:
      return new TimemoreScale(data, type);
    case ScaleType.VARIA_AKU:
      return new VariaAkuScale(data, type);
    case ScaleType.ESPRESSI:
      return new EspressiScale(data, type);
    case ScaleType.WEIGHMYBRUSCALE:
      return new WeighMyBruScale(data, type);
    default:
      return null;
  }
}

export function makePressureDevice(
  type: PressureType,
  data: PeripheralData,
): PressureDevice | null {
  switch (type) {
    case PressureType.POPSICLE:
      return new PopsiclePressure(data);
    case PressureType.DIRECT:
      return new TransducerDirectPressure(data);
    case PressureType.PRS:
      return new PrsPressure(data);
    case PressureType.BOKOOPRESSURE:
      return new BookooPressure(data);
    default:
      return null;
  }
}

export function makeTemperatureDevice(
  type: TemperatureType,
  data: PeripheralData,
): TemperatureDevice | null {
  switch (type) {
    case TemperatureType.ETI:
      return new ETITemperature(data);
    case TemperatureType.BASICGRILL:
      return new BasicGrillThermometer(data);
    case TemperatureType.MEATER:
      return new MeaterThermometer(data);
    case TemperatureType.COMBUSTION:
      return new CombustionThermometer(data);
    case TemperatureType.ARGOS:
      return new ArgosThermometer(data);
    case TemperatureType.GEISINGER:
      return new GeisingerThermometer(data);
    default:
      return null;
  }
}

export function makeRefractometerDevice(
  type: RefractometerType,
  data: PeripheralData,
): RefractometerDevice | null {
  if (type === RefractometerType.R2) return new DiFluidR2Refractometer(data);
  return null;
}
