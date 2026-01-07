import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { UIHelper } from '../../../../services/uiHelper';
import { RoastingMachine } from '../../../../classes/roasting-machine/roasting-machine';
import { IRoastingMachine } from '../../../../interfaces/roasting-machine/iRoastingMachine';
import ROASTING_MACHINE_TRACKING from '../../../../data/tracking/roastingMachineTracking';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonCard,
  IonItem,
  IonLabel,
  IonFooter,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-roasting-machine-detail',
  templateUrl: './roasting-machine-detail.component.html',
  styleUrls: ['./roasting-machine-detail.component.scss'],
  imports: [
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
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
  public static COMPONENT_ID: string = 'roasting-machine-detail';
  public data: RoastingMachine = new RoastingMachine();

  @Input() private roastingMachine: IRoastingMachine;

  constructor(
    private readonly modalController: ModalController,
    public uiHelper: UIHelper,
    private readonly uiAnalytics: UIAnalytics,
  ) {}

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
