import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { Bean } from '../../classes/bean/bean';
import { Settings } from '../../classes/settings/settings';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import {
  ActionSheetController,
  ModalController,
  Platform,
} from '@ionic/angular/standalone';
import { BeanPopoverActionsComponent } from '../../app/beans/bean-popover-actions/bean-popover-actions.component';
import { BeanGroup } from '../../interfaces/bean/beanGroup';
import { BEAN_ACTION } from '../../enums/beans/beanAction';
import { Brew } from '../../classes/brew/brew';
import { UIBeanHelper } from '../../services/uiBeanHelper';
import { ROASTS_ENUM } from '../../enums/beans/roasts';
import { NgxStarsComponent, NgxStarsModule } from 'ngx-stars';
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
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import * as htmlToImage from 'html-to-image';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import moment from 'moment/moment';
import { BEAN_FREEZING_STORAGE_ENUM } from '../../enums/beans/beanFreezingStorage';
import { CurrencyService } from '../../services/currencyService/currency.service';
import { BEAN_FUNCTION_PIPE_ENUM } from '../../enums/beans/beanFunctionPipe';
import { LongPressDirective } from '../../directive/long-press.directive';
import { AsyncImageComponent } from '../async-image/async-image.component';
import { DecimalPipe } from '@angular/common';
import { FormatDatePipe } from '../../pipes/formatDate';
import { ToFixedPipe } from '../../pipes/toFixed';
import { BeanFieldVisiblePipe } from '../../pipes/bean/beanFieldVisible';
import { BeanFunction } from '../../pipes/bean/beanFunction';
import { addIcons } from 'ionicons';
import {
  fileTrayFullOutline,
  moon,
  snowOutline,
  flameOutline,
  qrCodeOutline,
  shareSocialOutline,
  heart,
  pricetagOutline,
  chevronUpOutline,
  chevronDownOutline,
} from 'ionicons/icons';
import {
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonBadge,
  IonButton,
  IonLabel,
  IonText,
} from '@ionic/angular/standalone';

@Component({
  selector: 'bean-information',
  templateUrl: './bean-information.component.html',
  styleUrls: [
    './bean-information.component.scss',
    '../../theme/variables.scss',
  ],
  imports: [
    LongPressDirective,
    NgxStarsModule,
    AsyncImageComponent,
    DecimalPipe,
    TranslatePipe,
    FormatDatePipe,
    ToFixedPipe,
    BeanFieldVisiblePipe,
    BeanFunction,
    IonCard,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonIcon,
    IonBadge,
    IonButton,
    IonLabel,
    IonText,
  ],
})
export class BeanInformationComponent implements OnInit {
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  readonly uiBeanHelper = inject(UIBeanHelper);
  private readonly modalController = inject(ModalController);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiToast = inject(UIToast);
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiImage = inject(UIImage);
  private readonly shareService = inject(ShareService);
  private readonly serverCommunicationService = inject(
    ServerCommunicationService,
  );
  readonly uiHelper = inject(UIHelper);
  private readonly translate = inject(TranslateService);
  private readonly platform = inject(Platform);
  private readonly uiBrewHelper = inject(UIBrewHelper);
  private actionSheetCtrl = inject(ActionSheetController);
  private readonly currencyService = inject(CurrencyService);

  @Input() public bean: Bean;
  @Input() public beanGroup: BeanGroup;
  @Input() public showActions: boolean = true;
  @Input() public disabled: boolean = false;
  @Input() public collapsed: boolean = false;
  @Input() public isGroupChild: boolean = false;
  @ViewChild('card', { read: ElementRef })
  public cardEl: ElementRef;
  @ViewChild('beanStars', { read: NgxStarsComponent, static: false })
  public beanStars: NgxStarsComponent;
  @ViewChild('beanRating', { read: NgxStarsComponent, static: false })
  public beanRating: NgxStarsComponent;

  @Output() public beanAction: EventEmitter<any> = new EventEmitter();

  public beanRoastingTypeEnum = BEAN_ROASTING_TYPE_ENUM;
  public beanFreezingStorageTypeEnum = BEAN_FREEZING_STORAGE_ENUM;
  public roast_enum = ROASTS_ENUM;
  public settings: Settings = null;

