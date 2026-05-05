import { Injectable } from '@angular/core';
import { ScaleConnectionPort } from '../ports/scale-connection.port';

@Injectable()
export class WebScaleConnectionAdapter implements ScaleConnectionPort {
  isNativePlatform(): boolean { return false; }
  isAndroid(): boolean { return false; }
  isIos(): boolean { return false; }
}
