import {Water} from '../../classes/water/water';
import {UIAlert} from '../../services/uiAlert';
import {UIToast} from '../../services/uiToast';
import {UIWaterStorage} from '../../services/uiWaterStorage';
import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {WATER_ACTION} from '../../enums/water/waterActions';
import {WaterDetailComponent} from '../../app/water-section/water/water-detail/water-detail.component';
import {WaterEditComponent} from '../../app/water-section/water/water-edit/water-edit.component';
import {ModalController} from '@ionic/angular';
import {WaterPopoverActionsComponent} from '../../app/water-section/water/water-popover-actions/water-popover-actions.component';
import {UIAnalytics} from '../../services/uiAnalytics';
import {UIImage} from '../../services/uiImage';
import WATER_TRACKING from '../../data/tracking/waterTracking';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {Brew} from '../../classes/brew/brew';

@Component({
  selector: 'water-information-card',
  templateUrl: './water-information-card.component.html',
  styleUrls: ['./water-information-card.component.scss'],
})
export class WaterInformationCardComponent implements OnInit {

  @Input() public water: Water;
  @Output() public waterAction: EventEmitter<any> = new EventEmitter();

  constructor(private readonly modalController: ModalController,
              private readonly uiWaterStorage: UIWaterStorage,
              private readonly uiToast: UIToast,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiAlert: UIAlert,
              private readonly uiImage: UIImage,
              private readonly modalCtrl: ModalController,
              private readonly uiBrewStorage: UIBrewStorage) {
  }

  public ngOnInit() {

  }


  public async show() {
    await this.detail();
  }

  public async showActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.uiAnalytics.trackEvent(WATER_TRACKING.TITLE, WATER_TRACKING.ACTIONS.POPOVER_ACTIONS);
    const popover = await this.modalController.create({
      component: WaterPopoverActionsComponent,
      componentProps: {water: this.water},
      id: WaterPopoverActionsComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    if (data.role !== undefined) {
      await this.internalAction(data.role as WATER_ACTION);
      this.waterAction.emit([data.role as WATER_ACTION, this.water]);
    }
  }


  private async internalAction(action: WATER_ACTION) {
    switch (action) {
      case WATER_ACTION.DETAIL:
        await this.detail();
        break;
      case WATER_ACTION.EDIT:
        await this.edit();
        break;
      case WATER_ACTION.DELETE:

        try {
          await this.delete();
        }catch (ex) {}
        await this.uiAlert.hideLoadingSpinner();
        break;
      case WATER_ACTION.PHOTO_GALLERY:
        await this.viewPhotos();
        break;
      case WATER_ACTION.ARCHIVE:
        await this.archive();
        break;
      default:
        break;
    }
  }
  public archive() {
    this.uiAnalytics.trackEvent(WATER_TRACKING.TITLE, WATER_TRACKING.ACTIONS.ARCHIVE);
    this.water.finished = true;
    this.uiWaterStorage.update(this.water);
    this.uiToast.showInfoToast('TOAST_WATER_ARCHIVED_SUCCESSFULLY');
  }

  public async longPressEdit(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.edit();
    this.waterAction.emit([WATER_ACTION.EDIT, this.water]);
  }

  public async edit() {
    this.uiAnalytics.trackEvent(WATER_TRACKING.TITLE, WATER_TRACKING.ACTIONS.EDIT);
    const modal = await this.modalCtrl.create({component: WaterEditComponent, id: WaterEditComponent.COMPONENT_ID, componentProps: {water: this.water}});
    await modal.present();
    await modal.onWillDismiss();

  }


  public async detail() {
    this.uiAnalytics.trackEvent(WATER_TRACKING.TITLE, WATER_TRACKING.ACTIONS.DETAIL);
    const modal = await this.modalCtrl.create({component: WaterDetailComponent, id: WaterDetailComponent.COMPONENT_ID, componentProps: {water: this.water}});
    await modal.present();
    await modal.onWillDismiss();

  }

  public async showPhoto(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.viewPhotos();
  }
  public async viewPhotos() {

    this.uiAnalytics.trackEvent(WATER_TRACKING.TITLE, WATER_TRACKING.ACTIONS.PHOTO_VIEW);
    await this.uiImage.viewPhotos(this.water);
  }

  public async delete(): Promise<any> {

    return new Promise(async (resolve,reject) => {
        this.uiAlert.showConfirm('DELETE_WATER_QUESTION', 'SURE_QUESTION', true).then(async () => {
            await this.uiAlert.showLoadingSpinner();
            // Yes
            this.uiAnalytics.trackEvent(WATER_TRACKING.TITLE, WATER_TRACKING.ACTIONS.DELETE);
            await this.__delete();
            this.uiToast.showInfoToast('TOAST_WATER_DELETED_SUCCESSFULLY');
            resolve();
          },
          () => {
            // No
            reject();
          });
      }
    );
  }

  private async __delete() {


    // Remove all references in brews
    const brews: Array<Brew> =  this.uiBrewStorage.getAllEntries().filter((e)=>e.water === this.water.config.uuid);
    if (brews && brews.length > 0) {

      for (const brew of brews) {
        brew.water = '';
        await this.uiBrewStorage.update(brew);
      }
    }
    await this.uiWaterStorage.removeByObject(this.water);
  }



  public hasPhotos() {
    return (this.water.attachments && this.water.attachments.length > 0);
  }
}
