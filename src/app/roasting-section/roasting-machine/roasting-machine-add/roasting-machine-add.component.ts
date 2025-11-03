import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UIToast } from '../../../../services/uiToast';
import { UIRoastingMachineStorage } from '../../../../services/uiRoastingMachineStorage';
import { RoastingMachine } from '../../../../classes/roasting-machine/roasting-machine';
import ROASTING_MACHINE_TRACKING from '../../../../data/tracking/roastingMachineTracking';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { ROASTING_MACHINE_TYPES } from 'src/enums/roasting-machine/roasting-machine-types';

@Component({
  selector: 'app-roasting-machine-add',
  templateUrl: './roasting-machine-add.component.html',
  styleUrls: ['./roasting-machine-add.component.scss'],
  standalone: false,
})
export class RoastingMachineAddComponent implements OnInit {
  public static COMPONENT_ID: string = 'roasting-machine-add';
  public data: RoastingMachine = new RoastingMachine();
  public ROASTING_MACHINE_TYPES = ROASTING_MACHINE_TYPES;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiRoastingMachineStorage: UIRoastingMachineStorage,
    private readonly uiToast: UIToast,
    private readonly uiAnalytics: UIAnalytics,
  ) {}

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      ROASTING_MACHINE_TRACKING.TITLE,
      ROASTING_MACHINE_TRACKING.ACTIONS.ADD,
    );
  }
  public async add() {
    if (this.data.name) {
      await this.__add();
    }
  }

  public async __add() {
    await this.uiRoastingMachineStorage.add(this.data);
    this.uiAnalytics.trackEvent(
      ROASTING_MACHINE_TRACKING.TITLE,
      ROASTING_MACHINE_TRACKING.ACTIONS.ADD_FINISH,
    );
    this.uiToast.showInfoToast('TOAST_ROASTING_MACHINE_ADDED_SUCCESSFULLY');
    this.dismiss();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      RoastingMachineAddComponent.COMPONENT_ID,
    );
  }
  public ngOnInit() {
    this.data.type = ROASTING_MACHINE_TYPES.CUSTOM;
  }
}
