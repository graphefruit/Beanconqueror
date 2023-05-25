import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Settings } from '../../classes/settings/settings';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { ModalController } from '@ionic/angular';
import { Preparation } from '../../classes/preparation/preparation';
import { PREPARATION_ACTION } from '../../enums/preparations/preparationAction';
import { PreparationPopoverActionsComponent } from '../../app/preparation/preparation-popover-actions/preparation-popover-actions.component';
import { Brew } from '../../classes/brew/brew';
import { UIPreparationHelper } from '../../services/uiPreparationHelper';
import { PreparationCustomParametersComponent } from '../../app/preparation/preparation-custom-parameters/preparation-custom-parameters.component';
import { UIAlert } from '../../services/uiAlert';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIToast } from '../../services/uiToast';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIImage } from '../../services/uiImage';
import PREPARATION_TRACKING from '../../data/tracking/preparationTracking';
import { PreparationConnectedDeviceComponent } from '../../app/preparation/preparation-connected-device/preparation-connected-device.component';
import { PreparationDeviceType } from '../../classes/preparationDevice';

@Component({
  selector: 'preparation-information-card',
  templateUrl: './preparation-information-card.component.html',
  styleUrls: ['./preparation-information-card.component.scss'],
})
export class PreparationInformationCardComponent implements OnInit {
  @Input() public preparation: Preparation;

  @Output() public preparationAction: EventEmitter<any> = new EventEmitter();

  constructor(
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly modalController: ModalController,
    private readonly uiPreparationHelper: UIPreparationHelper,
    private readonly uiAlert: UIAlert,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiToast: UIToast,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiImage: UIImage
  ) {}

  public ngOnInit() {}

  public getBrewsCount(): number {
    const relatedBrews: Array<Brew> =
      this.uiPreparationHelper.getAllBrewsForThisPreparation(
        this.preparation.config.uuid
      );
    return relatedBrews.length;
  }

  public getWeightCount(): number {
    const relatedBrews: Array<Brew> =
      this.uiPreparationHelper.getAllBrewsForThisPreparation(
        this.preparation.config.uuid
      );
    let grindWeight: number = 0;
    for (const brew of relatedBrews) {
      grindWeight += brew.grind_weight;
    }
    return grindWeight;
  }

  public getDrunkenQuantity(): number {
    const relatedBrews: Array<Brew> =
      this.uiPreparationHelper.getAllBrewsForThisPreparation(
        this.preparation.config.uuid
      );
    let drunkenQuantity: number = 0;
    for (const brew of relatedBrews) {
      if (brew.brew_beverage_quantity > 0) {
        drunkenQuantity += brew.brew_beverage_quantity;
      } else {
        drunkenQuantity += brew.brew_quantity;
      }
    }
    return drunkenQuantity / 1000;
  }

  public getBeansCount(): number {
    const relatedBrews: Array<Brew> =
      this.uiPreparationHelper.getAllBrewsForThisPreparation(
        this.preparation.config.uuid
      );
    const distinctBeans = relatedBrews.filter((bean, i, arr) => {
      return arr.indexOf(arr.find((t) => t.bean === bean.bean)) === i;
    });

    return distinctBeans.length;
  }

