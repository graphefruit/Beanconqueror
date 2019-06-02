/** Core */
import {Component} from '@angular/core';
/** Ionic */
import {ViewController} from 'ionic-angular';
/** Services */
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
/** Classes */
import {Preparation} from '../../../classes/preparation/preparation';

@Component({
  templateUrl: 'preparations-add.html',
})
export class PreparationsAddModal {

  public data:Preparation = new Preparation();
  constructor(private viewCtrl: ViewController, private uiPreparationStorage:UIPreparationStorage) {

  }

  public addBean(form) {

    if (form.valid) {
      this.__addBean();
    }
  }

  public __addBean(){
    this.uiPreparationStorage.add(this.data);
    this.dismiss();
  }



  dismiss() {
    this.viewCtrl.dismiss("", null, {animate: false});
  }


}
