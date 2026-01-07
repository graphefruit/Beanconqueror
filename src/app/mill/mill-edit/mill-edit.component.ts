import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { Mill } from '../../../classes/mill/mill';
import { UIHelper } from '../../../services/uiHelper';
import { IMill } from '../../../interfaces/mill/iMill';
import { UIToast } from '../../../services/uiToast';
import MILL_TRACKING from '../../../data/tracking/millTracking';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { FormsModule } from '@angular/forms';
import { PhotoAddComponent } from '../../../components/photo-add/photo-add.component';
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
  IonInput,
  IonCheckbox,
  IonLabel,
  IonTextarea,
  IonFooter,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';

@Component({
  selector: 'mill-edit',
  templateUrl: './mill-edit.component.html',
  styleUrls: ['./mill-edit.component.scss'],
  imports: [
    FormsModule,
    PhotoAddComponent,
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
    IonInput,
    IonCheckbox,
    IonLabel,
    IonTextarea,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class MillEditComponent implements OnInit {
  public static COMPONENT_ID: string = 'mill-edit';
  public data: Mill = new Mill();

  @Input() private mill: IMill;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiMillStorage: UIMillStorage,
    private readonly uiHelper: UIHelper,
    private readonly uiToast: UIToast,
    private readonly uiAnalytics: UIAnalytics,
  ) {}

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      MILL_TRACKING.TITLE,
      MILL_TRACKING.ACTIONS.EDIT,
    );
    this.data = this.uiHelper.copyData(this.mill);
  }

  public async editMill(form) {
    if (form.valid) {
      await this.__editMill();
    }
  }

  public async __editMill() {
    await this.uiMillStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_MILL_EDITED_SUCCESSFULLY');
    this.uiAnalytics.trackEvent(
      MILL_TRACKING.TITLE,
      MILL_TRACKING.ACTIONS.EDIT_FINISH,
    );
    this.dismiss();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      MillEditComponent.COMPONENT_ID,
    );
  }
  public ngOnInit() {}
}
