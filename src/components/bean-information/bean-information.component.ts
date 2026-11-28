import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  EventEmitter,
  inject,
  input,
  output,
  Output,
  viewChild,
} from '@angular/core';

import {
  ActionSheetController,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCol,
  IonGrid,
  IonIcon,
  IonLabel,
  IonRow,
  IonText,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  chevronDownOutline,
  chevronUpOutline,
  fileTrayFullOutline,
  flameOutline,
  heart,
  moon,
  pricetagOutline,
  qrCodeOutline,
  shareSocialOutline,
  snowOutline,
} from 'ionicons/icons';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import moment from 'moment/moment';
import { NgxStarsComponent, NgxStarsModule } from 'ngx-stars';

import { Bean } from '../../classes/bean/bean';
import { Brew } from '../../classes/brew/brew';
import { Settings } from '../../classes/settings/settings';
import BEAN_TRACKING from '../../data/tracking/beanTracking';
import QR_TRACKING from '../../data/tracking/qrTracking';
import { LongPressDirective } from '../../directive/long-press.directive';
import { StarsNameDirective } from '../../directive/stars-name.directive';
import { BEAN_ACTION } from '../../enums/beans/beanAction';
import { BEAN_FREEZING_STORAGE_ENUM } from '../../enums/beans/beanFreezingStorage';
import { ROASTS_ENUM } from '../../enums/beans/roasts';
import { BeanGroup } from '../../interfaces/bean/beanGroup';
import { IBean } from '../../interfaces/bean/iBean';
import { BeanMapper } from '../../mapper/bean/beanMapper';
import { ServerBean } from '../../models/bean/serverBean';
import { BeanFieldVisiblePipe } from '../../pipes/bean/beanFieldVisible';
import { FormatDatePipe } from '../../pipes/formatDate';
import { ToFixedPipe } from '../../pipes/toFixed';
import { CurrencyService } from '../../services/currencyService/currency.service';
import { ServerCommunicationService } from '../../services/serverCommunication/server-communication.service';
import { ShareService } from '../../services/shareService/share-service.service';
import { UIAlert } from '../../services/uiAlert';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIBeanHelper } from '../../services/uiBeanHelper';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { UIHelper } from '../../services/uiHelper';
import { UIImage } from '../../services/uiImage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIToast } from '../../services/uiToast';
import {
  beanActions,
  pickRepeatBrew,
} from '../../stores/beans/bean-action-rules';
import { BeanCommands } from '../../stores/beans/bean-commands';
import {
  beanAgeInDays,
  beanEntryName,
  hasFrozenInformation,
  hasPhotos,
  isFrozen,
  isScannedBean,
  isSelfRoasted,
  showsCostPerKg,
} from '../../stores/beans/bean-rules';
import { BeanUsageStore, NO_USAGE } from '../../stores/beans/bean-usage.store';
import { BeanStore, toLegacyBean } from '../../stores/beans/bean.store';
import { DeepReadonly } from '../../stores/core/read-only';
import { DeleteCommands } from '../../stores/delete-commands';
import { deleteQuestion } from '../../stores/delete-rules';
import {
  ActionsPopoverComponent,
  popoverAction,
} from '../actions-popover/actions-popover.component';
import { AsyncImageComponent } from '../async-image/async-image.component';
import { BeanShareComponent } from '../bean-share/bean-share.component';

/** What a bean card sends after an action, with the bean it worked on. */
export type BeanActionEvent = [BEAN_ACTION, Bean];

