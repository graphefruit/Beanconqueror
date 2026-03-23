import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
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
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { MillPopoverActionsComponent } from '../../app/mill/mill-popover-actions/mill-popover-actions.component';
import { Brew } from '../../classes/brew/brew';
import { Mill } from '../../classes/mill/mill';
import { Settings } from '../../classes/settings/settings';
import MILL_TRACKING from '../../data/tracking/millTracking';
import { LongPressDirective } from '../../directive/long-press.directive';
import { MILL_ACTION } from '../../enums/mills/millActions';
import { MILL_FUNCTION_PIPE_ENUM } from '../../enums/mills/millFunctionPipe';
import { FormatDatePipe } from '../../pipes/formatDate';
import { MillFunction } from '../../pipes/mill/millFunction';
import { UIAlert } from '../../services/uiAlert';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIHelper } from '../../services/uiHelper';
import { UIImage } from '../../services/uiImage';
import { UIMillHelper } from '../../services/uiMillHelper';
import { UIMillStorage } from '../../services/uiMillStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIToast } from '../../services/uiToast';
import { AsyncImageComponent } from '../async-image/async-image.component';

@Component({
  selector: 'mill-information-card',
  templateUrl: './mill-information-card.component.html',
  styleUrls: ['./mill-information-card.component.scss'],
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
export class MillInformationCardComponent implements OnInit {
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly modalController = inject(ModalController);
  private readonly uiMillHelper = inject(UIMillHelper);
  private readonly uiToast = inject(UIToast);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiImage = inject(UIImage);
  private readonly uiBrewHelper = inject(UIBrewHelper);
  private readonly uiHelper = inject(UIHelper);

  @Input() public mill: Mill;

  @Output() public millAction: EventEmitter<any> = new EventEmitter();
  public settings: Settings;

  public brewsCount: number = 0;
  public weightCount: number = 0;
  public beansCount: number = 0;
  public lastUsedGrindSizeForBrew: string = '';
  public lastUsedBean: string = '';
  public lastUsed: number = 0;

  constructor() {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public ngOnInit() {
    this.brewsCount = this.getBrewsCount();
    this.weightCount = this.getWeightCount();
    this.beansCount = this.getBeansCount();
    this.lastUsedBean = this.getLastUsedBean();
    this.lastUsed = this.getLastUsed();
    this.lastUsedGrindSizeForBrew = this.getLastUsedGrindSizeForBrew();

    this.brewsCount = this.uiHelper.toFixedIfNecessary(this.brewsCount, 0);
    this.weightCount = this.uiHelper.toFixedIfNecessary(this.weightCount, 2);
    this.beansCount = this.uiHelper.toFixedIfNecessary(this.beansCount, 0);
  }

  public getBrewsCount(): number {
    const relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(
      this.mill.config.uuid,
    );
    return relatedBrews.length;
  }

  public getWeightCount(): number {
    const relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(
      this.mill.config.uuid,
    );
    let grindWeight: number = 0;
    for (const brew of relatedBrews) {
      grindWeight += brew.grind_weight;
    }
    return grindWeight;
  }

  public getBeansCount(): number {
    const relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(
      this.mill.config.uuid,
    );
    const distinctBeans = relatedBrews.filter((bean, i, arr) => {
      return arr.indexOf(arr.find((t) => t.bean === bean.bean)) === i;
    });

    return distinctBeans.length;
  }
  public getLastUsed(): number {
    let relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(
      this.mill.config.uuid,
    );
    if (relatedBrews.length > 0) {
      relatedBrews = UIBrewHelper.sortBrews(relatedBrews);
      return relatedBrews[0].config.unix_timestamp;
    }
    return -1;
  }

  public getLastUsedGrindSizeForBrew(): string {
    let relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(
      this.mill.config.uuid,
    );
    if (relatedBrews.length > 0) {
      relatedBrews = UIBrewHelper.sortBrews(relatedBrews);
      if (relatedBrews[0].mill_speed > 0) {
        return relatedBrews[0].grind_size + ' @ ' + relatedBrews[0].mill_speed;
      } else {
        return relatedBrews[0].grind_size;
      }
    }
    return '-';
  }
  public getLastUsedBean(): string {
    let relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(
      this.mill.config.uuid,
    );
    if (relatedBrews.length > 0) {
      relatedBrews = UIBrewHelper.sortBrews(relatedBrews);
      return relatedBrews[0].getBean().name;
    }
    return '-';
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

    await this.uiAlert.withLoadingSpinner(async () => {
      this.uiAnalytics.trackEvent(
        MILL_TRACKING.TITLE,
        MILL_TRACKING.ACTIONS.DELETE,
      );
      await this.__deleteMill();
      this.uiToast.showInfoToast('TOAST_MILL_DELETED_SUCCESSFULLY');
      await this.resetSettings();
    });
  }
  private async __deleteMill() {
    const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
    const deletingBrewIndex: Array<number> = [];
    for (let i = 0; i < brews.length; i++) {
      if (brews[i].mill === this.mill.config.uuid) {
        deletingBrewIndex.push(i);
      }
    }
    for (let i = deletingBrewIndex.length; i--; ) {
      await this.uiBrewStorage.removeByUUID(
        brews[deletingBrewIndex[i]].config.uuid,
      );
    }

    await this.uiMillStorage.removeByObject(this.mill);
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
    const popover = await this.modalController.create({
      component: MillPopoverActionsComponent,
      componentProps: { mill: this.mill },
      id: MillPopoverActionsComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    if (data.role !== undefined) {
      await this.internalMillAction(data.role as MILL_ACTION);
      this.millAction.emit([data.role as MILL_ACTION, this.mill]);
    }
  }
  public async showBrews() {
    await this.uiBrewHelper.showAssociatedBrews(this.mill.config.uuid, 'mill');
  }

  protected readonly MILL_FUNCTION_PIPE_ENUM = MILL_FUNCTION_PIPE_ENUM;
}
