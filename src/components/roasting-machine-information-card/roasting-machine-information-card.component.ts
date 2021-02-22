import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Settings} from '../../classes/settings/settings';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {ModalController, PopoverController} from '@ionic/angular';
import {UIToast} from '../../services/uiToast';
import {UIAnalytics} from '../../services/uiAnalytics';
import {UIAlert} from '../../services/uiAlert';
import {UIImage} from '../../services/uiImage';
import {RoastingMachine} from '../../classes/roasting-machine/roasting-machine';
import {RoastingMachineDetailComponent} from '../../app/roasting-section/roasting-machine/roasting-machine-detail/roasting-machine-detail.component';
import {UIRoastingMachineStorage} from '../../services/uiRoastingMachineStorage';
import {ROASTING_MACHINE_ACTION} from '../../enums/roasting-machine/roastingMachineAction';
import {RoastingMachinePopoverActionsComponent} from '../../app/roasting-section/roasting-machine/roasting-machine-popover-actions/roasting-machine-popover-actions.component';
import {RoastingMachineEditComponent} from '../../app/roasting-section/roasting-machine/roasting-machine-edit/roasting-machine-edit.component';

@Component({
  selector: 'roasting-machine-information-card',
  templateUrl: './roasting-machine-information-card.component.html',
  styleUrls: ['./roasting-machine-information-card.component.scss'],
})
export class RoastingMachineInformationCardComponent implements OnInit {

  @Input() public roastingMachine: RoastingMachine;
  @Output() public roastingMachineAction: EventEmitter<any> = new EventEmitter();


  public settings: Settings;

  constructor(private readonly uiSettingsStorage: UISettingsStorage,
              private readonly popoverCtrl: PopoverController,
              private readonly uiRoastingMachineStorage: UIRoastingMachineStorage,
              private readonly uiToast: UIToast,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiAlert: UIAlert,
              private readonly uiImage: UIImage,
              private readonly modalCtrl: ModalController) {
    this.settings = this.uiSettingsStorage.getSettings();

  }

  public ngOnInit() {

  }


  public async show() {
    await this.detail();
  }

  public async showActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    const popover = await this.popoverCtrl.create({
      component: RoastingMachinePopoverActionsComponent,
      event,
      translucent: true,
      componentProps: {roastingMachine: this.roastingMachine},
      id:'roasting-machine-popover-actions',
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    await this.internalAction(data.role as ROASTING_MACHINE_ACTION);
    this.roastingMachineAction.emit([data.role as ROASTING_MACHINE_ACTION, this.roastingMachine]);
  }


  private async internalAction(action: ROASTING_MACHINE_ACTION): Promise<void> {
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
  public archive() {

    /// \TODO remove all beans with this
    this.roastingMachine.finished = true;
    this.uiRoastingMachineStorage.update(this.roastingMachine);
    this.uiToast.showInfoToast('TOAST_ROASTING_MACHINE_ARCHIVED_SUCCESSFULLY');
  }

  public async edit() {
    const modal = await this.modalCtrl.create({component: RoastingMachineEditComponent, id:'roasting-machine-edit', componentProps: {roastingMachine: this.roastingMachine}});
    await modal.present();
    await modal.onWillDismiss();

  }


  public async detail() {
    const modal = await this.modalCtrl.create({component: RoastingMachineDetailComponent, id:'roasting-machine-detail', componentProps: {roastingMachine: this.roastingMachine}});
    await modal.present();
    await modal.onWillDismiss();

  }


  public async viewPhotos() {
    await this.uiImage.viewPhotos(this.roastingMachine);
  }

  public delete(): Promise<any> {

    return new Promise(async (resolve,reject) => {
        this.uiAlert.showConfirm('DELETE_ROASTING_MACHINE_QUESTION', 'SURE_QUESTION', true).then(() => {
            // Yes
            this.uiAnalytics.trackEvent('ROASTING_MACHINE', 'DELETE');
            this.__delete();
            this.uiToast.showInfoToast('TOAST_ROASTING_MACHINE_DELETED_SUCCESSFULLY');
            resolve();
          },
          () => {
            // No
            reject();
          });
      }
    );
  }

  private __delete(): void {
    /// \TODO remove all beans with this
    this.uiRoastingMachineStorage.removeByObject(this.roastingMachine);
  }

}