  public uiBrewsCount: number = undefined;
  public uiUsedWeightCount: number = undefined;
  public uiCuppedBrewFlavors: Array<string> = [];
  public uiCalculatedCostPerKG: number = undefined;
  public uiCurrencySymbol: string = '';

  constructor() {
    this.settings = this.uiSettingsStorage.getSettings();
    addIcons({
      fileTrayFullOutline,
      moon,
      snowOutline,
      flameOutline,
      qrCodeOutline,
      shareSocialOutline,
      heart,
      pricetagOutline,
      chevronUpOutline,
      chevronDownOutline,
    });
  }

  public ngOnInit() {
    this.setUiData();
  }

  private setUiData() {
    this.uiBrewsCount = this.getBrewCounts();
    this.uiUsedWeightCount = this.getUsedWeightCount();
    this.uiCuppedBrewFlavors = this.getCuppedBrewFlavors();
    this.uiCalculatedCostPerKG = this.getCalculateCostPerKG();
    this.uiCurrencySymbol = this.getCurrencySymbol();
  }
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

  public getBrewCounts(): number {
    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(
      this.bean.config.uuid,
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
      this.bean.config.uuid,
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
      BEAN_TRACKING.ACTIONS.POPOVER_ACTIONS,
    );
    const popover = await this.modalController.create({
      component: BeanPopoverActionsComponent,
      componentProps: { bean: this.bean },
      id: BeanPopoverActionsComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      animated: true,
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

  public toggleGroupExpansion(event: Event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (this.beanGroup) {
      this.beanGroup.expanded = !this.beanGroup.expanded;
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
        this.setUiData();
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
        this.setUiData();
        break;
      case BEAN_ACTION.SHOW_BREWS:
        await this.showBrews();
        break;
      case BEAN_ACTION.REPEAT_LAST_OR_BEST_BREW:
        await this.repeatLastOrBestBrew();
        break;
      case BEAN_ACTION.UNARCHIVE:
        await this.unarchiveBean();
        break;
      case BEAN_ACTION.FREEZE:
        await this.freezeBean();
        break;
      case BEAN_ACTION.UNFREEZE:
        await this.unfreezeBean();
        break;
      case BEAN_ACTION.GENERATE_INTERNAL_SHARE_CODE:
        await this.generateQrCode();
        break;
      case BEAN_ACTION.COPY_FROZEN_ID:
        await this.copyFrozenId();
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
      BEAN_TRACKING.ACTIONS.PHOTO_VIEW,
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

  public async unarchiveBean() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.UNARCHIVE,
    );
    this.bean.finished = false;
    await this.uiBeanStorage.update(this.bean);
    this.uiToast.showInfoToast('TOAST_BEAN_UNARCHIVED_SUCCESSFULLY');
    await this.resetSettings();
  }

  public async copyFrozenId() {
    this.uiHelper.copyToClipboard(this.bean.frozenId);
  }
  public async generateQrCode() {
    await this.uiBeanHelper.generateQRCode(this.bean);
  }
  public async freezeBean() {
    await this.uiBeanHelper.freezeBean(this.bean);
  }

  public async unfreezeBean() {
    if (this.bean.weight == 0) {
      //If a bean has been frozen from the tab menu, it could be frozen with zero weight, if this takes place, we just unfreeze the whole bean.
      this.bean.unfrozenDate = moment(new Date()).toISOString();
      await this.uiBeanStorage.update(this.bean);
      await this.resetSettings();
    } else {
      await this.uiBeanHelper.unfreezeBean(this.bean);
    }
  }

  public async toggleFavourite() {
    if (!this.bean.favourite) {
      this.uiAnalytics.trackEvent(
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.ADD_FAVOURITE,
      );
      this.uiToast.showInfoToast('TOAST_BEAN_FAVOURITE_ADDED');
      this.bean.favourite = true;
    } else {
      this.uiAnalytics.trackEvent(
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.REMOVE_FAVOURITE,
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
    if (this.disabled) {
      //Don#t edit
      return;
    }
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
      BEAN_TRACKING.ACTIONS.SHARE_IMAGE,
    );
    await this.uiAlert.showLoadingSpinner();
    if (this.platform.is('ios')) {
      htmlToImage
        .toPng(this.cardEl.nativeElement)
        .then((_dataURL) => {
          // On iOS we need to do this a second time, because the rendering doesn't render everything (strange thing)
          setTimeout(() => {
            htmlToImage
              .toPng(this.cardEl.nativeElement)
              .then(async (_dataURLSecond) => {
                await this.uiAlert.hideLoadingSpinner();
                setTimeout(() => {
                  if (
                    _dataURLSecond.length > 20 &&
                    _dataURLSecond.length > _dataURL.length
                  ) {
                    this.shareService.shareImage(_dataURLSecond);
                  } else {
                    this.shareService.shareImage(_dataURL);
                  }
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
        .toPng(this.cardEl.nativeElement)
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
    await this.uiBrewHelper.showAssociatedBrews(this.bean.config.uuid, 'bean');
  }

  public async repeatLastOrBestBrew() {
    let associatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(
      this.bean.config.uuid,
    );
    associatedBrews = associatedBrews.filter(
      (e) =>
        e.getBean().finished === false &&
        e.getMill().finished === false &&
        e.getPreparation().finished === false,
    );
    let hasBestBrews: boolean = false;
    if (associatedBrews.length > 0) {
      associatedBrews = UIBrewHelper.sortBrews(associatedBrews);

      if (this.settings.best_brew) {
        hasBestBrews =
          associatedBrews.filter((b) => b.best_brew === true).length > 0;
      }

      if (hasBestBrews) {
        const actionSheet = await this.actionSheetCtrl.create({
          header: this.translate.instant('CHOOSE'),
          buttons: [
            {
              text: this.translate.instant('REPEAT_LAST_BREW'),
              handler: async () => {
                await this.uiBrewHelper.repeatBrew(associatedBrews[0]);
              },
            },
            {
              text: this.translate.instant('REPEAT_BEST_BREW'),
              handler: async () => {
                const bestBrew = associatedBrews.filter(
                  (b) => b.best_brew === true,
                )[0];
                await this.uiBrewHelper.repeatBrew(bestBrew);
              },
            },
          ],
        });

        const waitingSheet = await actionSheet.present();
      } else {
        await this.uiBrewHelper.repeatBrew(associatedBrews[0]);
      }
    }
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
                this.bean.qr_code,
              );
            if (_scannedQRBean.error === null) {
              this.uiAnalytics.trackEvent(
                QR_TRACKING.TITLE,
                QR_TRACKING.ACTIONS.REFRESH_SUCCESSFULLY,
              );
              this.uiToast.showInfoToast('QR.BEAN_SUCCESSFULLY_REFRESHED');
              await this.uiAlert.showLoadingSpinner();
              // Get the new bean from server, just save the uuid, all other information will be overwritten
              const newMapper = new BeanMapper();
              const newBean: Bean =
                await newMapper.mapServerToClientBean(_scannedQRBean);
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
              true,
            );
          }
        },
        () => {},
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
              BEAN_TRACKING.ACTIONS.DELETE,
            );
            await this.__deleteBean();
            this.uiToast.showInfoToast('TOAST_BEAN_DELETED_SUCCESSFULLY');
            await this.resetSettings();
            resolve(undefined);
          },
          () => {
            // No
            reject();
          },
        );
    });
  }

  private async resetSettings() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.resetBeanFilter();
    await this.uiSettingsStorage.saveSettings(settings);
  }

  public async repeatBean() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.REPEAT,
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
        brews[deletingBrewIndex[i]].config.uuid,
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

  /*
      Deprecated right now, used by pipe
     */
  public showCostPerKG(): boolean {
    if (
      this.bean.weight &&
      this.bean.weight > 0 &&
      this.bean.weight !== 1000 &&
      this.bean.cost &&
      this.bean.cost > 0
    ) {
      return true;
    }
    return false;
  }
  public getCurrencySymbol(): string {
    return this.currencyService.getActualCurrencySymbol();
  }

  public getCalculateCostPerKG() {
    const beanWeight = this.bean.weight;
    const beanCost = this.bean.cost;

    const costPerGramm = beanCost / beanWeight;

    const kgCost = costPerGramm * 1000;
    return this.uiHelper.toFixedIfNecessary(kgCost, 2);
  }

  protected readonly BEAN_FUNCTION_PIPE_ENUM = BEAN_FUNCTION_PIPE_ENUM;
}
