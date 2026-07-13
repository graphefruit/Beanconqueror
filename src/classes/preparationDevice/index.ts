import { HttpClient } from '@angular/common/http';

import { Preparation } from '../preparation/preparation';
import { GaggiuinoDevice } from './gaggiuino/gaggiuinoDevice';
import { MeticulousDevice } from './meticulous/meticulousDevice';
import { Move2Device } from './move2/move2Device';
import { PreparationDevice } from './preparationDevice';
import { SanremoYOUDevice } from './sanremo/sanremoYOUDevice';
import { XeniaDevice } from './xenia/xeniaDevice';

export enum PreparationDeviceType {
  NONE = 'NONE',
  XENIA = 'XENIA',
  METICULOUS = 'METICULOUS',
  SANREMO_YOU = 'SANREMO_YOU',
  GAGGIUINO = 'GAGGIUINO',
  MOVE2 = 'MOVE2',
}

export function makePreparationDevice(
  _type: PreparationDeviceType,
  _http: HttpClient,
  _preparation: Preparation,
): PreparationDevice | null {
  switch (_type) {
    case PreparationDeviceType.XENIA:
      return new XeniaDevice(_http, _preparation);
    case PreparationDeviceType.METICULOUS:
      return new MeticulousDevice(_http, _preparation);
    case PreparationDeviceType.SANREMO_YOU:
      return new SanremoYOUDevice(_http, _preparation);
    case PreparationDeviceType.MOVE2:
      return new Move2Device(_http, _preparation);
    case PreparationDeviceType.GAGGIUINO:
      return new GaggiuinoDevice(_http, _preparation);
    default:
      return null;
  }
}
