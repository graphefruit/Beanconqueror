import { InjectionToken } from '@angular/core';

export interface ScaleConnectionPort {
  isNativePlatform(): boolean;
  isAndroid(): boolean;
  isIos(): boolean;
}

export const SCALE_CONNECTION_PORT = new InjectionToken<ScaleConnectionPort>('SCALE_CONNECTION_PORT');
