import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {UIAlert} from '../../services/uiAlert';
import {UIBeanStorage} from '../../services/uiBeanStorage';
import {ModalController} from '@ionic/angular';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {Brew} from '../../classes/brew/brew';
import {Bean} from '../../classes/bean/bean';
import {BeansAddComponent} from './beans-add/beans-add.component';
import {BeansEditComponent} from './beans-edit/beans-edit.component';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {Settings} from '../../classes/settings/settings';
import {BEAN_ACTION} from '../../enums/beans/beanAction';
import {UIToast} from '../../services/uiToast';
import {BeanPhotoViewComponent} from './bean-photo-view/bean-photo-view.component';

@Component({
  selector: 'beans',
  templateUrl: './beans.page.html',
  styleUrls: ['./beans.page.scss'],
})
export class BeansPage implements OnInit {

  public beans: Array<Bean> = [];


  public settings: Settings;

  public bean_segment: string = 'open';
  constructor(public modalCtrl: ModalController,
              private readonly changeDetectorRef: ChangeDetectorRef,
              private readonly uiBeanStorage: UIBeanStorage,
              private readonly uiAlert: UIAlert,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiSettingsStorage: UISettingsStorage,
              private readonly uiToast: UIToast) {


  }

  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
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

  public async beanAction(action: BEAN_ACTION, bean: Bean): Promise<void> {
    switch (action) {

      case BEAN_ACTION.REPEAT:
        this.repeatBean(bean);
        break;
      case BEAN_ACTION.EDIT:
        this.editBean(bean);
        break;
      case BEAN_ACTION.DELETE:
        this.deleteBean(bean);
        break;
      case BEAN_ACTION.BEANS_CONSUMED:
        this.beansConsumed(bean);
        break;
      case BEAN_ACTION.PHOTO_GALLERY:
        this.viewPhotos(bean);
        break;
      default:
        break;
    }
  }

  public async viewPhotos(_bean: Bean) {
    const modal = await this.modalCtrl.create({component: BeanPhotoViewComponent, componentProps: {bean: _bean}});
    await modal.present();
    await modal.onWillDismiss();
  }

  public beansConsumed(_bean: Bean) {
    _bean.finished = true;
    this.uiBeanStorage.update(_bean);
    this.loadBeans();
  }

  public async add() {
    const modal = await this.modalCtrl.create({component:BeansAddComponent});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBeans();
  }

  public async editBean(_bean: Bean) {

    const modal = await this.modalCtrl.create({component:BeansEditComponent,  componentProps: {'bean' : _bean}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBeans();
  }


  public deleteBean(_bean: Bean): void {
    this.uiAlert.showConfirm('DELETE_BEAN_QUESTION', 'SURE_QUESTION', true)
        .then(() => {
              // Yes
              this.__deleteBean(_bean);
            this.uiToast.showInfoToast('TOAST_BEAN_DELETED_SUCCESSFULLY');
            },
            () => {
              // No
            });

  }

  public async repeatBean(_bean: Bean) {

    const modal = await this.modalCtrl.create({component: BeansAddComponent, componentProps: {bean_template: _bean}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBeans();

  }

  private __initializeBeans(): void {
    this.beans = this.uiBeanStorage.getAllEntries()
        .sort((a, b) => a.name.localeCompare(b.name));
  }

  private __deleteBean(_bean: Bean): void {
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
