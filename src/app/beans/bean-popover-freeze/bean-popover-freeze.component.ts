import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';
import moment from 'moment/moment';
import { TranslateService } from '@ngx-translate/core';
import { Bean } from '../../../classes/bean/bean';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { Brew } from '../../../classes/brew/brew';

import { UIHelper } from '../../../services/uiHelper';
import { Config } from '../../../classes/objectConfig/objectConfig';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIAlert } from '../../../services/uiAlert';
import { BeanPopoverFrozenListComponent } from '../bean-popover-frozen-list/bean-popover-frozen-list.component';
import { BEAN_FREEZING_STORAGE_ENUM } from '../../../enums/beans/beanFreezingStorage';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIToast } from '../../../services/uiToast';

declare var cordova;
@Component({
  selector: 'app-bean-popover-freeze',
  templateUrl: './bean-popover-freeze.component.html',
  styleUrls: ['./bean-popover-freeze.component.scss'],
  standalone: false,
})
export class BeanPopoverFreezeComponent implements OnInit {
  public static COMPONENT_ID = 'bean-popover-freeze';
  public settings: Settings;
  @Input() public bean: Bean;

  public frozenDate: string = '';
  public frozenStorage: BEAN_FREEZING_STORAGE_ENUM;
  public freezePartialBagGrams: number = 0;
  public frozenNote: string = '';

  public addedBags: Array<{
    weight: number;
    type: BEAN_FREEZING_STORAGE_ENUM;
  }> = [];

  public leftOverBeanBagWeight: number = 0;
  public copyAttachments: boolean = false;
  public quality: number = 80;
  public maxMB: number = 0.5;

