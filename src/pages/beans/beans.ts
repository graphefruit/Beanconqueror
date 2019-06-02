/** Core */
import {Component, ChangeDetectorRef} from '@angular/core';
/** Ionic */
import {ModalController} from 'ionic-angular';
/** Services */
import {UIBeanStorage} from '../../services/uiBeanStorage';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {UIAlert} from '../../services/uiAlert';
/** Modals */
import {BeansAddModal} from '../beans/add/beans-add';
import {BeansEditModal} from '../beans/edit/beans-edit';
/** Interfaces */
import {IBean} from '../../interfaces/bean/iBean';
/**
 * Classes
 */
import {Bean} from '../../classes/bean/bean';
import {Brew} from '../../classes/brew/brew';
@Component({
  templateUrl: 'beans.html',
  selector: 'beans-list',
})
export class BeansPage {

  beans: Array<Bean> = [];

  bean_segment:string ="open";
  constructor(public modalCtrl: ModalController, private changeDetectorRef: ChangeDetectorRef, private uiBeanStorage: UIBeanStorage, private uiAlert: UIAlert, private uiBrewStorage:UIBrewStorage) {

  }

  ionViewWillEnter() {
    this.loadBeans();
  }

  private __initializeBeans() {
    this.beans = this.uiBeanStorage.getAllEntries().sort((a, b) => a.name.localeCompare(b.name));
  }

  public getOpenBeans()
  {

    return this.beans.filter(
      bean => bean.finished === false);
  }
  public getFinishedBeans()
  {

    return this.beans.filter(
      bean => bean.finished === true);
  }

  public loadBeans() {
    this.__initializeBeans();
    this.changeDetectorRef.detectChanges();
  }

  public addBean() {
    let addBeanModal = this.modalCtrl.create(BeansAddModal, {});
    addBeanModal.onDidDismiss(() => {
      this.loadBeans();
    });
    addBeanModal.present({animate: false});
  }

  public editBean(_bean: IBean) {
    let editBeansModal = this.modalCtrl.create(BeansEditModal, {'BEAN': _bean});
    editBeansModal.onDidDismiss(() => {
      this.loadBeans();
    });
    editBeansModal.present({animate: false});
  }

  public deleteBean(_bean: IBean) {
    this.uiAlert.showConfirm("Bohne löschen? Alle zugehörigen Brühungen werden mit entfernt.", "Sicher?").then(() => {
        //Yes
        this.__deleteBean(_bean);

      },
      () => {
        //No
      })

  }

  private __deleteBean(_bean: IBean) {
    let brews:Array<Brew> =  this.uiBrewStorage.getAllEntries();

    let deletingBrewIndex:Array<number> = [];
    for (let i=0;i<brews.length;i++){
      if (brews[i].bean === _bean.config.uuid){
        deletingBrewIndex.push(i);
      }
    }
    for(let i = deletingBrewIndex.length; i--;)
    {
      this.uiBrewStorage.removeByUUID(brews[deletingBrewIndex[i]].config.uuid);
    }

    this.uiBeanStorage.removeByObject(_bean);
    this.loadBeans();

  }


}
