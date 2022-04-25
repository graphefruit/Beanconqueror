/** Core */
import {Injectable} from '@angular/core';

import {Brew} from '../classes/brew/brew';
import {UIBrewStorage} from './uiBrewStorage';
import MILL_TRACKING from '../data/tracking/millTracking';
import {MillAddComponent} from '../app/mill/mill-add/mill-add.component';
import {UIAnalytics} from './uiAnalytics';
import {ModalController} from '@ionic/angular';
import {MillEditComponent} from '../app/mill/mill-edit/mill-edit.component';
import {Mill} from '../classes/mill/mill';
import {MillDetailComponent} from '../app/mill/mill-detail/mill-detail.component';

/**
 * Handles every helping functionalities
 */

@Injectable({
  providedIn: 'root'
})
export class UIMillHelper {

  private allStoredBrews: Array<Brew> = [];
  constructor(private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiAnalytics: UIAnalytics,
              private readonly modalController: ModalController) {
    this.uiBrewStorage.attachOnEvent().subscribe((_val) => {
      // If an brew is deleted, we need to reset our array for the next call.
      this.allStoredBrews = [];
    });
  }

  public getAllBrewsForThisMill(_uuid: string): Array<Brew> {

    if (this.allStoredBrews.length <= 0) {
      // Load just if needed, performance reasons
      this.allStoredBrews = this.uiBrewStorage.getAllEntries();
    }

    const brewsForMill: Array<Brew> = [];
    const brews: Array<Brew> = this.allStoredBrews;

    const millUUID: string = _uuid;
    for (const brew of brews) {
      if (brew.mill === millUUID) {
        brewsForMill.push(brew);
      }
    }
    return brewsForMill;

  }

  public async addMill(_hideToastMessage:boolean = false) {
    const modal = await this.modalController.create({
      component: MillAddComponent,
      cssClass: 'popover-actions',
      id: MillAddComponent.COMPONENT_ID,
      componentProps: {hide_toast_message: _hideToastMessage},
      breakpoints: [0, 0.35, 0.5, 0.75, 1],
      initialBreakpoint: 0.35,
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async editMill(_mill: Mill) {
    const editModal = await this.modalController.create({
      component: MillEditComponent,
      componentProps: {mill :_mill},
      id: MillEditComponent.COMPONENT_ID
    });
    await editModal.present();
    await editModal.onWillDismiss();
  }

  public async detailMill(_mill: Mill) {
    const modal = await this.modalController.create({component: MillDetailComponent, id: MillDetailComponent.COMPONENT_ID, componentProps: {mill: _mill}});
    await modal.present();
    await modal.onWillDismiss();
  }
}
