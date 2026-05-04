import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { ScaleConnectionPort } from '../ports/scale-connection.port';

@Injectable()
export class CapacitorScaleConnectionAdapter implements ScaleConnectionPort {
  isNativePlatform(): boolean { return Capacitor.isNativePlatform(); }
  isAndroid(): boolean { return Capacitor.getPlatform() === 'android'; }
  isIos(): boolean { return Capacitor.getPlatform() === 'ios'; }
}
