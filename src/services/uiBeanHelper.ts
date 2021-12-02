/** Core */
import {Injectable} from '@angular/core';

import {Brew} from '../classes/brew/brew';
import {UIBrewStorage} from './uiBrewStorage';
import {UIBeanStorage} from './uiBeanStorage';
import {Bean} from '../classes/bean/bean';
import BEAN_TRACKING from '../data/tracking/beanTracking';
import {BeansAddComponent} from '../app/beans/beans-add/beans-add.component';
import {UIAnalytics} from './uiAnalytics';
import {ModalController} from '@ionic/angular';
import {BeanArchivePopoverComponent} from '../app/beans/bean-archive-popover/bean-archive-popover.component';
import {BeansEditComponent} from '../app/beans/beans-edit/beans-edit.component';
import {BeansDetailComponent} from '../app/beans/beans-detail/beans-detail.component';
import {GreenBean} from '../classes/green-bean/green-bean';
import {ServerBean} from '../models/bean/serverBean';
import {BeanMapper} from '../mapper/bean/beanMapper';
import {UIAlert} from './uiAlert';
import {UIToast} from './uiToast';
import QR_TRACKING from '../data/tracking/qrTracking';


/**
 * Handles every helping functionalities
 */

@Injectable({
  providedIn: 'root'
})
export class UIBeanHelper {
  private static instance: UIBeanHelper;
  private allStoredBrews: Array<Brew> = [];
  private allStoredBeans: Array<Bean> = [];

  public static getInstance(): UIBeanHelper {
    if (UIBeanHelper.instance) {
      return UIBeanHelper.instance;
    }
    // noinspection TsLint

    return undefined;
  }

  constructor(private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiBeanStorage: UIBeanStorage,
              private readonly uiAnalytics: UIAnalytics,
              private readonly modalController: ModalController,
              private readonly uiAlert: UIAlert,
              private readonly uiToast: UIToast) {
    this.uiBrewStorage.attachOnEvent().subscribe((_val) => {
      // If an brew is deleted, we need to reset our array for the next call.
      this.allStoredBrews = [];
    });

    this.uiBeanStorage.attachOnEvent().subscribe((_val) => {
      // If an brew is deleted, we need to reset our array for the next call.
      this.allStoredBeans = [];
    });


    if (UIBeanHelper.instance === undefined) {
      UIBeanHelper.instance = this;
    }
  }

  public getAllBrewsForThisBean(_uuid: string): Array<Brew> {

    if (this.allStoredBrews.length <= 0) {
      // Load just if needed, performance reasons
      this.allStoredBrews = this.uiBrewStorage.getAllEntries();
    }

    const brewsForBean: Array<Brew> = [];
    const brews: Array<Brew> = this.allStoredBrews;
    const beanUUID: string = _uuid;
    for (const brew of brews) {
      if (brew.bean === beanUUID) {
        brewsForBean.push(brew);
      }
    }
    return brewsForBean;

  }

  public getAllRoastedBeansForThisGreenBean(_uuid: string): Array<Bean> {

    if (this.allStoredBeans.length <= 0) {
      // Load just if needed, performance reasons
      this.allStoredBeans = this.uiBeanStorage.getAllEntries();
    }

    const roastedBeans = this.allStoredBeans.filter((e) => (e.bean_roast_information && e.bean_roast_information.bean_uuid === _uuid));
    return roastedBeans;

  }
  public getAllRoastedBeansForRoastingMachine(_uuid: string) {
    if (this.allStoredBeans.length <= 0) {
      // Load just if needed, performance reasons
      this.allStoredBeans = this.uiBeanStorage.getAllEntries();
    }

    const roastedBeans = this.allStoredBeans.filter((e) => (e.bean_roast_information && e.bean_roast_information.roaster_machine === _uuid));
    return roastedBeans;

  }


  public async addScannedQRBean(_scannedQRBean: ServerBean) {

    if (_scannedQRBean.error === null)
    {
      this.uiAnalytics.trackEvent(QR_TRACKING.TITLE, QR_TRACKING.ACTIONS.SCAN_SUCCESSFULLY);
      this.uiToast.showInfoToast('QR.BEAN_SUCCESSFULLY_SCANNED');
      await this.uiAlert.showLoadingSpinner();
      const newMapper = new BeanMapper();
      const bean: Bean = await newMapper.mapServerToClientBean(_scannedQRBean);
      await this.uiAlert.hideLoadingSpinner();
      if (bean !== null) {

        const modal = await this.modalController.create({
          component:BeansAddComponent,
          id:BeansAddComponent.COMPONENT_ID,
          componentProps: {bean_template: bean, server_bean: _scannedQRBean}
        });
        await modal.present();
        await modal.onWillDismiss();
      } else {
        this.uiAlert.showMessage('QR.SERVER.ERROR_OCCURED','ERROR_OCCURED',undefined,true);
      }


    }  else {
      this.uiAnalytics.trackEvent(QR_TRACKING.TITLE, QR_TRACKING.ACTIONS.SCAN);
      await this.uiAlert.hideLoadingSpinner();
      this.uiAlert.showMessage('QR.SERVER.ERROR_OCCURED','ERROR_OCCURED',undefined,true);
    }

  }

  public async addBean(_hideToastMessage: boolean = false) {
    const modal = await this.modalController.create({component:BeansAddComponent,id: BeansAddComponent.COMPONENT_ID,  componentProps: {hide_toast_message: _hideToastMessage}});
    await modal.present();
    await modal.onWillDismiss();
  }
  public async repeatBean(_bean: Bean) {
    const modal = await this.modalController.create({
      component: BeansAddComponent,
      id: BeansAddComponent.COMPONENT_ID,
      componentProps: {bean_template: _bean}
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async addRoastedBean(_greenBean: GreenBean) {
    const modal = await this.modalController.create({component:BeansAddComponent,
      id:BeansAddComponent.COMPONENT_ID,  componentProps: {greenBean : _greenBean}});
    await modal.present();
    await modal.onWillDismiss();
  }
  public async editBean(_bean: Bean) {

    const modal = await this.modalController.create({component:BeansEditComponent, id: BeansEditComponent.COMPONENT_ID,  componentProps: {bean : _bean}});
    await modal.present();
    await modal.onWillDismiss();
  }

  public async detailBean(_bean: Bean) {
    const modal = await this.modalController.create({component: BeansDetailComponent, id: BeansDetailComponent.COMPONENT_ID, componentProps: {bean: _bean}});
    await modal.present();
    await modal.onWillDismiss();
  }

  public async archiveBeanWithRatingQuestion(_bean: Bean) {

      this.uiAnalytics.trackEvent(BEAN_TRACKING.TITLE, BEAN_TRACKING.ACTIONS.ARCHIVE);

      const modal = await this.modalController.create({
        component: BeanArchivePopoverComponent,
        cssClass: 'popover-actions',
        id: BeanArchivePopoverComponent.COMPONENT_ID,
        componentProps: {
          bean: _bean
        }
      });
      await modal.present();
      await modal.onWillDismiss();
  }
}
