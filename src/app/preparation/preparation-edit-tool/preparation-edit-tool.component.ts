import { Component, Input, inject } from '@angular/core';
import { PreparationTool } from '../../../classes/preparation/preparationTool';
import { ModalController } from '@ionic/angular/standalone';
import { UIHelper } from '../../../services/uiHelper';
import { UIToast } from '../../../services/uiToast';
import { UIAnalytics } from '../../../services/uiAnalytics';
import PREPARATION_TRACKING from '../../../data/tracking/preparationTracking';

import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { Preparation } from '../../../classes/preparation/preparation';
import { Brew } from '../../../classes/brew/brew';
import { UIAlert } from '../../../services/uiAlert';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { IPreparation } from '../../../interfaces/preparation/iPreparation';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonContent,
  IonItem,
  IonInput,
  IonRow,
  IonCol,
  IonButton,
} from '@ionic/angular/standalone';

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
    const relatedBrews: Array<Brew> = this.uiPreparationHelper
      .getAllBrewsForThisPreparation(this.preparation.config.uuid)
      .filter((e) =>
        e.method_of_preparation_tools.includes(this.data.config.uuid),
      );
    await this.uiAlert
      .showConfirm('DELETE_PREPARATION_TOOL_QUESTION', 'SURE_QUESTION', true)
      .then(
        async () => {
          this.uiAnalytics.trackEvent(
            PREPARATION_TRACKING.TITLE,
            PREPARATION_TRACKING.ACTIONS.TOOL_DELETED,
          );
          if (relatedBrews.length > 0) {
            for (const brew of relatedBrews) {
              for (
                let i = 0;
                i < brew.method_of_preparation_tools.length;
                i++
              ) {
                if (
                  brew.method_of_preparation_tools[i] === this.data.config.uuid
                ) {
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
        },
        () => {
          // No
        },
      );
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
