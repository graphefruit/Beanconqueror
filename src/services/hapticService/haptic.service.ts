import { Service } from '@angular/core';

import { Haptics } from '@capacitor/haptics';

@Service()
export class HapticService {
  constructor() {}

  public vibrate(): Promise<void> {
    return Haptics.vibrate({ duration: 1000 });
  }
}
