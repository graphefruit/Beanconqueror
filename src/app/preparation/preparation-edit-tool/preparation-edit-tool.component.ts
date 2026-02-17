import { Component, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonCol,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonRow,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { Brew } from '../../../classes/brew/brew';
import { Preparation } from '../../../classes/preparation/preparation';
import { PreparationTool } from '../../../classes/preparation/preparationTool';
import { Settings } from '../../../classes/settings/settings';
import PREPARATION_TRACKING from '../../../data/tracking/preparationTracking';
import { IPreparation } from '../../../interfaces/preparation/iPreparation';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIHelper } from '../../../services/uiHelper';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIToast } from '../../../services/uiToast';

@Component({
  selector: 'app-preparation-edit-tool',
  templateUrl: './preparation-edit-tool.component.html',
  styleUrls: ['./preparation-edit-tool.component.scss'],
  imports: [
    FormsModule,
    TranslatePipe,
    IonHeader,
    IonContent,
    IonItem,
    IonInput,
    IonRow,
    IonCol,
    IonButton,
  ],
})
export class PreparationEditToolComponent {
  private readonly modalController = inject(ModalController);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiToast = inject(UIToast);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiPreparationHelper = inject(UIPreparationHelper);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiSettingsStorage = inject(UISettingsStorage);

  public static readonly COMPONENT_ID: string = 'preparation-edit-tool';
  public data: PreparationTool = new PreparationTool();

  @Input() private preparationTool: PreparationTool;
  @Input() private preparation: IPreparation;

  private clonedPreparation: Preparation = new Preparation();

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.EDIT_TOOL,
    );
    // This is a bug reported on discord, when editing a preparation tool, it resetted the default params
    // I Don't know why, but making a copy of the object helped.
    if (this.preparation !== undefined) {
      this.clonedPreparation.initializeByObject(this.preparation);
    }
    this.data = this.uiHelper.cloneData(this.preparationTool);
  }

  public async deleteTool() {
    const relatedBrews: Brew[] = this.uiPreparationHelper
      .getAllBrewsForThisPreparation(this.preparation.config.uuid)
      .filter((e) =>
        e.method_of_preparation_tools.includes(this.data.config.uuid),
      );
    const choice = await this.uiAlert.showConfirm(
      'DELETE_PREPARATION_TOOL_QUESTION',
      'SURE_QUESTION',
      true,
    );
    if (choice !== 'YES') {
      return;
    }

    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.TOOL_DELETED,
    );
    if (relatedBrews.length > 0) {
      for (const brew of relatedBrews) {
        for (let i = 0; i < brew.method_of_preparation_tools.length; i++) {
          if (brew.method_of_preparation_tools[i] === this.data.config.uuid) {
            brew.method_of_preparation_tools.splice(i, 1);
            break;
          }
          await this.uiBrewStorage.update(brew);
        }

        // await  this.uiBrewStorage.removeByUUID(brew.config.uuid);
      }
    }

    this.clonedPreparation.deleteTool(this.data);
    await this.uiPreparationStorage.update(this.clonedPreparation);
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.resetFilter();
    await this.uiSettingsStorage.saveSettings(settings);

    this.dismiss();
  }

  public async archiveTool() {
    this.data.archived = !this.data.archived;
    await this._editTool();
  }

  public async editTool() {
    if (this.data.name.trim() !== '') {
      await this._editTool();
    }
  }

  public async _editTool() {
    if (this.clonedPreparation.updateTool(this.data)) {
      await this.uiPreparationStorage.update(this.clonedPreparation);
      this.uiToast.showInfoToast('TOAST_PREPARATION_TOOL_EDITED_SUCCESSFULLY');
      this.uiAnalytics.trackEvent(
        PREPARATION_TRACKING.TITLE,
        PREPARATION_TRACKING.ACTIONS.EDIT_TOOL_FINISH,
      );
      this.dismiss();
    }
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      PreparationEditToolComponent.COMPONENT_ID,
    );
  }
}
