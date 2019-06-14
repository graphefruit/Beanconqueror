/** Core */
import {ChangeDetectorRef, Component} from '@angular/core';
/** Ionic */
import {ModalController} from 'ionic-angular';
import {UIAlert} from '../../services/uiAlert';
/** Services */
import {UIBrewStorage} from '../../services/uiBrewStorage';
/**
 * Classes
 */
import {Brew} from '../../classes/brew/brew';
import {Mill} from '../../classes/mill/mill';
import {UIMillStorage} from '../../services/uiMillStorage';
import {MillAddModal} from './add/mill-add';
import {MillEditModal} from './edit/mill-edit';

@Component({
  templateUrl: 'mills.html'
})
export class MillsPage {

  public mills: Array<Mill> = [];

  constructor (public modalCtrl: ModalController,
               private readonly changeDetectorRef: ChangeDetectorRef,
               private readonly uiMillStorage: UIMillStorage,
               private readonly uiAlert: UIAlert,
               private readonly uiBrewStorage: UIBrewStorage) {

  }

  public ionViewWillEnter(): void {
    this.__initializeMills();
  }

  public loadMills(): void {
    this.__initializeMills();
    this.changeDetectorRef.detectChanges();
  }

  public add(): void {
    const addModal = this.modalCtrl.create(MillAddModal, {});
    addModal.onDidDismiss(() => {
      this.loadMills();
    });
    addModal.present({animate: false});
  }
  public edit(_mill: any): void {
    const editModal = this.modalCtrl.create(MillEditModal, {MILL: _mill});
    editModal.onDidDismiss(() => {
      this.loadMills();
    });
    editModal.present({animate: false});
  }

  public delete(_mill: Mill): void {
    this.uiAlert.showConfirm('Mühle? Alle zugehörigen Brühungen werden hierdurch abgeändert.', 'Sicher?').then(() => {
        // Yes
        this.__deleteMill(_mill);
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
