import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ModalController} from '@ionic/angular';
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
import {UIBeanHelper} from '../../services/uiBeanHelper';
import {Bean} from '../../classes/bean/bean';
import {UIBeanStorage} from '../../services/uiBeanStorage';

@Component({
  selector: 'roasting-machine-information-card',
  templateUrl: './roasting-machine-information-card.component.html',
  styleUrls: ['./roasting-machine-information-card.component.scss'],
})
export class RoastingMachineInformationCardComponent implements OnInit {

  @Input() public roastingMachine: RoastingMachine;
  @Output() public roastingMachineAction: EventEmitter<any> = new EventEmitter();

  constructor(private readonly modalController: ModalController,
              private readonly uiRoastingMachineStorage: UIRoastingMachineStorage,
              private readonly uiToast: UIToast,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiAlert: UIAlert,
              private readonly uiImage: UIImage,
              private readonly modalCtrl: ModalController,
              private readonly uiBeanHelper: UIBeanHelper,
              private readonly uiBeanStorage: UIBeanStorage) {
  }

  public ngOnInit() {

  }


  public async show() {
    await this.detail();
  }

  public async showActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    const popover = await this.modalController.create({
      component: RoastingMachinePopoverActionsComponent,
      componentProps: {roastingMachine: this.roastingMachine},
      id:'roasting-machine-popover-actions',
      cssClass: 'popover-actions',
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    if (data.role !== undefined) {
      await this.internalAction(data.role as ROASTING_MACHINE_ACTION);
      this.roastingMachineAction.emit([data.role as ROASTING_MACHINE_ACTION, this.roastingMachine]);
    }
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
        try {
          await this.delete();
        }catch (ex) {}

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

  public async showPhoto(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.viewPhotos();
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
    const beans: Array<Bean> = this.uiBeanHelper.getAllRoastedBeansForRoastingMachine(this.roastingMachine.config.uuid);
    for (const bean of beans) {
      bean.bean_roast_information.roaster_machine = '';
      this.uiBeanStorage.update(bean);
    }

    this.uiRoastingMachineStorage.removeByObject(this.roastingMachine);
  }
  public getRoastQuantity(): number {
    const beans: Array<Bean> = this.uiBeanHelper.getAllRoastedBeansForRoastingMachine(this.roastingMachine.config.uuid);
    let quantity:number = 0;
    for (const bean of beans) {
      quantity +=bean.weight;
    }
    return quantity;
  }
  public getRoastCount(): number {
    const beans: Array<Bean> = this.uiBeanHelper.getAllRoastedBeansForRoastingMachine(this.roastingMachine.config.uuid);
    return beans.length;
  }


  public hasPhotos() {
    return (this.roastingMachine.attachments && this.roastingMachine.attachments.length > 0);
  }

}
