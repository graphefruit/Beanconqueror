/** Core */
import {Component} from '@angular/core';
/** Ionic */
import {NavParams, ViewController} from 'ionic-angular';
/** Classes */
import {Preparation} from '../../../classes/preparation/preparation';
/** Interfaces */
import {IPreparation} from '../../../interfaces/preparation/iPreparation';
import {UIHelper} from '../../../services/uiHelper';
/** Services */
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';

@Component({
  templateUrl: 'preparations-edit.html'
})
export class PreparationsEditModal {

  public data: Preparation = new Preparation();
  private preparation: IPreparation = undefined;

  constructor (private readonly navParams: NavParams,
               private readonly viewCtrl: ViewController,
               private readonly uiPreparationStorage: UIPreparationStorage,
               private readonly uiHelper: UIHelper) {

  }

  public ionViewWillEnter(): void {
    this.preparation = this.navParams.get('PREPARATION');
    if (this.preparation !== undefined) {
      this.data = this.uiHelper.copyData(this.preparation);
    }

  }

  public editBean(form): void {
    if (form.valid) {
      this.__editBean();
    }
  }

  public __editBean(): void {
    this.uiPreparationStorage.update(this.data);
    this.dismiss();
  }

  public dismiss(): void {
    this.viewCtrl.dismiss('', undefined, {animate: false});
  }

}
