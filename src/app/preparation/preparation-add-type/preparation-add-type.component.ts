import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import {
  IonButton,
  IonChip,
  IonCol,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close, informationOutline } from 'ionicons/icons';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Preparation } from '../../../classes/preparation/preparation';
import { PreparationTool } from '../../../classes/preparation/preparationTool';
import { storedOrReported } from '../../../classes/storedOrReported';
import PREPARATION_TRACKING from '../../../data/tracking/preparationTracking';
import TrackContentImpression from '../../../data/tracking/trackContentImpression/trackContentImpression';
import { ChipButtonDirective } from '../../../directive/chip-button.directive';
import { DisableDoubleClickDirective } from '../../../directive/disable-double-click.directive';
import { TooltipDirective } from '../../../directive/tooltip.directive';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { PREPARATION_TYPES } from '../../../enums/preparations/preparationTypes';
import { RequiredFields } from '../../../services/a11y/required-fields.service';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UIToast } from '../../../services/uiToast';

@Component({
  selector: 'preparation-add-type',
  templateUrl: './preparation-add-type.component.html',
  styleUrls: ['./preparation-add-type.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    TooltipDirective,
    DisableDoubleClickDirective,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonContent,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonLabel,
    IonIcon,
    IonButton,
    IonChip,
    ChipButtonDirective,
    IonRow,
    IonCol,
  ],
})
export class PreparationAddTypeComponent implements OnInit {
  private readonly requiredFields = inject(RequiredFields);
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly modalController = inject(ModalController);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiToast = inject(UIToast);
  private readonly uiAlert = inject(UIAlert);
  private readonly translate = inject(TranslateService);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiPreparationHelper = inject(UIPreparationHelper);

  public static COMPONENT_ID: string = 'preparation-add-type';
  public data: Preparation = new Preparation();
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  public PREPARATION_TYPES = PREPARATION_TYPES;
  @ViewChild('addPreparationForm', { static: false })
  public preparationForm: NgForm;
  @Input() private hide_toast_message: boolean;

  public nextToolName: string = '';

  @Input('type') public type: any;

  constructor() {
    addIcons({ informationOutline, close });
  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.ADD_TYPE,
    );
  }

  public async addPreparation() {
    if (this.preparationForm.valid) {
      await this.__addPreparation();
    } else {
      this.requiredFields.report(this.host);
    }
  }

  public async __addPreparation() {
    if (this.data.style_type === PREPARATION_STYLE_TYPE.ESPRESSO) {
      this.data.manage_parameters.brew_beverage_quantity = true;
      this.data.default_last_coffee_parameters.brew_beverage_quantity = true;
      this.data.manage_parameters.brew_quantity = false;
      this.data.default_last_coffee_parameters.brew_quantity = false;
    } else {
      // #598 - We deactivate the first drip time first, but user can add it afterwards
      this.data.manage_parameters.coffee_first_drip_time = false;
      this.data.default_last_coffee_parameters.coffee_first_drip_time = false;
    }
    let newPreparation: Preparation;
    if (
      !(await storedOrReported(this.uiAlert, async () => {
        const added = await this.uiPreparationStorage.addAndConfirm(this.data);
        newPreparation = added.entry;
        return added.saved;
      }))
    ) {
      return;
    }
    this.dismiss(true);

    this.uiAnalytics.trackContentImpression(
      TrackContentImpression.STATISTICS_PREPARATION_NAME,
      this.data.name,
    );
    if (!this.hide_toast_message) {
      this.uiToast.showInfoToast('TOAST_PREPARATION_ADDED_SUCCESSFULLY');
    }

    if (
      this.data.type === PREPARATION_TYPES.METICULOUS ||
      this.data.type === PREPARATION_TYPES.XENIA ||
      this.data.type === PREPARATION_TYPES.SANREMO_YOU ||
      this.data.type === PREPARATION_TYPES.GAGGIUINO ||
      this.data.type === PREPARATION_TYPES.MOVE2 ||
      this.data.type === PREPARATION_TYPES.GAGGIMATE
    ) {
      await this.uiPreparationHelper.connectDevice(newPreparation);
    }

    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.ADD_TYPE_FINISH,
      this.data.type,
    );
    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.ADD_STYLE_FINISH,
      this.data.style_type,
    );
  }

  public async dismiss(_added: boolean) {
    this.modalController.dismiss(
      {
        dismissed: true,
        added: _added,
      },
      undefined,
      PreparationAddTypeComponent.COMPONENT_ID,
    );
  }

  public ngOnInit() {
    this.data.type = this.type;

    if (this.data.type !== PREPARATION_TYPES.CUSTOM_PREPARATION) {
      this.data.name = this.translate.instant(
        'PREPARATION_TYPE_' + this.data.type,
      );
    }
    this.data.style_type = this.data.getPresetStyleType();
  }

  public addTool() {
    const added: boolean = this.data.addTool(this.nextToolName);
    if (added) {
      this.nextToolName = '';
    }
  }

  public deleteTool(_tool: PreparationTool) {
    this.data.deleteTool(_tool);
  }
}
