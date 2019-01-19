/**Core**/
import {Component} from '@angular/core';
/**Ionic**/
import {NavParams, ViewController} from 'ionic-angular';
/**Services**/

import {UIHelper} from '../../../services/uiHelper';

import {IMill} from "../../../interfaces/mill/iMill";
import {Mill} from "../../../classes/mill/mill";
import {UIMillStorage} from "../../../services/uiMillStorage";
@Component({
  templateUrl: 'mill-edit.html',
})
export class MillEditModal {

  public data:Mill = new Mill();

  private mill:IMill;
  constructor(private navParams: NavParams,private viewCtrl: ViewController, private uiMillStorage:UIMillStorage, private uiHelper:UIHelper) {

  }

  ionViewWillEnter() {
    this.mill = this.navParams.get('MILL');
    this.data = this.uiHelper.copyData(this.mill);
  }

  public editMill(form) {
    if (form.valid) {
      this.__editMill();
    }
  }

  public __editMill(){
    this.uiMillStorage.update(this.data);
    this.dismiss();
  }


  dismiss() {
    this.viewCtrl.dismiss("", null, {animate: false});
  }


}
