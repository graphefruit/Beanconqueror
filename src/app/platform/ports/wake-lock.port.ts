import { InjectionToken } from '@angular/core';

export interface WakeLockPort {
  keepAwake(): Promise<void>;
  allowSleep(): Promise<void>;
}

export const WAKE_LOCK_PORT = new InjectionToken<WakeLockPort>('WAKE_LOCK_PORT');
