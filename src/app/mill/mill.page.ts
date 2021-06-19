import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {UIMillStorage} from '../../services/uiMillStorage';
import {UIAlert} from '../../services/uiAlert';
import {Mill} from '../../classes/mill/mill';
import {ModalController} from '@ionic/angular';
import {UIBrewStorage} from '../../services/uiBrewStorage';

import {MILL_ACTION} from '../../enums/mills/millActions';
import {Settings} from '../../classes/settings/settings';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {UIAnalytics} from '../../services/uiAnalytics';
import {UIMillHelper} from '../../services/uiMillHelper';


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
               private readonly uiAnalytics: UIAnalytics,
               private readonly uiMillHelper: UIMillHelper) {

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
    await this.uiMillHelper.addMill();
    this.loadMills();
  }

  private __initializeMills(): void {
    this.mills = this.uiMillStorage.getAllEntries()
        .sort((a, b) => a.name.localeCompare(b.name));
  }


}
