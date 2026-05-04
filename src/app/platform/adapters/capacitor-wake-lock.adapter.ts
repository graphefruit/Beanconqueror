import { Injectable } from '@angular/core';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { WakeLockPort } from '../ports/wake-lock.port';

@Injectable()
export class CapacitorWakeLockAdapter implements WakeLockPort {
  async keepAwake(): Promise<void> { await KeepAwake.keepAwake(); }
  async allowSleep(): Promise<void> { await KeepAwake.allowSleep(); }
}
