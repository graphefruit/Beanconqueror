import { Component, Input, OnInit, inject } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { UIHelper } from '../../../../services/uiHelper';
import { UIToast } from '../../../../services/uiToast';
import { UIRoastingMachineStorage } from '../../../../services/uiRoastingMachineStorage';
import { RoastingMachine } from '../../../../classes/roasting-machine/roasting-machine';
import { IRoastingMachine } from '../../../../interfaces/roasting-machine/iRoastingMachine';
import ROASTING_MACHINE_TRACKING from '../../../../data/tracking/roastingMachineTracking';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { FormsModule } from '@angular/forms';
import { PhotoAddComponent } from '../../../../components/photo-add/photo-add.component';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonButton,
  IonIcon,
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
} from '@ionic/angular/standalone';
import { HeaderComponent } from '../../../../components/header/header.component';
import { HeaderDismissButtonComponent } from '../../../../components/header/header-dismiss-button.component';

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
    IonIcon,
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
