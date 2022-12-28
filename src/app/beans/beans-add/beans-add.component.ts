import { Component, Input, OnInit } from '@angular/core';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIHelper } from '../../../services/uiHelper';
import { UIImage } from '../../../services/uiImage';
import { Bean } from '../../../classes/bean/bean';
import { ModalController, NavParams, Platform } from '@ionic/angular';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIToast } from '../../../services/uiToast';
import { IBeanInformation } from '../../../interfaces/bean/iBeanInformation';
import { GreenBean } from '../../../classes/green-bean/green-bean';
import { BEAN_MIX_ENUM } from '../../../enums/beans/mix';
import moment from 'moment';
import BEAN_TRACKING from '../../../data/tracking/beanTracking';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { ServerBean } from '../../../models/bean/serverBean';
import { UIAlert } from '../../../services/uiAlert';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';

@Component({
  selector: 'beans-add',
  templateUrl: './beans-add.component.html',
  styleUrls: ['./beans-add.component.scss'],
})
export class BeansAddComponent implements OnInit {
  public static COMPONENT_ID = 'bean-add';
  public data: Bean = new Bean();
  @Input() private readonly bean_template: Bean;
  @Input() private readonly server_bean: ServerBean;
  @Input() private readonly user_shared_bean: Bean;

  @Input() private hide_toast_message: boolean;
  @Input() private greenBean: GreenBean;

  public bean_segment = 'general';
  public settings: Settings = undefined;

  constructor(
    private readonly modalController: ModalController,
    private readonly navParams: NavParams,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiImage: UIImage,
    private readonly uiHelper: UIHelper,
    private readonly uiFileHelper: UIFileHelper,
    private readonly uiToast: UIToast,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiAlert: UIAlert,
    private readonly platform: Platform,
    public readonly uiBeanHelper: UIBeanHelper,
    private readonly uiSettingsStorage: UISettingsStorage
  ) {}

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent(BEAN_TRACKING.TITLE, BEAN_TRACKING.ACTIONS.ADD);

    // It just can be a bean template (bean will be repeated, or a green bean, both is not working)
    // TODO how to handle roasting beans which wil be repeated?
    if (this.bean_template) {
      await this.__loadBean(this.bean_template);
    }

    // Download images after loading the bean, else they would be copied :O
    if (this.server_bean && this.platform.is('cordova')) {
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
  }

  public async addBean() {
    if (this.__formValid()) {
      await this.__addBean();
    }
  }

  private loadGreenBeanInformation() {
    if (this.greenBean) {
      this.data.bean_roast_information.bean_uuid = this.greenBean.config.uuid;
      this.data.bean_information = this.greenBean.bean_information;

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

  public async __addBean() {
    await this.uiBeanStorage.add(this.data);
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.ADD_FINISH
    );
    this.dismiss();
    if (!this.hide_toast_message) {
      this.uiToast.showInfoToast('TOAST_BEAN_ADDED_SUCCESSFULLY');
    }
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BeansAddComponent.COMPONENT_ID
    );
  }

  private async __loadBean(_bean: Bean) {
    this.data.name = _bean.name;
    this.data.roastingDate = _bean.roastingDate;
    this.data.note = _bean.note;
    this.data.roaster = _bean.roaster;
    this.data.roast = _bean.roast;
    this.data.beanMix = _bean.beanMix;

    // tslint:disable-next-line
    this.data.roast_custom = _bean.roast_custom;
    this.data.aromatics = _bean.aromatics;
    this.data.weight = _bean.weight;
    this.data.finished = false;
    this.data.cost = _bean.cost;

    this.data.bean_roasting_type = _bean.bean_roasting_type;
    this.data.decaffeinated = _bean.decaffeinated;
    this.data.url = _bean.url;
    this.data.ean_article_number = _bean.ean_article_number;

    this.data.bean_information = this.uiHelper.cloneData(
      _bean.bean_information
    );
    this.data.cupping_points = _bean.cupping_points;
    this.data.roast_range = _bean.roast_range;

    const copyAttachments = [];
    for (const attachment of _bean.attachments) {
      try {
        const newPath: string = await this.uiFileHelper.copyFile(attachment);
        copyAttachments.push(newPath);
      } catch (ex) {}
    }
    this.data.attachments = copyAttachments;
    if (_bean.cupped_flavor) {
      this.data.cupped_flavor = _bean.cupped_flavor;
    }
    if (_bean.cupping) {
      this.data.cupping = _bean.cupping;
    }

    this.data.qr_code = _bean.qr_code;
  }

  private __formValid(): boolean {
    let valid: boolean = true;
    const name: string = this.data.name;
    if (name === undefined || name.trim() === '') {
      valid = false;
    }

    return valid;
  }
}