  private async resetSettings() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.resetFilter();
    await this.uiSettingsStorage.saveSettings(settings);
  }

  public async show() {
    await this.detail();
  }

  public async showPreparationActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.POPOVER_ACTIONS
    );
    const popover = await this.modalController.create({
      component: PreparationPopoverActionsComponent,
      id: PreparationPopoverActionsComponent.COMPONENT_ID,
      componentProps: { preparation: this.preparation },
      cssClass: 'popover-actions',
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    if (data.role !== undefined) {
      await this.internalPreparationAction(data.role as PREPARATION_ACTION);
      this.preparationAction.emit([
        data.role as PREPARATION_ACTION,
        this.preparation,
      ]);
    }
  }

  public async showPhoto(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.viewPhotos();
  }

  private async viewPhotos() {
    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.PHOTO_VIEW
    );
    await this.uiImage.viewPhotos(this.preparation);
  }

  public async internalPreparationAction(action: PREPARATION_ACTION) {
    switch (action) {
      case PREPARATION_ACTION.CUSTOM_PARAMETERS:
        await this.customParameters();
        break;
      case PREPARATION_ACTION.EDIT:
        await this.editPreparation();
        break;
      case PREPARATION_ACTION.REPEAT:
        await this.repeatPreparation();
        break;
      case PREPARATION_ACTION.DELETE:
        try {
          await this.deletePreparation();
        } catch (ex) {}
        await this.uiAlert.hideLoadingSpinner();
        break;
      case PREPARATION_ACTION.PHOTO_GALLERY:
        await this.viewPhotos();
        break;
      case PREPARATION_ACTION.ARCHIVE:
        await this.archive();
        break;
      case PREPARATION_ACTION.DETAIL:
        await this.detail();
        break;
      case PREPARATION_ACTION.CONNECT_DEVICE:
        await this.connectDevice();
        break;
      case PREPARATION_ACTION.EDIT_DEVICE_CONNECTION:
        await this.connectDevice();
        break;

      default:
        break;
    }
  }

  public async customParameters() {
    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.CUSTOM_PARAMETERS
    );
    const modal = await this.modalController.create({
      component: PreparationCustomParametersComponent,
      componentProps: { preparation: this.preparation },
      id: PreparationCustomParametersComponent.COMPONENT_ID,
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async connectDevice() {
    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.CONNECT_DEVICE
    );
    const modal = await this.modalController.create({
      component: PreparationConnectedDeviceComponent,
      componentProps: { preparation: this.preparation },
      id: PreparationConnectedDeviceComponent.COMPONENT_ID,
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async longPressEditPreparation(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.editPreparation();
    this.preparationAction.emit([PREPARATION_ACTION.EDIT, this.preparation]);
  }

  public async editPreparation() {
    await this.uiPreparationHelper.editPreparation(this.preparation);
  }

  public async repeatPreparation() {
    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.REPEAT
    );
    await this.uiPreparationHelper.repeatPreparation(this.preparation);
    this.uiToast.showInfoToast(
      'TOAST_PREPARATION_METHOD_REPEATED_SUCCESSFULLY'
    );
  }

  public async detail() {
    await this.uiPreparationHelper.detailPreparation(this.preparation);
  }

  public async deletePreparation() {
    await this.uiAlert
      .showConfirm('DELETE_PREPARATION_METHOD_QUESTION', 'SURE_QUESTION', true)
      .then(
        async () => {
          await this.uiAlert.showLoadingSpinner();
          // Yes
          this.uiAnalytics.trackEvent(
            PREPARATION_TRACKING.TITLE,
            PREPARATION_TRACKING.ACTIONS.DELETE
          );
          await this.__deletePreparation();
          this.uiToast.showInfoToast('TOAST_PREPARATION_DELETED_SUCCESSFULLY');
          await this.resetSettings();
        },
        () => {
          // No
        }
      );
  }

  public async archive() {
    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.ARCHIVE
    );
    this.preparation.finished = true;
    await this.uiPreparationStorage.update(this.preparation);
    this.uiToast.showInfoToast('TOAST_PREPARATION_ARCHIVED_SUCCESSFULLY');
    await this.resetSettings();
  }

  private async __deletePreparation() {
    const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
    const deletingBrewIndex: Array<number> = [];
    for (let i = 0; i < brews.length; i++) {
      if (brews[i].method_of_preparation === this.preparation.config.uuid) {
        deletingBrewIndex.push(i);
      }
    }
    for (let i = deletingBrewIndex.length; i--; ) {
      await this.uiBrewStorage.removeByUUID(
        brews[deletingBrewIndex[i]].config.uuid
      );
    }

    await this.uiPreparationStorage.removeByObject(this.preparation);
  }
  public preparationHasDeviceConnection() {
    return (
      this.preparation?.connectedPreparationDevice.type !==
      PreparationDeviceType.NONE
    );
  }
}
