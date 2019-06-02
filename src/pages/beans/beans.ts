/** Core */
import { ChangeDetectorRef, Component } from '@angular/core';
/** Ionic */
import { ModalController } from 'ionic-angular';
/**
 * Classes
 */
import { Bean } from '../../classes/bean/bean';
import { Brew } from '../../classes/brew/brew';
/** Interfaces */
import { IBean } from '../../interfaces/bean/iBean';
import { UIAlert } from '../../services/uiAlert';
/** Services */
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UIBrewStorage } from '../../services/uiBrewStorage';
/** Modals */
import { BeansAddModal } from '../beans/add/beans-add';
import { BeansEditModal } from '../beans/edit/beans-edit';
@Component({
  templateUrl: 'beans.html',
  selector: 'beans-list'
})
export class BeansPage {

  public beans: Array<Bean> = [];

  public bean_segment: string = 'open';
  constructor(public modalCtrl: ModalController,
              private changeDetectorRef: ChangeDetectorRef,
              private uiBeanStorage: UIBeanStorage,
              private uiAlert: UIAlert,
              private uiBrewStorage: UIBrewStorage) {

  }

  public ionViewWillEnter(): void {
    this.loadBeans();
  }

  public getOpenBeans(): Array<Bean> {

    return this.beans.filter(
      (bean) => bean.finished === false);
  }
  public getFinishedBeans(): Array<Bean> {

    return this.beans.filter(
      (bean) => bean.finished === true);
  }

  public loadBeans(): void {
    this.__initializeBeans();
    this.changeDetectorRef.detectChanges();
  }

  public addBean(): void {
    const addBeanModal = this.modalCtrl.create(BeansAddModal, {});
    addBeanModal.onDidDismiss(() => {
      this.loadBeans();
    });
    addBeanModal.present({animate: false});
  }

  public editBean(_bean: IBean): void {
    const editBeansModal = this.modalCtrl.create(BeansEditModal, {BEAN: _bean});
    editBeansModal.onDidDismiss(() => {
      this.loadBeans();
    });
    editBeansModal.present({animate: false});
  }

  public deleteBean(_bean: IBean): void {
    this.uiAlert.showConfirm('Bohne löschen? Alle zugehörigen Brühungen werden mit entfernt.', 'Sicher?')
      .then(() => {
        // Yes
        this.__deleteBean(_bean);
      },
      () => {
        // No
      });

  }

  private __initializeBeans(): void {
    this.beans = this.uiBeanStorage.getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private __deleteBean(_bean: IBean): void {
    const brews: Array<Brew> =  this.uiBrewStorage.getAllEntries();

    const deletingBrewIndex: Array<number> = [];
    for (let i = 0; i < brews.length; i++) {
      if (brews[i].bean === _bean.config.uuid) {
        deletingBrewIndex.push(i);
      }
    }
    for (let i = deletingBrewIndex.length; i--;) {
      this.uiBrewStorage.removeByUUID(brews[deletingBrewIndex[i]].config.uuid);
    }

    this.uiBeanStorage.removeByObject(_bean);
    this.loadBeans();

  }

}
