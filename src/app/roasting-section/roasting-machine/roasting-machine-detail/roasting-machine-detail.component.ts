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

import { RoastingMachine } from '../../../../classes/roasting-machine/roasting-machine';
import { HeaderDismissButtonComponent } from '../../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../../components/header/header.component';
import ROASTING_MACHINE_TRACKING from '../../../../data/tracking/roastingMachineTracking';
import { IRoastingMachine } from '../../../../interfaces/roasting-machine/iRoastingMachine';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIHelper } from '../../../../services/uiHelper';

@Component({
  selector: 'app-roasting-machine-detail',
  templateUrl: './roasting-machine-detail.component.html',
  styleUrls: ['./roasting-machine-detail.component.scss'],
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
export class RoastingMachineDetailComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  uiHelper = inject(UIHelper);
  private readonly uiAnalytics = inject(UIAnalytics);

  public static COMPONENT_ID: string = 'roasting-machine-detail';
  public data: RoastingMachine = new RoastingMachine();

  @Input() private roastingMachine: IRoastingMachine;

  public ionViewWillEnter() {
    this.uiAnalytics.trackEvent(
      ROASTING_MACHINE_TRACKING.TITLE,
      ROASTING_MACHINE_TRACKING.ACTIONS.DETAIL,
    );
    this.data = this.uiHelper.copyData(this.roastingMachine);
  }

  public ngOnInit() {}
  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      RoastingMachineDetailComponent.COMPONENT_ID,
    );
  }
}
