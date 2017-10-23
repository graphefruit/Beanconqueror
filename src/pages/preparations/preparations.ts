/**Core**/
import {Component, ChangeDetectorRef} from '@angular/core';
/**Ionic**/
import {ModalController} from 'ionic-angular';
/**Services**/
import {UIPreparationStorage} from '../../services/uiPreparationStorage';
import {UIAlert} from '../../services/uiAlert';
/**Modals**/
import {PreparationsAddModal} from '../preparations/add/preparations-add';
import {PreparationsEditModal} from '../preparations/edit/preparations-edit';

/**Interfaces**/
import {IPreparation} from '../../interfaces/preparation/iPreparation';

@Component({
  templateUrl: 'preparations.html'
})
export class PreparationsPage {

  preparations: Array<IPreparation> = [];

  constructor(public modalCtrl: ModalController, private changeDetectorRef: ChangeDetectorRef, private uiPreparationStorage:UIPreparationStorage, private uiAlert:UIAlert) {

  }

  ionViewWillEnter() {
    this.__initializePreparations();
  }

  public loadPreparations(){
    this.__initializePreparations();
    this.changeDetectorRef.detectChanges();
  }

  private __initializePreparations() {
    this.preparations = this.uiPreparationStorage.getAllEntries()
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


  public deletePreparation(_preparation: IPreparation) {
    this.uiAlert.showConfirm("Zubereitungsmethode löschen?", "Sicher?").then(() => {
        //Yes
        this.__deletePreparation(_preparation)
      },
      () => {
        //No
      })

  }

  private __deletePreparation(_preparation: IPreparation) {
    this.uiPreparationStorage.removeByObject(_preparation);
    this.loadPreparations();

  }

}
