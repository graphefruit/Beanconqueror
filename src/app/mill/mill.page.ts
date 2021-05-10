import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {UIMillStorage} from '../../services/uiMillStorage';
import {UIAlert} from '../../services/uiAlert';
import {Mill} from '../../classes/mill/mill';
import {ModalController} from '@ionic/angular';
import {UIBrewStorage} from '../../services/uiBrewStorage';

import {MillAddComponent} from './mill-add/mill-add.component';
import {MILL_ACTION} from '../../enums/mills/millActions';
import {Settings} from '../../classes/settings/settings';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import MILL_TRACKING from '../../data/tracking/millTracking';
import {UIAnalytics} from '../../services/uiAnalytics';


@Component({
  selector: 'mill',
  templateUrl: './mill.page.html',
  styleUrls: ['./mill.page.scss'],
})
export class MillPage  implements OnInit  {

  public mills: Array<Mill> = [];

  public settings: Settings;
  public segment: string = 'open';

  constructor (public modalCtrl: ModalController,
               private readonly changeDetectorRef: ChangeDetectorRef,
               private readonly uiMillStorage: UIMillStorage,
               private readonly uiAlert: UIAlert,
               private readonly uiBrewStorage: UIBrewStorage,
               private readonly uiSettingsStorage: UISettingsStorage,
               private readonly uiAnalytics: UIAnalytics) {

  }

  public ngOnInit(): void {
  }

  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.__initializeMills();
  }

  public getActiveMills(): Array<Mill> {
    return this.mills.filter(
      (mill) => !mill.finished);
  }

  public getArchivedMills(): Array<Mill> {
    return this.mills.filter(
      (mill) => mill.finished);
  }

  public loadMills(): void {
    this.__initializeMills();
    this.changeDetectorRef.detectChanges();
  }

  public async millAction(action: MILL_ACTION, mill: Mill): Promise<void> {
    this.loadMills();

  }

  public async add() {
    this.uiAnalytics.trackEvent(MILL_TRACKING.TITLE, MILL_TRACKING.ACTIONS.ADD);

    const modal = await this.modalCtrl.create({
      component: MillAddComponent,
      cssClass: 'popover-actions',
      id: 'mill-add'
    });
    await modal.present();
    await modal.onWillDismiss();
    this.loadMills();
  }

  private __initializeMills(): void {
    this.mills = this.uiMillStorage.getAllEntries()
        .sort((a, b) => a.name.localeCompare(b.name));
  }


}