@Component({
  selector: 'bean-information',
  templateUrl: './bean-information.component.html',
  styleUrls: [
    './bean-information.component.scss',
    '../../theme/variables.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LongPressDirective,
    NgxStarsModule,
    StarsNameDirective,
    AsyncImageComponent,
    DecimalPipe,
    TranslatePipe,
    FormatDatePipe,
    ToFixedPipe,
    BeanFieldVisiblePipe,
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
export class BeanInformationComponent {
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  readonly uiBeanHelper = inject(UIBeanHelper);
  private readonly modalController = inject(ModalController);
  private readonly uiAnalytics = inject(UIAnalytics);
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
  private readonly uiBrewHelper = inject(UIBrewHelper);
  private actionSheetCtrl = inject(ActionSheetController);
  private readonly currencyService = inject(CurrencyService);
  private readonly beanStore = inject(BeanStore);
  private readonly deleteCommands = inject(DeleteCommands);
  private readonly beanCommands = inject(BeanCommands);
  private readonly beanUsageStore = inject(BeanUsageStore);

  /**
   * The bean to show; legacy hosts hand in a `Bean`. Shown is the stored
   * state of the bean with this uuid, or this bean if it is not stored.
   */
  public readonly bean = input.required<DeepReadonly<IBean>>();
  public readonly beanGroup = input<BeanGroup>();
  /** Whether the cards of `beanGroup` are shown; the list keeps it. */
  public readonly groupExpanded = input(false);
  public readonly groupToggled = output<void>();
  public readonly showActions = input(true);
  public readonly disabled = input(false);
  public readonly collapsed = input(false);
  public readonly isGroupChild = input(false);
  private readonly beanStars = viewChild('beanStars', {
    read: NgxStarsComponent,
  });
  private readonly beanRating = viewChild('beanRating', {
    read: NgxStarsComponent,
  });

  @Output() public beanAction = new EventEmitter<BeanActionEvent>();

  public beanFreezingStorageTypeEnum = BEAN_FREEZING_STORAGE_ENUM;
  public roast_enum = ROASTS_ENUM;
  public settings: Settings = null;
  protected readonly currencySymbol: string =
    this.currencyService.getActualCurrencySymbol();

  protected readonly shown = computed(
    () => this.beanStore.byUuid().get(this.bean().config.uuid) ?? this.bean(),
  );
  protected readonly usage = computed(
    () => this.beanUsageStore.usage().get(this.shown().config.uuid) ?? NO_USAGE,
  );
  /** Names the bean in its buttons with what the card shows of it. */
  protected readonly entryName = computed(() => {
    const bean = this.shown();
    const visible = this.settings.bean_visible_list_view_parameters;
    const details = !this.collapsed();
    return beanEntryName(bean, {
      roaster: details && visible.roaster,
      roastingDate:
        details &&
        visible.roastingDate &&
        !!bean.roastingDate &&
        moment(bean.roastingDate).format(this.settings.date_format),
    });
  });
  protected readonly frozen = computed(() => isFrozen(this.shown()));
  protected readonly frozenInformation = computed(() =>
    hasFrozenInformation(this.shown()),
  );
  protected readonly selfRoasted = computed(() => isSelfRoasted(this.shown()));
  protected readonly scanned = computed(() => isScannedBean(this.shown()));
  protected readonly photos = computed(() => hasPhotos(this.shown()));
  protected readonly ageInDays = computed(() =>
    beanAgeInDays(this.shown(), Date.now(), this.usage().lastBrewAt),
  );
  protected readonly roastingTypeUnknown = computed(
    () => (this.shown().bean_roasting_type as string) === 'UNKNOWN',
  );
  /** Which of the three ways the roast is shown in. */
  protected readonly roast = computed(() => {
    const roast = this.shown().roast as string;
    if (roast === 'UNKNOWN') {
      return 'unknown';
    }
    return roast === 'CUSTOM_ROAST' ? 'custom' : 'named';
  });
  protected readonly flavors = computed((): string[] => {
    const flavor = this.shown().cupped_flavor;
    return [
      ...flavor.custom_flavors,
      ...Object.keys(flavor.predefined_flavors).map(
        (key) => this.translate.instant('CUPPING_' + key) as string,
      ),
    ];
  });
  /** Undefined when the card shows no price per kilogram. */
  protected readonly costPerKg = computed(() => {
    const bean = this.shown();
    if (!showsCostPerKg(bean)) {
      return undefined;
    }
    return this.uiHelper.toFixedIfNecessary(
      (bean.cost / bean.weight) * 1000,
      2,
    );
  });

  /**
   * The bean the actions work on: a copy of the shown bean that the legacy
   * dialogs and the bean storage may change, taken when an action starts.
   */
  private actionBean: Bean;

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
    // The stars take their input only when they are created.
    effect(() => {
      const bean = this.shown();
      this.beanStars()?.setRating(bean.roast_range);
      this.beanRating()?.setRating(bean.rating);
    });
  }

  private startAction(): void {
    this.actionBean = toLegacyBean(this.shown());
  }

  public async showBean() {
    this.startAction();
    await this.detailBean();
  }

  public async showPhoto(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.startAction();
    await this.viewPhotos();
  }

  public async showBeanActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.startAction();
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.POPOVER_ACTIONS,
    );
    const role = await ActionsPopoverComponent.pick(this.modalController, {
      id: 'bean-popover-actions',
      openedBy: event,
      items: beanActions(this.actionBean, {
        freezeEnabled: this.settings.freeze_coffee_beans === true,
        hasActiveBrews: this.hasActiveBrews(),
      }).map((entry) => popoverAction(entry)),
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 1,
    });
    if (role !== undefined) {
      await this.internalBeanAction(role as BEAN_ACTION);
      this.beanAction.emit([role as BEAN_ACTION, this.actionBean]);
    }
  }

  /**
   * The brews of the bean that can be repeated. Throws on a brew whose bean,
   * grinder or preparation is gone.
   */
  private activeBrews(): Brew[] {
    return this.uiBeanHelper
      .getAllBrewsForThisBean(this.actionBean.config.uuid)
      .filter(
        (b) =>
          b.getBean().finished === false &&
          b.getMill().finished === false &&
          b.getPreparation().finished === false,
      );
  }

  private hasActiveBrews(): boolean {
    try {
      return this.activeBrews().length > 0;
    } catch {
      return false;
    }
  }

  public toggleGroupExpansion(event: Event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.groupToggled.emit();
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
        await this.deleteBean();
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
    await this.uiBeanHelper.detailBean(this.actionBean);
  }
  public async cupBean() {
    await this.uiBeanHelper.cupBean(this.actionBean);
  }
  private async viewPhotos() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.PHOTO_VIEW,
    );
    await this.uiImage.viewPhotos(this.actionBean);
  }
  public async beansConsumed() {
    await this.uiBeanHelper.archiveBeanWithRatingQuestion(this.actionBean);
    await this.resetSettings();

    /* this.uiAnalytics.trackEvent(BEAN_TRACKING.TITLE, BEAN_TRACKING.ACTIONS.ARCHIVE);
        this.actionBean.finished = true;
        await this.uiBeanStorage.update(this.actionBean);
        this.uiToast.showInfoToast('TOAST_BEAN_ARCHIVED_SUCCESSFULLY');
        */
  }

  public async unarchiveBean() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.UNARCHIVE,
    );
    await this.beanCommands.unarchive(this.actionBean.config.uuid);
    this.uiToast.showInfoToast('TOAST_BEAN_UNARCHIVED_SUCCESSFULLY');
    await this.resetSettings();
  }

  public async copyFrozenId() {
    this.uiHelper.copyToClipboard(this.actionBean.frozenId);
  }
  public async generateQrCode() {
    await this.uiBeanHelper.generateQRCode(this.actionBean);
  }
  public async freezeBean() {
    await this.uiBeanHelper.freezeBean(this.actionBean);
  }

  public async unfreezeBean() {
    if (this.actionBean.weight == 0) {
      //If a bean has been frozen from the tab menu, it could be frozen with zero weight, if this takes place, we just unfreeze the whole bean.
      this.actionBean.unfrozenDate = moment(new Date()).toISOString();
      await this.uiBeanStorage.update(this.actionBean);
      await this.resetSettings();
    } else {
      await this.uiBeanHelper.unfreezeBean(this.actionBean);
    }
  }

  public async toggleFavourite() {
    const favourite = !this.actionBean.favourite;
    if (favourite) {
      this.uiAnalytics.trackEvent(
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.ADD_FAVOURITE,
      );
      this.uiToast.showInfoToast('TOAST_BEAN_FAVOURITE_ADDED');
    } else {
      this.uiAnalytics.trackEvent(
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.REMOVE_FAVOURITE,
      );
      this.uiToast.showInfoToast('TOAST_BEAN_FAVOURITE_REMOVED');
    }
    await this.beanCommands.setFavourite(
      this.actionBean.config.uuid,
      favourite,
    );
  }

  public async longPressEditBean(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (this.disabled()) {
      //Don#t edit
      return;
    }
    this.startAction();
    await this.editBean();
    this.beanAction.emit([BEAN_ACTION.EDIT, this.actionBean]);
  }
  public async editBean() {
    await this.uiBeanHelper.editBean(this.actionBean);
  }

  public async shareBean() {
    await this.shareService.shareBean(this.actionBean);
  }
  public async shareBeanImage() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.SHARE_IMAGE,
    );
    await BeanShareComponent.open(
      this.modalController,
      this.shown(),
      this.usage(),
    );
  }

  public async showBrews() {
    await this.uiBrewHelper.showAssociatedBrews(
      this.actionBean.config.uuid,
      'bean',
    );
  }

  public async repeatLastOrBestBrew() {
    const choice = pickRepeatBrew(this.activeBrews(), this.settings.best_brew);
    if (!choice) {
      return;
    }
    if (choice.best) {
      const actionSheet = await this.actionSheetCtrl.create({
        header: this.translate.instant('CHOOSE'),
        buttons: [
          {
            text: this.translate.instant('REPEAT_LAST_BREW'),
            handler: async () => {
              await this.uiBrewHelper.repeatBrew(choice.latest);
            },
          },
          {
            text: this.translate.instant('REPEAT_BEST_BREW'),
            handler: async () => {
              await this.uiBrewHelper.repeatBrew(choice.best);
            },
          },
        ],
      });

      await actionSheet.present();
    } else {
      await this.uiBrewHelper.repeatBrew(choice.latest);
    }
  }
  public async refreshDataFromQRCode() {
    const choice = await this.uiAlert.showConfirm(
      'QR_CODE_REFRESH_DATA_MESSAGE',
      'CARE',
      true,
    );
    if (choice !== 'YES') {
      return;
    }

    await this.uiAlert.showLoadingSpinner();
    let errorOccured = false;
    try {
      const _scannedQRBean: ServerBean =
        await this.serverCommunicationService.getBeanInformation(
          this.actionBean.qr_code,
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
        const savedUUID = this.actionBean.config.uuid;
        this.actionBean = newBean;
        this.actionBean.config.uuid = savedUUID;
        await this.uiBeanStorage.update(this.actionBean);
      } else {
        errorOccured = true;
      }
    } catch {
      errorOccured = true;
    }
    await this.uiAlert.hideLoadingSpinner();
    if (errorOccured) {
      await this.uiAlert.showMessage(
        'QR.SERVER.ERROR_OCCURED',
        'ERROR_OCCURED',
        undefined,
        true,
      );
    }
  }

  public async deleteBean(): Promise<void> {
    const brews = this.deleteCommands.brewCount(
      'bean',
      this.actionBean.config.uuid,
    );
    const choice = await this.uiAlert.showConfirm(
      deleteQuestion('DELETE_BEAN_QUESTION', brews),
      'SURE_QUESTION',
      true,
      { count: brews },
    );
    if (choice !== 'YES') {
      return;
    }

    const deletion = await this.uiAlert.withLoadingSpinner(async () => {
      this.uiAnalytics.trackEvent(
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.DELETE,
      );
      const result = await this.deleteCommands.deleteBean(
        this.actionBean.config.uuid,
      );
      if (result === 'deleted') {
        this.uiToast.showInfoToast('TOAST_BEAN_DELETED_SUCCESSFULLY');
        await this.resetSettings();
      }
      return result;
    }, 'PLEASE_WAIT_DO_NOT_CLOSE_APP');
    // After 'reported' the user has been told already.
    if (deletion === 'failed') {
      await this.uiAlert.showMessage('ERROR_OCCURED', 'CARE', undefined, true);
    }
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
    await this.uiBeanHelper.repeatBean(this.actionBean);
  }
}
