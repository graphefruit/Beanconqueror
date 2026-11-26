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
  Platform,
} from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';
import moment from 'moment';

import { Bean } from '../../../classes/bean/bean';
import { GreenBean } from '../../../classes/green-bean/green-bean';
import { Settings } from '../../../classes/settings/settings';
import { storedOrReported } from '../../../classes/storedOrReported';
import { BeanFreezeInformationComponent } from '../../../components/beans/bean-freeze-information/bean-freeze-information.component';
import { BeanGeneralInformationComponent } from '../../../components/beans/bean-general-information/bean-general-information.component';
import { BeanRoastInformationComponent } from '../../../components/beans/bean-roast-information/bean-roast-information.component';
import { BeanSortInformationComponent } from '../../../components/beans/bean-sort-information/bean-sort-information.component';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import BEAN_TRACKING from '../../../data/tracking/beanTracking';
import TrackContentImpression from '../../../data/tracking/trackContentImpression/trackContentImpression';
import { DisableDoubleClickDirective } from '../../../directive/disable-double-click.directive';
import { TabPanelDirective } from '../../../directive/tab-panel.directive';
import { BEAN_MIX_ENUM } from '../../../enums/beans/mix';
import { IBeanInformation } from '../../../interfaces/bean/iBeanInformation';
import { ServerBean } from '../../../models/bean/serverBean';
import { RequiredFields } from '../../../services/a11y/required-fields.service';
import { injectDiscardGuard } from '../../../services/discardGuard/discard-guard';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIToast } from '../../../services/uiToast';
import {
  hasBeanName,
  hasSortInformation,
  needsFrozenId,
} from '../../../stores/beans/bean-form-rules';

