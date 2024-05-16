import { Injectable } from '@angular/core';

declare var navigator;
@Injectable({
  providedIn: 'root',
})
export class HapticService {
  constructor() {}

  public vibrate() {
    try {
      navigator.vibrate(1000);
    } catch (ex) {}
  }
}
