import { Component, OnInit } from '@angular/core';

import {ModalController, NavParams} from '@ionic/angular';
import {UIHelper} from '../../../../services/uiHelper';
import {UIAnalytics} from '../../../../services/uiAnalytics';
import {IGreenBean} from '../../../../interfaces/green-bean/iGreenBean';
import {GREEN_BEAN_ACTION} from '../../../../enums/green-beans/greenBeanAction';
import {GreenBean} from '../../../../classes/green-bean/green-bean';


@Component({
  selector: 'green-bean-popover-actions',
  templateUrl: './green-bean-popover-actions.component.html',
  styleUrls: ['./green-bean-popover-actions.component.scss'],
})
export class GreenBeanPopoverActionsComponent implements OnInit {

  public data: GreenBean = new GreenBean();

  constructor(private readonly modalController: ModalController,
              private readonly navParams: NavParams,
              private readonly uiHelper: UIHelper,
              private readonly uiAnalytics: UIAnalytics) {
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const bean: IGreenBean = this.uiHelper.copyData(this.navParams.get('green-bean'));

    this.data.initializeByObject(bean);
  }

  public ionViewDidEnter(): void {
    this.uiAnalytics.trackEvent('GREEN_BEAN', 'POPOVER_ACTIONS');
  }

  public ngOnInit() {

  }

  public hasPhotos(): boolean {
    return this.data.attachments.length > 0;
  }

  public getStaticActions(): any {
    return GREEN_BEAN_ACTION;
  }

  public async choose(_type: string): Promise<void> {
    this.modalController.dismiss(undefined, _type,'green-bean-popover-actions');
  }
  public async dismiss() {
    this.modalController.dismiss(undefined, undefined,'green-bean-popover-actions');
  }
}
