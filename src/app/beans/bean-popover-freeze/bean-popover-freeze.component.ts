import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonCard,
  IonCheckbox,
  IonCol,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonRange,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  ModalController,
  Platform,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trashOutline, warningOutline } from 'ionicons/icons';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import moment from 'moment/moment';

import { Bean } from '../../../classes/bean/bean';
import { Config } from '../../../classes/objectConfig/objectConfig';
import { Settings } from '../../../classes/settings/settings';
import BEAN_TRACKING from '../../../data/tracking/beanTracking';
import { PickerFieldDirective } from '../../../directive/picker-field.directive';
import { PreventCharacterDirective } from '../../../directive/prevent-character.directive';
import { RangeNameDirective } from '../../../directive/range-name.directive';
import { RemoveEmptyNumberDirective } from '../../../directive/remove-empty-number.directive';
import { TransformDateDirective } from '../../../directive/transform-date';
import { BEAN_FREEZING_STORAGE_ENUM } from '../../../enums/beans/beanFreezingStorage';
import { KeysPipe } from '../../../pipes/keys';
import { ToFixedPipe } from '../../../pipes/toFixed';
import { sumUsedBeanWeight } from '../../../services/beanUsage/used-bean-weight';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIHelper } from '../../../services/uiHelper';
import { UILog } from '../../../services/uiLog';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIToast } from '../../../services/uiToast';
import { BeanPopoverFrozenListComponent } from '../bean-popover-frozen-list/bean-popover-frozen-list.component';

