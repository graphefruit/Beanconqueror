import { Component, inject, Input, OnInit } from '@angular/core';

import {
  IonButton,
  IonCard,
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

import { Mill } from '../../../classes/mill/mill';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import MILL_TRACKING from '../../../data/tracking/millTracking';
import { IMill } from '../../../interfaces/mill/iMill';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIHelper } from '../../../services/uiHelper';

@Component({
  selector: 'app-mill-detail',
  templateUrl: './mill-detail.component.html',
  styleUrls: ['./mill-detail.component.scss'],
  imports: [
    TranslatePipe,
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonHeader,
    IonButton,
    IonContent,
    IonCard,
    IonItem,
    IonLabel,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class MillDetailComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  uiHelper = inject(UIHelper);
  private readonly uiAnalytics = inject(UIAnalytics);

  public static COMPONENT_ID: string = 'mill-detail';
  @Input('mill') public mill: IMill;
  public data: Mill = new Mill();

  public ionViewWillEnter() {
    this.uiAnalytics.trackEvent(
      MILL_TRACKING.TITLE,
      MILL_TRACKING.ACTIONS.DETAIL,
    );

    if (this.mill) {
      const copy: IMill = this.uiHelper.copyData(this.mill);
      this.data.initializeByObject(copy);
    }
  }

  public ngOnInit() {}
  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      MillDetailComponent.COMPONENT_ID,
    );
  }
}
