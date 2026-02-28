import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonMenuButton,
  IonSegment,
  IonSegmentButton,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { RoastingMachine } from '../../../classes/roasting-machine/roasting-machine';
import { Settings } from '../../../classes/settings/settings';
import { HeaderButtonComponent } from '../../../components/header/header-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { RoastingMachineInformationCardComponent } from '../../../components/roasting-machine-information-card/roasting-machine-information-card.component';
import { ROASTING_MACHINE_ACTION } from '../../../enums/roasting-machine/roastingMachineAction';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIRoastingMachineHelper } from '../../../services/uiRoastingMachineHelper';
import { UIRoastingMachineStorage } from '../../../services/uiRoastingMachineStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'app-roasting-machine',
  templateUrl: './roasting-machine.page.html',
  styleUrls: ['./roasting-machine.page.scss'],
  imports: [
    FormsModule,
    RoastingMachineInformationCardComponent,
    TranslatePipe,
    HeaderComponent,
    HeaderButtonComponent,
    IonHeader,
    IonMenuButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
  ],
})
export class RoastingMachinePage implements OnInit {
  modalCtrl = inject(ModalController);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly uiRoastingMachineStorage = inject(UIRoastingMachineStorage);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiRoastingMachineHelper = inject(UIRoastingMachineHelper);

  public roastingMachines: RoastingMachine[] = [];

  public settings: Settings;
  public segment = 'open';

  public ngOnInit(): void {}

  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.loadRoastingMachines();
  }

  public getActiveRoastingMachines(): RoastingMachine[] {
    return this.roastingMachines.filter((machine) => !machine.finished);
  }

  public getArchivedMRoastingMachines(): RoastingMachine[] {
    return this.roastingMachines.filter((machine) => machine.finished);
  }

  public loadRoastingMachines(): void {
    this.__initializeMills();
    this.changeDetectorRef.detectChanges();
  }

  public async roastingMachineAction(
    action: ROASTING_MACHINE_ACTION,
    roastingMachine: RoastingMachine,
  ): Promise<void> {
    this.loadRoastingMachines();
  }
  private __initializeMills(): void {
    this.roastingMachines = this.uiRoastingMachineStorage
      .getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  public async add() {
    await this.uiRoastingMachineHelper.addRoastingMachine();
    this.loadRoastingMachines();
  }
}

export default RoastingMachinePage;
