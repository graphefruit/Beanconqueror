import {Injectable} from '@angular/core';

import {UILog} from '../uiLog';
import {TranslateService} from '@ngx-translate/core';
import {Observable} from 'rxjs';
import {UIAnalytics} from '../uiAnalytics';
import QR_TRACKING from '../../data/tracking/qrTracking';
import {UISettingsStorage} from '../uiSettingsStorage';
import {ModalController, Platform} from '@ionic/angular';
import {QrCodeScannerPopoverComponent} from '../../popover/qr-code-scanner-popover/qr-code-scanner-popover.component';

declare var cordova;

@Injectable({
  providedIn: 'root'
})
export class QrScannerService {

  private disableHardwareBack;
  constructor (private readonly uiLog: UILog,
               private readonly translate: TranslateService,
               private readonly uiAnalytics: UIAnalytics,
               private readonly uiSettingsStorage: UISettingsStorage,
               private readonly modalController: ModalController,
               private readonly platform: Platform) {

  }

  public async __checkQRCodeScannerInformationPage () {

    const settings = this.uiSettingsStorage.getSettings();
    const qr_scanner_information: boolean = settings.qr_scanner_information;
    if (qr_scanner_information === false) {
      const modal = await this.modalController.create({
        component: QrCodeScannerPopoverComponent,
        id: QrCodeScannerPopoverComponent.POPOVER_ID
      });
      await modal.present();
      await modal.onWillDismiss();
    }
  }

  public async scan (): Promise<string> {
    await this.__checkQRCodeScannerInformationPage();

    try {
      this.disableHardwareBack = this.platform.backButton.subscribeWithPriority(9999, (processNextHandler) => {
        // Don't do anything.
      });
    } catch (ex) {

    }
    const observable: Observable<string> = new Observable((subscriber) => {
      cordova.plugins.barcodeScanner.scan(
        (result) => {
          this.activateHardwareBackButton();
          if ((result.cancelled === false || result.cancelled === 0)) {
            this.uiAnalytics.trackEvent(QR_TRACKING.TITLE, QR_TRACKING.ACTIONS.SCANNED_LINK.CATEGORY, QR_TRACKING.ACTIONS.SCANNED_LINK.DATA.LINK, result.text as string);
          }

          if ((result.cancelled === false || result.cancelled === 0) && result.format === 'QR_CODE') {
            subscriber.next(result.text as string);
            subscriber.complete();
          } else {
            subscriber.error();
          }

        },
        (error) => {
          this.activateHardwareBackButton();
          subscriber.error();
        },
        {
          preferFrontCamera: false, // iOS and Android
          showFlipCameraButton: false, // iOS and Android
          showTorchButton: false, // iOS and Android
          torchOn: false, // Android, launch with the torch switched on (if available)
          saveHistory: false, // Android, save scan history (default false)
          prompt: this.translate.instant('CHOOSE'), // Android
          resultDisplayDuration: 0, // Android, display scanned text for X ms. 0 suppresses it entirely, default 1500
          formats: 'QR_CODE', // default: all but PDF_417 and RSS_EXPANDED
          disableAnimations: true, // iOS
          disableSuccessBeep: false, // iOS and Android
          continuousMode: false // Android
        }
      );
    });
    return observable.toPromise();

  }
  private activateHardwareBackButton() {
    try{
      // If we don't set a timeout the closing with back button, would also minimize app, thats why we need to skip the signal for 1 second
      setTimeout(() => {
        this.disableHardwareBack.unsubscribe();
      },1000);

    } catch(ex) {

    }
  }

  /*
    private async isAuthenticated(): Promise<boolean> {
      const observable: Observable<boolean> = new Observable((subscriber) => {
        this.qrScanner.prepare().then((status: QRScannerStatus) => {
          if (status.authorized) {
            subscriber.next(true);
            subscriber.complete();
          } else if (status.denied) {
            // camera permission was permanently denied
            // you must use QRScanner.openSettings() method to guide the user to the settings page
            // then they can grant the permission from there
            this.qrScanner.openSettings();
            subscriber.error();
          } else {
            // permission was denied, but not permanently. You can ask for permission again at a later time.
            subscriber.error();
          }
        }).catch((e: any) => {
          subscriber.error();
        });

      });
      return observable.toPromise();
    }
    public async scan(): Promise<string> {
      const observable:Observable<string> = new Observable((subscriber) => {
          this.isAuthenticated().then(() => {
          const scanSub = this.qrScanner.scan().subscribe(async (text: string) => {

            await this.qrScanner.hide(); // hide camera preview
            scanSub.unsubscribe(); // stop scanning

            subscriber.next(text as string);
            subscriber.complete();
            this.uiLog.log(`Scanned: ${text}`);
            alert(text);

          });
        }, () => {
            subscriber.error();

        });
      });
      return observable.toPromise();
    }
  */

}
