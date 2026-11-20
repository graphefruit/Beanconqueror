import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Input,
} from '@angular/core';
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
} from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { Brew } from '../../../classes/brew/brew';
import { Preparation } from '../../../classes/preparation/preparation';
import { PreparationTool } from '../../../classes/preparation/preparationTool';
import { Settings } from '../../../classes/settings/settings';
import { StorageClass } from '../../../classes/storageClass';
import { storedOrReported } from '../../../classes/storedOrReported';
import PREPARATION_TRACKING from '../../../data/tracking/preparationTracking';
import { IPreparation } from '../../../interfaces/preparation/iPreparation';
import { RequiredFields } from '../../../services/a11y/required-fields.service';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIHelper } from '../../../services/uiHelper';
import { UILog } from '../../../services/uiLog';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIToast } from '../../../services/uiToast';

@Component({
  selector: 'app-preparation-edit-tool',
  templateUrl: './preparation-edit-tool.component.html',
  styleUrls: ['./preparation-edit-tool.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
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
  private readonly requiredFields = inject(RequiredFields);
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly modalController = inject(ModalController);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiToast = inject(UIToast);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiPreparationHelper = inject(UIPreparationHelper);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiLog = inject(UILog);

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
    const shown = StorageClass.getMessagesShown();
    if (!(await this.__deleteToolFrom(relatedBrews))) {
      // The dialog stays open; a collection that reported the failure has
      // told the user already.
      if (StorageClass.getMessagesShown() === shown) {
        await this.uiAlert.showMessage(
          'ERROR_OCCURED',
          'CARE',
          undefined,
          true,
        );
      }
      return;
    }
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.resetFilter();
    await this.uiSettingsStorage.saveSettings(settings);

    this.dismiss(true);
  }

  /**
   * Takes the tool out of the brews with one save, then out of the
   * preparation. Resolves whether both are saved. The brews keep the tool
   * when they could not be saved; only when the preparation could not be
   * saved after them, it keeps the tool without brews.
   */
  private async __deleteToolFrom(_brews: Brew[]): Promise<boolean> {
    try {
      // An empty list removes nothing but tells whether the preparations
      // take writes, before the brews are changed.
      if (!(await this.uiPreparationStorage.removeManyByUUID([]))) {
        return false;
      }
      // Copies: the brews of the storage stay as they are when the save
      // fails.
      const brews = _brews.map((brew) => {
        const changed = new Brew();
        changed.initializeByObject(brew);
        changed.method_of_preparation_tools = [
          ...brew.method_of_preparation_tools,
        ];
        changed.method_of_preparation_tools.splice(
          changed.method_of_preparation_tools.indexOf(this.data.config.uuid),
          1,
        );
        return changed;
      });
      if (!(await this.uiBrewStorage.updateMany(brews))) {
        return false;
      }
      // A copy with a list of its own: the list of the dialog can be the
      // stored one, which has to stay as it is when the save fails.
      const preparation = new Preparation();
      preparation.initializeByObject(this.clonedPreparation);
      preparation.tools = [...preparation.tools];
      preparation.deleteTool(this.data);
      // Puts the stored preparation back when it could not be saved.
      return await this.uiPreparationStorage.updateMany([preparation]);
    } catch (ex) {
      this.uiLog.error('Preparation tool - Delete - Unsuccessfully', ex);
      return false;
    }
  }

  public async archiveTool() {
    this.data.archived = !this.data.archived;
    if (!(await this._editTool())) {
      this.data.archived = !this.data.archived;
    }
  }

  public async editTool() {
    if (this.data.name.trim() !== '') {
      await this._editTool();
    } else {
      await this.requiredFields.report(this.host);
    }
  }

  /** Resolves whether the tool was stored; the dialog stays open otherwise. */
  public async _editTool(): Promise<boolean> {
    // A copy with a list of its own, as for deleting a tool.
    const preparation = new Preparation();
    preparation.initializeByObject(this.clonedPreparation);
    preparation.tools = [...preparation.tools];
    if (
      !preparation.updateTool(this.data) ||
      !(await storedOrReported(this.uiAlert, () =>
        this.uiPreparationStorage.update(preparation),
      ))
    ) {
      return false;
    }
    this.uiToast.showInfoToast('TOAST_PREPARATION_TOOL_EDITED_SUCCESSFULLY');
    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.EDIT_TOOL_FINISH,
    );
    this.dismiss(true);
    return true;
  }

  /** `_stored` tells the form that the stored preparation has changed. */
  public dismiss(_stored = false): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      _stored ? 'saved' : undefined,
      PreparationEditToolComponent.COMPONENT_ID,
    );
  }
}
