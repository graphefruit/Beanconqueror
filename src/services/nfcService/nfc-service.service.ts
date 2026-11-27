import { inject, Service } from '@angular/core';

import { Platform } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';
import { Observable, Subject } from 'rxjs';

import { IntentHandlerService } from '../intentHandler/intent-handler.service';
import { NFC_PORT, NfcTag } from '../ports/nfc-port';
import { UIAlert } from '../uiAlert';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UIToast } from '../uiToast';
import { appLinkFromNdefMessage } from './nfc-tag-link';

@Service()
export class NfcService {
  private readonly platform = inject(Platform);
  private readonly uiAlert = inject(UIAlert);
  private readonly intentHandler = inject(IntentHandlerService);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiToast = inject(UIToast);
  private readonly uiLog = inject(UILog);
  private readonly nfc = inject(NFC_PORT);

  private nfcEnabled: boolean = false;

  /** Tags held to the reader while the app is open. */
  private androidMessageSubject = new Subject<{ tag?: NfcTag }>();

  constructor() {
    if (this.platform.is('capacitor')) {
      this.uiHelper.isBeanconqurorAppReady().then(async () => {
        if (this.platform.is('android')) {
          this.nfcEnabled = await this.nfc.isEnabled();
          if (this.nfcEnabled) {
            this.listenToNFCAndroid();
          }
        } else {
          this.nfcEnabled = true;
        }
      });
    }
  }

  public isNFCEnabled() {
    return this.nfcEnabled;
  }

  public async readNFCTag() {
    if (this.isNFCEnabled()) {
      if (this.platform.is('android')) {
        this.uiToast.showInfoToastBottom(
          'NFC.SCAN_IN_PROGRESS_PLEASE_HOLD_YOUR_TAG_TO_READER',
        );
        const nfcReadSubscription = this.attachOnNFCAndroid().subscribe(
          (_data) => {
            this.__handleNFCData(_data.tag);
            nfcReadSubscription.unsubscribe();
          },
        );
      } else {
        //IOS
        const scan = await this.nfc.scanTag();
        // Without strictNullChecks only a comparison narrows the result.
        if (scan.ok === false) {
          this.uiLog.error("We couldn't read NFC-Tag: " + scan.error);
        } else {
          this.__handleNFCData(scan.value);
        }
      }
    } else {
      this.uiAlert.showMessage(
        'NFC.PLEASE_ENABLED_NFC_DESCRIPTION',
        'CARE',
        'OK',
        true,
      );
    }
  }

  public attachOnNFCAndroid(): Observable<{ tag?: NfcTag }> {
    return this.androidMessageSubject.asObservable();
  }

  private listenToNFCAndroid() {
    this.nfc.listen((_event) => {
      if (_event.opensApp) {
        this.__handleNFCData(_event.tag);
      } else {
        this.androidMessageSubject.next({ tag: _event.tag });
      }
    });
  }
  private __handleNFCData(_tag: NfcTag | undefined) {
    // The tag carries its serial number; its link is logged when it is opened.
    this.uiLog.log('We read NFC-Tag');
    const link = appLinkFromNdefMessage(_tag?.ndefMessage);
    if (link) {
      this.intentHandler.handleDeepLink(link);
    } else {
      this.uiLog.error('No Beanconqueror link found on NFC-Tag');
      void this.uiAlert.showMessage(
        'NFC.TAG_WITHOUT_APP_LINK_DESCRIPTION',
        'NFC.TAG_WITHOUT_APP_LINK_TITLE',
        'OK',
        true,
      );
    }
  }

  /** Writes a tag link (see nfcTagLink) as a URI record. */
  public writeNFCData(_link: string) {
    if (this.platform.is('android')) {
      this.uiToast.showInfoToastBottom(
        'NFC.SCAN_IN_PROGRESS_PLEASE_HOLD_YOUR_TAG_TO_READER',
      );
      const nfcReadSubscription = this.attachOnNFCAndroid().subscribe(
        (_data) => {
          void this.__writeInternal(_link);
          nfcReadSubscription.unsubscribe();
        },
      );
    } else {
      void this.__writeInternal(_link);
    }
  }
  private async __writeInternal(_link: string) {
    const written = await this.nfc.writeUri(_link);
    this.uiLog.log(written.ok ? 'NFC tag written' : 'NFC tag not written');
    if (this.platform.is('android')) {
      void this.uiAlert.showMessage(
        written.ok
          ? 'NFC.WRITE_COMPLETED_DESCRIPTION'
          : 'NFC.WRITE_UNCOMPLETED_DESCRIPTION',
        written.ok
          ? 'NFC.WRITE_COMPLETED_TITLE'
          : 'NFC.WRITE_UNCOMPLETED_TITLE',
        'OK',
        true,
      );
    }
  }
}
