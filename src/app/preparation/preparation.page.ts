import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {UIAlert} from '../../services/uiAlert';
import {Preparation} from '../../classes/preparation/preparation';
import {UIPreparationStorage} from '../../services/uiPreparationStorage';
import {ModalController} from '@ionic/angular';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {Brew} from '../../classes/brew/brew';
import {PreparationEditComponent} from './preparation-edit/preparation-edit.component';
import {PreparationAddComponent} from './preparation-add/preparation-add.component';
import {PREPARATION_ACTION} from '../../enums/preparations/preparationAction';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {Settings} from '../../classes/settings/settings';
import {UIToast} from '../../services/uiToast';

@Component({
  selector: 'preparation',
  templateUrl: './preparation.page.html',
  styleUrls: ['./preparation.page.scss'],
})
export class PreparationPage implements OnInit {
  public settings: Settings;
  public segment: string = 'open';
  public preparations: Array<Preparation> = [];

  constructor(public modalCtrl: ModalController,
              private readonly changeDetectorRef: ChangeDetectorRef,
              private readonly uiPreparationStorage: UIPreparationStorage,
              private readonly uiAlert: UIAlert,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiSettingsStorage: UISettingsStorage,
              private readonly uiToast: UIToast) {

  }

  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.__initializePreparations();
  }

  public loadPreparations(): void {
    this.__initializePreparations();
    this.changeDetectorRef.detectChanges();
  }

  public getActivePreparations(): Array<Preparation> {
    return this.preparations.filter(
      (preparation) => !preparation.finished);
  }

  public getArchivedPreparations(): Array<Preparation> {
    return this.preparations.filter(
      (preparation) => preparation.finished);
  }

  public async preparationAction(action: PREPARATION_ACTION, preparation: Preparation): Promise<void> {
    switch (action) {

      case PREPARATION_ACTION.EDIT:
        this.editPreparation(preparation);
        break;
      case PREPARATION_ACTION.DELETE:
        this.deletePreparation(preparation);
        break;
      case PREPARATION_ACTION.ARCHIVE:
        this.archive(preparation);
        break;
      default:
        break;
    }
  }

  public async add() {
    const modal = await this.modalCtrl.create({
      component: PreparationAddComponent,
      cssClass: 'bottom-modal',
      showBackdrop: true,
      id: 'preparation-add'
    });
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

  public deletePreparation(_preparation: Preparation): void {
    this.uiAlert.showConfirm('DELETE_PREPARATION_METHOD_QUESTION', 'SURE_QUESTION', true).then(() => {
          // Yes
          this.__deletePreparation(_preparation);
        this.uiToast.showInfoToast('TOAST_PREPARATION_DELETED_SUCCESSFULLY');
        },
        () => {
          // No
        });

  }

  public archive(_preparation: Preparation) {
    _preparation.finished = true;
    this.uiPreparationStorage.update(_preparation);
    this.loadPreparations();
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
