import { XeniaDevice } from './xenia/xeniaDevice';
import { PreparationDevice } from './preparationDevice';
import { HttpClient } from '@angular/common/http';
import { Preparation } from '../preparation/preparation';
import { MeticulousDevice } from './meticulous/meticulousDevice';

export enum PreparationDeviceType {
  NONE = 'NONE',
  XENIA = 'XENIA',
  METICULOUS = 'METICULOUS',
}

export function makePreparationDevice(
  _type: PreparationDeviceType,
  _http: HttpClient,
  _preparation: Preparation
): PreparationDevice | null {
  switch (_type) {
    case PreparationDeviceType.XENIA:
      return new XeniaDevice(_http, _preparation);
    case PreparationDeviceType.METICULOUS:
      return new MeticulousDevice(_http, _preparation);
    default:
      return null;
  }
}
