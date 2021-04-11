import {Component, Input, OnInit} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {UIHelper} from '../../../../services/uiHelper';
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
               public uiHelper: UIHelper) {
  }

  public ionViewWillEnter() {
    this.data = this.uiHelper.copyData(this.roastingMachine);

  }

  public ngOnInit() {}
  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'roasting-machine-detail');
  }

}