@Component({
  selector: 'beans-add',
  templateUrl: './beans-add.component.html',
  styleUrls: ['./beans-add.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    TabPanelDirective,
    FormsModule,
    BeanRoastInformationComponent,
    BeanGeneralInformationComponent,
    BeanFreezeInformationComponent,
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
export class BeansAddComponent implements OnInit {
  private readonly requiredFields = inject(RequiredFields);
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly modalController = inject(ModalController);
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiToast = inject(UIToast);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiAlert = inject(UIAlert);
  private readonly platform = inject(Platform);
  readonly uiBeanHelper = inject(UIBeanHelper);
  private readonly uiSettingsStorage = inject(UISettingsStorage);

  public static readonly COMPONENT_ID = 'bean-add';
  public data: Bean = new Bean();
  @Input() private readonly bean_template: Bean;
  @Input() private readonly reuse_attachments: boolean = false;
  @Input() private readonly server_bean: ServerBean;
  @Input() private readonly user_shared_bean: Bean;

  @Input() private hide_toast_message: boolean;
  @Input() private greenBean: GreenBean;

  public bean_segment = 'general';
  public settings: Settings = undefined;

  private initialBeanData: string = '';
  private readonly discardGuard = injectDiscardGuard({
    question: 'PAGE_BEANS_DISCARD_CONFIRM',
    changed: () => JSON.stringify(this.data) !== this.initialBeanData,
    close: () => this.dismiss(),
  });

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  private async checkIfInformationAreSetButNotDisplayed() {
    try {
      const params = this.settings.bean_manage_parameters;
      if (this.data.bean_information.length > 0) {
        if (
          params.bean_information === false &&
          hasSortInformation(this.data.bean_information[0])
        ) {
          //Woopsi doopsi, user hasn't enabled the bean_information, lets display him a popover
          //#623
          const choice = await this.uiAlert.showConfirm(
            'BEAN_POPUP_YOU_DONT_SEE_EVERYTHING_DESCRIPTION',
            'INFORMATION',
            true,
          );
          if (choice !== 'YES') {
            return;
          }
          this.settings.bean_manage_parameters.bean_information = true;
          await this.uiSettingsStorage.update(this.settings);
        }
      }
    } catch (ex) {}
  }

  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent(BEAN_TRACKING.TITLE, BEAN_TRACKING.ACTIONS.ADD);

    // It just can be a bean template (bean will be repeated, or a green bean, both is not working)
    // TODO how to handle roasting beans which wil be repeated?
    if (this.bean_template) {
      await this.__loadBean(this.bean_template);
      await this.checkIfInformationAreSetButNotDisplayed();
    }

    // Download images after loading the bean, else they would be copied :O
    if (this.server_bean && this.platform.is('capacitor')) {
      if (this.server_bean.attachment.length > 0) {
        // await this.uiAlert.showLoadingSpinner();
        // this.uiAlert.setLoadingSpinnerMessage('QR.IMAGES_GETTING_DOWNLOADED');
        // We don't support attachments yet.
        // const newMapper = new BeanMapper();
        // await newMapper.downloadAndAttachAttachments(this.data, this.server_bean.attachment);
        // await this.uiAlert.hideLoadingSpinner();
      }
    }

    // Add one empty bean information, rest is being updated on start
    if (this.data.bean_information.length <= 0) {
      const beanInformation: IBeanInformation = {} as IBeanInformation;
      this.data.bean_information.push(beanInformation);
    }

    if (this.greenBean) {
      this.loadGreenBeanInformation();
    }
    this.initialBeanData = JSON.stringify(this.data);
  }

  public async addBean() {
    if (hasBeanName(this.data)) {
      await this.__addBean();
    } else {
      await this.requiredFields.report(
        this.host,
        () => (this.bean_segment = 'general'),
      );
    }
  }

  private loadGreenBeanInformation() {
    if (this.greenBean) {
      this.data.bean_roast_information.bean_uuid = this.greenBean.config.uuid;
      // The form edits the sorts in place; the green bean keeps its own.
      this.data.bean_information = this.uiHelper.cloneData(
        this.greenBean.bean_information,
      );

      this.data.name = this.greenBean.name;
      this.data.cupping_points = this.greenBean.cupping_points;
      this.data.ean_article_number = this.greenBean.ean_article_number;
      this.data.url = this.greenBean.url;
      this.data.decaffeinated = this.greenBean.decaffeinated;
      this.data.aromatics = this.greenBean.aromatics;
      this.data.note = this.greenBean.note;
      this.data.beanMix = 'SINGLE_ORIGIN' as BEAN_MIX_ENUM;
      this.data.roastingDate = moment().format();
    }
  }

  public confirmDismiss(): Promise<void> {
    return this.discardGuard.confirmDismiss();
  }

  public async __addBean() {
    if (needsFrozenId(this.data)) {
      this.data.frozenId = this.uiBeanHelper.generateFrozenId();
    }
    if (
      !(await storedOrReported(this.uiAlert, () =>
        this.uiBeanStorage.addAndConfirm(this.data),
      ))
    ) {
      return;
    }

    const eventsToTrack = [];
    const impressionsToTrack = [];

    if (this.data.roaster) {
      eventsToTrack.push({
        category: BEAN_TRACKING.TITLE,
        action: BEAN_TRACKING.ACTIONS.ADD_FINISH,
        name: this.data.name + '_' + this.data.roaster,
      });
    } else {
      eventsToTrack.push({
        category: BEAN_TRACKING.TITLE,
        action: BEAN_TRACKING.ACTIONS.ADD_FINISH,
        name: this.data.name + '_-',
      });
    }

    eventsToTrack.push({
      category: BEAN_TRACKING.TITLE,
      action:
        BEAN_TRACKING.ACTIONS.ADD_ROASTER + '_' + (this.data.roaster || '-'),
      name: this.data.name,
    });

    if (this.data.roaster) {
      impressionsToTrack.push({
        contentName: TrackContentImpression.STATISTICS_ROASTER_NAME,
        contentPiece: this.data.roaster,
      });
      impressionsToTrack.push({
        contentName: TrackContentImpression.STATISTICS_BEAN_ROASTER_NAME,
        contentPiece: this.data.roaster + ' | ' + this.data.name,
      });
    } else {
      impressionsToTrack.push({
        contentName: TrackContentImpression.STATISTICS_BEAN_ROASTER_NAME,
        contentPiece: ' - | ' + this.data.name,
      });
    }

    if (eventsToTrack.length > 0) {
      this.uiAnalytics.trackBulkEvents(eventsToTrack);
    }

    if (impressionsToTrack.length > 0) {
      this.uiAnalytics.trackBulkContentImpressions(impressionsToTrack);
    }

    this.uiBeanHelper.logUsedBeanParameters();
    this.dismiss('saved');
    if (!this.hide_toast_message) {
      this.uiToast.showInfoToast('TOAST_BEAN_ADDED_SUCCESSFULLY');
    }
  }

  public dismiss(role?: string): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      role,
      BeansAddComponent.COMPONENT_ID,
    );
  }

  private async __loadBean(_bean: Bean) {
    this.data.name = _bean.name;
    this.data.roastingDate = _bean.roastingDate;
    this.data.note = _bean.note;
    this.data.roaster = _bean.roaster;
    this.data.roast = _bean.roast;
    this.data.beanMix = _bean.beanMix;

    this.data.roast_custom = _bean.roast_custom;
    this.data.aromatics = _bean.aromatics;
    this.data.weight = _bean.weight;
    this.data.finished = false;
    this.data.cost = _bean.cost;

    this.data.bean_roasting_type = _bean.bean_roasting_type;
    this.data.decaffeinated = _bean.decaffeinated;
    this.data.url = _bean.url;
    this.data.ean_article_number = _bean.ean_article_number;
    this.data.co2e_kg = _bean.co2e_kg;

    this.data.bean_information = this.uiHelper.cloneData(
      _bean.bean_information,
    );
    this.data.cupping_points = _bean.cupping_points;
    this.data.roast_range = _bean.roast_range;

    if (!this.user_shared_bean && !this.reuse_attachments) {
      const copyAttachments = [];
      for (const attachment of _bean.attachments) {
        try {
          const newPath: string =
            await this.uiFileHelper.duplicateInternalFile(attachment);
          copyAttachments.push(newPath);
        } catch (ex) {}
      }
      this.data.attachments = copyAttachments;
    } else {
      // For user_shared_bean: attachments already downloaded, no duplication needed.
      // For reuse_attachments (AI import): photos are already in place, reuse them directly.
      this.data.attachments = _bean.attachments;
    }

    if (_bean.cupped_flavor) {
      this.data.cupped_flavor = _bean.cupped_flavor;
    }
    if (_bean.cupping) {
      this.data.cupping = _bean.cupping;
    }

    this.data.qr_code = _bean.qr_code;
  }
}
