import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { Settings } from '../../../classes/settings/settings';
import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIHelper } from '../../../services/uiHelper';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIAlert } from '../../../services/uiAlert';
import { BEAN_FREEZING_STORAGE_ENUM } from '../../../enums/beans/beanFreezingStorage';

@Component({
  selector: 'app-bean-popover-blend',
  templateUrl: './bean-popover-blend.component.html',
  styleUrls: ['./bean-popover-blend.component.scss'],
})
export class BeanPopoverBlendComponent implements OnInit {
  public static COMPONENT_ID = 'bean-popover-blend';

  public settings: Settings;
  public toBlendBean: string = '';

  @Input() public bean: Bean;

  public originalBeanWeight: number = 0;
  public toBlendBeanWeight: number = 0;

  public leftOverOriginalBeanBagWeight: number = 0;
  public leftOverToBlendBeanBagWeight: number = 0;

  constructor(
    private uiBeanHelper: UIBeanHelper,
    private uiHelper: UIHelper,
    private uiBeanStorage: UIBeanStorage,
    private readonly uiAlert: UIAlert,
    private readonly changeDetectorRef: ChangeDetectorRef,
  ) {}

  public ngOnInit() {
    this.leftOverOriginalBeanBagWeight = this.uiHelper.toFixedIfNecessary(
      this.bean.weight - this.getUsedWeightCount(this.bean),
      1,
    );
  }

  public getUsedWeightCount(_bean: Bean): number {
    let usedWeightCount: number = 0;
    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(
      _bean.config.uuid,
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

  public async toBlendBeanChanged() {
    if (this.toBlendBean === this.bean.config.uuid) {
      //Reset and do error
      setTimeout(() => {
        this.toBlendBean = '';
        this.changeDetectorRef.detectChanges();
      }, 1000);

      await this.uiAlert.showConfirm(
        'BEAN.BLEND_ERROR',
        'BEAN.BLEND_ERROR_SAME_BEAN',
      );
    } else {
      const objToBlendBean: Bean = this.uiBeanStorage.getByUUID(
        this.toBlendBean,
      );
      this.leftOverToBlendBeanBagWeight = this.uiHelper.toFixedIfNecessary(
        objToBlendBean.weight - this.getUsedWeightCount(objToBlendBean),
        1,
      );
      console.log(this.leftOverToBlendBeanBagWeight);
    }
  }

  public isBlendDisabled() {
    return (
      this.toBlendBean === '' ||
      this.toBlendBeanWeight === 0 ||
      this.toBlendBeanWeight > this.leftOverToBlendBeanBagWeight ||
      this.originalBeanWeight === 0 ||
      this.originalBeanWeight > this.leftOverOriginalBeanBagWeight
    );
  }

  public createBlend() {
    const objToBlendBean: Bean = this.uiBeanStorage.getByUUID(this.toBlendBean);
    const newWeightOfBlend = this.toBlendBeanWeight + this.originalBeanWeight;

    const clonedBean: Bean = new Bean();
    clonedBean.weight = newWeightOfBlend;

    if (this.bean.bean_information.length > 0) {
      for (const beanInfo of this.bean.bean_information) {
        clonedBean.bean_information.push(beanInfo);
      }
    }
    if (objToBlendBean.bean_information.length > 0) {
      for (const beanInfo of objToBlendBean.bean_information) {
        clonedBean.bean_information.push(beanInfo);
      }
    }

    if (this.bean.note.length > 0) {
      clonedBean.note = this.bean.note;
    }

    if (objToBlendBean.note.length > 0) {
      if (clonedBean.note.length > 0) {
        clonedBean.note += ' | ' + objToBlendBean.note;
      } else {
        clonedBean.note = objToBlendBean.note;
      }
    }
  }
}
