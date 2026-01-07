/** Core */
import { Injectable } from '@angular/core';

import { UIAnalytics } from './uiAnalytics';
import { ModalController } from '@ionic/angular/standalone';
import { GreenBean } from '../classes/green-bean/green-bean';
import { GreenBeanAddComponent } from '../app/roasting-section/green-beans/green-bean-add/green-bean-add.component';
import { GreenBeanEditComponent } from '../app/roasting-section/green-beans/green-bean-edit/green-bean-edit.component';
import { GreenBeanDetailComponent } from '../app/roasting-section/green-beans/green-bean-detail/green-bean-detail.component';

/**
 * Handles every helping functionalities
 */

@Injectable({
  providedIn: 'root',
})
export class UIGreenBeanHelper {
  constructor(
    private readonly uiAnalytics: UIAnalytics,
    private readonly modalController: ModalController,
  ) {}

  public async addGreenBean() {
    const modal = await this.modalController.create({
      component: GreenBeanAddComponent,
      id: GreenBeanAddComponent.COMPONENT_ID,
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async repeatGreenBean(_greenBean: GreenBean) {
    const modal = await this.modalController.create({
      component: GreenBeanAddComponent,
      id: GreenBeanAddComponent.COMPONENT_ID,
      componentProps: { green_bean_template: _greenBean },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async editGreenBean(_greenBean: GreenBean) {
    const modal = await this.modalController.create({
      component: GreenBeanEditComponent,
      id: GreenBeanEditComponent.COMPONENT_ID,
      componentProps: { greenBean: _greenBean },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async detailGreenBean(_greenBean: GreenBean) {
    const modal = await this.modalController.create({
      component: GreenBeanDetailComponent,
      id: GreenBeanDetailComponent.COMPONENT_ID,
      componentProps: { greenBean: _greenBean },
    });
    await modal.present();
    await modal.onWillDismiss();
  }
}
