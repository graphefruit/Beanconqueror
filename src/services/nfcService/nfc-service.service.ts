import { inject, Service } from '@angular/core';

import { Platform } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';
import { Observable, Subject } from 'rxjs';

import { IntentHandlerService } from '../intentHandler/intent-handler.service';
import { UIAlert } from '../uiAlert';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UIToast } from '../uiToast';
import { appLinkFromNdefMessage, INdefRecord } from './nfc-tag-link';

/**https://github.com/EYALIN/community-cordova-plugin-nfc**/
/** The plugin only clobbers NfcPlugin globally (not nfc/ndef). Use NfcPlugin.**/
declare var NfcPlugin;

/** An event of the NFC plugin; see www/phonegap-nfc.js. */
interface INfcEvent {
  tag?: { ndefMessage?: INdefRecord[] };
  launch?: boolean;
}

@Service()
export class NfcService {
  private readonly platform = inject(Platform);
  private readonly uiAlert = inject(UIAlert);
  private readonly intentHandler = inject(IntentHandlerService);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiToast = inject(UIToast);
  private readonly uiLog = inject(UILog);

  private didAndroidAttachToListener: boolean = false;

  private nfcEnabled: boolean = false;

  private androidMessageSubject = new Subject<any>();

  constructor() {
    if (this.platform.is('capacitor')) {
      this.uiHelper.isBeanconqurorAppReady().then(async () => {
        if (this.platform.is('android')) {
          this.nfcEnabled = await this.getEnabledState();
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

  private async getEnabledState(): Promise<boolean> {
    const enabled: boolean = await new Promise((resolve, _reject) => {
      NfcPlugin.enabled(
        () => {
          resolve(true);
        },
        (_error) => {
          resolve(false);
        },
      );
    });
    return enabled;
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
        // Async Await
        try {
          let tag = await NfcPlugin.scanTag();
          this.__handleNFCData(tag);
        } catch (ex) {
          this.uiLog.error("We couldn't read NFC-Tag: " + ex.message);
          //console.log(err);
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

  public attachOnNFCAndroid(): Observable<any> {
    return this.androidMessageSubject.asObservable();
  }

  private listenToNFCAndroid() {
    /**The issue with the plugin is that we can deattach but if we reattach the old handling instance is still given, therefore we make our own implemenntation logic, just attach once, and toggle.**/
    if (this.didAndroidAttachToListener === false) {
      NfcPlugin.addNdefListener(
        (_data: INfcEvent) => {
          // The plugin hands the tag that started the app to the first listener, marked as launch.
          if (_data.launch) {
            this.__handleNFCData(_data.tag);
          } else {
            this.androidMessageSubject.next({ tag: _data.tag });
          }
        },
        () => {
          this.didAndroidAttachToListener = true;
        },
        () => {
          this.didAndroidAttachToListener = false;
        },
      );
      // Tags of our NDEF_DISCOVERED filter (AndroidManifest) while the app is in the background.
      document.addEventListener('ndef-mime', (_event: Event & INfcEvent) => {
        if (!_event.launch) {
          this.__handleNFCData(_event.tag);
        }
      });
    }
  }
  private __handleNFCData(_tag: INfcEvent['tag']) {
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
          this.__writeInternal(_link);
          nfcReadSubscription.unsubscribe();
        },
      );
    } else {
      this.__writeInternal(_link);
    }
  }
  private __writeInternal(_link: string) {
    const record = [NfcPlugin.NdefPlugin.uriRecord(_link)];
    NfcPlugin.write(
      record,
      (success) => {
        this.uiLog.log('NFC tag written');
        if (this.platform.is('android')) {
          this.uiAlert.showMessage(
            'NFC.WRITE_COMPLETED_DESCRIPTION',
            'NFC.WRITE_COMPLETED_TITLE',
            'OK',
            true,
          );
        }
      },
      (error) => {
        this.uiLog.log('NFC tag not written');
        if (this.platform.is('android')) {
          this.uiAlert.showMessage(
            'NFC.WRITE_UNCOMPLETED_DESCRIPTION',
            'NFC.WRITE_UNCOMPLETED_TITLE',
            'OK',
            true,
          );
        }
      },
    );
  }
}
