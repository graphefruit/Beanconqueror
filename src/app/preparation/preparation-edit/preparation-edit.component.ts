import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { Preparation } from '../../../classes/preparation/preparation';
import { IPreparation } from '../../../interfaces/preparation/iPreparation';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UIHelper } from '../../../services/uiHelper';
import { PREPARATION_TYPES } from '../../../enums/preparations/preparationTypes';
import { UIToast } from '../../../services/uiToast';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { PreparationTool } from '../../../classes/preparation/preparationTool';
import { UIAlert } from '../../../services/uiAlert';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIAnalytics } from '../../../services/uiAnalytics';
import PREPARATION_TRACKING from '../../../data/tracking/preparationTracking';
import { FormsModule } from '@angular/forms';
import { TooltipDirective } from '../../../directive/tooltip.directive';
import { PhotoAddComponent } from '../../../components/photo-add/photo-add.component';
import { TranslatePipe } from '@ngx-translate/core';
import { KeysPipe } from '../../../pipes/keys';
import { addIcons } from 'ionicons';
import { swapVerticalOutline, informationOutline } from 'ionicons/icons';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonCard,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonLabel,
  IonChip,
  IonCheckbox,
  IonTextarea,
  IonFooter,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';

@Component({
  selector: 'preparation-edit',
  templateUrl: './preparation-edit.component.html',
  styleUrls: ['./preparation-edit.component.scss'],
  imports: [
    FormsModule,
    TooltipDirective,
    PhotoAddComponent,
    TranslatePipe,
    KeysPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonCard,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonLabel,
    IonChip,
    IonCheckbox,
    IonTextarea,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class PreparationEditComponent implements OnInit {
  public static COMPONENT_ID: string = 'preparation-edit';
  public data: Preparation = new Preparation();
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  @Input() private preparation: IPreparation;
  public preparationTypeEnum = PREPARATION_TYPES;
  public nextToolName: string = '';
  constructor(
    private readonly modalController: ModalController,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiHelper: UIHelper,
    private readonly uiToast: UIToast,
    private readonly uiAlert: UIAlert,
    private readonly uiPreparationHelper: UIPreparationHelper,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiAnalytics: UIAnalytics,
  ) {
    addIcons({ swapVerticalOutline, informationOutline });
  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.EDIT,
    );
    if (this.preparation !== undefined) {
      this.data.initializeByObject(this.preparation);
    }
  }

  public getActiveTools() {
    return this.data.tools.filter((e) => e.archived === false);
  }
  public getArchivedTools() {
    return this.data.tools.filter((e) => e.archived === true);
  }
  public typeChanged(): void {
    this.data.style_type = this.data.getPresetStyleType();
  }

  public async edit(form) {
    if (form.valid) {
      // #196
      this.addTool();
      await this.__edit();
    }
  }

  public async __edit() {
    if (this.data.style_type === PREPARATION_STYLE_TYPE.ESPRESSO) {
      this.data.manage_parameters.brew_beverage_quantity = true;
      this.data.default_last_coffee_parameters.brew_beverage_quantity = true;

      this.data.manage_parameters.brew_quantity = false;
      this.data.default_last_coffee_parameters.brew_quantity = false;
    } else {
      // #598 - We don't need to reset here
      //  this.data.manage_parameters.coffee_first_drip_time = false;
      //this.data.default_last_coffee_parameters.coffee_first_drip_time = false;
    }

    await this.uiPreparationStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_PREPARATION_EDITED_SUCCESSFULLY');
    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.EDIT_FINISH,
    );
    this.dismiss();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      PreparationEditComponent.COMPONENT_ID,
    );
  }
  public addTool() {
    const added: boolean = this.data.addTool(this.nextToolName);
    if (added) {
      this.nextToolName = '';
    }
  }

  public async sortPreparationTools() {
    await this.uiPreparationHelper.sortPreparationTools(this.data);
  }

  public async editTool(_tool: PreparationTool) {
    await this.uiPreparationHelper.editPreparationTool(this.data, _tool);
    //Reinitialize
    const prep = this.uiPreparationStorage.getByUUID(this.data.config.uuid);
    this.data.initializeByObject(prep);
  }

  public ngOnInit() {}
}
