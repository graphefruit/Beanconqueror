import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';

import {
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

import { TranslatePipe } from '@ngx-translate/core';

import { Brew } from '../../classes/brew/brew';
import { Mill } from '../../classes/mill/mill';
import { Settings } from '../../classes/settings/settings';
import MILL_TRACKING from '../../data/tracking/millTracking';
import { LongPressDirective } from '../../directive/long-press.directive';
import { MILL_ACTION } from '../../enums/mills/millActions';
import { MILL_FUNCTION_PIPE_ENUM } from '../../enums/mills/millFunctionPipe';
import { IBrew } from '../../interfaces/brew/iBrew';
import { FormatDatePipe } from '../../pipes/formatDate';
import { MillFunction } from '../../pipes/mill/millFunction';
import { UIAlert } from '../../services/uiAlert';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { UIHelper } from '../../services/uiHelper';
import { UIImage } from '../../services/uiImage';
import { UIMillHelper } from '../../services/uiMillHelper';
import { UIMillStorage } from '../../services/uiMillStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIToast } from '../../services/uiToast';
import { BrewUsageStore } from '../../stores/brews/brew-usage.store';
import { DeleteCommands } from '../../stores/delete-commands';
import {
  ActionsPopoverComponent,
  popoverAction,
  PopoverAction,
} from '../actions-popover/actions-popover.component';
import { AsyncImageComponent } from '../async-image/async-image.component';

@Component({
  selector: 'mill-information-card',
  templateUrl: './mill-information-card.component.html',
  styleUrls: ['./mill-information-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    LongPressDirective,
    AsyncImageComponent,
    TranslatePipe,
    FormatDatePipe,
    MillFunction,
    IonCard,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonButton,
    IonIcon,
    IonLabel,
    IonText,
  ],
})
export class MillInformationCardComponent {
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly modalController = inject(ModalController);
  private readonly uiMillHelper = inject(UIMillHelper);
  private readonly uiToast = inject(UIToast);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly deleteCommands = inject(DeleteCommands);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiImage = inject(UIImage);
  private readonly uiBrewHelper = inject(UIBrewHelper);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly brewUsageStore = inject(BrewUsageStore);

  @Input() public mill: Mill;

  @Output() public millAction: EventEmitter<any> = new EventEmitter();
  public settings: Settings;

  private readonly usage = computed(() =>
    this.brewUsageStore.byMill().get(this.mill.config.uuid),
  );
  private readonly lastBrew = computed(() => {
    const stored = this.usage()?.lastBrew;
    if (!stored) {
      return undefined;
    }
    const brew = new Brew();
    brew.initializeByObject(stored as unknown as IBrew);
    return brew;
  });

  public readonly brewsCount = computed(() => this.usage()?.brews ?? 0);
  public readonly weightCount = computed((): number =>
    this.uiHelper.toFixedIfNecessary(this.usage()?.grindWeight ?? 0, 2),
  );
  public readonly beansCount = computed(() => this.usage()?.beans.size ?? 0);
  public readonly lastUsed = computed(
    () => this.lastBrew()?.config.unix_timestamp ?? -1,
  );
  public readonly lastUsedGrindSizeForBrew = computed(() => {
    const brew = this.lastBrew();
    if (!brew) {
      return '-';
    }
    return brew.mill_speed > 0
      ? brew.grind_size + ' @ ' + brew.mill_speed
      : brew.grind_size;
  });
  public readonly lastUsedBean = computed(() => {
    const brew = this.lastBrew();
    // Brew.getBean() throws for a bean that no longer exists.
    if (!brew || !this.uiBeanStorage.getByUUID(brew.bean)) {
      return '-';
    }
    return brew.getBean().name;
  });

  constructor() {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public async show() {
    await this.detail();
  }

  public async showPhoto(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.viewPhotos();
  }

  private async viewPhotos() {
    this.uiAnalytics.trackEvent(
      MILL_TRACKING.TITLE,
      MILL_TRACKING.ACTIONS.PHOTO_VIEW,
    );
    await this.uiImage.viewPhotos(this.mill);
  }

  public async internalMillAction(action: MILL_ACTION) {
    switch (action) {
      case MILL_ACTION.EDIT:
        await this.edit();
        break;
      case MILL_ACTION.DELETE:
        await this.delete();
        break;
      case MILL_ACTION.ARCHIVE:
        await this.archive();
        break;
      case MILL_ACTION.DETAIL:
        await this.detail();
        break;
      case MILL_ACTION.PHOTO_GALLERY:
        await this.viewPhotos();
        break;
      case MILL_ACTION.SHOW_BREWS:
        await this.showBrews();
        break;
      default:
        break;
    }
  }

  private async resetSettings() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.resetFilter();
    await this.uiSettingsStorage.saveSettings(settings);
  }

  public async longPressEditMill(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.edit();
    this.millAction.emit([MILL_ACTION.EDIT, this.mill]);
  }
  public async edit() {
    await this.uiMillHelper.editMill(this.mill);
  }

  public async detail() {
    await this.uiMillHelper.detailMill(this.mill);
  }

  public async delete(): Promise<void> {
    const choice = await this.uiAlert.showConfirm(
      'DELETE_MILL_QUESTION',
      'SURE_QUESTION',
      true,
    );
    if (choice !== 'YES') {
      return;
    }

    const deletion = await this.uiAlert.withLoadingSpinner(async () => {
      this.uiAnalytics.trackEvent(
        MILL_TRACKING.TITLE,
        MILL_TRACKING.ACTIONS.DELETE,
      );
      const result = await this.deleteCommands.deleteMill(
        this.mill.config.uuid,
      );
      if (result === 'deleted') {
        this.uiToast.showInfoToast('TOAST_MILL_DELETED_SUCCESSFULLY');
        await this.resetSettings();
      }
      return result;
    }, 'PLEASE_WAIT_DO_NOT_CLOSE_APP');
    // After 'reported' the user has been told already.
    if (deletion === 'failed') {
      await this.uiAlert.showMessage('ERROR_OCCURED', 'CARE', undefined, true);
    }
  }

  public async archive() {
    this.uiAnalytics.trackEvent(
      MILL_TRACKING.TITLE,
      MILL_TRACKING.ACTIONS.ARCHIVE,
    );
    this.mill.finished = true;
    await this.uiMillStorage.update(this.mill);
    this.uiToast.showInfoToast('TOAST_MILL_ARCHIVED_SUCCESSFULLY');
    await this.resetSettings();
  }

  public async showMillActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.uiAnalytics.trackEvent(
      MILL_TRACKING.TITLE,
      MILL_TRACKING.ACTIONS.POPOVER_ACTIONS,
    );
    const role = await ActionsPopoverComponent.pick(this.modalController, {
      id: 'mill-popover-actions',
      items: this.buildMillActions(),
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
    });
    if (role !== undefined) {
      await this.internalMillAction(role as MILL_ACTION);
      this.millAction.emit([role as MILL_ACTION, this.mill]);
    }
  }

  private buildMillActions(): PopoverAction[] {
    return [
      popoverAction({
        role: MILL_ACTION.DETAIL,
        translationKey: 'DETAIL',
        icon: 'beanconqueror-detail',
      }),
      popoverAction({
        role: MILL_ACTION.EDIT,
        translationKey: 'EDIT',
        icon: 'beanconqueror-edit',
      }),
      popoverAction({
        role: MILL_ACTION.SHOW_BREWS,
        translationKey: 'POPOVER_SHOW_BREWS',
        icon: 'beanconqueror-brew',
      }),
      popoverAction({
        role: MILL_ACTION.ARCHIVE,
        translationKey: 'ARCHIVE',
        icon: 'beanconqueror-finished',
        visible: this.mill.finished === false,
      }),
      popoverAction({
        role: MILL_ACTION.PHOTO_GALLERY,
        translationKey: 'POPOVER_BREWS_OPTION_PHOTO_GALLERY',
        icon: 'beanconqueror-photo-gallery',
        visible: this.mill.attachments.length > 0,
      }),
      popoverAction({
        role: MILL_ACTION.DELETE,
        translationKey: 'DELETE',
        icon: 'beanconqueror-delete',
      }),
    ];
  }
  public async showBrews() {
    await this.uiBrewHelper.showAssociatedBrews(this.mill.config.uuid, 'mill');
  }

  protected readonly MILL_FUNCTION_PIPE_ENUM = MILL_FUNCTION_PIPE_ENUM;
}
