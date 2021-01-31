import {ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {UIHelper} from '../../../services/uiHelper';
import {UIImage} from '../../../services/uiImage';
import {Bean} from '../../../classes/bean/bean';
import {ModalController, NavParams, Platform} from '@ionic/angular';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {UIFileHelper} from '../../../services/uiFileHelper';
import {UIToast} from '../../../services/uiToast';
import {TranslateService} from '@ngx-translate/core';
import {IBeanInformation} from '../../../interfaces/bean/iBeanInformation';
import {GreenBean} from '../../../classes/green-bean/green-bean';

@Component({
  selector: 'beans-add',
  templateUrl: './beans-add.component.html',
  styleUrls: ['./beans-add.component.scss'],
})
export class BeansAddComponent implements OnInit {


  public data: Bean = new Bean();
  private readonly bean_template: Bean;

  @Input() private hide_toast_message: boolean;

  @Input() private greenBean: GreenBean;

  public bean_segment = 'general';

  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiImage: UIImage,
               public uiHelper: UIHelper,
               private readonly uiAnalytics: UIAnalytics,
               private readonly uiFileHelper: UIFileHelper,
               private readonly uiToast: UIToast,
               private readonly translate: TranslateService,
               private readonly platform: Platform,
               private readonly changeDetectorRef: ChangeDetectorRef) {
    this.bean_template = this.navParams.get('bean_template');
  }





  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent('BEAN', 'ADD');

    // It just can be a bean template (bean will be repeated, or a green bean, both is not working)
    // TODO how to handle roasting beans which wil be repeated?
    if (this.bean_template) {
      await this.__loadBean(this.bean_template);
    }

    // Add one empty bean information, rest is being updated on start
    if (this.data.bean_information.length <=0) {
      const beanInformation: IBeanInformation = {} as IBeanInformation;
      this.data.bean_information.push(beanInformation);
    }

    if (this.greenBean) {
      this.loadGreenBeanInformation();
    }
  }


  public addBean(): void {

    if (this.__formValid()) {
      this.__addBean();
    }
  }

  private loadGreenBeanInformation() {
    if (this.greenBean) {
      this.data.bean_roast_information.bean_uuid = this.greenBean.config.uuid;
      this.data.bean_information = this.greenBean.bean_information;
    }
  }


  public __addBean(): void {

    this.uiBeanStorage.add(this.data);
    this.dismiss();
    if (!this.hide_toast_message) {
      this.uiToast.showInfoToast('TOAST_BEAN_ADDED_SUCCESSFULLY');
    }
  }


  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'bean-add');
  }

  private async __loadBean(_bean: Bean) {
    this.data.name = _bean.name;
    this.data.roastingDate = _bean.roastingDate;
    this.data.note = _bean.note;
    this.data.roaster = _bean.roaster;
    if (this.data.roaster !== '') {
      //this.ignoreNextChange = true;
    }
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

    this.data.bean_information = _bean.bean_information;
    this.data.cupping_points = _bean.cupping_points;
    this.data.roast_range = _bean.roast_range;


    const copyAttachments = [];
    for (const attachment of _bean.attachments) {
      try {
        const newPath: string = await this.uiFileHelper.copyFile(attachment);
        copyAttachments.push(newPath);
      } catch (ex) {

      }

    }
    this.data.attachments = copyAttachments;
  }

  private __formValid(): boolean {
    let valid: boolean = true;
    const name: string = this.data.name;
    if (name === undefined || name.trim() === '') {
      valid = false;
    }

    return valid;
  }

  public ngOnInit() {}




}
