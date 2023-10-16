/** Core */
import { Injectable } from '@angular/core';

import { UIAnalytics } from './uiAnalytics';
import { ModalController } from '@ionic/angular';
import { RoastingMachine } from '../classes/roasting-machine/roasting-machine';
import { RoastingMachineAddComponent } from '../app/roasting-section/roasting-machine/roasting-machine-add/roasting-machine-add.component';
import { RoastingMachineEditComponent } from '../app/roasting-section/roasting-machine/roasting-machine-edit/roasting-machine-edit.component';
import { RoastingMachineDetailComponent } from '../app/roasting-section/roasting-machine/roasting-machine-detail/roasting-machine-detail.component';

/**
 * Handles every helping functionalities
 */

@Injectable({
  providedIn: 'root',
})
export class UIRoastingMachineHelper {
  constructor(
    private readonly uiAnalytics: UIAnalytics,
    private readonly modalController: ModalController
  ) {}

  public async addRoastingMachine() {
    const modal = await this.modalController.create({
      component: RoastingMachineAddComponent,
      cssClass: 'popover-actions',
      id: RoastingMachineAddComponent.COMPONENT_ID,
      breakpoints: [0, 0.35, 0.5, 0.75],
      initialBreakpoint: 0.35,
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async editRoastingMachine(_roastingMachine: RoastingMachine) {
    const modal = await this.modalController.create({
      component: RoastingMachineEditComponent,
      id: RoastingMachineEditComponent.COMPONENT_ID,
      componentProps: { roastingMachine: _roastingMachine },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async detailRoastingMachine(_roastingMachine: RoastingMachine) {
    const modal = await this.modalController.create({
      component: RoastingMachineDetailComponent,
      id: RoastingMachineDetailComponent.COMPONENT_ID,
      componentProps: { roastingMachine: _roastingMachine },
    });
    await modal.present();
    await modal.onWillDismiss();
  }
}
