import { inject, Injectable } from '@angular/core';

import { ModalController } from '@ionic/angular/standalone';

import { GreenBeanAddComponent } from '../app/roasting-section/green-beans/green-bean-add/green-bean-add.component';
import { GreenBeanDetailComponent } from '../app/roasting-section/green-beans/green-bean-detail/green-bean-detail.component';
import { GreenBeanEditComponent } from '../app/roasting-section/green-beans/green-bean-edit/green-bean-edit.component';
import { GreenBean } from '../classes/green-bean/green-bean';
import { UIAnalytics } from './uiAnalytics';

/**
 * Handles every helping functionalities
 */

@Injectable({
  providedIn: 'root',
})
export class UIGreenBeanHelper {
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly modalController = inject(ModalController);

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
