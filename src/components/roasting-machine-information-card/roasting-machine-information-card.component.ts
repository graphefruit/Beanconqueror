import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
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

import { Bean } from '../../classes/bean/bean';
import { RoastingMachine } from '../../classes/roasting-machine/roasting-machine';
import { StorageClass } from '../../classes/storageClass';
import ROASTING_MACHINE_TRACKING from '../../data/tracking/roastingMachineTracking';
import { LongPressDirective } from '../../directive/long-press.directive';
import { ROASTING_MACHINE_ACTION } from '../../enums/roasting-machine/roastingMachineAction';
import { UIAlert } from '../../services/uiAlert';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIBeanHelper } from '../../services/uiBeanHelper';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UIImage } from '../../services/uiImage';
import { UILog } from '../../services/uiLog';
import { UIRoastingMachineHelper } from '../../services/uiRoastingMachineHelper';
import { UIRoastingMachineStorage } from '../../services/uiRoastingMachineStorage';
import { UIToast } from '../../services/uiToast';
import { Deletion } from '../../stores/delete-commands';
import {
  ActionsPopoverComponent,
  popoverAction,
  PopoverAction,
} from '../actions-popover/actions-popover.component';
import { AsyncImageComponent } from '../async-image/async-image.component';

@Component({
  selector: 'roasting-machine-information-card',
  templateUrl: './roasting-machine-information-card.component.html',
  styleUrls: ['./roasting-machine-information-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
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
  private readonly modalController = inject(ModalController);
  private readonly uiRoastingMachineStorage = inject(UIRoastingMachineStorage);
  private readonly uiToast = inject(UIToast);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiImage = inject(UIImage);
  private readonly modalCtrl = inject(ModalController);
  private readonly uiBeanHelper = inject(UIBeanHelper);
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiRoastingMachineHelper = inject(UIRoastingMachineHelper);
  private readonly uiLog = inject(UILog);

  @Input() public roastingMachine: RoastingMachine;
  @Output() public roastingMachineAction: EventEmitter<any> =
    new EventEmitter();

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
    const role = await ActionsPopoverComponent.pick(this.modalController, {
      id: 'roasting-machine-popover-actions',
      openedBy: event,
      items: this.buildRoastingMachineActions(),
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
    });
    if (role !== undefined) {
      await this.internalAction(role as ROASTING_MACHINE_ACTION);
      this.roastingMachineAction.emit([
        role as ROASTING_MACHINE_ACTION,
        this.roastingMachine,
      ]);
    }
  }

  private buildRoastingMachineActions(): PopoverAction[] {
    return [
      popoverAction({
        role: ROASTING_MACHINE_ACTION.DETAIL,
        translationKey: 'DETAIL',
        icon: 'beanconqueror-detail',
      }),
      popoverAction({
        role: ROASTING_MACHINE_ACTION.EDIT,
        translationKey: 'EDIT',
        icon: 'beanconqueror-edit',
      }),
      popoverAction({
        role: ROASTING_MACHINE_ACTION.ARCHIVE,
        translationKey: 'ARCHIVE',
        icon: 'beanconqueror-finished',
        visible: this.roastingMachine.finished === false,
      }),
      popoverAction({
        role: ROASTING_MACHINE_ACTION.PHOTO_GALLERY,
        translationKey: 'POPOVER_BREWS_OPTION_PHOTO_GALLERY',
        icon: 'beanconqueror-photo-gallery',
        visible: this.hasPhotos(),
      }),
      popoverAction({
        role: ROASTING_MACHINE_ACTION.DELETE,
        translationKey: 'DELETE',
        icon: 'beanconqueror-delete',
      }),
    ];
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
        await this.delete();
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

  public async delete(): Promise<void> {
    const choice = await this.uiAlert.showConfirm(
      'DELETE_ROASTING_MACHINE_QUESTION',
      'SURE_QUESTION',
      true,
    );
    if (choice !== 'YES') {
      return;
    }

    const deletion = await this.uiAlert.withLoadingSpinner(
      async (): Promise<Deletion> => {
        this.uiAnalytics.trackEvent(
          ROASTING_MACHINE_TRACKING.TITLE,
          ROASTING_MACHINE_TRACKING.ACTIONS.DELETE,
        );
        const shown = StorageClass.getMessagesShown();
        if (await this.__delete()) {
          this.uiToast.showInfoToast(
            'TOAST_ROASTING_MACHINE_DELETED_SUCCESSFULLY',
          );
          return 'deleted';
        }
        return StorageClass.getMessagesShown() === shown
          ? 'failed'
          : 'reported';
      },
    );
    // After 'reported' the user has been told already.
    if (deletion === 'failed') {
      await this.uiAlert.showMessage('ERROR_OCCURED', 'CARE', undefined, true);
    }
  }

  /**
   * Takes the machine out of all beans with one save, then deletes it.
   * Resolves whether the machine is gone. The beans keep it when they could
   * not be saved; only when the machine could not be deleted after them, it
   * is left without beans and can be deleted again.
   */
  private async __delete(): Promise<boolean> {
    try {
      // An empty list removes nothing but tells whether the machines take
      // writes, before the beans are changed.
      if (!(await this.uiRoastingMachineStorage.removeManyByUUID([]))) {
        return false;
      }
      // Copies: the beans of the storage stay as they are when the save
      // fails.
      const beans = this.uiBeanHelper
        .getAllRoastedBeansForRoastingMachine(this.roastingMachine.config.uuid)
        .map((bean) => {
          const changed = new Bean();
          changed.initializeByObject(bean);
          changed.bean_roast_information.roaster_machine = '';
          return changed;
        });
      return (
        (await this.uiBeanStorage.updateMany(beans)) &&
        (await this.uiRoastingMachineStorage.removeManyByUUID([
          this.roastingMachine.config.uuid,
        ]))
      );
    } catch (ex) {
      this.uiLog.error('Roasting machine - Delete - Unsuccessfully', ex);
      return false;
    }
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
