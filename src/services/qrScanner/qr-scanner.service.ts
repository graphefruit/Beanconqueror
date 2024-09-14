import { Injectable } from '@angular/core';

import { UILog } from '../uiLog';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { UIAnalytics } from '../uiAnalytics';
import QR_TRACKING from '../../data/tracking/qrTracking';
import { UISettingsStorage } from '../uiSettingsStorage';
import { ModalController, Platform } from '@ionic/angular';
import { UIAlert } from '../uiAlert';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerTypeHint,
  CapacitorBarcodeScannerTypeHintALLOption,
} from '@capacitor/barcode-scanner';

@Injectable({
  providedIn: 'root',
})
export class QrScannerService {
  constructor(
    private readonly uiLog: UILog,
    private readonly translate: TranslateService,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly modalController: ModalController,
    private readonly platform: Platform,
    private readonly uiAlert: UIAlert
  ) {}

  public async scan(): Promise<string> {
    // TODO Capacitor migration: Loading spinner handling
    // TODO Capacitor migration: Hardware back button handling
    const scanResult = await CapacitorBarcodeScanner.scanBarcode({
      hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
      // TODO Capacitor migration: QR code scanner options
    });
    // TODO Capacitor migration: QR code error handling
    this.uiAnalytics.trackEvent(
      QR_TRACKING.TITLE,
      QR_TRACKING.ACTIONS.SCANNED_LINK.CATEGORY,
      scanResult.ScanResult
    );
    return scanResult.ScanResult;
  }
}
