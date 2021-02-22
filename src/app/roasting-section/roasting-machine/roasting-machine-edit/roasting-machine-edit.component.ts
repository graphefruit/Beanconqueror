import {Component, Input, OnInit} from '@angular/core';
import {Mill} from '../../../../classes/mill/mill';
import {IMill} from '../../../../interfaces/mill/iMill';
import {ModalController, NavParams} from '@ionic/angular';
import {UIHelper} from '../../../../services/uiHelper';
import {UIAnalytics} from '../../../../services/uiAnalytics';
import {UIToast} from '../../../../services/uiToast';
import {UIRoastingMachineStorage} from '../../../../services/uiRoastingMachineStorage';
import {RoastingMachine} from '../../../../classes/roasting-machine/roasting-machine';
import {IRoastingMachine} from '../../../../interfaces/roasting-machine/iRoastingMachine';

@Component({
  selector: 'app-roasting-machine-edit',
  templateUrl: './roasting-machine-edit.component.html',
  styleUrls: ['./roasting-machine-edit.component.scss'],
})
export class RoastingMachineEditComponent implements OnInit {

  public data: RoastingMachine = new RoastingMachine();

  @Input() private roastingMachine: IRoastingMachine;

  constructor (private readonly navParams: NavParams,
               private  readonly modalController: ModalController,
               private readonly uiRoastingMachineStorage: UIRoastingMachineStorage,
               private readonly uiHelper: UIHelper,
               private readonly uiAnalytics: UIAnalytics,
               private readonly uiToast: UIToast) {

  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent('ROASTING_MACHINE', 'EDIT');
    this.data = this.uiHelper.copyData(this.roastingMachine);
  }

  public edit(form): void {
    if (form.valid) {
      this.__edit();
    }
  }

  public __edit(): void {
    this.uiRoastingMachineStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_ROASTING_MACHINE_EDITED_SUCCESSFULLY');
    this.dismiss();
  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'roasting-machine-edit');
  }
  public ngOnInit() {}


}
