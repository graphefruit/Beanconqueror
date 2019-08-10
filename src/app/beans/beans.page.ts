import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {UIAlert} from '../../services/uiAlert';
import {UIBeanStorage} from '../../services/uiBeanStorage';
import {ModalController} from '@ionic/angular';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {IBean} from '../../interfaces/bean/iBean';
import {Brew} from '../../classes/brew/brew';
import {Bean} from '../../classes/bean/bean';
import {MillAddComponent} from '../mill/mill-add/mill-add.component';
import {BeansAddComponent} from './beans-add/beans-add.component';
import {BeansEditComponent} from './beans-edit/beans-edit.component';

@Component({
  selector: 'beans',
  templateUrl: './beans.page.html',
  styleUrls: ['./beans.page.scss'],
})
export class BeansPage implements OnInit {

  public beans: Array<Bean> = [];

  public bean_segment: string = 'open';
  constructor(public modalCtrl: ModalController,
              private readonly changeDetectorRef: ChangeDetectorRef,
              private readonly uiBeanStorage: UIBeanStorage,
              private readonly uiAlert: UIAlert,
              private readonly uiBrewStorage: UIBrewStorage) {

  }

  public ionViewWillEnter(): void {
    this.loadBeans();
  }

  public getOpenBeans(): Array<Bean> {

    return this.beans.filter(
        (bean) => !bean.finished);
  }
  public getFinishedBeans(): Array<Bean> {

    return this.beans.filter(
        (bean) => bean.finished);
  }

  public loadBeans(): void {
    this.__initializeBeans();
    this.changeDetectorRef.detectChanges();
  }

  public async add() {
    const modal = await this.modalCtrl.create({component:BeansAddComponent});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBeans();
  }

  public async editBean(_bean: IBean) {
    const modal = await this.modalCtrl.create({component:BeansEditComponent,  componentProps: {'bean' : _bean}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBeans();
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
  public ngOnInit() {
  }

}
