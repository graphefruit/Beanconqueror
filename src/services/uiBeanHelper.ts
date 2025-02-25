/** Core */
import { Inject, Injectable, Injector } from '@angular/core';

import { Brew } from '../classes/brew/brew';
import { UIBrewStorage } from './uiBrewStorage';
import { UIBeanStorage } from './uiBeanStorage';
import { Bean } from '../classes/bean/bean';
import BEAN_TRACKING from '../data/tracking/beanTracking';
import { BeansAddComponent } from '../app/beans/beans-add/beans-add.component';
import { UIAnalytics } from './uiAnalytics';
import {
  ActionSheetController,
  ModalController,
  Platform,
} from '@ionic/angular';
import { BeanArchivePopoverComponent } from '../app/beans/bean-archive-popover/bean-archive-popover.component';
import { BeansEditComponent } from '../app/beans/beans-edit/beans-edit.component';
import { BeansDetailComponent } from '../app/beans/beans-detail/beans-detail.component';
import { GreenBean } from '../classes/green-bean/green-bean';
import { ServerBean } from '../models/bean/serverBean';
import { BeanMapper } from '../mapper/bean/beanMapper';
import { UIAlert } from './uiAlert';
import { UIToast } from './uiToast';
import QR_TRACKING from '../data/tracking/qrTracking';
import { QrCodeScannerPopoverComponent } from '../popover/qr-code-scanner-popover/qr-code-scanner-popover.component';
import { UISettingsStorage } from './uiSettingsStorage';

import { BeanProto } from '../generated/src/classes/bean/bean';
import { UIHelper } from './uiHelper';
import { BEAN_MIX_ENUM } from '../enums/beans/mix';
import { ROASTS_ENUM } from '../enums/beans/roasts';
import { BEAN_ROASTING_TYPE_ENUM } from '../enums/beans/beanRoastingType';
import { BrewCuppingComponent } from '../app/brew/brew-cupping/brew-cupping.component';
import { BeanPopoverFreezeComponent } from '../app/beans/bean-popover-freeze/bean-popover-freeze.component';

import { BeanPopoverListComponent } from '../app/beans/bean-popover-list/bean-popover-list.component';
import { BeanInternalShareCodeGeneratorComponent } from '../app/beans/bean-internal-share-code-generator/bean-internal-share-code-generator.component';
import { BEAN_CODE_ACTION } from '../enums/beans/beanCodeAction';
import { TranslateService } from '@ngx-translate/core';

/**
 * Handles every helping functionalities
 */

@Injectable({
  providedIn: 'root',
})
export class UIBeanHelper {
  private static instance: UIBeanHelper;
  private allStoredBrews: Array<Brew> = [];
  private allStoredBeans: Array<Bean> = [];

