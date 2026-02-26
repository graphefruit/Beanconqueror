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
import { addIcons } from 'ionicons';
import { wifiOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { PreparationCustomParametersComponent } from '../../app/preparation/preparation-custom-parameters/preparation-custom-parameters.component';
import { PreparationPopoverActionsComponent } from '../../app/preparation/preparation-popover-actions/preparation-popover-actions.component';
import { Brew } from '../../classes/brew/brew';
import { Preparation } from '../../classes/preparation/preparation';
import { PreparationDeviceType } from '../../classes/preparationDevice';
import { PreparationDevice } from '../../classes/preparationDevice/preparationDevice';
import { SanremoYOUDevice } from '../../classes/preparationDevice/sanremo/sanremoYOUDevice';
import { Settings } from '../../classes/settings/settings';
import PREPARATION_TRACKING from '../../data/tracking/preparationTracking';
import { LongPressDirective } from '../../directive/long-press.directive';
import { PREPARATION_ACTION } from '../../enums/preparations/preparationAction';
import { PREPARATION_FUNCTION_PIPE_ENUM } from '../../enums/preparations/preparationFunctionPipe';
import { PreparationFunction } from '../../pipes/preparation/preparationFunction';
import { UIAlert } from '../../services/uiAlert';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIHelper } from '../../services/uiHelper';
import { UIImage } from '../../services/uiImage';
import { UIPreparationHelper } from '../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIToast } from '../../services/uiToast';
import { AsyncImageComponent } from '../async-image/async-image.component';

@Component({
  selector: 'preparation-information-card',
  templateUrl: './preparation-information-card.component.html',
  styleUrls: ['./preparation-information-card.component.scss'],
  imports: [
    LongPressDirective,
    AsyncImageComponent,
    TranslatePipe,
    PreparationFunction,
    IonCard,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonIcon,
    IonButton,
    IonLabel,
    IonText,
  ],
})
export class PreparationInformationCardComponent implements OnInit {
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly modalController = inject(ModalController);
  private readonly uiPreparationHelper = inject(UIPreparationHelper);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiToast = inject(UIToast);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiImage = inject(UIImage);
  private readonly uiBrewHelper = inject(UIBrewHelper);
  private readonly uiHelper = inject(UIHelper);

  @Input() public preparation: Preparation;

  @Output() public preparationAction: EventEmitter<any> = new EventEmitter();

  public brewsCount: number = 0;
  public weightCount: number = 0;
  public drunkenQuantity: number = 0;
  public beansCount: number = 0;

  constructor() {
    addIcons({ wifiOutline });
  }

  public ngOnInit() {
    this.brewsCount = this.getBrewsCount();
    this.weightCount = this.getWeightCount();
    this.drunkenQuantity = this.getDrunkenQuantity();
    this.beansCount = this.getBeansCount();

    this.brewsCount = this.uiHelper.toFixedIfNecessary(this.brewsCount, 0);
    this.weightCount = this.uiHelper.toFixedIfNecessary(this.weightCount, 2);
    this.drunkenQuantity = this.uiHelper.toFixedIfNecessary(
      this.drunkenQuantity,
      2,
    );
    this.beansCount = this.uiHelper.toFixedIfNecessary(this.beansCount, 0);
  }

  public getBrewsCount(): number {
    const relatedBrews: Array<Brew> =
      this.uiPreparationHelper.getAllBrewsForThisPreparation(
        this.preparation.config.uuid,
      );
    return relatedBrews.length;
  }

  public getWeightCount(): number {
    const relatedBrews: Array<Brew> =
      this.uiPreparationHelper.getAllBrewsForThisPreparation(
        this.preparation.config.uuid,
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
        this.preparation.config.uuid,
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
        this.preparation.config.uuid,
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

  public async turnOnMachine() {
    const device: PreparationDevice =
      this.preparation.getConnectedDevice() as PreparationDevice;
    const result = await device.turnOnMachine();
    if (result) {
      this.uiToast.showInfoToast(
        'TOAST_PREPARATION_MACHINE_TURNED_ON_SUCCESSFULLY',
      );
    } else {
      this.uiToast.showInfoToast(
        'TOAST_PREPARATION_MACHINE_TURNED_ON_UNSUCCESSFULLY',
      );
    }
  }

  public async turnOffMachine() {
    const device: PreparationDevice =
      this.preparation.getConnectedDevice() as PreparationDevice;

    const result = await device.turnOffMachine();
    if (result) {
      this.uiToast.showInfoToast(
        'TOAST_PREPARATION_MACHINE_TURNED_OFF_SUCCESSFULLY',
      );
    } else {
      this.uiToast.showInfoToast(
        'TOAST_PREPARATION_MACHINE_TURNED_OFF_UNSUCCESSFULLY',
      );
    }

    //All events need to be canceled, else the detail page is shown
  }
  public toggleTurnOnOffMachine(_event: any) {
    _event.preventDefault();
    _event.stopImmediatePropagation();
    _event.stopPropagation();

    this.preparation.getConnectedDevice();
    //All events need to be canceled, else the detail page is shown
  }
  public async showPreparationActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.POPOVER_ACTIONS,
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
      PREPARATION_TRACKING.ACTIONS.PHOTO_VIEW,
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
        await this.deletePreparation();
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
      case PREPARATION_ACTION.SHOW_BREWS:
        await this.showBrews();
        break;
      case PREPARATION_ACTION.TURN_MACHINE_ON:
        this.turnOnMachine();
        break;
      case PREPARATION_ACTION.TURN_MACHINE_OFF:
        this.turnOffMachine();
        break;
      default:
        break;
    }
  }

  public async customParameters() {
    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.CUSTOM_PARAMETERS,
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
    await this.uiPreparationHelper.connectDevice(this.preparation);
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
      PREPARATION_TRACKING.ACTIONS.REPEAT,
    );
    await this.uiPreparationHelper.repeatPreparation(this.preparation);
    this.uiToast.showInfoToast(
      'TOAST_PREPARATION_METHOD_REPEATED_SUCCESSFULLY',
    );
  }

  public async detail() {
    await this.uiPreparationHelper.detailPreparation(this.preparation);
  }

  public async deletePreparation(): Promise<void> {
    const choice = await this.uiAlert.showConfirm(
      'DELETE_PREPARATION_METHOD_QUESTION',
      'SURE_QUESTION',
      true,
    );
    if (choice !== 'YES') {
      return;
    }

    await this.uiAlert.withLoadingSpinner(async () => {
      this.uiAnalytics.trackEvent(
        PREPARATION_TRACKING.TITLE,
        PREPARATION_TRACKING.ACTIONS.DELETE,
      );
      await this.__deletePreparation();
      this.uiToast.showInfoToast('TOAST_PREPARATION_DELETED_SUCCESSFULLY');
      await this.resetSettings();
    });
  }

  public async archive() {
    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.ARCHIVE,
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
        brews[deletingBrewIndex[i]].config.uuid,
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
  public async showBrews() {
    await this.uiBrewHelper.showAssociatedBrews(
      this.preparation.config.uuid,
      'preparation',
    );
  }

  protected readonly PREPARATION_FUNCTION_PIPE_ENUM =
    PREPARATION_FUNCTION_PIPE_ENUM;
}
