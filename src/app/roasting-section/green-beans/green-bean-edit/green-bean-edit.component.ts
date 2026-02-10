import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonCol,
  IonContent,
  IonFooter,
  IonHeader,
  IonLabel,
  IonRow,
  IonSegment,
  IonSegmentButton,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { GreenBean } from '../../../../classes/green-bean/green-bean';
import { BeanSortInformationComponent } from '../../../../components/beans/bean-sort-information/bean-sort-information.component';
import { GreenBeanGeneralInformationComponent } from '../../../../components/beans/green-bean-general-information/green-bean-general-information.component';
import { HeaderDismissButtonComponent } from '../../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../../components/header/header.component';
import GREEN_BEAN_TRACKING from '../../../../data/tracking/greenBeanTracking';
import { DisableDoubleClickDirective } from '../../../../directive/disable-double-click.directive';
import { IGreenBean } from '../../../../interfaces/green-bean/iGreenBean';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIFileHelper } from '../../../../services/uiFileHelper';
import { UIGreenBeanStorage } from '../../../../services/uiGreenBeanStorage';
import { UIHelper } from '../../../../services/uiHelper';
import { UIImage } from '../../../../services/uiImage';
import { UIToast } from '../../../../services/uiToast';

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
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonHeader,
    IonButton,
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
