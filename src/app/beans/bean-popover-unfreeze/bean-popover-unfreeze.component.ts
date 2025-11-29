import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Bean } from '../../../classes/bean/bean';
import { UIHelper } from '../../../services/uiHelper';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIToast } from '../../../services/uiToast';
import moment from 'moment';
import { Config } from '../../../classes/objectConfig/objectConfig';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'app-bean-popover-unfreeze',
  templateUrl: './bean-popover-unfreeze.component.html',
  styleUrls: ['./bean-popover-unfreeze.component.scss'],
  standalone: false,
})
export class BeanPopoverUnfreezeComponent implements OnInit {
  public static COMPONENT_ID = 'bean-popover-unfreeze';
  @Input() public bean: Bean;

  public unfreezeWeight: number;
  public maxWeight: number;
  public settings: Settings;

  constructor(
    private readonly modalController: ModalController,
    public readonly uiHelper: UIHelper,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiToast: UIToast,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
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
      // Partial unfreeze
      const newBean: Bean = this.uiHelper.cloneData(this.bean);

      // Update new bean properties
      newBean.frozenId = this.uiBeanHelper.generateFrozenId();
      newBean.unfrozenDate = moment(new Date()).toISOString();
      // It retains frozenDate, frozenGroupId from the clone

      newBean.weight = this.uiHelper.toFixedIfNecessary(this.unfreezeWeight, 1);

      // Calculate cost for the new bean
      if (this.bean.cost && this.bean.weight > 0) {
        newBean.cost = this.uiHelper.toFixedIfNecessary(
          (this.bean.cost / this.bean.weight) * newBean.weight,
          2
        );
      } else {
        newBean.cost = 0;
      }

      newBean.config = new Config();
      await this.uiBeanStorage.add(newBean);

      // Update original bean
      const remainingWeight = this.bean.weight - this.unfreezeWeight;
      this.bean.weight = this.uiHelper.toFixedIfNecessary(remainingWeight, 1);

      if (this.bean.cost) {
        this.bean.cost = this.uiHelper.toFixedIfNecessary(this.bean.cost - newBean.cost, 2);
      }

      await this.uiBeanStorage.update(this.bean);
      this.uiToast.showInfoToast('TOAST_BEAN_PARTIALLY_UNFROZEN_SUCCESSFULLY');
    }

    // Reset settings filter if needed, similar to what was done before
    const settings = this.uiSettingsStorage.getSettings();
    settings.resetBeanFilter();
    await this.uiSettingsStorage.saveSettings(settings);

    this.dismiss();
  }
}
