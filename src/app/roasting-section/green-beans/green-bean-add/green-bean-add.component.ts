import { Component, Input, OnInit, inject } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';

import { UIImage } from '../../../../services/uiImage';
import { UIHelper } from '../../../../services/uiHelper';
import { UIFileHelper } from '../../../../services/uiFileHelper';

import { IBeanInformation } from '../../../../interfaces/bean/iBeanInformation';

import { GreenBean } from '../../../../classes/green-bean/green-bean';

import { UIGreenBeanStorage } from '../../../../services/uiGreenBeanStorage';
import { UIToast } from '../../../../services/uiToast';
import GREEN_BEAN_TRACKING from '../../../../data/tracking/greenBeanTracking';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { FormsModule } from '@angular/forms';
import { GreenBeanGeneralInformationComponent } from '../../../../components/beans/green-bean-general-information/green-bean-general-information.component';
import { BeanSortInformationComponent } from '../../../../components/beans/bean-sort-information/bean-sort-information.component';
import { DisableDoubleClickDirective } from '../../../../directive/disable-double-click.directive';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonButton,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonFooter,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';
import { HeaderComponent } from '../../../../components/header/header.component';
import { HeaderDismissButtonComponent } from '../../../../components/header/header-dismiss-button.component';

@Component({
  selector: 'green-bean-add',
  templateUrl: './green-bean-add.component.html',
  styleUrls: ['./green-bean-add.component.scss'],
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
export class GreenBeanAddComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiGreenBeanStorage = inject(UIGreenBeanStorage);
  private readonly uiImage = inject(UIImage);
  uiHelper = inject(UIHelper);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiToast = inject(UIToast);
  private readonly uiAnalytics = inject(UIAnalytics);

  public static COMPONENT_ID: string = 'green-bean-add';
  public data: GreenBean = new GreenBean();
  @Input('green_bean_template') public green_bean_template: GreenBean;

  public bean_segment = 'general';

  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent(
      GREEN_BEAN_TRACKING.TITLE,
      GREEN_BEAN_TRACKING.ACTIONS.ADD,
    );
    if (this.green_bean_template) {
      await this.__loadBean(this.green_bean_template);
    }

    // Add one empty bean information, rest is being updated on start
    if (this.data.bean_information.length <= 0) {
      const beanInformation: IBeanInformation = {} as IBeanInformation;
      beanInformation.percentage = 100;
      this.data.bean_information.push(beanInformation);
    }
  }

  public async addBean() {
    if (this.__formValid()) {
      await this.__addBean();
    }
  }

  public async __addBean() {
    await this.uiGreenBeanStorage.add(this.data);
    this.uiToast.showInfoToast('TOAST_GREEN_BEAN_ADDED_SUCCESSFULLY');
    this.uiAnalytics.trackEvent(
      GREEN_BEAN_TRACKING.TITLE,
      GREEN_BEAN_TRACKING.ACTIONS.ADD_FINISH,
    );
    this.dismiss();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      GreenBeanAddComponent.COMPONENT_ID,
    );
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
        const newPath: string =
          await this.uiFileHelper.duplicateInternalFile(attachment);
        copyAttachments.push(newPath);
      } catch (ex) {}
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