  constructor(
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiAnalytics: UIAnalytics,
    private readonly modalController: ModalController,
    private readonly uiAlert: UIAlert,
    private readonly uiToast: UIToast,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiHelper: UIHelper,
    private readonly actionSheetCtrl: ActionSheetController,
    private readonly translate: TranslateService,
  ) {
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

  public static getInstance(): UIBeanHelper {
    if (UIBeanHelper.instance) {
      return UIBeanHelper.instance;
    }

    return undefined;
  }

  public fieldVisible(_settingsField: boolean, _data?: any) {
    if (_settingsField === true) {
      return true;
    }
    return false;
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

    const roastedBeans = this.allStoredBeans.filter(
      (e) =>
        e.bean_roast_information &&
        e.bean_roast_information.bean_uuid === _uuid,
    );
    return roastedBeans;
  }

  public getAllRoastedBeansForRoastingMachine(_uuid: string) {
    if (this.allStoredBeans.length <= 0) {
      // Load just if needed, performance reasons
      this.allStoredBeans = this.uiBeanStorage.getAllEntries();
    }

    const roastedBeans = this.allStoredBeans.filter(
      (e) =>
        e.bean_roast_information &&
        e.bean_roast_information.roaster_machine === _uuid,
    );
    return roastedBeans;
  }

  public async __checkQRCodeScannerInformationPage() {
    const settings = this.uiSettingsStorage.getSettings();
    const qr_scanner_information: boolean = settings.qr_scanner_information;
    if (qr_scanner_information === false) {
      const modal = await this.modalController.create({
        component: QrCodeScannerPopoverComponent,
        id: QrCodeScannerPopoverComponent.POPOVER_ID,
      });
      await modal.present();
      await modal.onWillDismiss();
    }
  }

  public async addScannedQRBean(_scannedQRBean: ServerBean) {
    if (_scannedQRBean.error === null) {
      this.uiAnalytics.trackEvent(
        QR_TRACKING.TITLE,
        QR_TRACKING.ACTIONS.SCAN_SUCCESSFULLY,
      );
      this.uiToast.showInfoToast('QR.BEAN_SUCCESSFULLY_SCANNED');
      await this.uiAlert.showLoadingSpinner();
      const newMapper = new BeanMapper();
      const bean: Bean = await newMapper.mapServerToClientBean(_scannedQRBean);
      await this.uiAlert.hideLoadingSpinner();

      //Show the information before the popup would come up
      await this.__checkQRCodeScannerInformationPage();

      if (bean !== null) {
        const modal = await this.modalController.create({
          component: BeansAddComponent,
          id: BeansAddComponent.COMPONENT_ID,
          componentProps: { bean_template: bean, server_bean: _scannedQRBean },
        });
        await modal.present();
        await modal.onWillDismiss();
      } else {
        this.uiAlert.showMessage(
          'QR.SERVER.ERROR_OCCURED',
          'ERROR_OCCURED',
          undefined,
          true,
        );
      }
    } else {
      this.uiAnalytics.trackEvent(
        QR_TRACKING.TITLE,
        QR_TRACKING.ACTIONS.SCAN_FAILED,
      );
      await this.uiAlert.hideLoadingSpinner();
      if (_scannedQRBean.error.errorCode === 'beannotapproved') {
        this.uiAlert.showMessage(
          'QR.SERVER.BEAN_NOT_APPROVED',
          'ERROR_OCCURED',
          undefined,
          true,
        );
      } else {
        this.uiAlert.showMessage(
          'QR.SERVER.ERROR_OCCURED',
          'ERROR_OCCURED',
          undefined,
          true,
        );
      }
    }
  }

  public async addBean(_hideToastMessage: boolean = false) {
    const modal = await this.modalController.create({
      component: BeansAddComponent,
      id: BeansAddComponent.COMPONENT_ID,
      componentProps: { hide_toast_message: _hideToastMessage },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async freezeBean(_bean: Bean) {
    const modal = await this.modalController.create({
      component: BeanPopoverFreezeComponent,
      id: BeanPopoverFreezeComponent.COMPONENT_ID,
      componentProps: { bean: _bean },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async generateQRCode(_bean: Bean) {
    const modal = await this.modalController.create({
      component: BeanInternalShareCodeGeneratorComponent,
      id: BeanInternalShareCodeGeneratorComponent.COMPONENT_ID,
      componentProps: { bean: _bean },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async repeatBean(_bean: Bean) {
    const modal = await this.modalController.create({
      component: BeansAddComponent,
      id: BeansAddComponent.COMPONENT_ID,
      componentProps: { bean_template: _bean },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async addUserSharedBean(_compressedJson: string) {
    try {
      const encoded = this.uiHelper.decode(_compressedJson);

      const protoBean = BeanProto.decode(encoded);

      const bean: Bean = new Bean();
      bean.initializeBySharedProtoBean(protoBean);
      bean.shared = true;
      bean.attachments = [];
      bean.favourite = false;
      bean.rating = 0;

      // Empty it.
      const newPredefinedFlavors = {};
      if (
        'cupped_flavor' in protoBean &&
        'predefined_flavors' in protoBean.cupped_flavor &&
        protoBean.cupped_flavor.predefined_flavors.length > 0
      ) {
        for (const flavKey of protoBean.cupped_flavor.predefined_flavors) {
          newPredefinedFlavors[flavKey] = true;
        }
      }
      bean.cupped_flavor.predefined_flavors = newPredefinedFlavors;

      if (bean.bean_information && Object.keys(bean.bean_information)) {
      } else {
        bean.bean_information = [];
      }

      bean.beanMix = {
        0: 'UNKNOWN' as BEAN_MIX_ENUM,
        1: 'SINGLE_ORIGIN' as BEAN_MIX_ENUM,
        2: 'BLEND' as BEAN_MIX_ENUM,
      }[protoBean.beanMix];

      bean.roast = {
        0: 'UNKNOWN' as ROASTS_ENUM,
        1: 'CINNAMON_ROAST' as ROASTS_ENUM,
        2: 'AMERICAN_ROAST' as ROASTS_ENUM,
        3: 'NEW_ENGLAND_ROAST' as ROASTS_ENUM,
        4: 'HALF_CITY_ROAST' as ROASTS_ENUM,
        5: 'MODERATE_LIGHT_ROAST' as ROASTS_ENUM,
        6: 'CITY_ROAST' as ROASTS_ENUM,
        7: 'CITY_PLUS_ROAST' as ROASTS_ENUM,
        8: 'FULL_CITY_ROAST' as ROASTS_ENUM,
        9: 'FULL_CITY_PLUS_ROAST' as ROASTS_ENUM,
        10: 'ITALIAN_ROAST' as ROASTS_ENUM,
        11: 'VIEANNA_ROAST' as ROASTS_ENUM,
        12: 'FRENCH_ROAST' as ROASTS_ENUM,
        13: 'CUSTOM_ROAST' as ROASTS_ENUM,
      }[protoBean.roast];

      bean.bean_roasting_type = {
        0: 'UNKNOWN' as BEAN_ROASTING_TYPE_ENUM,
        1: 'FILTER' as BEAN_ROASTING_TYPE_ENUM,
        2: 'ESPRESSO' as BEAN_ROASTING_TYPE_ENUM,
        3: 'OMNI' as BEAN_ROASTING_TYPE_ENUM,
      }[protoBean.bean_roasting_type];

      await this.uiAlert.hideLoadingSpinner();
      if (bean !== null) {
        const modal = await this.modalController.create({
          component: BeansAddComponent,
          id: BeansAddComponent.COMPONENT_ID,
          componentProps: { bean_template: bean, user_shared_bean: bean },
        });
        await modal.present();
        await modal.onWillDismiss();
      } else {
        this.uiAlert.showMessage(
          'USER_BEAN_SHARINGSHARING_ERROR',
          'ERROR_OCCURED',
          undefined,
          true,
        );
      }
    } catch (ex) {
    } finally {
      this.uiAlert.hideLoadingSpinner();
    }
  }

  public async addRoastedBean(_greenBean: GreenBean) {
    const modal = await this.modalController.create({
      component: BeansAddComponent,
      id: BeansAddComponent.COMPONENT_ID,
      componentProps: { greenBean: _greenBean },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async showBeans(_beanList: Array<Bean>) {
    const modal = await this.modalController.create({
      component: BeanPopoverListComponent,
      id: BeanPopoverListComponent.COMPONENT_ID,
      componentProps: { beansList: _beanList },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async editBean(_bean: Bean) {
    const modal = await this.modalController.create({
      component: BeansEditComponent,
      id: BeansEditComponent.COMPONENT_ID,
      componentProps: { bean: _bean },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  private findBeanByInternalShareCode(internalShareCode: string) {
    const allEntries = this.uiBeanStorage.getAllEntries();
    const bean = allEntries.find(
      (b) => b.internal_share_code === internalShareCode,
    );
    return bean;
  }
  public async detailBeanByInternalShareCode(internalShareCode: string) {
    const bean = this.findBeanByInternalShareCode(internalShareCode);
    if (bean) {
      await this.detailBean(bean);
    }
  }

  public async chooseNFCTagAction() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: this.translate.instant('BEAN_CODE_ON_ACTION_SCANNED_TITLE'),
      buttons: [
        {
          text: this.translate.instant('BEAN_CODE_ACTION.START_BREW'),
          data: {
            action: BEAN_CODE_ACTION.START_BREW,
          },
        },
        {
          text: this.translate.instant(
            'BEAN_CODE_ACTION.START_BREW_CHOOSE_PREPARATION',
          ),
          data: {
            action: BEAN_CODE_ACTION.START_BREW_CHOOSE_PREPARATION,
          },
        },
        {
          text: this.translate.instant('BEAN_CODE_ACTION.EDIT'),
          data: {
            action: BEAN_CODE_ACTION.EDIT,
          },
        },
        {
          text: this.translate.instant('BEAN_CODE_ACTION.DETAIL'),
          data: {
            action: BEAN_CODE_ACTION.DETAIL,
          },
        },
      ],
    });

    await actionSheet.present();

    const data = await actionSheet.onWillDismiss();
    if (data && data.data !== undefined) {
      return data.data.action;
    }
    return undefined;
  }
  public async editBeanByInternalShareCode(internalShareCode: string) {
    const bean = this.findBeanByInternalShareCode(internalShareCode);
    if (bean) {
      await this.editBean(bean);
    }
  }

  public async detailBean(_bean: Bean) {
    const modal = await this.modalController.create({
      component: BeansDetailComponent,
      id: BeansDetailComponent.COMPONENT_ID,
      componentProps: { bean: _bean },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async archiveBeanWithRatingQuestion(_bean: Bean) {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.ARCHIVE,
    );

    const modal = await this.modalController.create({
      component: BeanArchivePopoverComponent,
      cssClass: 'popover-actions',
      id: BeanArchivePopoverComponent.COMPONENT_ID,
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
      componentProps: {
        bean: _bean,
      },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async cupBean(_bean: Bean) {
    const modal = await this.modalController.create({
      component: BrewCuppingComponent,
      id: BrewCuppingComponent.COMPONENT_ID,
      componentProps: { bean: _bean },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public generateFrozenId() {
    return Math.random().toString(20).substr(2, 6);
  }
}
