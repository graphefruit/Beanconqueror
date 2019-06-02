/** Core */
import { Component } from '@angular/core';
/** Ionic */
import { NavParams, ViewController } from 'ionic-angular';
/** Classes */
import { Preparation } from '../../../classes/preparation/preparation';
/** Interfaces */
import { IPreparation } from '../../../interfaces/preparation/iPreparation';
import { UIHelper } from '../../../services/uiHelper';
/** Services */
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';

@Component({
  templateUrl: 'preparations-edit.html'
})
export class PreparationsEditModal {

  public data: Preparation = new Preparation();

  private preparation: IPreparation;
  constructor(private navParams: NavParams,
              private viewCtrl: ViewController,
              private uiPreparationStorage: UIPreparationStorage,
              private uiHelper: UIHelper) {

  }

  public ionViewWillEnter() {
    this.preparation = this.navParams.get('PREPARATION');
    this.data = this.uiHelper.copyData(this.preparation);
  }

  public editBean(form) {
    if (form.valid) {
      this.__editBean();
    }
  }

  public __editBean() {
    this.uiPreparationStorage.update(this.data);
    this.dismiss();
  }

  public dismiss() {
    this.viewCtrl.dismiss('', null, {animate: false});
  }

}
