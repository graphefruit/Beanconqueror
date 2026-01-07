import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { UIToast } from '../../services/uiToast';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIAlert } from '../../services/uiAlert';
import { UIImage } from '../../services/uiImage';
import { RoastingMachine } from '../../classes/roasting-machine/roasting-machine';
import { UIRoastingMachineStorage } from '../../services/uiRoastingMachineStorage';
import { ROASTING_MACHINE_ACTION } from '../../enums/roasting-machine/roastingMachineAction';
import { RoastingMachinePopoverActionsComponent } from '../../app/roasting-section/roasting-machine/roasting-machine-popover-actions/roasting-machine-popover-actions.component';
import { UIBeanHelper } from '../../services/uiBeanHelper';
import { Bean } from '../../classes/bean/bean';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import ROASTING_MACHINE_TRACKING from '../../data/tracking/roastingMachineTracking';
import { UIRoastingMachineHelper } from '../../services/uiRoastingMachineHelper';
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
  selector: 'roasting-machine-information-card',
  templateUrl: './roasting-machine-information-card.component.html',
  styleUrls: ['./roasting-machine-information-card.component.scss'],
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
export class RoastingMachineInformationCardComponent {
  @Input() public roastingMachine: RoastingMachine;
  @Output() public roastingMachineAction: EventEmitter<any> =
    new EventEmitter();

  constructor(
    private readonly modalController: ModalController,
    private readonly uiRoastingMachineStorage: UIRoastingMachineStorage,
    private readonly uiToast: UIToast,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiAlert: UIAlert,
    private readonly uiImage: UIImage,
    private readonly modalCtrl: ModalController,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiRoastingMachineHelper: UIRoastingMachineHelper,
  ) {}

  public async show() {
    await this.detail();
  }

  public async showActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.uiAnalytics.trackEvent(
      ROASTING_MACHINE_TRACKING.TITLE,
      ROASTING_MACHINE_TRACKING.ACTIONS.POPOVER_ACTIONS,
    );
    const popover = await this.modalController.create({
      component: RoastingMachinePopoverActionsComponent,
      componentProps: { roastingMachine: this.roastingMachine },
      id: RoastingMachinePopoverActionsComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    if (data.role !== undefined) {
      await this.internalAction(data.role as ROASTING_MACHINE_ACTION);
      this.roastingMachineAction.emit([
        data.role as ROASTING_MACHINE_ACTION,
        this.roastingMachine,
      ]);
    }
  }

  private async internalAction(action: ROASTING_MACHINE_ACTION) {
    switch (action) {
      case ROASTING_MACHINE_ACTION.DETAIL:
        await this.detail();
        break;
      case ROASTING_MACHINE_ACTION.EDIT:
        await this.edit();
        break;
      case ROASTING_MACHINE_ACTION.DELETE:
        try {
          await this.delete();
        } catch (ex) {}
        await this.uiAlert.hideLoadingSpinner();
        break;
      case ROASTING_MACHINE_ACTION.PHOTO_GALLERY:
        await this.viewPhotos();
        break;
      case ROASTING_MACHINE_ACTION.ARCHIVE:
        await this.archive();
        break;
      default:
        break;
    }
  }
  public async archive() {
    this.uiAnalytics.trackEvent(
      ROASTING_MACHINE_TRACKING.TITLE,
      ROASTING_MACHINE_TRACKING.ACTIONS.ARCHIVE,
    );
    this.roastingMachine.finished = true;
    await this.uiRoastingMachineStorage.update(this.roastingMachine);
    this.uiToast.showInfoToast('TOAST_ROASTING_MACHINE_ARCHIVED_SUCCESSFULLY');
  }

  public async longPressEditRoastingMachine(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.edit();
    this.roastingMachineAction.emit([
      ROASTING_MACHINE_ACTION.EDIT,
      this.roastingMachine,
    ]);
  }

  public async edit() {
    await this.uiRoastingMachineHelper.editRoastingMachine(
      this.roastingMachine,
    );
  }

  public async detail() {
    await this.uiRoastingMachineHelper.detailRoastingMachine(
      this.roastingMachine,
    );
  }

  public async showPhoto(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.viewPhotos();
  }
  public async viewPhotos() {
    this.uiAnalytics.trackEvent(
      ROASTING_MACHINE_TRACKING.TITLE,
      ROASTING_MACHINE_TRACKING.ACTIONS.PHOTO_VIEW,
    );
    await this.uiImage.viewPhotos(this.roastingMachine);
  }

  public async delete(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      this.uiAlert
        .showConfirm('DELETE_ROASTING_MACHINE_QUESTION', 'SURE_QUESTION', true)
        .then(
          async () => {
            await this.uiAlert.showLoadingSpinner();
            // Yes
            this.uiAnalytics.trackEvent(
              ROASTING_MACHINE_TRACKING.TITLE,
              ROASTING_MACHINE_TRACKING.ACTIONS.DELETE,
            );
            await this.__delete();
            this.uiToast.showInfoToast(
              'TOAST_ROASTING_MACHINE_DELETED_SUCCESSFULLY',
            );
            resolve(undefined);
          },
          () => {
            // No
            reject();
          },
        );
    });
  }

  private async __delete() {
    const beans: Array<Bean> =
      this.uiBeanHelper.getAllRoastedBeansForRoastingMachine(
        this.roastingMachine.config.uuid,
      );
    for (const bean of beans) {
      bean.bean_roast_information.roaster_machine = '';
      await this.uiBeanStorage.update(bean);
    }
    await this.uiRoastingMachineStorage.removeByObject(this.roastingMachine);
  }
  public getRoastQuantity(): number {
    const beans: Array<Bean> =
      this.uiBeanHelper.getAllRoastedBeansForRoastingMachine(
        this.roastingMachine.config.uuid,
      );
    let quantity: number = 0;
    for (const bean of beans) {
      quantity += bean.weight;
    }
    return quantity;
  }
  public getRoastCount(): number {
    const beans: Array<Bean> =
      this.uiBeanHelper.getAllRoastedBeansForRoastingMachine(
        this.roastingMachine.config.uuid,
      );
    return beans.length;
  }

  public hasPhotos() {
    return (
      this.roastingMachine.attachments &&
      this.roastingMachine.attachments.length > 0
    );
  }
}
