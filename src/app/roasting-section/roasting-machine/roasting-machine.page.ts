import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Settings } from '../../../classes/settings/settings';
import { ModalController } from '@ionic/angular/standalone';
import { UIAlert } from '../../../services/uiAlert';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { ROASTING_MACHINE_ACTION } from '../../../enums/roasting-machine/roastingMachineAction';
import { RoastingMachine } from '../../../classes/roasting-machine/roasting-machine';
import { UIRoastingMachineStorage } from '../../../services/uiRoastingMachineStorage';

import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIRoastingMachineHelper } from '../../../services/uiRoastingMachineHelper';
import { FormsModule } from '@angular/forms';
import { RoastingMachineInformationCardComponent } from '../../../components/roasting-machine-information-card/roasting-machine-information-card.component';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-roasting-machine',
  templateUrl: './roasting-machine.page.html',
  styleUrls: ['./roasting-machine.page.scss'],
  imports: [
    FormsModule,
    RoastingMachineInformationCardComponent,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonButton,
    IonIcon,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
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

  public roastingMachines: Array<RoastingMachine> = [];

  public settings: Settings;
  public segment: string = 'open';

  public ngOnInit(): void {}

  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.loadRoastingMachines();
  }

  public getActiveRoastingMachines(): Array<RoastingMachine> {
    return this.roastingMachines.filter((machine) => !machine.finished);
  }

  public getArchivedMRoastingMachines(): Array<RoastingMachine> {
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
