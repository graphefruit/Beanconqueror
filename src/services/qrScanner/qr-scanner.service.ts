import { Injectable, inject } from '@angular/core';

import { UIAnalytics } from '../uiAnalytics';
import QR_TRACKING from '../../data/tracking/qrTracking';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerTypeHint,
} from '@capacitor/barcode-scanner';

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
