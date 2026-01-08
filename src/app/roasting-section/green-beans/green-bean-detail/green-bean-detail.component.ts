import { Component, Input, inject } from '@angular/core';
import { GreenBean } from '../../../../classes/green-bean/green-bean';
import { IGreenBean } from '../../../../interfaces/green-bean/iGreenBean';
import { ModalController } from '@ionic/angular/standalone';
import { Bean } from '../../../../classes/bean/bean';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';
import GREEN_BEAN_TRACKING from '../../../../data/tracking/greenBeanTracking';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { Settings } from '../../../../classes/settings/settings';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { FormsModule } from '@angular/forms';
import { BeanDetailSortInformationComponent } from '../../../../components/beans/detail/bean-detail-sort-information/bean-detail-sort-information.component';
import { BeanInformationComponent } from '../../../../components/bean-information/bean-information.component';
import { TranslatePipe } from '@ngx-translate/core';
import { FormatDatePipe } from '../../../../pipes/formatDate';
import {
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
} from '@ionic/angular/standalone';
import { HeaderComponent } from '../../../../components/header/header.component';
import { HeaderDismissButtonComponent } from '../../../../components/header/header-dismiss-button.component';

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
