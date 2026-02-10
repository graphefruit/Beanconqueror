import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonCol,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonRow,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { RoastingMachine } from '../../../../classes/roasting-machine/roasting-machine';
import ROASTING_MACHINE_TRACKING from '../../../../data/tracking/roastingMachineTracking';
import { DisableDoubleClickDirective } from '../../../../directive/disable-double-click.directive';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIRoastingMachineStorage } from '../../../../services/uiRoastingMachineStorage';
import { UIToast } from '../../../../services/uiToast';

@Component({
  selector: 'app-roasting-machine-add',
  templateUrl: './roasting-machine-add.component.html',
  styleUrls: ['./roasting-machine-add.component.scss'],
  imports: [
    FormsModule,
    DisableDoubleClickDirective,
    TranslatePipe,
    IonHeader,
    IonContent,
    IonItem,
    IonInput,
    IonRow,
    IonCol,
    IonButton,
  ],
})
export class RoastingMachineAddComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiRoastingMachineStorage = inject(UIRoastingMachineStorage);
  private readonly uiToast = inject(UIToast);
  private readonly uiAnalytics = inject(UIAnalytics);

  public static COMPONENT_ID: string = 'roasting-machine-add';
  public data: RoastingMachine = new RoastingMachine();

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      ROASTING_MACHINE_TRACKING.TITLE,
      ROASTING_MACHINE_TRACKING.ACTIONS.ADD,
    );
  }
  public async add() {
    if (this.data.name) {
      await this.__add();
    }
  }

  public async __add() {
    await this.uiRoastingMachineStorage.add(this.data);
    this.uiAnalytics.trackEvent(
      ROASTING_MACHINE_TRACKING.TITLE,
      ROASTING_MACHINE_TRACKING.ACTIONS.ADD_FINISH,
    );
    this.uiToast.showInfoToast('TOAST_ROASTING_MACHINE_ADDED_SUCCESSFULLY');
    this.dismiss();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      RoastingMachineAddComponent.COMPONENT_ID,
    );
  }
  public ngOnInit() {}
}
