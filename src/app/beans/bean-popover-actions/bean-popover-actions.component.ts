import { Component, inject, Input, OnInit } from '@angular/core';

import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  copyOutline,
  heart,
  heartOutline,
  qrCodeOutline,
  shareSocialOutline,
  snowOutline,
  thermometerOutline,
} from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { Settings } from '../../../classes/settings/settings';
import { BEAN_ACTION } from '../../../enums/beans/beanAction';
import { IBean } from '../../../interfaces/bean/iBean';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'bean-popover-actions',
  templateUrl: './bean-popover-actions.component.html',
  styleUrls: ['./bean-popover-actions.component.scss'],
  imports: [TranslatePipe, IonHeader, IonContent, IonList, IonItem, IonIcon],
})
export class BeanPopoverActionsComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiBeanHelper = inject(UIBeanHelper);
  private readonly uiSettingsStorage = inject(UISettingsStorage);

  public static COMPONENT_ID = 'bean-popover-actions';
  public data: Bean = new Bean();

  @Input('bean') public bean: IBean;

  public settings: Settings;
  constructor() {
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    addIcons({
      snowOutline,
      thermometerOutline,
      copyOutline,
      heartOutline,
      heart,
      shareSocialOutline,
      qrCodeOutline,
    });
  }

  public ionViewDidEnter(): void {}

  public ngOnInit() {
    const bean: IBean = this.uiHelper.copyData(this.bean);
    this.data.initializeByObject(bean);
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public hasPhotos(): boolean {
    return this.data.attachments.length > 0;
  }

  public hasBrews(): boolean {
    try {
      let allBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(
        this.data.config.uuid,
      );
      allBrews = allBrews.filter(
        (e) =>
          e.getBean().finished === false &&
          e.getMill().finished === false &&
          e.getPreparation().finished === false,
      );
      return allBrews.length > 0;
    } catch {
      return false;
    }
  }

  public getStaticActions(): any {
    return BEAN_ACTION;
  }

  public async choose(_type: string): Promise<void> {
    this.modalController.dismiss(
      undefined,
      _type,
      BeanPopoverActionsComponent.COMPONENT_ID,
    );
  }
  public async dismiss() {
    this.modalController.dismiss(
      undefined,
      undefined,
      BeanPopoverActionsComponent.COMPONENT_ID,
    );
  }
}
