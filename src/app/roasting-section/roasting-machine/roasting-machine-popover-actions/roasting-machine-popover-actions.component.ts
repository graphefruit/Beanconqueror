import { Component, OnInit } from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';
import {UIHelper} from '../../../../services/uiHelper';
import {RoastingMachine} from '../../../../classes/roasting-machine/roasting-machine';
import {IRoastingMachine} from '../../../../interfaces/roasting-machine/iRoastingMachine';
import {ROASTING_MACHINE_ACTION} from '../../../../enums/roasting-machine/roastingMachineAction';

@Component({
  selector: 'app-roasting-machine-popover-actions',
  templateUrl: './roasting-machine-popover-actions.component.html',
  styleUrls: ['./roasting-machine-popover-actions.component.scss'],
})
export class RoastingMachinePopoverActionsComponent implements OnInit {
  public static COMPONENT_ID:string = 'roasting-machine-popover-actions';
  public data: RoastingMachine = new RoastingMachine();

  constructor(private readonly modalController: ModalController,
              private readonly navParams: NavParams,
              private readonly uiHelper: UIHelper) {
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const roastingMachine: IRoastingMachine = this.uiHelper.copyData(this.navParams.get('roastingMachine'));

    this.data.initializeByObject(roastingMachine);
  }

  public ionViewDidEnter(): void {
  }

  public ngOnInit() {

  }

  public hasPhotos(): boolean {
    return this.data.attachments.length > 0;
  }

  public getStaticActions(): any {
    return ROASTING_MACHINE_ACTION;
  }

  public async choose(_type: string): Promise<void> {
    this.modalController.dismiss(undefined, _type,RoastingMachinePopoverActionsComponent.COMPONENT_ID);
  }
  public async dismiss() {
    this.modalController.dismiss(undefined, undefined,RoastingMachinePopoverActionsComponent.COMPONENT_ID);
  }
}
