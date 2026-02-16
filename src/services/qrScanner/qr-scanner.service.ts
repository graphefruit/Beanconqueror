import { inject, Injectable } from '@angular/core';

import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerTypeHint,
} from '@capacitor/barcode-scanner';

import QR_TRACKING from '../../data/tracking/qrTracking';
import { UIAnalytics } from '../uiAnalytics';

@Injectable({
  providedIn: 'root',
})
export class QrScannerService {
  private readonly uiAnalytics = inject(UIAnalytics);

  public async scan(): Promise<string> {
    const scanResult = await CapacitorBarcodeScanner.scanBarcode({
      hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
      cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
    });
    this.uiAnalytics.trackEvent(
      QR_TRACKING.TITLE,
      QR_TRACKING.ACTIONS.SCANNED_LINK.CATEGORY,
      scanResult.ScanResult,
    );
    return scanResult.ScanResult;
  }
}
