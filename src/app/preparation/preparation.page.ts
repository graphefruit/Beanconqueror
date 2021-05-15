import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {UIAlert} from '../../services/uiAlert';
import {Preparation} from '../../classes/preparation/preparation';
import {UIPreparationStorage} from '../../services/uiPreparationStorage';
import {ModalController} from '@ionic/angular';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {PreparationAddComponent} from './preparation-add/preparation-add.component';
import {PREPARATION_ACTION} from '../../enums/preparations/preparationAction';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {Settings} from '../../classes/settings/settings';
import {UIToast} from '../../services/uiToast';
import {UIAnalytics} from '../../services/uiAnalytics';
import PREPARATION_TRACKING from '../../data/tracking/preparationTracking';

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
              private readonly uiToast: UIToast,
              private readonly uiAnalytics: UIAnalytics) {

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

  public async add() {
    this.uiAnalytics.trackEvent(PREPARATION_TRACKING.TITLE, PREPARATION_TRACKING.ACTIONS.ADD);
    const modal = await this.modalCtrl.create({
      component: PreparationAddComponent,
      showBackdrop: true,
      id: 'preparation-add'
    });
    await modal.present();
    await modal.onWillDismiss();
    this.loadPreparations();
  }

  public async preparationAction(action: PREPARATION_ACTION, preparation: Preparation): Promise<void> {
    this.loadPreparations();
  }



  private __initializePreparations(): void {
    this.preparations = this.uiPreparationStorage.getAllEntries()
        .sort((a, b) => a.name.localeCompare(b.name));
  }


  public ngOnInit() {
  }

}
