/** Core */
import { Injectable, inject } from '@angular/core';

import { UIAnalytics } from './uiAnalytics';
import { ModalController } from '@ionic/angular/standalone';
import { WaterAddComponent } from '../app/water-section/water/water-add/water-add.component';
import { WaterEditComponent } from '../app/water-section/water/water-edit/water-edit.component';
import { Water } from '../classes/water/water';
import { WaterDetailComponent } from '../app/water-section/water/water-detail/water-detail.component';
import { Brew } from '../classes/brew/brew';
import { UIBrewStorage } from './uiBrewStorage';

/**
 * Handles every helping functionalities
 */

@Injectable({
  providedIn: 'root',
})
export class UIWaterHelper {
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly modalController = inject(ModalController);
  private readonly uiBrewStorage = inject(UIBrewStorage);

  private allStoredBrews: Array<Brew> = [];
  constructor() {
    this.uiBrewStorage.attachOnEvent().subscribe((_val) => {
      // If an brew is deleted, we need to reset our array for the next call.
      this.allStoredBrews = [];
    });
  }

  public async addWater() {
    const modal = await this.modalController.create({
      component: WaterAddComponent,
      id: WaterAddComponent.COMPONENT_ID,
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async editWater(_water: Water) {
    const modal = await this.modalController.create({
      component: WaterEditComponent,
      id: WaterEditComponent.COMPONENT_ID,
      componentProps: { water: _water },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async detailWater(_water: Water) {
    const modal = await this.modalController.create({
      component: WaterDetailComponent,
      id: WaterDetailComponent.COMPONENT_ID,
      componentProps: { water: _water },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public getAllBrewsForThisWater(_uuid: string): Array<Brew> {
    if (this.allStoredBrews.length <= 0) {
      // Load just if needed, performance reasons
      this.allStoredBrews = this.uiBrewStorage.getAllEntries();
    }

    const brewsForWater: Array<Brew> = [];
    const brews: Array<Brew> = this.allStoredBrews;

    const waterUUID: string = _uuid;
    for (const brew of brews) {
      if (brew.water === waterUUID) {
        brewsForWater.push(brew);
      }
    }
    return brewsForWater;
  }
}
