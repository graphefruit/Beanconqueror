import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { Bean } from '../../classes/bean/bean';
import { Settings } from '../../classes/settings/settings';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { ModalController, Platform } from '@ionic/angular';
import { BeanPopoverActionsComponent } from '../../app/beans/bean-popover-actions/bean-popover-actions.component';
import { BEAN_ACTION } from '../../enums/beans/beanAction';
import { Brew } from '../../classes/brew/brew';
import { UIBeanHelper } from '../../services/uiBeanHelper';
import { ROASTS_ENUM } from '../../enums/beans/roasts';
import { NgxStarsComponent } from 'ngx-stars';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIAlert } from '../../services/uiAlert';
import { UIToast } from '../../services/uiToast';
import { UIImage } from '../../services/uiImage';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import BEAN_TRACKING from '../../data/tracking/beanTracking';
import { ShareService } from '../../services/shareService/share-service.service';
import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { ServerBean } from '../../models/bean/serverBean';
import QR_TRACKING from '../../data/tracking/qrTracking';
import { BeanMapper } from '../../mapper/bean/beanMapper';
import { ServerCommunicationService } from '../../services/serverCommunication/server-communication.service';
import { UIHelper } from '../../services/uiHelper';
import { TranslateService } from '@ngx-translate/core';
import BREW_TRACKING from '../../data/tracking/brewTracking';
import * as htmlToImage from 'html-to-image';

@Component({
  selector: 'bean-information',
  templateUrl: './bean-information.component.html',
  styleUrls: ['./bean-information.component.scss'],
})
export class BeanInformationComponent implements OnInit {
  @Input() public bean: Bean;
  @Input() public showActions: boolean = true;

  @ViewChild('card', { read: ElementRef })
  public cardEl: ElementRef;
  @ViewChild('beanStars', { read: NgxStarsComponent, static: false })
  public beanStars: NgxStarsComponent;
  @ViewChild('beanRating', { read: NgxStarsComponent, static: false })
  public beanRating: NgxStarsComponent;

  @Output() public beanAction: EventEmitter<any> = new EventEmitter();

