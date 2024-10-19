import { Component, Input, OnInit } from '@angular/core';
import { Settings } from '../../../classes/settings/settings';
import { Bean } from '../../../classes/bean/bean';
import { ModalController } from '@ionic/angular';

import QRCode from 'qrcode';
import { environment } from '../../../environments/environment';
import { ShareService } from '../../../services/shareService/share-service.service';
import { UIHelper } from '../../../services/uiHelper';
import { UIAlert } from '../../../services/uiAlert';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UILog } from '../../../services/uiLog';
import { BEAN_CODE_ACTION } from '../../../enums/beans/beanCodeAction';
import { NfcService } from '../../../services/nfcService/nfc-service.service';

@Component({
  selector: 'app-bean-internal-share-code-generator.',
  templateUrl: './bean-internal-share-code-generator.component.html',
  styleUrls: ['./bean-internal-share-code-generator.component.scss'],
})
export class BeanInternalShareCodeGeneratorComponent implements OnInit {
  public static COMPONENT_ID = 'bean-internal-share-code-generator-popover';
  public settings: Settings;
  @Input() public bean: Bean;

  public imageSrc: string;

  public action: BEAN_CODE_ACTION = BEAN_CODE_ACTION.START_BREW;

  public qrData: string = '';
  constructor(
    private readonly modalController: ModalController,
    private shareService: ShareService,
    private readonly uiHelper: UIHelper,
    private readonly uiAlert: UIAlert,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiLog: UILog,
    private readonly nfcService: NfcService
  ) {}

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
          (b) => b.internal_share_code === newShareCode
        );
        if (indexFound === -1) {
          this.uiLog.log(
            'Generate QR Code - ' + newShareCode + ' - code not used yet.'
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
    this.nfcService.writeNFCData(this.qrData);
  }

  public copyNotesToClipboard() {
    this.uiHelper.copyToClipboard(this.qrData);
  }

  public async dismiss(): Promise<void> {
    this.modalController.dismiss(
      undefined,
      undefined,
      BeanInternalShareCodeGeneratorComponent.COMPONENT_ID
    );
  }

  protected readonly BEAN_CODE_ACTION = BEAN_CODE_ACTION;
}
