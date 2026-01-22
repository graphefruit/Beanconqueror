import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonCard,
  IonCheckbox,
  IonCol,
  IonContent,
  IonFooter,
  IonHeader,
  IonItem,
  IonLabel,
  IonRow,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { Water } from '../../../../classes/water/water';
import { HeaderDismissButtonComponent } from '../../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../../components/header/header.component';
import WATER_TRACKING from '../../../../data/tracking/waterTracking';
import { WATER_UNIT } from '../../../../enums/water/waterUnit';
import { WATER_UNIT_TDS } from '../../../../enums/water/waterUnitTds';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIHelper } from '../../../../services/uiHelper';
import { UIWaterHelper } from '../../../../services/uiWaterHelper';

@Component({
  selector: 'app-water-detail',
  templateUrl: './water-detail.component.html',
  styleUrls: ['./water-detail.component.scss'],
  imports: [
    FormsModule,
    TranslatePipe,
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonHeader,
    IonButton,
    IonContent,
    IonCard,
    IonItem,
    IonLabel,
    IonCheckbox,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class WaterDetailComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiAnalytics = inject(UIAnalytics);

  public static COMPONENT_ID = 'water-detail';
  public data: Water = new Water();

  @Input() private water: Water;

  public waterPropertyEnum = WATER_UNIT;
  public waterPropertyTdsEnum = WATER_UNIT_TDS;

  public ionViewWillEnter() {
    this.uiAnalytics.trackEvent(
      WATER_TRACKING.TITLE,
      WATER_TRACKING.ACTIONS.DETAIL,
    );
    this.data = this.uiHelper.copyData(this.water);
  }

  public ngOnInit() {}
  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      WaterDetailComponent.COMPONENT_ID,
    );
  }
}
