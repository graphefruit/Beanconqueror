import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Input,
  OnInit,
} from '@angular/core';
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
} from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { Bean } from '../../../classes/bean/bean';
import { Settings } from '../../../classes/settings/settings';
import { StorageClass } from '../../../classes/storageClass';
import { storedOrReported } from '../../../classes/storedOrReported';
import { BeanFreezeInformationComponent } from '../../../components/beans/bean-freeze-information/bean-freeze-information.component';
import { BeanGeneralInformationComponent } from '../../../components/beans/bean-general-information/bean-general-information.component';
import { BeanRoastInformationComponent } from '../../../components/beans/bean-roast-information/bean-roast-information.component';
import { BeanSortInformationComponent } from '../../../components/beans/bean-sort-information/bean-sort-information.component';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import BEAN_TRACKING from '../../../data/tracking/beanTracking';
import { TabPanelDirective } from '../../../directive/tab-panel.directive';
import { BEAN_FREEZING_STORAGE_ENUM } from '../../../enums/beans/beanFreezingStorage';
import { IBean } from '../../../interfaces/bean/iBean';
import { RequiredFields } from '../../../services/a11y/required-fields.service';
import { injectDiscardGuard } from '../../../services/discardGuard/discard-guard';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIImage } from '../../../services/uiImage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIToast } from '../../../services/uiToast';
import {
  aloneInFrozenGroup,
  hasBeanName,
  needsFrozenId,
} from '../../../stores/beans/bean-form-rules';
import { hasFrozenInformation } from '../../../stores/beans/bean-rules';

@Component({
  selector: 'beans-edit',
  templateUrl: './beans-edit.component.html',
  styleUrls: ['./beans-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    TabPanelDirective,
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
  private readonly requiredFields = inject(RequiredFields);
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly modalController = inject(ModalController);
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiImage = inject(UIImage);
  private readonly uiToast = inject(UIToast);
  private readonly uiAnalytics = inject(UIAnalytics);
  readonly uiBeanHelper = inject(UIBeanHelper);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiAlert = inject(UIAlert);

  public static readonly COMPONENT_ID: string = 'bean-edit';
  public settings: Settings = undefined;
  public data: Bean;
  @Input() public bean: IBean;
  public bean_segment = 'general';
  private initialBeanData: string = '';
  private readonly discardGuard = injectDiscardGuard({
    question: 'PAGE_BEANS_DISCARD_CONFIRM',
    changed: () => JSON.stringify(this.data) !== this.initialBeanData,
    close: () => this.dismiss(),
  });

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.EDIT,
    );
    this.data = new Bean();
    this.data.initializeByObject(this.bean);
    // The form edits the sorts in place; the stored bean keeps its own until saved.
    this.data.bean_information = StorageClass.cloneData(
      this.data.bean_information,
    );
    this.initialBeanData = JSON.stringify(this.data);
  }

  public async editBean() {
    if (hasBeanName(this.data)) {
      await this.__editBean();
    } else {
      await this.requiredFields.report(
        this.host,
        () => (this.bean_segment = 'general'),
      );
    }
  }

  public confirmDismiss(): Promise<void> {
    return this.discardGuard.confirmDismiss();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BeansEditComponent.COMPONENT_ID,
    );
  }

  private async __editBean() {
    const originalFrozenGroupId = this.bean.frozenGroupId;
    if (!hasFrozenInformation(this.data)) {
      this.data.frozenGroupId = '';
      this.data.frozenId = '';
      this.data.frozenStorageType = BEAN_FREEZING_STORAGE_ENUM.UNKNOWN;
    }
    if (needsFrozenId(this.data)) {
      this.data.frozenId = this.uiBeanHelper.generateFrozenId();
    }
    if (
      !(await storedOrReported(this.uiAlert, () =>
        this.uiBeanStorage.update(this.data),
      ))
    ) {
      return;
    }
    await this.uiImage.deleteRemovedPhotos(this.data);

    if (originalFrozenGroupId && !this.data.frozenGroupId) {
      const lastBean = aloneInFrozenGroup<Bean>(
        this.uiBeanStorage.getAllEntries(),
        originalFrozenGroupId,
        this.data.config.uuid,
      );
      if (lastBean) {
        lastBean.frozenGroupId = '';
        await this.uiBeanStorage.update(lastBean);
      }
    }

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
  }
}
