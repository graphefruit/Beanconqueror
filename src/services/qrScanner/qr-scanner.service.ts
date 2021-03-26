import { Injectable } from '@angular/core';

import {UILog} from '../uiLog';
import {TranslateService} from '@ngx-translate/core';
import {Observable} from 'rxjs';

declare var cordova;
@Injectable({
  providedIn: 'root'
})
export class QrScannerService {



  constructor(private readonly uiLog: UILog,
              private readonly translate: TranslateService) {

  }


             public scan(): Promise<string> {

               const observable:Observable<string> = new Observable((subscriber) => {
                 cordova.plugins.barcodeScanner.scan(
                   (result) => {

                     if (result.cancelled === 0 && result.format === 'QR_CODE') {
                       subscriber.next(result.text as string);
                       subscriber.complete();
                     }
                      else {
                       subscriber.error();
                     }

                   },
                   (error)  => {
                     subscriber.error();
                   },
                   {
                     preferFrontCamera : false, // iOS and Android
                     showFlipCameraButton : false, // iOS and Android
                     showTorchButton : false, // iOS and Android
                     torchOn: false, // Android, launch with the torch switched on (if available)
                     saveHistory: false, // Android, save scan history (default false)
                     prompt : this.translate.instant('CHOOSE'), // Android
                     resultDisplayDuration: 0, // Android, display scanned text for X ms. 0 suppresses it entirely, default 1500
                     formats : 'QR_CODE', // default: all but PDF_417 and RSS_EXPANDED
                     disableAnimations : true, // iOS
                     disableSuccessBeep: false, // iOS and Android
                     continuousMode: false // Android
                   }
                 );
               });
               return observable.toPromise();

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
