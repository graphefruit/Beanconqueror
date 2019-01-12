/**Core**/
import {Component, ChangeDetectorRef} from '@angular/core';
/**Ionic**/
import {ModalController} from 'ionic-angular';
/**Services**/
import {UIPreparationStorage} from '../../services/uiPreparationStorage';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {UIAlert} from '../../services/uiAlert';
/**Modals**/
import {PreparationsAddModal} from '../preparations/add/preparations-add';
import {PreparationsEditModal} from '../preparations/edit/preparations-edit';

/**
 * Classes
 */
import {Brew} from '../../classes/brew/brew';
import {Preparation} from '../../classes/preparation/preparation';
@Component({
  templateUrl: 'preparations.html'
})
export class PreparationsPage {

  preparations: Array<Preparation> = [];

  constructor(public modalCtrl: ModalController, private changeDetectorRef: ChangeDetectorRef, private uiPreparationStorage:UIPreparationStorage, private uiAlert:UIAlert, private uiBrewStorage:UIBrewStorage) {

  }

  ionViewWillEnter() {
    this.__initializePreparations();
  }

  public loadPreparations(){
    this.__initializePreparations();
    this.changeDetectorRef.detectChanges();
  }

  private __initializePreparations() {
    this.preparations = this.uiPreparationStorage.getAllEntries().sort((a, b) => a.name.localeCompare(b.name));
  }

  public addPreparation() {
    let addPreparationModal = this.modalCtrl.create(PreparationsAddModal, {});
    addPreparationModal.onDidDismiss(() => {
      this.loadPreparations();
    });
    addPreparationModal.present({animate: false});
  }
  public editPreparation(_bean:any){
    let editPreparationModal = this.modalCtrl.create(PreparationsEditModal, {'PREPARATION':_bean});
    editPreparationModal.onDidDismiss(() => {
      this.loadPreparations();
    });
    editPreparationModal.present({animate: false});
  }


  public deletePreparation(_preparation: Preparation) {
    this.uiAlert.showConfirm("Zubereitungsmethode löschen? Alle zugehörigen Brühungen werden mit entfernt.", "Sicher?").then(() => {
        //Yes
        this.__deletePreparation(_preparation)
      },
      () => {
        //No
      })

  }

  private __deletePreparation(_preparation: Preparation) {
    let brews:Array<Brew> =  this.uiBrewStorage.getAllEntries();
    let deletingBrewIndex:Array<number> = [];
    for (let i=0;i<brews.length;i++){
      if (brews[i].method_of_preparation === _preparation.config.uuid){
        deletingBrewIndex.push(i);
      }
    }
    for(let i = deletingBrewIndex.length; i--;)
    {
      this.uiBrewStorage.removeByUUID(brews[deletingBrewIndex[i]].config.uuid);
    }


    this.uiPreparationStorage.removeByObject(_preparation);
    this.loadPreparations();

  }

}
