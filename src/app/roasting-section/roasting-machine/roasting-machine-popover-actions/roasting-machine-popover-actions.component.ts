import { Component, OnInit } from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';
import {UIHelper} from '../../../../services/uiHelper';
import {UIAnalytics} from '../../../../services/uiAnalytics';
import {RoastingMachine} from '../../../../classes/roasting-machine/roasting-machine';
import {IRoastingMachine} from '../../../../interfaces/roasting-machine/iRoastingMachine';
import {ROASTING_MACHINE_ACTION} from '../../../../enums/roasting-machine/roastingMachineAction';

@Component({
  selector: 'app-roasting-machine-popover-actions',
  templateUrl: './roasting-machine-popover-actions.component.html',
  styleUrls: ['./roasting-machine-popover-actions.component.scss'],
})
export class RoastingMachinePopoverActionsComponent implements OnInit {

  public data: RoastingMachine = new RoastingMachine();

  constructor(private readonly modalController: ModalController,
              private readonly navParams: NavParams,
              private readonly uiHelper: UIHelper,
              private readonly uiAnalytics: UIAnalytics) {
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const roastingMachine: IRoastingMachine = this.uiHelper.copyData(this.navParams.get('roastingMachine'));

    this.data.initializeByObject(roastingMachine);
  }

  public ionViewDidEnter(): void {
    this.uiAnalytics.trackEvent('ROASTING_MACHINE', 'POPOVER_ACTIONS');
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
    this.modalController.dismiss(undefined, _type,'roasting-machine-popover-actions');
  }
  public async dismiss() {
    this.modalController.dismiss(undefined, undefined,'roasting-machine-popover-actions');
  }
}
