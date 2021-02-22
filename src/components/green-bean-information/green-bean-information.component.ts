import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';


import {ModalController, PopoverController} from '@ionic/angular';
import {UIBeanHelper} from '../../services/uiBeanHelper';

import {GreenBean} from '../../classes/green-bean/green-bean';
import {GreenBeanPopoverActionsComponent} from '../../app/roasting-section/green-beans/green-bean-popover-actions/green-bean-popover-actions.component';
import {Bean} from '../../classes/bean/bean';
import {GreenBeanDetailComponent} from '../../app/roasting-section/green-beans/green-bean-detail/green-bean-detail.component';
import {GreenBeanEditComponent} from '../../app/roasting-section/green-beans/green-bean-edit/green-bean-edit.component';
import {GreenBeanAddComponent} from '../../app/roasting-section/green-beans/green-bean-add/green-bean-add.component';
import {BeansAddComponent} from '../../app/beans/beans-add/beans-add.component';
import {Brew} from '../../classes/brew/brew';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {UIGreenBeanStorage} from '../../services/uiGreenBeanStorage';
import {UIAnalytics} from '../../services/uiAnalytics';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {UIToast} from '../../services/uiToast';
import {UIImage} from '../../services/uiImage';
import {UIAlert} from '../../services/uiAlert';
import {Settings} from '../../classes/settings/settings';
import {GREEN_BEAN_ACTION} from '../../enums/green-beans/greenBeanAction';
import {UIBeanStorage} from '../../services/uiBeanStorage';

@Component({
  selector: 'green-bean-information',
  templateUrl: './green-bean-information.component.html',
  styleUrls: ['./green-bean-information.component.scss'],
})
export class GreenBeanInformationComponent implements OnInit {
  @Input() public greenBean: GreenBean;

  @Output() public greenBeanAction: EventEmitter<any> = new EventEmitter();

  constructor(private readonly popoverCtrl: PopoverController,
              private readonly uiBeanHelper: UIBeanHelper,
              private readonly uiGreenBeanStorage: UIGreenBeanStorage,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly modalController: ModalController,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiSettingsStorage: UISettingsStorage,
              private readonly uiAlert: UIAlert,
              private readonly uiToast: UIToast,
              private readonly uiImage: UIImage,
              private readonly uiBeanStorage: UIBeanStorage) {



  }


  public ngOnInit() {

  }



  public daysOld(): number {

    return this.greenBean.beanAgeInDays();

  }


  public async showGreenBean() {
    await this.detailBean();
  }

  public async showBeanActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    const popover = await this.popoverCtrl.create({
      component: GreenBeanPopoverActionsComponent,
      event,
      translucent: true,
      componentProps: {'green-bean': this.greenBean},
      id:'green-bean-popover-actions'
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    await  this.internalBeanAction(data.role as GREEN_BEAN_ACTION);
    this.greenBeanAction.emit([data.role as GREEN_BEAN_ACTION, this.greenBean]);
  }

  private async internalBeanAction(action: GREEN_BEAN_ACTION): Promise<void> {
    switch (action) {
      case GREEN_BEAN_ACTION.DETAIL:
        await this.detailBean();
        break;
      case GREEN_BEAN_ACTION.REPEAT:
        await this.repeatBean();
        break;
      case GREEN_BEAN_ACTION.EDIT:
        await this.editBean();
        break;
      case GREEN_BEAN_ACTION.DELETE:
        await this.deleteBean();
        break;
      case GREEN_BEAN_ACTION.BEANS_CONSUMED:
        await this.beansConsumed();
        break;
      case GREEN_BEAN_ACTION.PHOTO_GALLERY:
        await this.viewPhotos();
        break;
      case GREEN_BEAN_ACTION.TRANSFER_ROAST:
        await this.transferRoast();
        break;
      default:
        break;
    }
  }
  public getUsedWeightCount(): number {
    let usedWeightCount: number = 0;
    const relatedRoastingBeans: Array<Bean> = this.uiBeanHelper.getAllRoastedBeansForThisGreenBean(this.greenBean.config.uuid);
    for (const roast of relatedRoastingBeans) {
      usedWeightCount += roast.bean_roast_information.green_bean_weight;
    }
    return usedWeightCount;
  }

  public roastCount(): number {
    const relatedRoastingBeans: Array<Bean> = this.uiBeanHelper.getAllRoastedBeansForThisGreenBean(this.greenBean.config.uuid);
    return relatedRoastingBeans.length;
  }
  public async detailBean() {
    const modal = await this.modalController.create({component: GreenBeanDetailComponent,
      id:'green-bean-detail', componentProps: {greenBean: this.greenBean}});
    await modal.present();
    await modal.onWillDismiss();
  }
  public async showPhoto(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.viewPhotos();
  }

  public async viewPhotos() {
    await this.uiImage.viewPhotos(this.greenBean);

  }

  public async transferRoast() {
    const modal = await this.modalController.create({component:BeansAddComponent,
      id:'bean-add',  componentProps: {greenBean : this.greenBean}});
    await modal.present();
    await modal.onWillDismiss();
  }
  public beansConsumed() {
    this.greenBean.finished = true;
    this.uiGreenBeanStorage.update(this.greenBean);
    this.uiToast.showInfoToast('TOAST_BEAN_ARCHIVED_SUCCESSFULLY');
    this.resetSettings();
  }

  private resetSettings() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.resetFilter();
    this.uiSettingsStorage.saveSettings(settings);
  }
  public async editBean() {

    const modal = await this.modalController.create({component:GreenBeanEditComponent,
      id:'green-bean-edit',  componentProps: {greenBean : this.greenBean}});
    await modal.present();
    await modal.onWillDismiss();
  }


  public deleteBean(): Promise<any> {
    return new Promise(async (resolve,reject) => {
      this.uiAlert.showConfirm('DELETE_BEAN_QUESTION', 'SURE_QUESTION', true)
        .then(() => {
            // Yes
            this.uiAnalytics.trackEvent('GREEN_BEAN', 'DELETE');
            this.__deleteBean();
            this.uiToast.showInfoToast('TOAST_BEAN_DELETED_SUCCESSFULLY');
            this.resetSettings();
            resolve();
          },
          () => {
            // No
            reject();
          });
    });
  }

  public async repeatBean() {
    this.uiAnalytics.trackEvent('GREEN_BEAN', 'REPEAT');
    const modal = await this.modalController.create({component: GreenBeanAddComponent,
      id:'green-bean-add', componentProps: {green_bean_template: this.greenBean}});
    await modal.present();
    await modal.onWillDismiss();

  }
  private __deleteBean(): void {
    const brews: Array<Brew> =  this.uiBrewStorage.getAllEntries();
    const relatedRoastingBeans: Array<Bean> = this.uiBeanHelper.getAllRoastedBeansForThisGreenBean(this.greenBean.config.uuid);
    let deletingBrews: Array<Brew> = [];
    for (const roastedBean of relatedRoastingBeans) {
      const filteredBrews: Array<Brew> = brews.filter((e) => e.bean === roastedBean.config.uuid);
      deletingBrews = [...deletingBrews, ...filteredBrews];
    }

     for (const brew of deletingBrews) {
       this.uiBrewStorage.removeByUUID(brew.config.uuid);
     }
    for (const bean of relatedRoastingBeans) {
      this.uiBeanStorage.removeByUUID(bean.config.uuid);
    }
    this.uiGreenBeanStorage.removeByObject(this.greenBean);
  }

  public hasPhotos(): boolean{
    return this.greenBean.attachments.length > 0;
  }
}
