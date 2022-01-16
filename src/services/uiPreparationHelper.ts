/** Core */
import {Injectable} from '@angular/core';

import {Brew} from '../classes/brew/brew';
import {UIBrewStorage} from './uiBrewStorage';
import PREPARATION_TRACKING from '../data/tracking/preparationTracking';
import {PreparationAddComponent} from '../app/preparation/preparation-add/preparation-add.component';
import {ModalController} from '@ionic/angular';
import {PreparationEditComponent} from '../app/preparation/preparation-edit/preparation-edit.component';
import {Preparation} from '../classes/preparation/preparation';
import {PreparationDetailComponent} from '../app/preparation/preparation-detail/preparation-detail.component';
import {PreparationTool} from '../classes/preparation/preparationTool';
import {PreparationEditToolComponent} from '../app/preparation/preparation-edit-tool/preparation-edit-tool.component';

/**
 * Handles every helping functionalities
 */

@Injectable({
  providedIn: 'root'
})
export class UIPreparationHelper {
  private allStoredBrews: Array<Brew> = [];
  constructor(private readonly uiBrewStorage: UIBrewStorage,
              private readonly modalController: ModalController) {
    this.uiBrewStorage.attachOnEvent().subscribe((_val) => {
      // If an brew is deleted, we need to reset our array for the next call.
      this.allStoredBrews = [];
    });
  }

  public getAllBrewsForThisPreparation(_uuid: string): Array<Brew> {


    if (this.allStoredBrews.length <= 0) {
      // Load just if needed, performance reasons
      this.allStoredBrews = this.uiBrewStorage.getAllEntries();
    }

    const brewsForPreparation: Array<Brew> = [];
    const brews: Array<Brew> = this.allStoredBrews;
    const preparationUUID: string = _uuid;
    for (const brew of brews) {
      if (brew.method_of_preparation === preparationUUID) {
        brewsForPreparation.push(brew);
      }
    }
    return brewsForPreparation;

  }

  public async addPreparation(_hideToastMessage:boolean = false) {

    const modal = await this.modalController.create({
      component: PreparationAddComponent,
      showBackdrop: true,
      id: PreparationAddComponent.COMPONENT_ID,
      componentProps: {hide_toast_message: _hideToastMessage}
    });
    await modal.present();
    await modal.onWillDismiss();
  }


  public async editPreparation(_preparation: Preparation) {
    const modal = await this.modalController.create({component: PreparationEditComponent,
      componentProps: {preparation: _preparation},
      id: PreparationEditComponent.COMPONENT_ID
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async editPreparationTool(_preparation: Preparation, _preparationTool: PreparationTool) {
    const modal = await this.modalController.create({component: PreparationEditToolComponent,
      componentProps: {preparation: _preparation, preparationTool:_preparationTool },
      id: PreparationEditToolComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      breakpoints: [0, 0.35, 0.5, 0.75, 1],
      initialBreakpoint: 0.35,

    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async detailPreparation(_preparation: Preparation) {
    const modal = await this.modalController.create({component: PreparationDetailComponent, id:PreparationDetailComponent.COMPONENT_ID, componentProps: {preparation: _preparation}});
    await modal.present();
    await modal.onWillDismiss();
  }

}
