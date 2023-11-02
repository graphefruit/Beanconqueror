/** Core */
import { Injectable } from '@angular/core';

import { Brew } from '../classes/brew/brew';
import { UIBrewStorage } from './uiBrewStorage';

import { UIAnalytics } from './uiAnalytics';
import { ModalController } from '@ionic/angular';
import { Graph } from '../classes/graph/graph';
import { GraphEditComponent } from '../app/graph-section/graph/graph-edit/graph-edit.component';
import { GraphAddComponent } from '../app/graph-section/graph/graph-add/graph-add.component';
import { GraphDetailComponent } from '../app/graph-section/graph/graph-detail/graph-detail.component';

/**
 * Handles every helping functionalities
 */

@Injectable({
  providedIn: 'root',
})
export class UIGraphHelper {
  private allStoredBrews: Array<Brew> = [];
  constructor(
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiAnalytics: UIAnalytics,
    private readonly modalController: ModalController
  ) {}

  public async addGraph() {
    const modal = await this.modalController.create({
      component: GraphAddComponent,
      cssClass: 'popover-actions',
      id: GraphAddComponent.COMPONENT_ID,
      componentProps: {},
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async editGraph(_graph: Graph) {
    const editModal = await this.modalController.create({
      component: GraphEditComponent,
      componentProps: { graph: _graph },
      id: GraphEditComponent.COMPONENT_ID,
    });
    await editModal.present();
    await editModal.onWillDismiss();
  }

  public async detailGraph(_graph: Graph) {
    const modal = await this.modalController.create({
      component: GraphDetailComponent,
      id: GraphDetailComponent.COMPONENT_ID,
      componentProps: { graph: _graph },
    });
    await modal.present();
    await modal.onWillDismiss();
  }
}
