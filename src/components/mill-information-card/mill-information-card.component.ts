import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Settings } from '../../classes/settings/settings';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { ModalController } from '@ionic/angular';
import { Mill } from '../../classes/mill/mill';
import { MILL_ACTION } from '../../enums/mills/millActions';
import { MillPopoverActionsComponent } from '../../app/mill/mill-popover-actions/mill-popover-actions.component';
import { Brew } from '../../classes/brew/brew';
import { UIMillHelper } from '../../services/uiMillHelper';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { MillEditComponent } from '../../app/mill/mill-edit/mill-edit.component';
import { MillDetailComponent } from '../../app/mill/mill-detail/mill-detail.component';
import { UIToast } from '../../services/uiToast';
import { UIAlert } from '../../services/uiAlert';
import { UIMillStorage } from '../../services/uiMillStorage';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIImage } from '../../services/uiImage';
import MILL_TRACKING from '../../data/tracking/millTracking';
import { PREPARATION_ACTION } from '../../enums/preparations/preparationAction';
@Component({
  selector: 'mill-information-card',
  templateUrl: './mill-information-card.component.html',
  styleUrls: ['./mill-information-card.component.scss'],
})
export class MillInformationCardComponent implements OnInit {
  @Input() public mill: Mill;

  @Output() public millAction: EventEmitter<any> = new EventEmitter();
  public settings: Settings;
  constructor(
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly modalController: ModalController,
    private readonly uiMillHelper: UIMillHelper,
    private readonly uiToast: UIToast,
    private readonly uiAlert: UIAlert,
    private readonly uiMillStorage: UIMillStorage,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiImage: UIImage,
    private readonly uiBrewHelper: UIBrewHelper
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public ngOnInit() {}

  public getBrewsCount(): number {
    const relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(
      this.mill.config.uuid
    );
    return relatedBrews.length;
  }

  public getWeightCount(): number {
    const relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(
      this.mill.config.uuid
    );
    let grindWeight: number = 0;
    for (const brew of relatedBrews) {
      grindWeight += brew.grind_weight;
    }
    return grindWeight;
  }

  public getBeansCount(): number {
    const relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(
      this.mill.config.uuid
    );
    const distinctBeans = relatedBrews.filter((bean, i, arr) => {
      return arr.indexOf(arr.find((t) => t.bean === bean.bean)) === i;
    });

    return distinctBeans.length;
  }
  public lastUsed(): number {
    let relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(
      this.mill.config.uuid
    );
    if (relatedBrews.length > 0) {
      relatedBrews = UIBrewHelper.sortBrews(relatedBrews);
      return relatedBrews[0].config.unix_timestamp;
    }
    return -1;
  }

  public getLastUsedGrindSizeForBrew(): string {
    let relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(
      this.mill.config.uuid
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
      this.mill.config.uuid
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
      MILL_TRACKING.ACTIONS.PHOTO_VIEW
    );
    await this.uiImage.viewPhotos(this.mill);
  }

  public async internalMillAction(action: MILL_ACTION) {
    switch (action) {
      case MILL_ACTION.EDIT:
        await this.edit();
        break;
      case MILL_ACTION.DELETE:
        try {
          await this.delete();
        } catch (ex) {}
        await this.uiAlert.hideLoadingSpinner();
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

  public async delete() {
    await this.uiAlert
      .showConfirm('DELETE_MILL_QUESTION', 'SURE_QUESTION', true)
      .then(
        async () => {
          await this.uiAlert.showLoadingSpinner();
          // Yes
          this.uiAnalytics.trackEvent(
            MILL_TRACKING.TITLE,
            MILL_TRACKING.ACTIONS.DELETE
          );
          await this.__deleteMill();
          this.uiToast.showInfoToast('TOAST_MILL_DELETED_SUCCESSFULLY');
          await this.resetSettings();
        },
        () => {
          // No
        }
      );
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
        brews[deletingBrewIndex[i]].config.uuid
      );
    }

    await this.uiMillStorage.removeByObject(this.mill);
  }

  public async archive() {
    this.uiAnalytics.trackEvent(
      MILL_TRACKING.TITLE,
      MILL_TRACKING.ACTIONS.ARCHIVE
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
      MILL_TRACKING.ACTIONS.POPOVER_ACTIONS
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
}
