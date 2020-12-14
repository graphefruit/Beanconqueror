import {Component, Input, OnInit} from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';
import {Preparation} from '../../../classes/preparation/preparation';
import {IPreparation} from '../../../interfaces/preparation/iPreparation';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {UIHelper} from '../../../services/uiHelper';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {PREPARATION_TYPES} from '../../../enums/preparations/preparationTypes';
import {UIToast} from '../../../services/uiToast';
import {PREPARATION_STYLE_TYPE} from '../../../enums/preparations/preparationStyleTypes';
import {PreparationTool} from '../../../classes/preparation/preparationTool';
import {UIAlert} from '../../../services/uiAlert';
import {UIPreparationHelper} from '../../../services/uiPreparationHelper';
import {Brew} from '../../../classes/brew/brew';
import {UIBrewStorage} from '../../../services/uiBrewStorage';

@Component({
  selector: 'preparation-edit',
  templateUrl: './preparation-edit.component.html',
  styleUrls: ['./preparation-edit.component.scss'],
})
export class PreparationEditComponent implements OnInit {

  public data: Preparation = new Preparation();
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  @Input() private preparation: IPreparation;
  public preparationTypeEnum = PREPARATION_TYPES;
  public  nextToolName: string ='';
  constructor (private readonly navParams: NavParams,
               private readonly modalController: ModalController,
               private readonly uiPreparationStorage: UIPreparationStorage,
               private readonly uiHelper: UIHelper,
               private readonly uiAnalytics: UIAnalytics,
               private readonly uiToast: UIToast,
               private readonly uiAlert: UIAlert,
               private readonly uiPreparationHelper: UIPreparationHelper,
               private readonly uiBrewStorage: UIBrewStorage) {

  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent('PREPARATION', 'EDIT');

    if (this.preparation !== undefined) {
      this.data.initializeByObject(this.preparation);
    }

  }
  public typeChanged(): void {
    this.data.style_type = this.data.getPresetStyleType();
  }

  public editBean(form): void {
    if (form.valid) {
      this.__editBean();
    }
  }

  public __editBean(): void {
    if (this.data.style_type === PREPARATION_STYLE_TYPE.ESPRESSO) {
      this.data.manage_parameters.brew_beverage_quantity = true;
      this.data.default_last_coffee_parameters.brew_beverage_quantity = true;

      this.data.manage_parameters.brew_quantity = false;
      this.data.default_last_coffee_parameters.brew_quantity = false;
    } else {
      this.data.manage_parameters.coffee_first_drip_time = false;
      this.data.default_last_coffee_parameters.coffee_first_drip_time = false;
    }
    this.uiPreparationStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_PREPARATION_EDITED_SUCCESSFULLY');
    this.dismiss();
  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    }, undefined, 'preparation-edit');
  }
  public addTool() {
    const added: boolean = this.data.addTool(this.nextToolName);
    if (added) {
      this.nextToolName = '';
    }
  }

  public deleteTool(_tool: PreparationTool) {
   const relatedBrews: Array<Brew> =  this.uiPreparationHelper.getAllBrewsForThisPreparation(this.data.config.uuid).filter((e) => e.method_of_preparation_tools.includes(_tool.config.uuid));
     this.uiAlert.showConfirm('DELETE_PREPARATION_TOOL_QUESTION', 'SURE_QUESTION', true).then(() => {
         if (relatedBrews.length > 0) {
           for (const brew of relatedBrews) {
             this.uiBrewStorage.removeByUUID(brew.config.uuid);
           }
         }
         this.data.deleteTool(_tool);
       },
       () => {
         // No
       });



  }

  public ngOnInit() {}


}
