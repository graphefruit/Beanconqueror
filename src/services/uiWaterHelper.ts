/** Core */
import {Injectable} from '@angular/core';

import {UIAnalytics} from './uiAnalytics';
import {ModalController} from '@ionic/angular';
import {WaterAddComponent} from '../app/water-section/water/water-add/water-add.component';
import {WaterEditComponent} from '../app/water-section/water/water-edit/water-edit.component';
import {Water} from '../classes/water/water';
import {WaterDetailComponent} from '../app/water-section/water/water-detail/water-detail.component';

/**
 * Handles every helping functionalities
 */

@Injectable({
  providedIn: 'root'
})
export class UIWaterHelper {


  constructor(private readonly uiAnalytics: UIAnalytics,
              private readonly modalController: ModalController) {

  }



  public async addWater() {
    const modal = await this.modalController.create({component:WaterAddComponent,id:WaterAddComponent.COMPONENT_ID, cssClass: 'popover-actions'});
    await modal.present();
    await modal.onWillDismiss();
  }

  public async editWater(_water: Water) {

    const modal = await this.modalController.create({component: WaterEditComponent, id: WaterEditComponent.COMPONENT_ID, componentProps: {water: _water}});
    await modal.present();
    await modal.onWillDismiss();

  }


  public async detailWater(_water: Water) {
    const modal = await this.modalController.create({component: WaterDetailComponent, id: WaterDetailComponent.COMPONENT_ID, componentProps: {water: _water}});
    await modal.present();
    await modal.onWillDismiss();

  }

}
