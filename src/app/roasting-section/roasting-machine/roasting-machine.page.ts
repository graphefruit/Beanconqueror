import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {Settings} from '../../../classes/settings/settings';
import {ModalController} from '@ionic/angular';
import {UIAlert} from '../../../services/uiAlert';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {ROASTING_MACHINE_ACTION} from '../../../enums/roasting-machine/roastingMachineAction';
import {RoastingMachine} from '../../../classes/roasting-machine/roasting-machine';
import {UIRoastingMachineStorage} from '../../../services/uiRoastingMachineStorage';

import {UIAnalytics} from '../../../services/uiAnalytics';
import {UIRoastingMachineHelper} from '../../../services/uiRoastingMachineHelper';

@Component({
  selector: 'app-roasting-machine',
  templateUrl: './roasting-machine.page.html',
  styleUrls: ['./roasting-machine.page.scss'],
})
export class RoastingMachinePage implements OnInit {

  public roastingMachines: Array<RoastingMachine> = [];

  public settings: Settings;
  public segment: string = 'open';

  constructor (public modalCtrl: ModalController,
               private readonly changeDetectorRef: ChangeDetectorRef,
               private readonly uiRoastingMachineStorage: UIRoastingMachineStorage,
               private readonly uiAlert: UIAlert,
               private readonly uiBrewStorage: UIBrewStorage,
               private readonly uiSettingsStorage: UISettingsStorage,
               private readonly uiAnalytics: UIAnalytics,
               private readonly uiRoastingMachineHelper: UIRoastingMachineHelper) {

  }

  public ngOnInit(): void {
  }

  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.loadRoastingMachines();
  }

  public getActiveRoastingMachines(): Array<RoastingMachine> {
    return this.roastingMachines.filter(
      (machine) => !machine.finished);
  }

  public getArchivedMRoastingMachines(): Array<RoastingMachine> {
    return this.roastingMachines.filter(
      (machine) => machine.finished);
  }



  public loadRoastingMachines(): void {
    this.__initializeMills();
    this.changeDetectorRef.detectChanges();
  }

  public async roastingMachineAction(action: ROASTING_MACHINE_ACTION, roastingMachine: RoastingMachine): Promise<void> {
    this.loadRoastingMachines();
  }
  private __initializeMills(): void {
    this.roastingMachines = this.uiRoastingMachineStorage.getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  public async add() {
      await this.uiRoastingMachineHelper.addRoastingMachine();
      this.loadRoastingMachines();
  }
}
