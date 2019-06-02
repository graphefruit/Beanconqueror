/** Core */
import { Component } from '@angular/core';
/** Ionic */
import { ViewController } from 'ionic-angular';
/** Classes */
import { Preparation } from '../../../classes/preparation/preparation';
/** Services */
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';

@Component({
  templateUrl: 'preparations-add.html'
})
export class PreparationsAddModal {

  public data: Preparation = new Preparation();
  constructor(private viewCtrl: ViewController, private uiPreparationStorage: UIPreparationStorage) {

  }

  public addBean(form): void {

    if (form.valid) {
      this.__addBean();
    }
  }

  public __addBean(): void {
    this.uiPreparationStorage.add(this.data);
    this.dismiss();
  }

  public dismiss(): void {
    this.viewCtrl.dismiss('', undefined, {animate: false});
  }

}
