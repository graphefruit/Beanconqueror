import { Component, inject, OnInit } from '@angular/core';

import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addCircleOutline, qrCodeOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { BEAN_POPOVER_ADD_ACTION } from '../../../enums/beans/beanPopoverAddAction';

@Component({
  selector: 'app-bean-popover-add',
  templateUrl: './bean-popover-add.component.html',
  styleUrls: ['./bean-popover-add.component.scss'],
  imports: [TranslatePipe, IonHeader, IonContent, IonList, IonItem, IonIcon],
})
export class BeanPopoverAddComponent implements OnInit {
  private readonly modalController = inject(ModalController);

  public static COMPONENT_ID = 'bean-popover-add';

  constructor() {
    addIcons({ addCircleOutline, qrCodeOutline });
  }

  public ionViewDidEnter(): void {}

  public ngOnInit() {}

  public getStaticActions(): any {
    return BEAN_POPOVER_ADD_ACTION;
  }

  public async choose(_type: string): Promise<void> {
    this.modalController.dismiss(
      undefined,
      _type,
      BeanPopoverAddComponent.COMPONENT_ID,
    );
  }
  public async dismiss() {
    this.modalController.dismiss(
      undefined,
      undefined,
      BeanPopoverAddComponent.COMPONENT_ID,
    );
  }
}
