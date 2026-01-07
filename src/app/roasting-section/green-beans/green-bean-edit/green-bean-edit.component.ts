import { Component, Input, OnInit, inject } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { GreenBean } from '../../../../classes/green-bean/green-bean';
import { UIGreenBeanStorage } from '../../../../services/uiGreenBeanStorage';
import { UIImage } from '../../../../services/uiImage';
import { UIHelper } from '../../../../services/uiHelper';
import { UIFileHelper } from '../../../../services/uiFileHelper';
import { UIToast } from '../../../../services/uiToast';

import { IGreenBean } from '../../../../interfaces/green-bean/iGreenBean';
import GREEN_BEAN_TRACKING from '../../../../data/tracking/greenBeanTracking';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { FormsModule } from '@angular/forms';
import { GreenBeanGeneralInformationComponent } from '../../../../components/beans/green-bean-general-information/green-bean-general-information.component';
import { BeanSortInformationComponent } from '../../../../components/beans/bean-sort-information/bean-sort-information.component';
import { DisableDoubleClickDirective } from '../../../../directive/disable-double-click.directive';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonFooter,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';

@Component({
  selector: 'green-bean-edit',
  templateUrl: './green-bean-edit.component.html',
  styleUrls: ['./green-bean-edit.component.scss'],
  imports: [
    FormsModule,
    GreenBeanGeneralInformationComponent,
    BeanSortInformationComponent,
    DisableDoubleClickDirective,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class GreenBeanEditComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiGreenBeanStorage = inject(UIGreenBeanStorage);
  private readonly uiImage = inject(UIImage);
  uiHelper = inject(UIHelper);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiToast = inject(UIToast);
  private readonly uiAnalytics = inject(UIAnalytics);

  public static COMPONENT_ID: string = 'green-bean-edit';

  public data: GreenBean = new GreenBean();
  @Input() public greenBean: IGreenBean;

  public bean_segment = 'general';

  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent(
      GREEN_BEAN_TRACKING.TITLE,
      GREEN_BEAN_TRACKING.ACTIONS.EDIT,
    );
    this.data = new GreenBean();
    this.data.initializeByObject(this.greenBean);
  }

  public async editBean() {
    if (this.__formValid()) {
      await this.__editBean();
    }
  }

  private __formValid(): boolean {
    let valid: boolean = true;
    const name: string = this.data.name;
    if (name === undefined || name.trim() === '') {
      valid = false;
    }

    return valid;
  }
  private async __editBean() {
    await this.uiGreenBeanStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_GREEN_BEAN_EDITED_SUCCESSFULLY');
    this.uiAnalytics.trackEvent(
      GREEN_BEAN_TRACKING.TITLE,
      GREEN_BEAN_TRACKING.ACTIONS.EDIT_FINISH,
    );
    this.dismiss();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      GreenBeanEditComponent.COMPONENT_ID,
    );
  }

  public ngOnInit() {}
}
