import { Component, Input, OnInit, inject } from '@angular/core';
import { Settings } from '../../../classes/settings/settings';
import { Bean } from '../../../classes/bean/bean';
import { ModalController } from '@ionic/angular/standalone';

import QRCode from 'qrcode';
import { environment } from '../../../environments/environment';
import { ShareService } from '../../../services/shareService/share-service.service';
import { UIHelper } from '../../../services/uiHelper';
import { UIAlert } from '../../../services/uiAlert';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UILog } from '../../../services/uiLog';
import { BEAN_CODE_ACTION } from '../../../enums/beans/beanCodeAction';
import { NfcService } from '../../../services/nfcService/nfc-service.service';
import BEAN_TRACKING from '../../../data/tracking/beanTracking';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { download, clipboardOutline } from 'ionicons/icons';
import {
  IonHeader,
  IonContent,
  IonCard,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonLabel,
  IonButton,
  IonIcon,
  IonFooter,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-bean-internal-share-code-generator.',
  templateUrl: './bean-internal-share-code-generator.component.html',
  styleUrls: ['./bean-internal-share-code-generator.component.scss'],
  imports: [
    FormsModule,
    TranslatePipe,
    IonHeader,
    IonContent,
    IonCard,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonLabel,
    IonButton,
    IonIcon,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class BeanInternalShareCodeGeneratorComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private shareService = inject(ShareService);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiLog = inject(UILog);
  private readonly nfcService = inject(NfcService);
  private readonly uiAnalytics = inject(UIAnalytics);

  public static COMPONENT_ID = 'bean-internal-share-code-generator-popover';
  public settings: Settings;
  @Input() public bean: Bean;

  public imageSrc: string;

  public action: BEAN_CODE_ACTION = BEAN_CODE_ACTION.START_BREW;

  public qrData: string = '';
  constructor() {
    addIcons({ download, clipboardOutline });
  }

  ngOnInit() {}
  public ionViewDidEnter(): void {
    if (this.bean) {
      this.generateQRCode();
    }
  }

  public async generateQRCode() {
    await this.uiAlert.showLoadingSpinner();
    let newShareCode = '';

    if (!this.bean.internal_share_code) {
      const allBeanEntries = this.uiBeanStorage.getAllEntries();
      while (true) {
        newShareCode = this.uiHelper.generateShortUUID().toUpperCase();
        const indexFound = allBeanEntries.findIndex(
          (b) => b.internal_share_code === newShareCode,
        );
        if (indexFound === -1) {
          this.uiLog.log(
            'Generate QR Code - ' + newShareCode + ' - code not used yet.',
          );
          /** This id isn't used yet**/
          break;
        } else {
          /** Goto into a next round find a new unique id**/
        }
      }

      this.bean.internal_share_code = newShareCode;
      await this.uiBeanStorage.update(this.bean);
    } else {
      newShareCode = this.bean.internal_share_code;
    }

    await this.uiAlert.hideLoadingSpinner();

    this.qrData =
      environment.INTERNAL_CALLER +
      'int/bean/' +
      newShareCode +
      '/' +
      this.action;
    QRCode.toDataURL(this.qrData, { errorCorrectionLevel: 'L' })
      .then((url) => {
        this.imageSrc = url;
      })
      .catch((err) => {});
  }

  public download() {
    this.shareService.shareImage(this.imageSrc);
  }
  public writeNFC() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.NFC_WRITE,
    );
    this.nfcService.writeNFCData(this.qrData);
  }

  public copyNotesToClipboard() {
    this.uiHelper.copyToClipboard(this.qrData);
  }

  public async dismiss(): Promise<void> {
    this.modalController.dismiss(
      undefined,
      undefined,
      BeanInternalShareCodeGeneratorComponent.COMPONENT_ID,
    );
  }

  protected readonly BEAN_CODE_ACTION = BEAN_CODE_ACTION;
}
