import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {UIMillStorage} from '../../services/uiMillStorage';
import {UIAlert} from '../../services/uiAlert';
import {Mill} from '../../classes/mill/mill';
import {ModalController} from '@ionic/angular';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {Brew} from '../../classes/brew/brew';
import {MillEditComponent} from './mill-edit/mill-edit.component';
import {MillAddComponent} from './mill-add/mill-add.component';
import {MILL_ACTION} from '../../enums/mills/millActions';
import {Settings} from '../../classes/settings/settings';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {UIToast} from '../../services/uiToast';
import {UIAnalytics} from '../../services/uiAnalytics';


@Component({
  selector: 'mill',
  templateUrl: './mill.page.html',
  styleUrls: ['./mill.page.scss'],
})
export class MillPage  implements OnInit  {

  public mills: Array<Mill> = [];

  public settings: Settings;
  public segment: string = 'open';

  constructor (public modalCtrl: ModalController,
               private readonly changeDetectorRef: ChangeDetectorRef,
               private readonly uiMillStorage: UIMillStorage,
               private readonly uiAlert: UIAlert,
               private readonly uiBrewStorage: UIBrewStorage,
               private readonly uiSettingsStorage: UISettingsStorage,
               private readonly uiToast: UIToast,
               private readonly uiAnalytics: UIAnalytics) {

  }

  public ngOnInit(): void {
  }

  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.__initializeMills();
  }

  public getActiveMills(): Array<Mill> {
    return this.mills.filter(
      (mill) => !mill.finished);
  }

  public getArchivedMills(): Array<Mill> {
    return this.mills.filter(
      (mill) => mill.finished);
  }

  public archive(_mill: Mill) {
    _mill.finished = true;
    this.uiMillStorage.update(_mill);
    this.uiToast.showInfoToast('TOAST_MILL_ARCHIVED_SUCCESSFULLY');
    this.settings.resetFilter();
    this.uiSettingsStorage.saveSettings(this.settings);
    this.loadMills();
  }

  public loadMills(): void {
    this.__initializeMills();
    this.changeDetectorRef.detectChanges();
  }

  public async millAction(action: MILL_ACTION, mill: Mill): Promise<void> {
    switch (action) {
      case MILL_ACTION.EDIT:
        this.edit(mill);
        break;
      case MILL_ACTION.DELETE:
        this.delete(mill);
        break;
      case MILL_ACTION.ARCHIVE:
        this.archive(mill);
        break;
      default:
        break;
    }
  }

  public async add() {
    const modal = await this.modalCtrl.create({
      component: MillAddComponent, cssClass: 'half-bottom-modal', showBackdrop: true,
      backdropDismiss: true,
      swipeToClose: true,
      id: 'mill-add'
    });
    await modal.present();
    await modal.onWillDismiss();
    this.loadMills();
  }
  public async edit(_mill: any) {

    const editModal = await this.modalCtrl.create({
      component: MillEditComponent,
      componentProps: {'mill' : _mill},
      id:'mill-edit',
    });
    await editModal.present();
    await editModal.onWillDismiss();
    this.loadMills();

  }

  public delete(_mill: Mill): void {
    this.uiAlert.showConfirm('DELETE_MILL_QUESTION', 'SURE_QUESTION', true).then(() => {
          // Yes
        this.uiAnalytics.trackEvent('MILL', 'DELETE');
          this.__deleteMill(_mill);
        this.uiToast.showInfoToast('TOAST_MILL_DELETED_SUCCESSFULLY');
        this.settings.resetFilter();
        this.uiSettingsStorage.saveSettings(this.settings);
        },
        () => {
          // No
        });

  }


  private __initializeMills(): void {
    this.mills = this.uiMillStorage.getAllEntries()
        .sort((a, b) => a.name.localeCompare(b.name));
  }

  private __deleteMill(_mill: Mill): void {
    const brews: Array<Brew> =  this.uiBrewStorage.getAllEntries();
    const deletingBrewIndex: Array<number> = [];
    for (let i = 0; i < brews.length; i++) {
      if (brews[i].mill === _mill.config.uuid) {
        deletingBrewIndex.push(i);
      }
    }
    for (let i = deletingBrewIndex.length; i--;) {
      this.uiBrewStorage.removeByUUID(brews[deletingBrewIndex[i]].config.uuid);
    }

    this.uiMillStorage.removeByObject(_mill);
    this.loadMills();
  }
}
