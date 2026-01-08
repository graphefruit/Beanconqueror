import { Component, Input, OnInit, inject } from '@angular/core';

import { ModalController } from '@ionic/angular/standalone';
import { UIHelper } from '../../../../services/uiHelper';
import { Water } from '../../../../classes/water/water';
import { WATER_UNIT } from '../../../../enums/water/waterUnit';
import { WATER_UNIT_TDS } from '../../../../enums/water/waterUnitTds';
import WATER_TRACKING from '../../../../data/tracking/waterTracking';
import { UIWaterHelper } from '../../../../services/uiWaterHelper';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonButton,
  IonIcon,
  IonContent,
  IonCard,
  IonItem,
  IonLabel,
  IonCheckbox,
  IonFooter,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';
import { HeaderComponent } from '../../../../components/header/header.component';
import { HeaderDismissButtonComponent } from '../../../../components/header/header-dismiss-button.component';

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
    IonIcon,
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
