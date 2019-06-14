/** Core */
import {ChangeDetectorRef, Component} from '@angular/core';
/** Ionic */
import {ModalController} from 'ionic-angular';
import {UIAlert} from '../../services/uiAlert';
import {UIBrewStorage} from '../../services/uiBrewStorage';
/** Services */
import {UIPreparationStorage} from '../../services/uiPreparationStorage';
/** Modals */
import {PreparationsAddModal} from './add/preparations-add';
import {PreparationsEditModal} from './edit/preparations-edit';
/**
 * Classes
 */
import {Brew} from '../../classes/brew/brew';
import {Preparation} from '../../classes/preparation/preparation';

@Component({
  templateUrl: 'preparations.html'
})
export class PreparationsPage {

  public preparations: Array<Preparation> = [];
  constructor(public modalCtrl: ModalController,
              private readonly changeDetectorRef: ChangeDetectorRef,
              private readonly uiPreparationStorage: UIPreparationStorage,
              private readonly uiAlert: UIAlert,
              private readonly uiBrewStorage: UIBrewStorage) {

  }

  public ionViewWillEnter(): void {
    this.__initializePreparations();
  }

  public loadPreparations(): void {
    this.__initializePreparations();
    this.changeDetectorRef.detectChanges();
  }

  public addPreparation(): void {
    const addPreparationModal = this.modalCtrl.create(PreparationsAddModal, {});
    addPreparationModal.onDidDismiss(() => {
      this.loadPreparations();
    });
    addPreparationModal.present({animate: false});
  }
  public editPreparation(_bean: any): void {
    const editPreparationModal = this.modalCtrl.create(PreparationsEditModal, {PREPARATION: _bean});
    editPreparationModal.onDidDismiss(() => {
      this.loadPreparations();
    });
    editPreparationModal.present({animate: false});
  }

  public deletePreparation(_preparation: Preparation): void {
    this.uiAlert.showConfirm('Zubereitungsmethode löschen? Alle zugehörigen Brühungen werden mit entfernt.', 'Sicher?').then(() => {
        // Yes
        this.__deletePreparation(_preparation);
      },
      () => {
        // No
      });

  }

  private __initializePreparations(): void {
    this.preparations = this.uiPreparationStorage.getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private __deletePreparation(_preparation: Preparation): void {
    const brews: Array<Brew> =  this.uiBrewStorage.getAllEntries();
    const deletingBrewIndex: Array<number> = [];
    for (let i = 0; i < brews.length; i++) {
      if (brews[i].method_of_preparation === _preparation.config.uuid) {
        deletingBrewIndex.push(i);
      }
    }
    for (let i = deletingBrewIndex.length; i--;) {
      this.uiBrewStorage.removeByUUID(brews[deletingBrewIndex[i]].config.uuid);
    }

    this.uiPreparationStorage.removeByObject(_preparation);
    this.loadPreparations();

  }

}
