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

declare var cordova;
@Component({
  selector: 'app-bean-popover-freeze',
  templateUrl: './bean-popover-freeze.component.html',
  styleUrls: ['./bean-popover-freeze.component.scss'],
})
export class BeanPopoverFreezeComponent implements OnInit {
  public static COMPONENT_ID = 'bean-popover-freeze';
  public settings: Settings;
  @Input() public bean: Bean;

  public frozenDate: string = '';
  public freezePartialBagGrams: number = 0;

  public addedBags: Array<number> = [];

  public leftOverBeanBagWeight: number = 0;
  public copyAttachments: boolean = false;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly translate: TranslateService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly platform: Platform,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiHelper: UIHelper,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiAlert: UIAlert
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public ngOnInit() {
    // cant be done in constructor, else the bean object is not known
    this.leftOverBeanBagWeight = this.bean.weight - this.getUsedWeightCount();
  }

  public getUsedWeightCount(): number {
    let usedWeightCount: number = 0;
    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(
      this.bean.config.uuid
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
      BeanPopoverFreezeComponent.COMPONENT_ID
    );
  }

  public async save() {
    const spillOver =
      this.leftOverBeanBagWeight - this.getActualFreezingQuantity();

    let index = 1;

    for await (const bag of this.addedBags) {
      await this.__createNewFrozenBean(bag, index);
      index = index + 1;
    }

    if (spillOver === 0) {
      //The whole beanbag will be finished after this
      const brews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(
        this.bean.config.uuid
      );
      if (brews.length > 0) {
        const oldWeight = this.bean.weight;
        this.bean.weight = this.bean.weight - this.getActualFreezingQuantity();
        const newCost = (this.bean.cost * this.bean.weight) / oldWeight;
        this.bean.cost = newCost;

        //Don't delete the bean, because we did brews with this
        this.bean.finished = true;
        await this.uiBeanStorage.update(this.bean);
      } else {
        try {
          await this.uiAlert.showConfirm(
            'BEAN_POPOVER_FROZEN_DELETE_BEAN_MESSAGE',
            'CARE',
            true
          );
          //The bag doesn't have any brews, so just delete it.
          await this.uiBeanStorage.removeByUUID(this.bean.config.uuid);
        } catch (ex) {
          //Reset the weight to zero atleast.
          this.bean.weight = 0;
          await this.uiBeanStorage.update(this.bean);
        }
      }
    } else {
      //We need to update our bean bag.
      /**
       * Because we had already maybe some brews, we take the bean weight, and subtract it with the spill over, because just using the spill over would not take previus brews into account
       */
      const oldWeight = this.bean.weight;
      this.bean.weight = this.bean.weight - this.getActualFreezingQuantity();
      const newCost = (this.bean.cost * this.bean.weight) / oldWeight;
      this.bean.cost = newCost;
      await this.uiBeanStorage.update(this.bean);
    }

    this.dismiss();
  }
  private async __createNewFrozenBean(_freezingWeight: number, _index: number) {
    const clonedBean: Bean = this.uiHelper.cloneData(this.bean);

    clonedBean.frozenId = this.uiBeanHelper.generateFrozenId();
    clonedBean.frozenDate = this.frozenDate;
    //Reset the data, because maybe we freeze an unfrozen bean again.
    clonedBean.unfrozenDate = '';
    clonedBean.attachments = [];

    if (this.bean.cost !== 0) {
      const newCost = (this.bean.cost * _freezingWeight) / this.bean.weight;
      clonedBean.cost = newCost;
    }
    clonedBean.weight = _freezingWeight;
    clonedBean.config = new Config();
    await this.uiBeanStorage.add(clonedBean);
  }

  public chooseDate(_event) {
    _event.target.blur();
    _event.cancelBubble = true;
    _event.preventDefault();
    _event.stopImmediatePropagation();
    _event.stopPropagation();

    if (this.platform.is('cordova')) {
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
      quantity += bag;
    }
    return quantity;
  }

  public addOnePartialBag() {
    this.addedBags.push(this.freezePartialBagGrams);

    const leftFreezingCount =
      this.leftOverBeanBagWeight - this.getActualFreezingQuantity();
    if (leftFreezingCount < this.freezePartialBagGrams) {
      this.freezePartialBagGrams = leftFreezingCount;
    }
  }

  public addMaxPartialBags() {
    while (true) {
      this.addedBags.push(this.freezePartialBagGrams);

      const leftFreezingCount =
        this.leftOverBeanBagWeight - this.getActualFreezingQuantity();
      if (leftFreezingCount < this.freezePartialBagGrams) {
        this.freezePartialBagGrams = leftFreezingCount;
        break;
      }
    }
  }

  public deleteBag(_index) {
    this.addedBags.splice(_index, 1);
    const leftFreezingCount =
      this.leftOverBeanBagWeight - this.getActualFreezingQuantity();
    if (leftFreezingCount < this.freezePartialBagGrams) {
      this.freezePartialBagGrams = leftFreezingCount;
    }
  }
}
