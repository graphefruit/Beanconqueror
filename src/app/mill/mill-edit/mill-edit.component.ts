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

import { Mill } from '../../../classes/mill/mill';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { PhotoAddComponent } from '../../../components/photo-add/photo-add.component';
import MILL_TRACKING from '../../../data/tracking/millTracking';
import { IMill } from '../../../interfaces/mill/iMill';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIHelper } from '../../../services/uiHelper';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIToast } from '../../../services/uiToast';

@Component({
  selector: 'mill-edit',
  templateUrl: './mill-edit.component.html',
  styleUrls: ['./mill-edit.component.scss'],
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
export class MillEditComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiToast = inject(UIToast);
  private readonly uiAnalytics = inject(UIAnalytics);

  public static COMPONENT_ID: string = 'mill-edit';
  public data: Mill = new Mill();

  @Input() private mill: IMill;

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
