import { Component, Input, OnInit } from '@angular/core';

import { ModalController } from '@ionic/angular/standalone';
import { UIHelper } from '../../../../services/uiHelper';
import { IGreenBean } from '../../../../interfaces/green-bean/iGreenBean';
import { GREEN_BEAN_ACTION } from '../../../../enums/green-beans/greenBeanAction';
import { GreenBean } from '../../../../classes/green-bean/green-bean';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { flameOutline } from 'ionicons/icons';
import {
  IonHeader,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
} from '@ionic/angular/standalone';

@Component({
  selector: 'green-bean-popover-actions',
  templateUrl: './green-bean-popover-actions.component.html',
  styleUrls: ['./green-bean-popover-actions.component.scss'],
  imports: [TranslatePipe, IonHeader, IonContent, IonList, IonItem, IonIcon],
})
export class GreenBeanPopoverActionsComponent implements OnInit {
  public static COMPONENT_ID = 'green-bean-popover-actions';
  public data: GreenBean = new GreenBean();
  @Input('greenbean') public greenbean: IGreenBean;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiHelper: UIHelper,
  ) {
    addIcons({ flameOutline });
  }

  public ionViewDidEnter(): void {}

  public ngOnInit() {
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const bean: IGreenBean = this.uiHelper.copyData(this.greenbean);

    this.data.initializeByObject(bean);
  }

  public hasPhotos(): boolean {
    return this.data.attachments.length > 0;
  }

  public getStaticActions(): any {
    return GREEN_BEAN_ACTION;
  }

  public async choose(_type: string): Promise<void> {
    this.modalController.dismiss(
      undefined,
      _type,
      GreenBeanPopoverActionsComponent.COMPONENT_ID,
    );
  }
  public async dismiss() {
    this.modalController.dismiss(
      undefined,
      undefined,
      GreenBeanPopoverActionsComponent.COMPONENT_ID,
    );
  }
}
