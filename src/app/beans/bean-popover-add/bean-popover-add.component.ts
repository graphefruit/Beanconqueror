import { Component, OnInit, inject } from '@angular/core';

import { ModalController } from '@ionic/angular/standalone';

import { BEAN_POPOVER_ADD_ACTION } from '../../../enums/beans/beanPopoverAddAction';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { addCircleOutline, qrCodeOutline } from 'ionicons/icons';
import {
  IonHeader,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
} from '@ionic/angular/standalone';

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
