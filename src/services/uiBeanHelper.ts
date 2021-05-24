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
              private readonly modalController: ModalController) {
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


  public async addScannedQRBean(_scannedQRBean) {
    this.uiAnalytics.trackEvent(BEAN_TRACKING.TITLE, BEAN_TRACKING.ACTIONS.ADD);
    const modal = await this.modalController.create({
      component:BeansAddComponent,
      id:BeansAddComponent.COMPONENT_ID,
      componentProps: {qr_bean_template: _scannedQRBean}
    });
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
