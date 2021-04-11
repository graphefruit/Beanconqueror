import {Component, OnInit} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {UIToast} from '../../../../services/uiToast';
import {UIRoastingMachineStorage} from '../../../../services/uiRoastingMachineStorage';
import {RoastingMachine} from '../../../../classes/roasting-machine/roasting-machine';

@Component({
  selector: 'app-roasting-machine-add',
  templateUrl: './roasting-machine-add.component.html',
  styleUrls: ['./roasting-machine-add.component.scss'],
})
export class RoastingMachineAddComponent implements OnInit {

  public data: RoastingMachine = new RoastingMachine();
  constructor(private readonly modalController: ModalController,
              private readonly uiRoastingMachineStorage: UIRoastingMachineStorage,
              private readonly uiToast: UIToast) {

  }

  public ionViewWillEnter(): void {
  }
  public add(form): void {

    if (form.valid) {
      this.__add();
    }
  }

  public __add(): void {
    this.uiRoastingMachineStorage.add(this.data);
    this.dismiss();
    this.uiToast.showInfoToast('TOAST_ROASTING_MACHINE_ADDED_SUCCESSFULLY');
  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined, 'roasting-machine-add')

  }
  public ngOnInit() {}


}