  public allNewCreatedBeans: Array<Bean> = [];
  public readonly beanFreezingStorageEnum = BEAN_FREEZING_STORAGE_ENUM;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly translate: TranslateService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly platform: Platform,
    private readonly uiBeanHelper: UIBeanHelper,
    public readonly uiHelper: UIHelper,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiAlert: UIAlert,
    private readonly uiFileHelper: UIFileHelper,
    private readonly uiToast: UIToast,
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
    this.frozenStorage = 'UNKNOWN' as BEAN_FREEZING_STORAGE_ENUM;
  }
  public pinFormatter(value: any) {
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return `${0}`;
    }
    const newValue = +parsedFloat.toFixed(2);
    return `${newValue}`;
  }
  public ngOnInit() {
    // cant be done in constructor, else the bean object is not known
    this.leftOverBeanBagWeight = this.uiHelper.toFixedIfNecessary(
      this.bean.weight - this.getUsedWeightCount(),
      1,
    );
  }

  public getUsedWeightCount(): number {
    let usedWeightCount: number = 0;
    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(
      this.bean.config.uuid,
    );
    for (const brew of relatedBrews) {
      if (brew.bean_weight_in > 0) {
        usedWeightCount += brew.bean_weight_in;
      } else {
        usedWeightCount += brew.grind_weight;
      }
    }
    return usedWeightCount;
  }

  public async dismiss(): Promise<void> {
    this.modalController.dismiss(
      undefined,
      undefined,
      BeanPopoverFreezeComponent.COMPONENT_ID,
    );
  }

  public async saveWholePackage() {
    if (this.bean.frozenId == undefined || this.bean.frozenId == '') {
      this.bean.frozenId = this.uiBeanHelper.generateFrozenId();
    }
    this.bean.frozenDate = this.frozenDate;
    if (this.frozenNote) {
      this.bean.frozenNote = this.frozenNote;
    }

    await this.uiBeanStorage.update(this.bean);
    this.uiToast.showInfoToast('BEAN_HAS_BEEN_FROZEN', true);
    this.dismiss();
  }

  public async save() {
    await this.uiAlert.showLoadingSpinner();
    const spillOver = this.uiHelper.toFixedIfNecessary(
      this.leftOverBeanBagWeight - this.getActualFreezingQuantity(),
      1,
    );

    let index = 1;

    //If burnInPercentage is set, we know its a roasted one.
    let burnInPercentage = 0;
    if (this.bean.bean_roast_information.green_bean_weight > 0) {
      //250
      const originalWeight = this.bean.weight;
      //220
      const originalGreenBeanWeight =
        this.bean.bean_roast_information.green_bean_weight;

      //Example 12%

      burnInPercentage = 100 - (originalWeight * 100) / originalGreenBeanWeight;
    }
    const totalActualBeanWeight = this.bean.weight;
    let totalGreenBeanWeight = 0;
    if (this.bean.bean_roast_information.green_bean_weight > 0) {
      totalGreenBeanWeight = this.bean.bean_roast_information.green_bean_weight;
    }

    const copyAttachments: Array<string> = [];
    if (this.copyAttachments) {
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
                copyAttachments.push(newFileBase);
                resolve(undefined);
              };
              img.onerror = () => {
                const newFileBase = fileBase64?.toString() || '';
                if (newFileBase) {
                  copyAttachments.push(newFileBase);
                }

                resolve(undefined);
              };
              img.src = fileBase64;
            });
          }
        } catch (error) {}
      }
    }

    let groupBeanId: string = crypto.randomUUID();
    if (this.bean.frozenGroupId) {
      //If we froze the initial bean already, we use this as the reference again.
      groupBeanId = this.bean.frozenGroupId;
    }
    for await (const bag of this.addedBags) {
      await this.__createNewFrozenBean(
        bag.weight,
        bag.type,
        index,
        groupBeanId,
        burnInPercentage,
        totalActualBeanWeight,
        totalGreenBeanWeight,
        copyAttachments,
      );
      index = index + 1;
    }

    if (spillOver === 0) {
      //The whole beanbag will be finished after this
      const brews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(
        this.bean.config.uuid,
      );
      if (brews.length > 0) {
        const oldWeight = this.uiHelper.toFixedIfNecessary(this.bean.weight, 1);
        this.bean.weight = this.uiHelper.toFixedIfNecessary(
          this.bean.weight - this.getActualFreezingQuantity(),
          1,
        );
        try {
          const newCost = this.uiHelper.toFixedIfNecessary(
            (this.bean.cost * this.bean.weight) / oldWeight,
            2,
          );
          this.bean.cost = newCost;
        } catch (ex) {
          this.bean.cost = 0;
        }

        if (this.bean.bean_roast_information.green_bean_weight > 0) {
          const percentageBeanWeightShare =
            this.bean.weight / totalActualBeanWeight;
          this.bean.bean_roast_information.green_bean_weight =
            this.uiHelper.toFixedIfNecessary(
              totalGreenBeanWeight * percentageBeanWeightShare,
              2,
            );
        }

        await this.uiAlert.hideLoadingSpinner();
        //Don't delete the bean, because we did brews with this
        this.bean.frozenGroupId = groupBeanId;
        await this.uiBeanStorage.update(this.bean);
        await this.uiAlert.showMessage(
          'BEAN_POPOVER_FROZEN_BEAN_WILL_BE_ARCHIVED_NOW_MESSAGE',
          'INFORMATION',
          'OK',
          true,
        );
        await this.uiBeanHelper.archiveBeanWithRatingQuestion(this.bean);
      } else {
        await this.uiAlert.hideLoadingSpinner();
        try {
          await this.uiAlert.showConfirm(
            'BEAN_POPOVER_FROZEN_DELETE_BEAN_MESSAGE',
            'CARE',
            true,
          );
          //The bag doesn't have any brews, so just delete it.
          await this.uiBeanStorage.removeByUUID(this.bean.config.uuid);
        } catch (ex) {
          //Reset the weight to zero atleast.
          this.bean.weight = 0;
          if (this.bean.bean_roast_information.green_bean_weight > 0) {
            this.bean.bean_roast_information.green_bean_weight = 0;
          }

          await this.uiBeanStorage.update(this.bean);
        }
      }
    } else {
      // We need to update our bean bag.
      /**
       * Because we had already maybe some brews, we take the bean weight, and subtract it with the spill over, because just using the spill over would not take previus brews into account
       */
      const oldWeight = this.uiHelper.toFixedIfNecessary(this.bean.weight, 1);
      this.bean.weight = this.uiHelper.toFixedIfNecessary(
        this.bean.weight - this.getActualFreezingQuantity(),
        1,
      );
      try {
        const newCost = this.uiHelper.toFixedIfNecessary(
          (this.bean.cost * this.bean.weight) / oldWeight,
          2,
        );
        this.bean.cost = newCost;
      } catch (ex) {
        this.bean.cost = 0;
      }

      if (this.bean.bean_roast_information.green_bean_weight > 0) {
        const percentageBeanWeightShare =
          this.bean.weight / totalActualBeanWeight;
        this.bean.bean_roast_information.green_bean_weight =
          this.uiHelper.toFixedIfNecessary(
            totalGreenBeanWeight * percentageBeanWeightShare,
            2,
          );
      }

      this.bean.frozenGroupId = groupBeanId;
      await this.uiBeanStorage.update(this.bean);
    }
    await this.uiAlert.hideLoadingSpinner();
    this.dismiss();
    const modal = await this.modalController.create({
      component: BeanPopoverFrozenListComponent,
      id: BeanPopoverFrozenListComponent.COMPONENT_ID,
      componentProps: { frozenBeansList: this.allNewCreatedBeans },
    });
    await modal.present();
    await modal.onWillDismiss();
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

  private async __createNewFrozenBean(
    _freezingWeight: number,
    _freezingType: BEAN_FREEZING_STORAGE_ENUM,
    _index: number,
    _groupBeanId: string,
    _burnInPercentage: number,
    _totalBeanWeight: number,
    _totalGreenBeanWeight: number,
    _copyAttachments: Array<string>,
  ) {
    const clonedBean: Bean = this.uiHelper.cloneData(this.bean);

    clonedBean.frozenId = this.uiBeanHelper.generateFrozenId();
    clonedBean.frozenDate = this.frozenDate;
    //Reset the data, because maybe we freeze an unfrozen bean again.
    clonedBean.unfrozenDate = '';
    clonedBean.attachments = [];
    clonedBean.frozenGroupId = _groupBeanId;
    clonedBean.frozenStorageType = _freezingType;
    clonedBean.frozenNote = this.frozenNote;
    clonedBean.internal_share_code = '';
    clonedBean.shared = false;
    clonedBean.qr_code = '';

    if (_copyAttachments && _copyAttachments.length > 0) {
      for await (let attachment of _copyAttachments) {
        const fileUri = await this.saveBase64Photo(attachment);
        clonedBean.attachments.push(fileUri);
      }
    }

    if (this.bean.cost !== 0) {
      try {
        const newCost = this.uiHelper.toFixedIfNecessary(
          (this.bean.cost * _freezingWeight) / this.bean.weight,
          2,
        );
        clonedBean.cost = newCost;
      } catch (ex) {
        clonedBean.cost = 0;
      }
    }
    clonedBean.weight = this.uiHelper.toFixedIfNecessary(_freezingWeight, 1);

    if (this.bean.bean_roast_information.green_bean_weight > 0) {
      const percentageBeanWeightShare = clonedBean.weight / _totalBeanWeight;
      clonedBean.bean_roast_information.green_bean_weight =
        this.uiHelper.toFixedIfNecessary(
          _totalGreenBeanWeight * percentageBeanWeightShare,
          2,
        );
    }

    clonedBean.config = new Config();
    const newClonedBean = await this.uiBeanStorage.add(clonedBean);
    const newBean: Bean = new Bean();
    newBean.initializeByObject(newClonedBean);
    this.allNewCreatedBeans.push(newBean);
  }

  public chooseDate(_event) {
    _event.target.blur();
    _event.cancelBubble = true;
    _event.preventDefault();
    _event.stopImmediatePropagation();
    _event.stopPropagation();

    if (this.platform.is('capacitor')) {
      const myDate = new Date(); // From model.

      cordova.plugins.DateTimePicker.show({
        mode: 'date',
        date: myDate,
        okText: this.translate.instant('CHOOSE'),
        todayText: this.translate.instant('TODAY'),
        cancelText: this.translate.instant('CANCEL'),
        clearText: this.translate.instant('CLEAR'),
        success: (newDate) => {
          if (newDate === undefined) {
            this.frozenDate = '';
          } else {
            this.frozenDate = moment(newDate).toISOString();
          }

          this.changeDetectorRef.detectChanges();
        },
        error: () => {},
      });
    } else {
      this.frozenDate = moment(new Date()).toISOString();
    }
  }

  public getActualFreezingQuantity() {
    let quantity: number = 0;
    for (const bag of this.addedBags) {
      quantity += bag.weight;
    }
    return quantity;
  }

  public isAddingBagDisabled() {
    if (this.freezePartialBagGrams <= 0) {
      return true;
    }
    if (
      this.uiHelper.toFixedIfNecessary(
        Number(this.freezePartialBagGrams) + this.getActualFreezingQuantity(),
        1,
      ) > this.leftOverBeanBagWeight
    ) {
      return true;
    }
    return false;
  }

  public addOnePartialBag() {
    this.addedBags.push({
      weight: Number(this.freezePartialBagGrams),
      type: this.frozenStorage,
    });

    const leftFreezingCount = this.uiHelper.toFixedIfNecessary(
      this.leftOverBeanBagWeight - this.getActualFreezingQuantity(),
      1,
    );
    if (leftFreezingCount < this.freezePartialBagGrams) {
      this.freezePartialBagGrams = this.uiHelper.toFixedIfNecessary(
        leftFreezingCount,
        1,
      );
    }
  }

  public addMaxPartialBags() {
    while (true) {
      this.addedBags.push({
        weight: Number(this.freezePartialBagGrams),
        type: this.frozenStorage,
      });

      const leftFreezingCount = this.uiHelper.toFixedIfNecessary(
        this.leftOverBeanBagWeight - this.getActualFreezingQuantity(),
        1,
      );
      if (leftFreezingCount < this.freezePartialBagGrams) {
        this.freezePartialBagGrams = this.uiHelper.toFixedIfNecessary(
          leftFreezingCount,
          1,
        );
        break;
      }
    }
  }

  public deleteBag(_index) {
    this.addedBags.splice(_index, 1);
    const leftFreezingCount = this.uiHelper.toFixedIfNecessary(
      this.leftOverBeanBagWeight - this.getActualFreezingQuantity(),
      1,
    );
    if (leftFreezingCount < this.freezePartialBagGrams) {
      this.freezePartialBagGrams = leftFreezingCount;
    }
  }
}
