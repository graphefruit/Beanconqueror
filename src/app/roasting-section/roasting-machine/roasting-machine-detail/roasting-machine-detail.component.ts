import {Component, Input, OnInit} from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';
import {UIHelper} from '../../../../services/uiHelper';
import {UIAnalytics} from '../../../../services/uiAnalytics';
import {RoastingMachine} from '../../../../classes/roasting-machine/roasting-machine';
import {IRoastingMachine} from '../../../../interfaces/roasting-machine/iRoastingMachine';

@Component({
  selector: 'app-roasting-machine-detail',
  templateUrl: './roasting-machine-detail.component.html',
  styleUrls: ['./roasting-machine-detail.component.scss'],
})
export class RoastingMachineDetailComponent implements OnInit {

  public data: RoastingMachine = new RoastingMachine();

  @Input() private roastingMachine: IRoastingMachine;



  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               public uiHelper: UIHelper,
               private readonly uiAnalytics: UIAnalytics) {
  }

  public ionViewWillEnter() {
    this.uiAnalytics.trackEvent('ROASTING_MACHINE', 'DETAIL');
    this.data = this.uiHelper.copyData(this.roastingMachine);

  }

  public ngOnInit() {}
  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'roasting-machine-detail');
  }

}
