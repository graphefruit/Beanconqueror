import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';


import {PopoverController} from '@ionic/angular';
import {UIBeanHelper} from '../../services/uiBeanHelper';
import {BEAN_ACTION} from '../../enums/beans/beanAction';

import {GreenBean} from '../../classes/green-bean/green-bean';
import {GreenBeanPopoverActionsComponent} from '../../app/roasting-section/green-beans/green-bean-popover-actions/green-bean-popover-actions.component';
import {Bean} from '../../classes/bean/bean';

@Component({
  selector: 'green-bean-information',
  templateUrl: './green-bean-information.component.html',
  styleUrls: ['./green-bean-information.component.scss'],
})
export class GreenBeanInformationComponent implements OnInit {
  @Input() public greenBean: GreenBean;

  @Output() public greenBeanAction: EventEmitter<any> = new EventEmitter();




  constructor(private readonly popoverCtrl: PopoverController,
              private readonly uiBeanHelper: UIBeanHelper) {



  }


  public ngOnInit() {
  }



  public daysOld(): number {

    return this.greenBean.beanAgeInDays();

  }


  public showGreenBean() {
    this.greenBeanAction.emit([BEAN_ACTION.DETAIL, this.greenBean]);
  }

  public async showBeanActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    const popover = await this.popoverCtrl.create({
      component: GreenBeanPopoverActionsComponent,
      event,
      translucent: true,
      componentProps: {'green-bean': this.greenBean},
      id:'green-bean-popover-actions'
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    this.greenBeanAction.emit([data.role as BEAN_ACTION, this.greenBean]);
  }


  public getUsedWeightCount(): number {
    let usedWeightCount: number = 0;
    const relatedRoastingBeans: Array<Bean> = this.uiBeanHelper.getAllRoastedBeansForThisGreenBean(this.greenBean.config.uuid);
    for (const roast of relatedRoastingBeans) {
      usedWeightCount += roast.bean_roast_information.green_bean_weight;
    }
    return usedWeightCount;
  }

  public roastCount(): number {
    const relatedRoastingBeans: Array<Bean> = this.uiBeanHelper.getAllRoastedBeansForThisGreenBean(this.greenBean.config.uuid);
    return relatedRoastingBeans.length;
  }
}
