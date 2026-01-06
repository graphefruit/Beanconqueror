import { Component, Input, OnInit } from '@angular/core';
import { ModalController, IonicModule } from '@ionic/angular';
import { Bean } from '../../../classes/bean/bean';
import { UIHelper } from '../../../services/uiHelper';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIToast } from '../../../services/uiToast';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIAlert } from '../../../services/uiAlert';
import moment from 'moment';
import { Config } from '../../../classes/objectConfig/objectConfig';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-bean-popover-unfreeze',
  templateUrl: './bean-popover-unfreeze.component.html',
  styleUrls: ['./bean-popover-unfreeze.component.scss'],
  imports: [IonicModule, FormsModule, TranslatePipe],
})
export class BeanPopoverUnfreezeComponent implements OnInit {
  public static COMPONENT_ID = 'bean-popover-unfreeze';
  @Input() public bean: Bean;

  public unfreezeWeight: number;
  public maxWeight: number;
  public settings: Settings;
  public copyAttachments: boolean = false;
  public quality: number = 100;
  public maxMB: number = 0.5;

  constructor(
    private readonly modalController: ModalController,
    public readonly uiHelper: UIHelper,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiToast: UIToast,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiFileHelper: UIFileHelper,
    private readonly uiAlert: UIAlert,
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public ngOnInit() {
    this.maxWeight = this.bean.weight;
    this.unfreezeWeight = this.maxWeight;
  }

  public async dismiss(): Promise<void> {
    this.modalController.dismiss(
      undefined,
      undefined,
      BeanPopoverUnfreezeComponent.COMPONENT_ID,
    );
  }

  public pinFormatter(value: number) {
    return `${value}`;
  }

  public pinFormatterMB(value: any) {
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return `${0}`;
    }
    const newValue = +parsedFloat.toFixed(2);
    return `${newValue}`;
  }

  private async saveBase64Photo(base64: string): Promise<string> {
    let ending = '.jpg';
    if (base64.indexOf('data:image/png;base64,') > -1) {
      ending = '.png';
    }
    const fileName = await this.uiFileHelper.generateInternalPath(
      'photo',
      ending,
    );
    const fileUri = await this.uiFileHelper.writeInternalFileFromBase64(
      base64,
      fileName,
    );
    return fileUri.path;
  }

  public async save() {
    if (this.unfreezeWeight <= 0 || this.unfreezeWeight > this.maxWeight) {
      return;
    }

    if (this.unfreezeWeight === this.maxWeight) {
      // Unfreeze whole bag
      this.bean.unfrozenDate = moment(new Date()).toISOString();
      await this.uiBeanStorage.update(this.bean);
      this.uiToast.showInfoToast('TOAST_BEAN_UNFROZEN_SUCCESSFULLY');
    } else {
      await this.uiAlert.showLoadingSpinner();
      // Partial unfreeze
      if (!this.bean.frozenGroupId) {
        this.bean.frozenGroupId = crypto.randomUUID();
        // Update the original bean immediately so the ID is persisted
        await this.uiBeanStorage.update(this.bean);
      }

      const newBean: Bean = this.uiHelper.cloneData(this.bean);

      // Update new bean properties
      newBean.frozenId = this.uiBeanHelper.generateFrozenId();
      newBean.unfrozenDate = moment(new Date()).toISOString();
      newBean.attachments = [];
      // It retains frozenDate, frozenGroupId from the clone

      newBean.weight = this.uiHelper.toFixedIfNecessary(this.unfreezeWeight, 1);

      // Calculate cost for the new bean
      if (this.bean.cost && this.bean.weight > 0) {
        newBean.cost = this.uiHelper.toFixedIfNecessary(
          (this.bean.cost / this.bean.weight) * newBean.weight,
          2,
        );
      } else {
        newBean.cost = 0;
      }

      // Copy attachments logic
      if (
        this.copyAttachments &&
        this.bean.attachments &&
        this.bean.attachments.length > 0
      ) {
        const copyAttachmentsBase64: Array<string> = [];
        for await (let attachment of this.bean.attachments) {
          try {
            const filePath = attachment;
            if (filePath) {
              // Read the attachment file as base64 string for later copying
              let fileBase64 =
                await this.uiFileHelper.readInternalFileAsBase64(filePath);
              let type = 'image/jpeg';
              if (filePath.indexOf('.png') > -1) {
                // If the file is a jpg, we need to convert it to a png
                type = 'image/png';
              }
              fileBase64 = 'data:' + type + ';base64,' + fileBase64;

              await new Promise(async (resolve) => {
                const img = new Image();
                const maxSizeInMB = this.maxMB;
                const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  const width = img.width;
                  const height = img.height;
                  const aspectRatio = width / height;
                  const newWidth = Math.sqrt(maxSizeInBytes * aspectRatio);
                  const newHeight = Math.sqrt(maxSizeInBytes / aspectRatio);
                  canvas.width = newWidth;
                  canvas.height = newHeight;
                  ctx.drawImage(img, 0, 0, newWidth, newHeight);
                  const imageQuality = this.quality / 10;
                  const newFileBase = canvas.toDataURL(
                    'image/jpeg',
                    imageQuality,
                  );
                  copyAttachmentsBase64.push(newFileBase);
                  resolve(undefined);
                };
                img.onerror = () => {
                  const newFileBase = fileBase64?.toString() || '';
                  if (newFileBase) {
                    copyAttachmentsBase64.push(newFileBase);
                  }
                  resolve(undefined);
                };
                img.src = fileBase64;
              });
            }
          } catch (error) {}
        }

        for await (let attachmentBase64 of copyAttachmentsBase64) {
          const fileUri = await this.saveBase64Photo(attachmentBase64);
          newBean.attachments.push(fileUri);
        }
      }

      newBean.config = new Config();
      await this.uiBeanStorage.add(newBean);

      // Update original bean
      const remainingWeight = this.bean.weight - this.unfreezeWeight;
      this.bean.weight = this.uiHelper.toFixedIfNecessary(remainingWeight, 1);

      if (this.bean.cost) {
        this.bean.cost = this.uiHelper.toFixedIfNecessary(
          this.bean.cost - newBean.cost,
          2,
        );
      }

      await this.uiBeanStorage.update(this.bean);
      await this.uiAlert.hideLoadingSpinner();
      this.uiToast.showInfoToast('TOAST_BEAN_PARTIALLY_UNFROZEN_SUCCESSFULLY');
    }

    // Reset settings filter if needed, similar to what was done before
    const settings = this.uiSettingsStorage.getSettings();
    settings.resetBeanFilter();
    await this.uiSettingsStorage.saveSettings(settings);

    this.dismiss();
  }
}
