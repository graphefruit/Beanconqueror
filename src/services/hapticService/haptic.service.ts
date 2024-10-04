import { Injectable } from '@angular/core';
import { Haptics } from '@capacitor/haptics';

@Injectable({
  providedIn: 'root',
})
export class HapticService {
  constructor() {}

  public vibrate(): Promise<void> {
    return Haptics.vibrate({ duration: 1000 });
  }
}
