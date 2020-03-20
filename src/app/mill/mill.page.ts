import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {UIMillStorage} from '../../services/uiMillStorage';
import {UIAlert} from '../../services/uiAlert';
import {Mill} from '../../classes/mill/mill';
import {ModalController, Platform} from '@ionic/angular';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {Brew} from '../../classes/brew/brew';
import {MillEditComponent} from './mill-edit/mill-edit.component';
import {MillAddComponent} from './mill-add/mill-add.component';
import {MillInformationComponent} from './mill-information/mill-information.component';

@Component({
  selector: 'mill',
  templateUrl: './mill.page.html',
  styleUrls: ['./mill.page.scss'],
})
export class MillPage  implements OnInit  {

  public mills: Array<Mill> = [];
public ngOnInit(): void {
}

  constructor (public modalCtrl: ModalController,
               private readonly changeDetectorRef: ChangeDetectorRef,
               private readonly uiMillStorage: UIMillStorage,
               private readonly uiAlert: UIAlert,
               private readonly uiBrewStorage: UIBrewStorage,
               private readonly  platform: Platform) {

  }

  public ionViewWillEnter(): void {

      this.__initializeMills();



  }

  public loadMills(): void {
    this.__initializeMills();
    this.changeDetectorRef.detectChanges();
  }

  public async add() {
    const modal = await this.modalCtrl.create({component:MillAddComponent});
    await modal.present();
    await modal.onWillDismiss();
    this.loadMills();
  }
  public async edit(_mill: any) {

    const editModal = await this.modalCtrl.create({
      component: MillEditComponent,
      componentProps: {'mill' : _mill}
    }, );
    await editModal.present();
    await editModal.onWillDismiss();
    this.loadMills();

  }

  public delete(_mill: Mill): void {
    this.uiAlert.showConfirm('DELETE_MILL_QUESTION', 'SURE_QUESTION', true).then(() => {
          // Yes
          this.__deleteMill(_mill);
        },
        () => {
          // No
        });

  }

  public async informationMill(_mill: Mill) {
    const modal = await this.modalCtrl.create({component: MillInformationComponent, componentProps: {mill: _mill}});
    await modal.present();
    await modal.onWillDismiss();
  }

  private __initializeMills(): void {
    this.mills = this.uiMillStorage.getAllEntries()
        .sort((a, b) => a.name.localeCompare(b.name));
  }

  private __deleteMill(_mill: Mill): void {
    const brews: Array<Brew> =  this.uiBrewStorage.getAllEntries();
    const deletingBrewIndex: Array<number> = [];
    for (let i = 0; i < brews.length; i++) {
      if (brews[i].mill === _mill.config.uuid) {
        deletingBrewIndex.push(i);
      }
    }
    for (let i = deletingBrewIndex.length; i--;) {
      this.uiBrewStorage.removeByUUID(brews[deletingBrewIndex[i]].config.uuid);
    }

    this.uiMillStorage.removeByObject(_mill);
    this.loadMills();
  }
}
