import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { ModalController } from '@ionic/angular/standalone';

import { TranslateService } from '@ngx-translate/core';

import { PreparationAddComponent } from '../app/preparation/preparation-add/preparation-add.component';
import { PreparationConnectedDeviceComponent } from '../app/preparation/preparation-connected-device/preparation-connected-device.component';
import { PreparationDetailComponent } from '../app/preparation/preparation-detail/preparation-detail.component';
import { PreparationEditToolComponent } from '../app/preparation/preparation-edit-tool/preparation-edit-tool.component';
import { PreparationEditComponent } from '../app/preparation/preparation-edit/preparation-edit.component';
import { PreparationSortToolsComponent } from '../app/preparation/preparation-sort-tools/preparation-sort-tools.component';
import { Brew } from '../classes/brew/brew';
import { Config } from '../classes/objectConfig/objectConfig';
import { Preparation } from '../classes/preparation/preparation';
import { PreparationTool } from '../classes/preparation/preparationTool';
import {
  makePreparationDevice,
  PreparationDeviceType,
} from '../classes/preparationDevice';
import { BluetoothPreparationDevice } from '../classes/preparationDevice/bluetoothPreparationDevice';
import {
  GaggimateDevice,
  GaggimateShotNotes,
} from '../classes/preparationDevice/gaggimate/gaggimateDevice';
import { PreparationDevice } from '../classes/preparationDevice/preparationDevice';
import PREPARATION_TRACKING from '../data/tracking/preparationTracking';
import { UIAnalytics } from './uiAnalytics';
import { UIBrewStorage } from './uiBrewStorage';
import { UIHelper } from './uiHelper';
import { UIPreparationStorage } from './uiPreparationStorage';
import { UIToast } from './uiToast';

/**
 * Handles every helping functionalities
 */

@Injectable({
  providedIn: 'root',
})
export class UIPreparationHelper {
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly modalController = inject(ModalController);
  private readonly uiHelper = inject(UIHelper);
  private readonly translate = inject(TranslateService);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly httpClient = inject(HttpClient);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiToast = inject(UIToast);

  private allStoredBrews: Array<Brew> = [];

  public static instance: UIPreparationHelper;

  public static getInstance(): UIPreparationHelper {
    if (UIPreparationHelper.instance) {
      return UIPreparationHelper.instance;
    }

    return undefined;
  }

  constructor() {
    if (UIPreparationHelper.instance === undefined) {
      UIPreparationHelper.instance = this;
    }

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
  public async connectDevice(_preparation: Preparation) {
    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.CONNECT_DEVICE,
    );
    const modal = await this.modalController.create({
      component: PreparationConnectedDeviceComponent,
      componentProps: { preparation: _preparation },
      id: PreparationConnectedDeviceComponent.COMPONENT_ID,
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async editPreparationTool(
    _preparation: Preparation,
    _preparationTool: PreparationTool,
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

  public async sortPreparationTools(_preparation: Preparation) {
    const modal = await this.modalController.create({
      component: PreparationSortToolsComponent,
      id: PreparationSortToolsComponent.COMPONENT_ID,
      componentProps: { preparation: _preparation },
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
      clonedPreparation.tools,
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
      PreparationDeviceType.NONE
    ) {
      // For HTTP-based devices: require a URL
      // For Bluetooth-based devices: require a bluetoothId (first-class field
      //   or backwards-compatible location in customParams)
      const candidate = makePreparationDevice(
        _preparation.connectedPreparationDevice.type,
        this.httpClient,
        _preparation,
      );
      if (!candidate) {
        return null;
      }
      if (candidate instanceof BluetoothPreparationDevice) {
        // Bluetooth device is ready when it has an ID
        return candidate.getBluetoothId() ? candidate : null;
      }
      // HTTP device is ready when it has a URL
      return _preparation.connectedPreparationDevice.url ? candidate : null;
    }
    return null;
  }

  /**
   * If the brew was imported from a GaggiMate and the user activated it, the
   * brew data is added to the shot notes on the GaggiMate. Only fields which
   * are empty there are filled.
   *
   * This is meant to be called without awaiting it after a brew was saved: It
   * never throws and just informs the user with a toast, so the app stays
   * usable and the brew is saved even if the machine is switched off.
   */
  public async writeBrewBackToGaggimate(
    _brew: Brew,
    _maxRating: number,
  ): Promise<void> {
    try {
      const shotId = _brew?.preparationDeviceBrew?.params?.shotId;
      if (
        _brew?.preparationDeviceBrew?.type !==
          PreparationDeviceType.GAGGIMATE ||
        !shotId
      ) {
        return;
      }
      const device = this.getConnectedDevice(_brew.getPreparation());
      if (
        !(device instanceof GaggimateDevice) ||
        !device.shallWriteBackNotes()
      ) {
        return;
      }

      // Brews which were imported before the timestamp was stored can't be
      // verified, so we don't write to the GaggiMate for them
      const shotTimestamp = _brew.preparationDeviceBrew.params.shotTimestamp;
      if (!shotTimestamp) {
        return;
      }
      // Make sure the shot id still belongs to the imported shot, else we
      // would write the data of this brew into the notes of a different shot
      if (!(await device.isSameShot(shotId, shotTimestamp))) {
        await this.uiToast.showInfoToast(
          'PREPARATION_DEVICE.TYPE_GAGGIMATE.WRITE_BACK_NOTES_SHOT_MISMATCH',
        );
        return;
      }

      // Collect the values of the brew. Empty values are skipped later.
      const values = new GaggimateShotNotes();
      if (_brew.rating > 0 && _maxRating > 0) {
        // GaggiMate rates with 1-5 stars, 0 means not rated
        values.rating = Math.min(
          Math.max(Math.round((_brew.rating / _maxRating) * 5), 1),
          5,
        );
      }
      if (_brew.grind_weight > 0) {
        values.doseIn = String(_brew.grind_weight);
      }
      values.grindSetting = String(_brew.grind_size ?? '').trim();
      values.beanType = String(_brew.getBean()?.name ?? '').trim();
      values.notes = String(_brew.note ?? '').trim();

      const changed = await device.addMissingShotNotes(shotId, values);
      if (changed) {
        await this.uiToast.showInfoToast(
          'PREPARATION_DEVICE.TYPE_GAGGIMATE.WRITE_BACK_NOTES_SUCCESS',
        );
      }
    } catch {
      // Most likely the machine is switched off or not reachable in this network
      await this.uiToast.showInfoToast(
        'PREPARATION_DEVICE.TYPE_GAGGIMATE.WRITE_BACK_NOTES_ERROR',
      );
    }
  }
}