declare var cordova;
@Component({
  selector: 'app-bean-popover-freeze',
  templateUrl: './bean-popover-freeze.component.html',
  styleUrls: ['./bean-popover-freeze.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    TransformDateDirective,
    FormsModule,
    PreventCharacterDirective,
    RemoveEmptyNumberDirective,
    TranslatePipe,
    KeysPipe,
    ToFixedPipe,
    IonHeader,
    IonContent,
    IonCard,
    IonItem,
    IonInput,
    PickerFieldDirective,
    IonCheckbox,
    IonLabel,
    IonRange,
    RangeNameDirective,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonIcon,
    IonButton,
    IonList,
    IonListHeader,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class BeanPopoverFreezeComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly translate = inject(TranslateService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly platform = inject(Platform);
  private readonly uiBeanHelper = inject(UIBeanHelper);
  readonly uiHelper = inject(UIHelper);
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiToast = inject(UIToast);
  private readonly uiLog = inject(UILog);
  private readonly uiAnalytics = inject(UIAnalytics);

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

  constructor() {
    this.settings = this.uiSettingsStorage.getSettings();
    this.frozenStorage = 'UNKNOWN' as BEAN_FREEZING_STORAGE_ENUM;
    addIcons({ warningOutline, trashOutline });
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
    if (this.bean?.frozenStorageType) {
      this.frozenStorage = this.bean.frozenStorageType;
    }
    if (this.bean?.frozenNote) {
      this.frozenNote = this.bean.frozenNote;
    }
  }

  public getUsedWeightCount(): number {
    return sumUsedBeanWeight(
      this.uiBeanHelper.getAllBrewsForThisBean(this.bean.config.uuid),
    );
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
    this.bean.unfrozenDate = '';
    this.bean.frozenStorageType = this.frozenStorage;
    this.bean.frozenNote = this.frozenNote;

    try {
      await this.__updateOriginal();
    } catch (ex) {
      this.uiLog.error('Freeze bean - Unsuccessfully', ex);
      await this.uiAlert.showMessage('ERROR_OCCURED', 'CARE', undefined, true);
      return;
    }
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.FREEZE,
    );
    this.uiToast.showInfoToast('BEAN_HAS_BEEN_FROZEN', true);
    this.dismiss();
  }

  public async save() {
    let frozen = false;
    try {
      // Asked first: the bags and the bean they are taken from are stored
      // together, so nothing can be stored before the answer.
      const deleteOriginal = await this.__askToDeleteOriginal();
      await this.uiAlert.showLoadingSpinner();
      frozen = await this.__freezeBags(deleteOriginal);
    } catch (ex) {
      this.uiLog.error('Freeze bean - Unsuccessfully', ex);
    } finally {
      await this.uiAlert.hideLoadingSpinner();
    }
    if (!frozen) {
      // Nothing was stored and the bean of this dialog is as it was: the
      // dialog stays open for another try. Shown also when the collection
      // has reported the failed save: its message does not tell that no bag
      // was stored and the bean is unchanged.
      await this.uiAlert.showMessage(
        'BEAN_FREEZE_NOTHING_FROZEN',
        'CARE',
        undefined,
        true,
      );
      return;
    }
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.FREEZE,
    );
    if (this.__isUsedUp() && this.__hasBrews()) {
      // The freezing is done; a failure here must not report otherwise.
      try {
        await this.uiAlert.showMessage(
          'BEAN_POPOVER_FROZEN_BEAN_WILL_BE_ARCHIVED_NOW_MESSAGE',
          'INFORMATION',
          'OK',
          true,
        );
        await this.uiBeanHelper.archiveBeanWithRatingQuestion(this.bean);
      } catch (ex) {
        this.uiLog.error('Freeze bean - Archive question not shown', ex);
      }
    }
    this.dismiss();
    const modal = await this.modalController.create({
      component: BeanPopoverFrozenListComponent,
      id: BeanPopoverFrozenListComponent.COMPONENT_ID,
      componentProps: { frozenBeansList: this.allNewCreatedBeans },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  /** Whether the bags take all that is left of the bean. */
  private __isUsedUp(): boolean {
    return (
      this.uiHelper.toFixedIfNecessary(
        this.leftOverBeanBagWeight - this.getActualFreezingQuantity(),
        1,
      ) === 0
    );
  }

  private __hasBrews(): boolean {
    return (
      this.uiBeanHelper.getAllBrewsForThisBean(this.bean.config.uuid).length > 0
    );
  }

  /**
   * A bean that is used up by the bags and has no brews can go. Resolves
   * whether the user wants it deleted; false as well when it is not asked.
   */
  private async __askToDeleteOriginal(): Promise<boolean> {
    if (!this.__isUsedUp() || this.__hasBrews()) {
      return false;
    }
    const choice = await this.uiAlert.showConfirm(
      'BEAN_POPOVER_FROZEN_DELETE_BEAN_MESSAGE',
      'CARE',
      true,
    );
    return choice === 'YES';
  }

  private async __updateOriginal(): Promise<void> {
    if (!(await this.uiBeanStorage.update(this.bean))) {
      throw new Error('The bean was not saved');
    }
  }

  /** The photos copied for bags that were not stored belong to nothing. */
  private async __deleteCopiedFiles(
    _copiedFiles: Array<string>,
  ): Promise<void> {
    for (const file of _copiedFiles) {
      try {
        await this.uiFileHelper.deleteInternalFile(file);
      } catch (ex) {
        this.uiLog.error('Freeze bean - Copied photo not deleted', ex);
      }
    }
  }

  /**
   * Stores the bags and what becomes of the bean they are taken from with
   * one save. Resolves false when that could not be stored: nothing was
   * changed then, in the storage or on the bean of this dialog, and the
   * photos copied for the bags are deleted again.
   */
  private async __freezeBags(_deleteOriginal: boolean): Promise<boolean> {
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
    // A copy: the bean of this dialog changes only once all is stored.
    const original: Bean = this.uiHelper.cloneData(this.bean);
    if (!this.__isUsedUp() || this.__hasBrews()) {
      // Because we had already maybe some brews, we take the bean weight, and subtract it with the spill over, because just using the spill over would not take previus brews into account
      const oldWeight = this.uiHelper.toFixedIfNecessary(this.bean.weight, 1);
      original.weight = this.uiHelper.toFixedIfNecessary(
        this.bean.weight - this.getActualFreezingQuantity(),
        1,
      );
      try {
        original.cost = this.uiHelper.toFixedIfNecessary(
          (this.bean.cost * original.weight) / oldWeight,
          2,
        );
      } catch (ex) {
        original.cost = 0;
      }
      if (totalGreenBeanWeight > 0) {
        const percentageBeanWeightShare =
          original.weight / totalActualBeanWeight;
        original.bean_roast_information.green_bean_weight =
          this.uiHelper.toFixedIfNecessary(
            totalGreenBeanWeight * percentageBeanWeightShare,
            2,
          );
      }
      original.frozenGroupId = groupBeanId;
    } else if (!_deleteOriginal) {
      //Reset the weight to zero atleast.
      original.weight = 0;
      if (totalGreenBeanWeight > 0) {
        original.bean_roast_information.green_bean_weight = 0;
      }
    }

    const copiedFiles: Array<string> = [];
    let saved = false;
    try {
      const bags: Array<Bean> = [];
      for (const bag of this.addedBags) {
        bags.push(
          await this.__createNewFrozenBean(
            bag.weight,
            bag.type,
            groupBeanId,
            totalActualBeanWeight,
            totalGreenBeanWeight,
            copyAttachments,
            copiedFiles,
          ),
        );
      }
      const result = await this.uiBeanStorage.applyChanges(
        _deleteOriginal
          ? { add: bags, remove: [this.bean.config.uuid] }
          : { add: bags, update: [original] },
      );
      saved = result.saved;
      if (saved) {
        this.allNewCreatedBeans = result.added.map((added) => {
          const newBean = new Bean();
          newBean.initializeByObject(added);
          return newBean;
        });
      }
    } catch (ex) {
      this.uiLog.error('Freeze bean - Bags not stored', ex);
    }
    if (!saved) {
      await this.__deleteCopiedFiles(copiedFiles);
      return false;
    }
    this.bean.weight = original.weight;
    this.bean.cost = original.cost;
    this.bean.bean_roast_information.green_bean_weight =
      original.bean_roast_information.green_bean_weight;
    this.bean.frozenGroupId = original.frozenGroupId;
    return true;
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

  /** The bean for one bag, not stored yet; its photos are copied already. */
  private async __createNewFrozenBean(
    _freezingWeight: number,
    _freezingType: BEAN_FREEZING_STORAGE_ENUM,
    _groupBeanId: string,
    _totalBeanWeight: number,
    _totalGreenBeanWeight: number,
    _copyAttachments: Array<string>,
    _copiedFiles: Array<string>,
  ): Promise<Bean> {
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
        _copiedFiles.push(fileUri);
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
    return clonedBean;
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
        clearText: this.translate.instant('DELETE'),
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
