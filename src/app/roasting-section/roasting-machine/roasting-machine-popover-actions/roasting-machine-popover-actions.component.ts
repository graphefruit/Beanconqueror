import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UIHelper } from '../../../../services/uiHelper';
import { RoastingMachine } from '../../../../classes/roasting-machine/roasting-machine';
import { IRoastingMachine } from '../../../../interfaces/roasting-machine/iRoastingMachine';
import { ROASTING_MACHINE_ACTION } from '../../../../enums/roasting-machine/roastingMachineAction';

@Component({
    selector: 'app-roasting-machine-popover-actions',
    templateUrl: './roasting-machine-popover-actions.component.html',
    styleUrls: ['./roasting-machine-popover-actions.component.scss'],
    standalone: false
})
export class RoastingMachinePopoverActionsComponent {
  public static readonly COMPONENT_ID = 'roasting-machine-popover-actions';
  public data: RoastingMachine = new RoastingMachine();

  @Input('roastingMachine') public roastingMachine: IRoastingMachine;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiHelper: UIHelper
  ) {}
  public ngOnInit() {
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const roastingMachine: IRoastingMachine = this.uiHelper.copyData(
      this.roastingMachine
    );

    this.data.initializeByObject(roastingMachine);
  }

  public hasPhotos(): boolean {
    return this.data.attachments.length > 0;
  }

  public getStaticActions(): any {
    return ROASTING_MACHINE_ACTION;
  }

  public async choose(_type: string): Promise<void> {
    this.modalController.dismiss(
      undefined,
      _type,
      RoastingMachinePopoverActionsComponent.COMPONENT_ID
    );
  }
  public async dismiss() {
    this.modalController.dismiss(
      undefined,
      undefined,
      RoastingMachinePopoverActionsComponent.COMPONENT_ID
    );
  }
}
