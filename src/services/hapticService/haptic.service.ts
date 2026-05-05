import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class HapticService {
  constructor() {}

  public async vibrate(): Promise<void> {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(1000);
    }
  }
}
