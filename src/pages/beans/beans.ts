/**Core**/
import {Component, ChangeDetectorRef} from '@angular/core';
/**Ionic**/
import {ModalController} from 'ionic-angular';
/**Services**/
import {UIBeanStorage} from '../../services/uiBeanStorage';
import {UIAlert} from '../../services/uiAlert';
/**Modals**/
import {BeansAddModal} from '../beans/add/beans-add';
import {BeansEditModal} from '../beans/edit/beans-edit';
/**Interfaces**/
import {IBean} from '../../interfaces/bean/iBean';
/**
 * Classes
 */
import {Bean} from '../../classes/bean/bean';
@Component({
  templateUrl: 'beans.html',
  selector: 'beans-list',
})
export class BeansPage {

  beans: Array<Bean> = null;

  constructor(public modalCtrl: ModalController, private changeDetectorRef: ChangeDetectorRef, private uiBeanStorage: UIBeanStorage, private uiAlert: UIAlert) {

  }

  ionViewWillEnter() {
    this.loadBeans();
  }

  private __initializeBeans() {
    this.beans = this.uiBeanStorage.getAllEntries()
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
    this.uiAlert.showConfirm("Bohne löschen?", "Sicher?").then(() => {
        //Yes
        this.__deleteBean(_bean)
      },
      () => {
        //No
      })

  }

  private __deleteBean(_bean: IBean) {
    this.uiBeanStorage.removeByObject(_bean);
    this.loadBeans();

  }


}
