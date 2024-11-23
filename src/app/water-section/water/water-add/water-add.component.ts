import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UIToast } from '../../../../services/uiToast';
import { UIWaterStorage } from '../../../../services/uiWaterStorage';
import { Water } from '../../../../classes/water/water';
import WATER_TRACKING from '../../../../data/tracking/waterTracking';
import { UIAnalytics } from '../../../../services/uiAnalytics';

import { WATER_TYPES } from '../../../../enums/water/waterTypes';
import { WaterAddTypeComponent } from '../water-add-type/water-add-type.component';

@Component({
  selector: 'app-water-add',
  templateUrl: './water-add.component.html',
  styleUrls: ['./water-add.component.scss'],
})
export class WaterAddComponent implements OnInit {
  public static COMPONENT_ID = 'water-add';

  public data: Water = new Water();

  public water_type_enums = WATER_TYPES;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiWaterStorage: UIWaterStorage,
    private readonly uiToast: UIToast,
    private readonly uiAnalytics: UIAnalytics
  ) {}

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      WATER_TRACKING.TITLE,
      WATER_TRACKING.ACTIONS.ADD
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
        WATER_TRACKING.ACTIONS.ADD_FINISH
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
      WaterAddComponent.COMPONENT_ID
    );
  }
  public ngOnInit() {}
}
