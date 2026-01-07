import { Component, Input, OnInit, inject } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { UIToast } from '../../../../services/uiToast';
import { UIWaterStorage } from '../../../../services/uiWaterStorage';
import { Water } from '../../../../classes/water/water';
import WATER_TRACKING from '../../../../data/tracking/waterTracking';
import { UIAnalytics } from '../../../../services/uiAnalytics';

import { WATER_TYPES } from '../../../../enums/water/waterTypes';
import { WaterAddTypeComponent } from '../water-add-type/water-add-type.component';
import { TranslatePipe } from '@ngx-translate/core';
import { KeysPipe } from '../../../../pipes/keys';
import { addIcons } from 'ionicons';
import { waterOutline } from 'ionicons/icons';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-water-add',
  templateUrl: './water-add.component.html',
  styleUrls: ['./water-add.component.scss'],
  imports: [
    TranslatePipe,
    KeysPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardContent,
  ],
})
export class WaterAddComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiWaterStorage = inject(UIWaterStorage);
  private readonly uiToast = inject(UIToast);
  private readonly uiAnalytics = inject(UIAnalytics);

  public static COMPONENT_ID = 'water-add';

  public data: Water = new Water();

  public water_type_enums = WATER_TYPES;
  constructor() {
    addIcons({ waterOutline });
  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      WATER_TRACKING.TITLE,
      WATER_TRACKING.ACTIONS.ADD,
    );
  }

  public async chooseWater(_waterType: WATER_TYPES) {
    const modal = await this.modalController.create({
      component: WaterAddTypeComponent,
      cssClass: 'popover-actions',
      animated: true,
      id: WaterAddTypeComponent.COMPONENT_ID,
      componentProps: {
        type: _waterType,
      },
      breakpoints: [0, 0.25, 0.5, 0.75, 1],
      initialBreakpoint: 0.75,
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data && data.added === true) {
      this.uiAnalytics.trackEvent(
        WATER_TRACKING.TITLE,
        WATER_TRACKING.ACTIONS.ADD_FINISH,
      );
      await this.dismiss();
    }
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      WaterAddComponent.COMPONENT_ID,
    );
  }
  public ngOnInit() {}
}
