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
  Platform,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { Bean } from '../../../classes/bean/bean';
import { Settings } from '../../../classes/settings/settings';
import { BeanFreezeInformationComponent } from '../../../components/beans/bean-freeze-information/bean-freeze-information.component';
import { BeanGeneralInformationComponent } from '../../../components/beans/bean-general-information/bean-general-information.component';
import { BeanRoastInformationComponent } from '../../../components/beans/bean-roast-information/bean-roast-information.component';
import { BeanSortInformationComponent } from '../../../components/beans/bean-sort-information/bean-sort-information.component';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import BEAN_TRACKING from '../../../data/tracking/beanTracking';
import { IBean } from '../../../interfaces/bean/iBean';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIToast } from '../../../services/uiToast';

@Component({
  selector: 'beans-edit',
  templateUrl: './beans-edit.component.html',
  styleUrls: ['./beans-edit.component.scss'],
  imports: [
    FormsModule,
    BeanRoastInformationComponent,
    BeanGeneralInformationComponent,
    BeanFreezeInformationComponent,
    BeanSortInformationComponent,
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
export class BeansEditComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiToast = inject(UIToast);
  private readonly uiAnalytics = inject(UIAnalytics);
  readonly uiBeanHelper = inject(UIBeanHelper);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiAlert = inject(UIAlert);
  private readonly platform = inject(Platform);

  public static readonly COMPONENT_ID: string = 'bean-edit';
  public settings: Settings = undefined;
  public data: Bean;
  @Input() public bean: IBean;
  public bean_segment = 'general';
  private initialBeanData: string = '';
  private disableHardwareBack: Subscription;

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.EDIT,
    );
    this.data = new Bean();
    this.data.initializeByObject(this.bean);
    this.initialBeanData = JSON.stringify(this.data);
  }

  public async editBean() {
    if (this.__formValid()) {
      await this.__editBean();
    }
  }

  public async confirmDismiss(): Promise<void> {
    if (
      this.settings.security_check_when_going_back === false ||
      JSON.stringify(this.data) === this.initialBeanData
    ) {
      this.dismiss();
      return;
    }

    const choice = await this.uiAlert.showConfirm(
      'PAGE_BEANS_DISCARD_CONFIRM',
      'SURE_QUESTION',
      true,
    );
    if (choice === 'YES') {
      this.dismiss();
    }
  }

  public dismiss(): void {
    try {
      if (this.settings.security_check_when_going_back === true) {
        this.disableHardwareBack.unsubscribe();
      }
    } catch (ex) {}
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BeansEditComponent.COMPONENT_ID,
    );
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
    if (this.data.frozenDate && this.data.frozenId === '') {
      this.data.frozenId = this.uiBeanHelper.generateFrozenId();
    }
    await this.uiBeanStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_BEAN_EDITED_SUCCESSFULLY');
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.EDIT_FINISH,
    );
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.EDIT_ROASTER + '_' + this.data.roaster,
      this.data.name,
    );
    this.dismiss();
  }

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
    if (this.settings.security_check_when_going_back === true) {
      this.disableHardwareBack = this.platform.backButton.subscribeWithPriority(
        9999,
        async () => {
          // Only go back after confirmation
          await this.confirmDismiss();
        },
      );
    }
  }
}
