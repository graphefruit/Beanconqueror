import {Component, OnInit} from '@angular/core';
import {NavParams, PopoverController} from '@ionic/angular';
import {UIHelper} from '../../../services/uiHelper';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {IBean} from '../../../interfaces/bean/iBean';
import {Bean} from '../../../classes/bean/bean';
import {BEAN_ACTION} from '../../../enums/beans/beanAction';

@Component({
  selector: 'bean-popover-actions',
  templateUrl: './bean-popover-actions.component.html',
  styleUrls: ['./bean-popover-actions.component.scss'],
})
export class BeanPopoverActionsComponent implements OnInit {


  public data: Bean = new Bean();

  constructor(private readonly popoverController: PopoverController,
              private readonly navParams: NavParams,
              private readonly uiHelper: UIHelper,
              private readonly uiAnalytics: UIAnalytics) {
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const bean: IBean = this.uiHelper.copyData(this.navParams.get('bean'));

    this.data.initializeByObject(bean);
  }

  public ionViewDidEnter(): void {
    this.uiAnalytics.trackEvent('BEAN', 'POPOVER_ACTIONS');
  }

  public ngOnInit() {

  }

  public hasPhotos(): boolean {
    return this.data.attachments.length > 0;
  }

  public getStaticActions(): any {
    return BEAN_ACTION;
  }

  public async choose(_type: string): Promise<void> {
    this.popoverController.dismiss(undefined, _type,'bean-popover-actions');
  }

}
