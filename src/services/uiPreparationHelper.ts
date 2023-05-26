/** Core */
import { Injectable } from '@angular/core';

import { Brew } from '../classes/brew/brew';
import { UIBrewStorage } from './uiBrewStorage';

import { PreparationAddComponent } from '../app/preparation/preparation-add/preparation-add.component';
import { ModalController } from '@ionic/angular';
import { PreparationEditComponent } from '../app/preparation/preparation-edit/preparation-edit.component';
import { Preparation } from '../classes/preparation/preparation';
import { PreparationDetailComponent } from '../app/preparation/preparation-detail/preparation-detail.component';
import { PreparationTool } from '../classes/preparation/preparationTool';
import { PreparationEditToolComponent } from '../app/preparation/preparation-edit-tool/preparation-edit-tool.component';
import { UIHelper } from './uiHelper';
import { Config } from '../classes/objectConfig/objectConfig';
import { TranslateService } from '@ngx-translate/core';
import { UIPreparationStorage } from './uiPreparationStorage';
import {
  makePreparationDevice,
  PreparationDeviceType,
} from '../classes/preparationDevice';
import { HttpClient } from '@angular/common/http';
import { XeniaDevice } from '../classes/preparationDevice/xenia/xeniaDevice';
import { PreparationDevice } from '../classes/preparationDevice/preparationDevice';

/**
 * Handles every helping functionalities
 */

@Injectable({
  providedIn: 'root',
})
export class UIPreparationHelper {
  private allStoredBrews: Array<Brew> = [];
  constructor(
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly modalController: ModalController,
    private readonly uiHelper: UIHelper,
    private readonly translate: TranslateService,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly httpClient: HttpClient
  ) {
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

  public async addPreparation(_hideToastMessage: boolean = false) {
    const modal = await this.modalController.create({
      component: PreparationAddComponent,
      showBackdrop: true,
      id: PreparationAddComponent.COMPONENT_ID,
      componentProps: { hide_toast_message: _hideToastMessage },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async editPreparation(_preparation: Preparation) {
    const modal = await this.modalController.create({
      component: PreparationEditComponent,
      componentProps: { preparation: _preparation },
      id: PreparationEditComponent.COMPONENT_ID,
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async editPreparationTool(
    _preparation: Preparation,
    _preparationTool: PreparationTool
  ) {
    const modal = await this.modalController.create({
      component: PreparationEditToolComponent,
      componentProps: {
        preparation: _preparation,
        preparationTool: _preparationTool,
      },
      id: PreparationEditToolComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      breakpoints: [0, 0.5, 0.75, 1],
      initialBreakpoint: 0.75,
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async detailPreparation(_preparation: Preparation) {
    const modal = await this.modalController.create({
      component: PreparationDetailComponent,
      id: PreparationDetailComponent.COMPONENT_ID,
      componentProps: { preparation: _preparation },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async repeatPreparation(_preparation: Preparation) {
    const clonedPreparation: Preparation =
      this.uiHelper.cloneData(_preparation);
    // Reset the id and the timestamp, so we'll create a new one
    clonedPreparation.config = new Config();
    clonedPreparation.name =
      this.translate.instant('COPY') + ' ' + clonedPreparation.name;

    const newTools: Array<PreparationTool> = this.uiHelper.cloneData(
      clonedPreparation.tools
    );
    clonedPreparation.tools = [];
    for (const tool of newTools) {
      const newTool: PreparationTool = this.uiHelper.cloneData(tool);
      clonedPreparation.addToolByObject(newTool);
    }

    // No attachments.
    clonedPreparation.attachments = [];
    await this.uiPreparationStorage.add(clonedPreparation);
  }

  public getConnectedDevice(_preparation: Preparation): PreparationDevice {
    if (
      _preparation.connectedPreparationDevice.type !==
        PreparationDeviceType.NONE &&
      _preparation.connectedPreparationDevice.url
    ) {
      return makePreparationDevice(
        _preparation.connectedPreparationDevice.type,
        this.httpClient,
        _preparation
      );
    }
    return null;
  }
}
