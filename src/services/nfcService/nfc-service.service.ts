import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { UIAlert } from '../uiAlert';
import { TranslateService } from '@ngx-translate/core';
import { IntentHandlerService } from '../intentHandler/intent-handler.service';
import { UILog } from '../uiLog';
import { Observable, Subject } from 'rxjs';
import { UIHelper } from '../uiHelper';
import { UIToast } from '../uiToast';

/**https://github.com/EYALIN/community-cordova-plugin-nfc**/
declare var nfc;
declare var ndef;
@Injectable({
  providedIn: 'root',
})
export class NfcService {
  private didAndroidAttachToListener: boolean = false;

  private nfcEnabled: boolean = false;

  private androidMessageSubject = new Subject<any>();

  constructor(
    private readonly platform: Platform,
    private readonly uiAlert: UIAlert,
    private readonly intentHandler: IntentHandlerService,
    private readonly uiHelper: UIHelper,
    private readonly uiToast: UIToast
  ) {
    if (this.platform.is('capacitor')) {
      this.uiHelper.isBeanconqurorAppReady().then(async () => {
        this.nfcEnabled = await this.getEnabledState();
        if (this.isNFCEnabled) {
          this.listenToNFCAndroid();
        }
      });
    }
  }

  public isNFCEnabled() {
    return this.nfcEnabled;
  }

  private async getEnabledState(): Promise<boolean> {
    const enabled: boolean = await new Promise((resolve, _reject) => {
      nfc.enabled(
        () => {
          resolve(true);
        },
        (_error) => {
          resolve(false);
        }
      );
    });
    return enabled;
  }

  public async readNFCTag() {
    if (this.isNFCEnabled()) {
      if (this.platform.is('android')) {
        this.uiToast.showInfoToastBottom(
          'NFC.SCAN_IN_PROGRESS_PLEASE_HOLD_YOUR_TAG_TO_READER'
        );
        const nfcReadSubscription = this.attachOnNFCAndroid().subscribe(
          (_data) => {
            this.__handleNFCData(_data.tag);
            nfcReadSubscription.unsubscribe();
          }
        );
      } else {
        //IOS
        // Async Await
        try {
          let tag = await nfc.scanTag();
          this.__handleNFCData(tag);
        } catch (err) {
          //console.log(err);
        }
      }
    } else {
      this.uiAlert.showMessage(
        'NFC.PLEASE_ENABLED_NFC_DESCRIPTION',
        'CARE',
        'OK',
        true
      );
    }
  }

  public attachOnNFCAndroid(): Observable<any> {
    return this.androidMessageSubject.asObservable();
  }

  private listenToNFCAndroid() {
    /**The issue with the plugin is that we can deattach but if we reattach the old handling instance is still given, therefore we make our own implemenntation logic, just attach once, and toggle.**/
    if (this.didAndroidAttachToListener === false) {
      nfc.addNdefListener(
        (_data) => {
          this.androidMessageSubject.next({ tag: _data.tag });
        },
        () => {
          this.didAndroidAttachToListener = true;
        },
        () => {
          this.didAndroidAttachToListener = false;
        }
      );
    }
  }
  private __handleNFCData(_tag) {
    if (_tag) {
      let data = ndef.textHelper.decodePayload(_tag.ndefMessage[0].payload);
      /**We dont use bytes to string because somehow ascis came into play
      let data = nfc.bytesToString(_tag.ndefMessage[0].payload)**/
      this.intentHandler.handleDeepLink(data);
    }
  }

  public writeNFCData(_text: string) {
    if (this.platform.is('android')) {
      this.uiToast.showInfoToastBottom(
        'NFC.SCAN_IN_PROGRESS_PLEASE_HOLD_YOUR_TAG_TO_READER'
      );
      const nfcReadSubscription = this.attachOnNFCAndroid().subscribe(
        (_data) => {
          this.__writeInternal(_text);
          nfcReadSubscription.unsubscribe();
        }
      );
    } else {
      this.__writeInternal(_text);
    }
  }
  private __writeInternal(_text: string) {
    let record = [ndef.textRecord(_text)];
    nfc.write(
      record,
      (success) => {
        if (this.platform.is('android')) {
          this.uiAlert.showMessage(
            'NFC.WRITE_COMPLETED_DESCRIPTION',
            'NFC.WRITE_COMPLETED_TITLE',
            'OK',
            true
          );
        }
      },
      (error) => {
        if (this.platform.is('android')) {
          this.uiAlert.showMessage(
            'NFC.WRITE_UNCOMPLETED_DESCRIPTION',
            'NFC.WRITE_UNCOMPLETED_TITLE',
            'OK',
            true
          );
        }
      }
    );
  }
}
