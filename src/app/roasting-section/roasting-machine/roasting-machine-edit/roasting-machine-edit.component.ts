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
  IonInput,
  IonItem,
  IonLabel,
  IonRow,
  IonTextarea,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { RoastingMachine } from '../../../../classes/roasting-machine/roasting-machine';
import { HeaderDismissButtonComponent } from '../../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../../components/header/header.component';
import { PhotoAddComponent } from '../../../../components/photo-add/photo-add.component';
import ROASTING_MACHINE_TRACKING from '../../../../data/tracking/roastingMachineTracking';
import { IRoastingMachine } from '../../../../interfaces/roasting-machine/iRoastingMachine';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIHelper } from '../../../../services/uiHelper';
import { UIRoastingMachineStorage } from '../../../../services/uiRoastingMachineStorage';
import { UIToast } from '../../../../services/uiToast';

@Component({
  selector: 'app-roasting-machine-edit',
  templateUrl: './roasting-machine-edit.component.html',
  styleUrls: ['./roasting-machine-edit.component.scss'],
  imports: [
    FormsModule,
    PhotoAddComponent,
    TranslatePipe,
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonHeader,
    IonButton,
    IonContent,
    IonCard,
    IonItem,
    IonInput,
    IonCheckbox,
    IonLabel,
    IonTextarea,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class RoastingMachineEditComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiRoastingMachineStorage = inject(UIRoastingMachineStorage);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiToast = inject(UIToast);
  private readonly uiAnalytics = inject(UIAnalytics);

  public static COMPONENT_ID: string = 'roasting-machine-edit';

  public data: RoastingMachine = new RoastingMachine();

  @Input() private roastingMachine: IRoastingMachine;

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      ROASTING_MACHINE_TRACKING.TITLE,
      ROASTING_MACHINE_TRACKING.ACTIONS.EDIT,
    );
    this.data = this.uiHelper.copyData(this.roastingMachine);
  }

  public async edit(form) {
    if (form.valid) {
      await this.__edit();
    }
  }

  public async __edit() {
    await this.uiRoastingMachineStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_ROASTING_MACHINE_EDITED_SUCCESSFULLY');
    this.uiAnalytics.trackEvent(
      ROASTING_MACHINE_TRACKING.TITLE,
      ROASTING_MACHINE_TRACKING.ACTIONS.EDIT_FINISH,
    );
    this.dismiss();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      RoastingMachineEditComponent.COMPONENT_ID,
    );
  }
  public ngOnInit() {}
}
