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
import {Mill} from "../../classes/mill/mill";
import {UIMillStorage} from "../../services/uiMillStorage";
import {MillAddModal} from "./add/mill-add";
import {MillEditModal} from "./edit/mill-edit";
@Component({
  templateUrl: 'mills.html'
})
export class MillsPage {

  mills: Array<Mill> = [];

  constructor(public modalCtrl: ModalController, private changeDetectorRef: ChangeDetectorRef, private uiMillStorage:UIMillStorage, private uiAlert:UIAlert, private uiBrewStorage:UIBrewStorage) {

  }

  ionViewWillEnter() {
    this.__initializeMills();
  }

  public loadMills(){
    this.__initializeMills();
    this.changeDetectorRef.detectChanges();
  }

  private __initializeMills() {
    this.mills = this.uiMillStorage.getAllEntries()
  }

  public add() {
    let addModal = this.modalCtrl.create(MillAddModal, {});
    addModal.onDidDismiss(() => {
      this.loadMills();
    });
    addModal.present({animate: false});
  }
  public edit(_mill:any){
    let editModal = this.modalCtrl.create(MillEditModal, {'MILL':_mill});
    editModal.onDidDismiss(() => {
      this.loadMills();
    });
    editModal.present({animate: false});
  }


  public delete(_mill: Mill) {
    this.uiAlert.showConfirm("Mühle? Alle zugehörigen Brühungen werden hierdurch abgeändert.", "Sicher?").then(() => {
        //Yes
        this.__deleteMill(_mill)
      },
      () => {
        //No
      })

  }

  private __deleteMill(_mill: Mill) {
    let brews:Array<Brew> =  this.uiBrewStorage.getAllEntries();
    let deletingBrewIndex:Array<number> = [];
    for (let i=0;i<brews.length;i++){
      if (brews[i].mill === _mill.config.uuid){
        deletingBrewIndex.push(i);
      }
    }
    for(let i = deletingBrewIndex.length; i--;)
    {
      this.uiBrewStorage.removeByUUID(brews[deletingBrewIndex[i]].config.uuid);
    }


    this.uiMillStorage.removeByObject(_mill);
    this.loadMills();

  }

}
