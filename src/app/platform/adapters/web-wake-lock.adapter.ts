import { Injectable } from '@angular/core';
import { WakeLockPort } from '../ports/wake-lock.port';

@Injectable()
export class WebWakeLockAdapter implements WakeLockPort {
  async keepAwake(): Promise<void> {}
  async allowSleep(): Promise<void> {}
}
