import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {UIAlert} from '../../services/uiAlert';
import {Preparation} from '../../classes/preparation/preparation';
import {UIPreparationStorage} from '../../services/uiPreparationStorage';
import {ModalController} from '@ionic/angular';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {Brew} from '../../classes/brew/brew';
import {PreparationEditComponent} from './preparation-edit/preparation-edit.component';
import {PreparationAddComponent} from './preparation-add/preparation-add.component';
import {PreparationInformationComponent} from './preparation-information/preparation-information.component';

@Component({
  selector: 'preparation',
  templateUrl: './preparation.page.html',
  styleUrls: ['./preparation.page.scss'],
})
export class PreparationPage implements OnInit {


  public preparations: Array<Preparation> = [];
  constructor(public modalCtrl: ModalController,
              private readonly changeDetectorRef: ChangeDetectorRef,
              private readonly uiPreparationStorage: UIPreparationStorage,
              private readonly uiAlert: UIAlert,
              private readonly uiBrewStorage: UIBrewStorage) {

  }

  public ionViewWillEnter(): void {
    this.__initializePreparations();
  }

  public loadPreparations(): void {
    this.__initializePreparations();
    this.changeDetectorRef.detectChanges();
  }

  public async add() {
    const modal = await this.modalCtrl.create({component:PreparationAddComponent});
    await modal.present();
    await modal.onWillDismiss();
    this.loadPreparations();
  }

  public async editPreparation(_preparation: Preparation) {
    const modal = await this.modalCtrl.create({component: PreparationEditComponent, componentProps: {preparation: _preparation}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadPreparations();
  }

  public async informationPreparation(_preparation: Preparation) {
    const modal = await this.modalCtrl.create({component: PreparationInformationComponent, componentProps: {preparation: _preparation}});
    await modal.present();
    await modal.onWillDismiss();
  }

  public deletePreparation(_preparation: Preparation): void {
    this.uiAlert.showConfirm('DELETE_PREPARATION_METHOD_QUESTION', 'SURE_QUESTION', true).then(() => {
          // Yes
          this.__deletePreparation(_preparation);
        },
        () => {
          // No
        });

  }

  private __initializePreparations(): void {
    this.preparations = this.uiPreparationStorage.getAllEntries()
        .sort((a, b) => a.name.localeCompare(b.name));
  }

  private __deletePreparation(_preparation: Preparation): void {
    const brews: Array<Brew> =  this.uiBrewStorage.getAllEntries();
    const deletingBrewIndex: Array<number> = [];
    for (let i = 0; i < brews.length; i++) {
      if (brews[i].method_of_preparation === _preparation.config.uuid) {
        deletingBrewIndex.push(i);
      }
    }
    for (let i = deletingBrewIndex.length; i--;) {
      this.uiBrewStorage.removeByUUID(brews[deletingBrewIndex[i]].config.uuid);
    }

    this.uiPreparationStorage.removeByObject(_preparation);
    this.loadPreparations();

  }

  public ngOnInit() {
  }

}
