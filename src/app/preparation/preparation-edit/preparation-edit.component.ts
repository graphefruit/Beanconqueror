import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Input,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonCard,
  IonCheckbox,
  IonChip,
  IonCol,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { informationOutline, swapVerticalOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { Preparation } from '../../../classes/preparation/preparation';
import { PreparationTool } from '../../../classes/preparation/preparationTool';
import { storedOrReported } from '../../../classes/storedOrReported';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { PhotoAddComponent } from '../../../components/photo-add/photo-add.component';
import PREPARATION_TRACKING from '../../../data/tracking/preparationTracking';
import { ChipButtonDirective } from '../../../directive/chip-button.directive';
import { SelectLabelDirective } from '../../../directive/select-label.directive';
import { TooltipDirective } from '../../../directive/tooltip.directive';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { PREPARATION_TYPES } from '../../../enums/preparations/preparationTypes';
import { environment } from '../../../environments/environment';
import { IPreparation } from '../../../interfaces/preparation/iPreparation';
import { KeysPipe } from '../../../pipes/keys';
import { RequiredFields } from '../../../services/a11y/required-fields.service';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIHelper } from '../../../services/uiHelper';
import { UIImage } from '../../../services/uiImage';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UIToast } from '../../../services/uiToast';

@Component({
  selector: 'preparation-edit',
  templateUrl: './preparation-edit.component.html',
  styleUrls: ['./preparation-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    TooltipDirective,
    PhotoAddComponent,
    TranslatePipe,
    KeysPipe,
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonHeader,
    IonButton,
    IonIcon,
    IonContent,
    IonCard,
    IonItem,
    IonSelect,
    SelectLabelDirective,
    IonSelectOption,
    IonInput,
    IonLabel,
    IonChip,
    ChipButtonDirective,
    IonCheckbox,
    IonTextarea,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class PreparationEditComponent implements OnInit {
  private readonly requiredFields = inject(RequiredFields);
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly modalController = inject(ModalController);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiImage = inject(UIImage);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiToast = inject(UIToast);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiPreparationHelper = inject(UIPreparationHelper);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiAnalytics = inject(UIAnalytics);

  public static COMPONENT_ID: string = 'preparation-edit';
  public data: Preparation = new Preparation();
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  @Input() private preparation: IPreparation;
  public preparationTypeEnum = PREPARATION_TYPES;
  public nextToolName: string = '';
  public ENVIRONMENT = environment;
  constructor() {
    addIcons({ swapVerticalOutline, informationOutline });
  }

  public individualPreparationVisible(_key) {
    if (_key === 'SANREMO_YOU' || _key === 'MOVE2') {
      /** Fixed keys here, else we would check all**/
      if (this.ENVIRONMENT.FEATURES_ACTIVE[_key] === true) {
        return true;
      }
      return false;
    }
    return true;
  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.EDIT,
    );
    if (this.preparation !== undefined) {
      this.data.initializeByObject(this.preparation);
      // A list of the dialog's own: tools added, removed or sorted here stay
      // out of the stored entry until saved.
      this.data.tools = [...this.data.tools];
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
    } else {
      await this.requiredFields.report(this.host);
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

    if (
      !(await storedOrReported(this.uiAlert, () =>
        this.uiPreparationStorage.update(this.data),
      ))
    ) {
      return;
    }
    await this.uiImage.deleteRemovedPhotos(this.data);
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
    if (await this.uiPreparationHelper.editPreparationTool(this.data, _tool)) {
      // Takes over only what the tool dialog stored; the other changes made
      // here stay unsaved.
      const stored: IPreparation = this.uiPreparationStorage.getByUUID(
        this.data.config.uuid,
      );
      const tool = stored?.tools.find(
        (_stored) => _stored.config.uuid === _tool.config.uuid,
      );
      if (tool === undefined) {
        this.data.deleteTool(_tool);
      } else {
        this.data.updateTool(tool);
      }
    }
  }

  public ngOnInit() {}
}
