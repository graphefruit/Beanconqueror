import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UIHelper } from '../../../../services/uiHelper';
import { UIToast } from '../../../../services/uiToast';
import { UIRoastingMachineStorage } from '../../../../services/uiRoastingMachineStorage';
import { RoastingMachine } from '../../../../classes/roasting-machine/roasting-machine';
import { IRoastingMachine } from '../../../../interfaces/roasting-machine/iRoastingMachine';
import ROASTING_MACHINE_TRACKING from '../../../../data/tracking/roastingMachineTracking';
import { UIAnalytics } from '../../../../services/uiAnalytics';

@Component({
  selector: 'app-roasting-machine-edit',
  templateUrl: './roasting-machine-edit.component.html',
  styleUrls: ['./roasting-machine-edit.component.scss'],
  standalone: false,
})
export class RoastingMachineEditComponent implements OnInit {
  public static COMPONENT_ID: string = 'roasting-machine-edit';

  public data: RoastingMachine = new RoastingMachine();

  @Input() private roastingMachine: IRoastingMachine;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiRoastingMachineStorage: UIRoastingMachineStorage,
    private readonly uiHelper: UIHelper,
    private readonly uiToast: UIToast,
    private readonly uiAnalytics: UIAnalytics,
  ) {}

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      ROASTING_MACHINE_TRACKING.TITLE,
      ROASTING_MACHINE_TRACKING.ACTIONS.EDIT,
    );
    this.data = this.uiHelper.copyData(this.roastingMachine);
  }

  public async edit(form) {
    if (form.valid) {
      await this.__edit();
    }
  }

  public async __edit() {
    await this.uiRoastingMachineStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_ROASTING_MACHINE_EDITED_SUCCESSFULLY');
    this.uiAnalytics.trackEvent(
      ROASTING_MACHINE_TRACKING.TITLE,
      ROASTING_MACHINE_TRACKING.ACTIONS.EDIT_FINISH,
    );
    this.dismiss();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      RoastingMachineEditComponent.COMPONENT_ID,
    );
  }
  public ngOnInit() {}
}
