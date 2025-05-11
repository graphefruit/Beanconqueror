import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { Preparation } from '../../../classes/preparation/preparation';
import { PREPARATION_TYPES } from '../../../enums/preparations/preparationTypes';
import { NgForm } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UIToast } from '../../../services/uiToast';
import { TranslateService } from '@ngx-translate/core';

import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { PreparationTool } from '../../../classes/preparation/preparationTool';
import PREPARATION_TRACKING from '../../../data/tracking/preparationTracking';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import TrackContentImpression from '../../../data/tracking/trackContentImpression/trackContentImpression';

@Component({
  selector: 'preparation-add-type',
  templateUrl: './preparation-add-type.component.html',
  styleUrls: ['./preparation-add-type.component.scss'],
})
export class PreparationAddTypeComponent implements OnInit {
  public static COMPONENT_ID: string = 'preparation-add-type';
  public data: Preparation = new Preparation();
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  public PREPARATION_TYPES = PREPARATION_TYPES;
  @ViewChild('addPreparationForm', { static: false })
  public preparationForm: NgForm;
  @Input() private hide_toast_message: boolean;

  public nextToolName: string = '';

  @Input('type') public type: any;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiToast: UIToast,
    private readonly translate: TranslateService,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiPreparationHelper: UIPreparationHelper,
  ) {}

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      PREPARATION_TRACKING.TITLE,
      PREPARATION_TRACKING.ACTIONS.ADD_TYPE,
    );
  }

  public async addPreparation() {
    if (this.preparationForm.valid) {
      await this.__addPreparation();
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
    const newPreparation = await this.uiPreparationStorage.add(this.data);
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
      this.data.type === PREPARATION_TYPES.GAGGIUINO
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
