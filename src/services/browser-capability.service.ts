import { Injectable } from '@angular/core';

export interface BrowserCapabilities {
  isWeb: boolean;
  camera: boolean;
  bluetooth: boolean;
  nfc: boolean;
  geolocation: boolean;
  share: boolean;
  fileSystemAccess: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class BrowserCapabilityService {
  public getCapabilities(): BrowserCapabilities {
    if (typeof window === 'undefined') {
      return {
        isWeb: false,
        camera: false,
        bluetooth: false,
        nfc: false,
        geolocation: false,
        share: false,
        fileSystemAccess: false,
      };
    }

    const nav = window.navigator as any;
    return {
      isWeb: true,
      camera: !!(nav.mediaDevices && nav.mediaDevices.getUserMedia),
      bluetooth: !!nav.bluetooth,
      nfc: !!nav.NDEFReader,
      geolocation: !!nav.geolocation,
      share: typeof nav.share === 'function',
      fileSystemAccess: !!window.showOpenFilePicker,
    };
  }
}
