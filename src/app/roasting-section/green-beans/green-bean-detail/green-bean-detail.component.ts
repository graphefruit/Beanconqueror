import { Component, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonCard,
  IonCheckbox,
  IonCol,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonRow,
  IonSegment,
  IonSegmentButton,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { Bean } from '../../../../classes/bean/bean';
import { GreenBean } from '../../../../classes/green-bean/green-bean';
import { Settings } from '../../../../classes/settings/settings';
import { BeanInformationComponent } from '../../../../components/bean-information/bean-information.component';
import { BeanDetailSortInformationComponent } from '../../../../components/beans/detail/bean-detail-sort-information/bean-detail-sort-information.component';
import { HeaderDismissButtonComponent } from '../../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../../components/header/header.component';
import GREEN_BEAN_TRACKING from '../../../../data/tracking/greenBeanTracking';
import { IGreenBean } from '../../../../interfaces/green-bean/iGreenBean';
import { FormatDatePipe } from '../../../../pipes/formatDate';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';

@Component({
  selector: 'app-green-bean-detail',
  templateUrl: './green-bean-detail.component.html',
  styleUrls: ['./green-bean-detail.component.scss'],
  imports: [
    FormsModule,
    BeanDetailSortInformationComponent,
    BeanInformationComponent,
    TranslatePipe,
    FormatDatePipe,
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonHeader,
    IonButton,
    IonIcon,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonItem,
    IonCheckbox,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class GreenBeanDetailComponent {
  private readonly modalController = inject(ModalController);
  private uiBeanHelper = inject(UIBeanHelper);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiSettings = inject(UISettingsStorage);

  public static readonly COMPONENT_ID = 'green-bean-detail';
  public data: GreenBean = new GreenBean();
  @Input() public greenBean: IGreenBean;
  public visibleIndex: any = {};

  public bean_segment = 'general';

  public linkedRoasts: Array<Bean> = [];

  public settings: Settings;

  constructor() {
    this.settings = this.uiSettings.getSettings();
  }

  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent(
      GREEN_BEAN_TRACKING.TITLE,
      GREEN_BEAN_TRACKING.ACTIONS.DETAIL,
    );
    this.data = new GreenBean();
    this.data.initializeByObject(this.greenBean);
    // Add one empty bean information, rest is being updated on start
    this.loadRelatedRoastedBeans();
  }

  private loadRelatedRoastedBeans() {
    this.linkedRoasts = this.getRelatedRoastedBeans();
  }

  private getRelatedRoastedBeans(): Array<Bean> {
    return this.uiBeanHelper.getAllRoastedBeansForThisGreenBean(
      this.greenBean.config.uuid,
    );
  }

  public async beanAction(): Promise<void> {
    this.loadRelatedRoastedBeans();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      GreenBeanDetailComponent.COMPONENT_ID,
    );
  }
}
