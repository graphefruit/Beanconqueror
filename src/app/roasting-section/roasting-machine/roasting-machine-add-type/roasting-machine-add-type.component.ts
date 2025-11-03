import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ROASTING_MACHINE_TYPES } from 'src/enums/roasting-machine/roasting-machine-types';

@Component({
  selector: 'app-roasting-machine-add-type',
  templateUrl: './roasting-machine-add-type.component.html',
  styleUrls: ['./roasting-machine-add-type.component.scss'],
  standalone: false,
})
export class RoastingMachineAddTypeComponent {
  public readonly ROASTING_MACHINE_TYPES = ROASTING_MACHINE_TYPES;
  constructor(private modalCtrl: ModalController) {}

  public chooseType(type: ROASTING_MACHINE_TYPES): void {
    this.modalCtrl.dismiss({ type });
  }
}