  public beanRoastingTypeEnum = BEAN_ROASTING_TYPE_ENUM;
  public roast_enum = ROASTS_ENUM;
  public settings: Settings = null;
  constructor(
    private readonly uiSettingsStorage: UISettingsStorage,
    public readonly uiBeanHelper: UIBeanHelper,
    private readonly modalController: ModalController,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiAlert: UIAlert,
    private readonly uiToast: UIToast,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiImage: UIImage,
    private readonly shareService: ShareService,
    private readonly serverCommunicationService: ServerCommunicationService,
    private readonly uiHelper: UIHelper,
    private readonly translate: TranslateService,
    private readonly platform: Platform
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public ngOnInit() {}
  public ngAfterViewInit() {
    this.resetRenderingRating();
  }
  public ngOnChanges() {
    this.resetRenderingRating();
  }

  private resetRenderingRating() {
    setTimeout(() => {
      // Timeout needed because of ngif not rendering
      if (this.beanStars && this.bean.roast_range !== 0) {
        this.beanStars.setRating(this.bean.roast_range);
      }
      if (this.beanRating && this.bean.rating !== 0) {
        this.beanRating.setRating(this.bean.rating);
      }
    }, 250);
  }

  public brewCounts(): number {
    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(
      this.bean.config.uuid
    );
    return relatedBrews.length;
  }

  public getCuppedBrewFlavors(): Array<string> {
    const flavors: Array<string> = [...this.bean.cupped_flavor.custom_flavors];
    for (const key in this.bean.cupped_flavor.predefined_flavors) {
      if (this.bean.cupped_flavor.predefined_flavors.hasOwnProperty(key)) {
        flavors.push(this.translate.instant('CUPPING_' + key));
      }
    }
    return flavors;
  }

  public daysOld(): number {
    return this.bean.beanAgeInDays();
  }

  public getUsedWeightCount(): number {
    let usedWeightCount: number = 0;
    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(
      this.bean.config.uuid
    );
    for (const brew of relatedBrews) {
      if (brew.bean_weight_in > 0) {
        usedWeightCount += brew.bean_weight_in;
      } else {
        usedWeightCount += brew.grind_weight;
      }
    }
    return usedWeightCount;
  }

  public getRoastEnum(_key: ROASTS_ENUM) {
    for (const key in ROASTS_ENUM) {
      if (ROASTS_ENUM[key] === _key) {
        return key as ROASTS_ENUM;
      }
    }
    return '';
  }

  public async showBean() {
    await this.detailBean();
  }

  public async showPhoto(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.viewPhotos();
  }

  public async showBeanActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.POPOVER_ACTIONS
    );
    const popover = await this.modalController.create({
      component: BeanPopoverActionsComponent,
      componentProps: { bean: this.bean },
      id: BeanPopoverActionsComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 1,
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    if (data.role !== undefined) {
      await this.internalBeanAction(data.role as BEAN_ACTION);
      this.beanAction.emit([data.role as BEAN_ACTION, this.bean]);
    }
  }

  public async internalBeanAction(action: BEAN_ACTION): Promise<void> {
    switch (action) {
      case BEAN_ACTION.DETAIL:
        await this.detailBean();
        break;
      case BEAN_ACTION.REPEAT:
        await this.repeatBean();
        break;
      case BEAN_ACTION.EDIT:
        await this.editBean();
        break;
      case BEAN_ACTION.DELETE:
        try {
          await this.deleteBean();
        } catch (ex) {}
        await this.uiAlert.hideLoadingSpinner();
        break;
      case BEAN_ACTION.BEANS_CONSUMED:
        await this.beansConsumed();
        break;
      case BEAN_ACTION.PHOTO_GALLERY:
        await this.viewPhotos();
        break;
      case BEAN_ACTION.CUPPING:
        await this.cupBean();
        break;
      case BEAN_ACTION.TOGGLE_FAVOURITE:
        await this.toggleFavourite();
        break;
      case BEAN_ACTION.SHARE:
        await this.shareBean();
        break;
      case BEAN_ACTION.SHARE_IMAGE:
        await this.shareBeanImage();
        break;
      case BEAN_ACTION.REFRESH_DATA_FROM_QR_CODE:
        await this.refreshDataFromQRCode();
        break;
      case BEAN_ACTION.SHOW_BREWS:
        await this.showBrews();
        break;
      default:
        break;
    }
  }

  public async detailBean() {
    await this.uiBeanHelper.detailBean(this.bean);
  }
  public async cupBean() {
    await this.uiBeanHelper.cupBean(this.bean);
  }
  private async viewPhotos() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.PHOTO_VIEW
    );
    await this.uiImage.viewPhotos(this.bean);
  }
  public async beansConsumed() {
    await this.uiBeanHelper.archiveBeanWithRatingQuestion(this.bean);

    await this.resetSettings();

    /* this.uiAnalytics.trackEvent(BEAN_TRACKING.TITLE, BEAN_TRACKING.ACTIONS.ARCHIVE);
    this.bean.finished = true;
    await this.uiBeanStorage.update(this.bean);
    this.uiToast.showInfoToast('TOAST_BEAN_ARCHIVED_SUCCESSFULLY');
    */
  }

  public async toggleFavourite() {
    if (!this.bean.favourite) {
      this.uiAnalytics.trackEvent(
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.ADD_FAVOURITE
      );
      this.uiToast.showInfoToast('TOAST_BEAN_FAVOURITE_ADDED');
      this.bean.favourite = true;
    } else {
      this.uiAnalytics.trackEvent(
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.REMOVE_FAVOURITE
      );
      this.bean.favourite = false;
      this.uiToast.showInfoToast('TOAST_BEAN_FAVOURITE_REMOVED');
    }
    await this.uiBeanStorage.update(this.bean);
  }

  public async add() {
    await this.uiBeanHelper.addBean();
  }

  public async longPressEditBean(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.editBean();
    this.beanAction.emit([BEAN_ACTION.EDIT, this.bean]);
  }
  public async editBean() {
    await this.uiBeanHelper.editBean(this.bean);
  }

  public async shareBean() {
    await this.shareService.shareBean(this.bean);
  }
  public async shareBeanImage() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.SHARE_IMAGE
    );
    await this.uiAlert.showLoadingSpinner();
    if (this.platform.is('ios')) {
      htmlToImage
        .toJpeg(this.cardEl.nativeElement)
        .then((_dataURL) => {
          // On iOS we need to do this a second time, because the rendering doesn't render everything (strange thing)
          setTimeout(() => {
            htmlToImage
              .toJpeg(this.cardEl.nativeElement)
              .then(async (_dataURLSecond) => {
                await this.uiAlert.hideLoadingSpinner();
                setTimeout(() => {
                  this.shareService.shareImage(_dataURLSecond);
                }, 50);
              })
              .catch(async (error) => {
                await this.uiAlert.hideLoadingSpinner();
              });
          }, 500);
        })
        .catch(async (error) => {
          await this.uiAlert.hideLoadingSpinner();
        });
    } else {
      htmlToImage
        .toJpeg(this.cardEl.nativeElement)
        .then(async (_dataURL) => {
          await this.uiAlert.hideLoadingSpinner();

          setTimeout(() => {
            this.shareService.shareImage(_dataURL);
          }, 50);
        })
        .catch(async (error) => {
          await this.uiAlert.hideLoadingSpinner();
        });
    }
  }

  public async showBrews() {
    await this.uiBeanHelper.showAssociatedBrewsForBean(this.bean);
  }
  public async refreshDataFromQRCode() {
    await this.uiAlert
      .showConfirm('QR_CODE_REFRESH_DATA_MESSAGE', 'CARE', true)
      .then(
        async () => {
          await this.uiAlert.showLoadingSpinner();
          let errorOccured: boolean = false;
          try {
            const _scannedQRBean: ServerBean =
              await this.serverCommunicationService.getBeanInformation(
                this.bean.qr_code
              );
            if (_scannedQRBean.error === null) {
              this.uiAnalytics.trackEvent(
                QR_TRACKING.TITLE,
                QR_TRACKING.ACTIONS.REFRESH_SUCCESSFULLY
              );
              this.uiToast.showInfoToast('QR.BEAN_SUCCESSFULLY_REFRESHED');
              await this.uiAlert.showLoadingSpinner();
              // Get the new bean from server, just save the uuid, all other information will be overwritten
              const newMapper = new BeanMapper();
              const newBean: Bean = await newMapper.mapServerToClientBean(
                _scannedQRBean
              );
              const savedUUID = this.bean.config.uuid;
              this.bean = newBean;
              this.bean.config.uuid = savedUUID;
              await this.uiBeanStorage.update(this.bean);
            } else {
              errorOccured = true;
            }
          } catch (ex) {
            errorOccured = true;
          }
          await this.uiAlert.hideLoadingSpinner();
          if (errorOccured) {
            this.uiAlert.showMessage(
              'QR.SERVER.ERROR_OCCURED',
              'ERROR_OCCURED',
              undefined,
              true
            );
          }
        },
        () => {}
      );
  }

  public async deleteBean(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      this.uiAlert
        .showConfirm('DELETE_BEAN_QUESTION', 'SURE_QUESTION', true)
        .then(
          async () => {
            await this.uiAlert.showLoadingSpinner();
            // Yes
            this.uiAnalytics.trackEvent(
              BEAN_TRACKING.TITLE,
              BEAN_TRACKING.ACTIONS.DELETE
            );
            await this.__deleteBean();
            this.uiToast.showInfoToast('TOAST_BEAN_DELETED_SUCCESSFULLY');
            await this.resetSettings();
            resolve(undefined);
          },
          () => {
            // No
            reject();
          }
        );
    });
  }

  private async resetSettings() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.resetFilter();
    await this.uiSettingsStorage.saveSettings(settings);
  }

  public async repeatBean() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.REPEAT
    );
    await this.uiBeanHelper.repeatBean(this.bean);
  }

  private async __deleteBean() {
    const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();

    const deletingBrewIndex: Array<number> = [];
    for (let i = 0; i < brews.length; i++) {
      if (brews[i].bean === this.bean.config.uuid) {
        deletingBrewIndex.push(i);
      }
    }
    for (let i = deletingBrewIndex.length; i--; ) {
      await this.uiBrewStorage.removeByUUID(
        brews[deletingBrewIndex[i]].config.uuid
      );
    }

    await this.uiBeanStorage.removeByObject(this.bean);
  }
  public isBeanRoastUnknown() {
    return (
      this.bean.bean_roasting_type === ('UNKNOWN' as BEAN_ROASTING_TYPE_ENUM)
    );
  }
  public hasCustomRatingRange(): boolean {
    if (this.settings) {
      if (this.settings.bean_rating !== 5) {
        return true;
      } else if (this.settings.bean_rating_steps !== 1) {
        return true;
      }
    }
    return false;
  }
}
