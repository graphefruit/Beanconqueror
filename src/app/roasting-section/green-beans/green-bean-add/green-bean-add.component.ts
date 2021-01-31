import {Component, Input, OnInit} from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';


import {UIImage} from '../../../../services/uiImage';
import {UIHelper} from '../../../../services/uiHelper';
import {UIAnalytics} from '../../../../services/uiAnalytics';
import {UIFileHelper} from '../../../../services/uiFileHelper';

import {IBeanInformation} from '../../../../interfaces/bean/iBeanInformation';

import {GreenBean} from '../../../../classes/green-bean/green-bean';

import {UIGreenBeanStorage} from '../../../../services/uiGreenBeanStorage';

@Component({
  selector: 'green-bean-add',
  templateUrl: './green-bean-add.component.html',
  styleUrls: ['./green-bean-add.component.scss'],
})
export class GreenBeanAddComponent implements OnInit {


  public data: GreenBean = new GreenBean();
  private readonly green_bean_template: GreenBean;


  public bean_segment = 'general';
  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               private readonly uiGreenBeanStorage: UIGreenBeanStorage,
               private readonly uiImage: UIImage,
               public uiHelper: UIHelper,
               private readonly uiAnalytics: UIAnalytics,
               private readonly uiFileHelper: UIFileHelper) {
    this.green_bean_template = this.navParams.get('green_bean_template');
  }


  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent('GREEN_BEAN', 'ADD');
    if (this.green_bean_template) {
      await this.__loadBean(this.green_bean_template);
    }

    // Add one empty bean information, rest is being updated on start
    if (this.data.bean_information.length <=0) {
      const beanInformation: IBeanInformation = {} as IBeanInformation;
      this.data.bean_information.push(beanInformation);
    }
  }


  public addBean(): void {

    if (this.__formValid()) {
      this.__addBean();
    }
  }

  public __addBean(): void {

    this.uiGreenBeanStorage.add(this.data);
    this.dismiss();
  }



  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'green-bean-add');
  }

  private async __loadBean(_bean: GreenBean) {
    this.data.name = _bean.name;
    this.data.note = _bean.note;
    this.data.aromatics = _bean.aromatics;
    this.data.weight = _bean.weight;
    this.data.finished = false;
    this.data.cost = _bean.cost;


    this.data.decaffeinated = _bean.decaffeinated;
    this.data.url = _bean.url;
    this.data.ean_article_number = _bean.ean_article_number;

    this.data.bean_information = _bean.bean_information;
    this.data.cupping_points = _bean.cupping_points;



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
