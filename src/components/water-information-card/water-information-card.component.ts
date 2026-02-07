import { Water } from '../../classes/water/water';
import { UIAlert } from '../../services/uiAlert';
import { UIToast } from '../../services/uiToast';
import { UIWaterStorage } from '../../services/uiWaterStorage';
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { WATER_ACTION } from '../../enums/water/waterActions';
import { ModalController } from '@ionic/angular/standalone';
import { WaterPopoverActionsComponent } from '../../app/water-section/water/water-popover-actions/water-popover-actions.component';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIImage } from '../../services/uiImage';
import WATER_TRACKING from '../../data/tracking/waterTracking';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { Brew } from '../../classes/brew/brew';
import { UIWaterHelper } from '../../services/uiWaterHelper';
import { WATER_TYPES } from '../../enums/water/waterTypes';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { LongPressDirective } from '../../directive/long-press.directive';
import { AsyncImageComponent } from '../async-image/async-image.component';
import { DecimalPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonIcon,
  IonLabel,
  IonText,
} from '@ionic/angular/standalone';

@Component({
  selector: 'water-information-card',
  templateUrl: './water-information-card.component.html',
  styleUrls: ['./water-information-card.component.scss'],
  imports: [
    LongPressDirective,
    AsyncImageComponent,
    DecimalPipe,
    TranslatePipe,
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
export class WaterInformationCardComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly uiWaterStorage = inject(UIWaterStorage);
  private readonly uiToast = inject(UIToast);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiImage = inject(UIImage);
  private readonly modalCtrl = inject(ModalController);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiWaterHelper = inject(UIWaterHelper);
  private readonly uiBrewHelper = inject(UIBrewHelper);

  @Input() public water: Water;
  @Output() public waterAction: EventEmitter<any> = new EventEmitter();
  public readonly WATER_TYPES = WATER_TYPES;

  public ngOnInit() {}

  public async show() {
    await this.detail();
  }

  public async showActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.uiAnalytics.trackEvent(
      WATER_TRACKING.TITLE,
      WATER_TRACKING.ACTIONS.POPOVER_ACTIONS,
    );
    const popover = await this.modalController.create({
      component: WaterPopoverActionsComponent,
      componentProps: { water: this.water },
      id: WaterPopoverActionsComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
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
        } catch (ex) {}
        await this.uiAlert.hideLoadingSpinner();
        break;
      case WATER_ACTION.PHOTO_GALLERY:
        await this.viewPhotos();
        break;
      case WATER_ACTION.ARCHIVE:
        await this.archive();
        break;
      case WATER_ACTION.SHOW_BREWS:
        await this.showBrews();
        break;
      default:
        break;
    }
  }

  public async showBrews() {
    await this.uiBrewHelper.showAssociatedBrews(
      this.water.config.uuid,
      'water',
    );
  }

  public async archive() {
    this.uiAnalytics.trackEvent(
      WATER_TRACKING.TITLE,
      WATER_TRACKING.ACTIONS.ARCHIVE,
    );
    this.water.finished = true;
    await this.uiWaterStorage.update(this.water);
    this.uiToast.showInfoToast('TOAST_WATER_ARCHIVED_SUCCESSFULLY');
  }

  public async longPressEdit(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.edit();
    this.waterAction.emit([WATER_ACTION.EDIT, this.water]);
  }

  public async edit() {
    await this.uiWaterHelper.editWater(this.water);
  }

  public async detail() {
    await this.uiWaterHelper.detailWater(this.water);
  }

  public async showPhoto(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.viewPhotos();
  }
  public async viewPhotos() {
    this.uiAnalytics.trackEvent(
      WATER_TRACKING.TITLE,
      WATER_TRACKING.ACTIONS.PHOTO_VIEW,
    );
    await this.uiImage.viewPhotos(this.water);
  }

  public async delete(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      this.uiAlert
        .showConfirm('DELETE_WATER_QUESTION', 'SURE_QUESTION', true)
        .then(
          async () => {
            await this.uiAlert.showLoadingSpinner();
            // Yes
            this.uiAnalytics.trackEvent(
              WATER_TRACKING.TITLE,
              WATER_TRACKING.ACTIONS.DELETE,
            );
            await this.__delete();
            this.uiToast.showInfoToast('TOAST_WATER_DELETED_SUCCESSFULLY');
            resolve(undefined);
          },
          () => {
            // No
            reject();
          },
        );
    });
  }

  private getAllRelatedBrews(): Array<Brew> {
    // Remove all references in brews
    const brews: Array<Brew> = this.uiBrewStorage
      .getAllEntries()
      .filter((e) => e.water === this.water.config.uuid);
    if (brews && brews.length > 0) {
      return brews;
    }
    return [];
  }
  private async __delete() {
    // Remove all references in brews
    const brews: Array<Brew> = this.getAllRelatedBrews();
    if (brews && brews.length > 0) {
      for (const brew of brews) {
        brew.water = '';
        await this.uiBrewStorage.update(brew);
      }
    }
    await this.uiWaterStorage.removeByObject(this.water);
  }

  public getUsedTimes() {
    const brews: Array<Brew> = this.getAllRelatedBrews();
    return brews.length;
  }
  public getAmount() {
    const brews: Array<Brew> = this.getAllRelatedBrews();
    let amount: number = 0;
    if (brews && brews.length > 0) {
      for (const brew of brews) {
        if (brew.brew_beverage_quantity) {
          amount += brew.brew_beverage_quantity;
        } else if (brew.brew_quantity) {
          amount += brew.brew_quantity;
        }
      }
    }
    return amount;
  }

  public hasPhotos() {
    return this.water.attachments && this.water.attachments.length > 0;
  }
}
