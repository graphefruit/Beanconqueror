import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Settings} from '../../classes/settings/settings';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {ModalController} from '@ionic/angular';
import {Preparation} from '../../classes/preparation/preparation';
import {PREPARATION_ACTION} from '../../enums/preparations/preparationAction';
import {PreparationPopoverActionsComponent} from '../../app/preparation/preparation-popover-actions/preparation-popover-actions.component';
import {Brew} from '../../classes/brew/brew';
import {UIPreparationHelper} from '../../services/uiPreparationHelper';
import {PreparationCustomParametersComponent} from '../../app/preparation/preparation-custom-parameters/preparation-custom-parameters.component';
import {PreparationEditComponent} from '../../app/preparation/preparation-edit/preparation-edit.component';
import {PreparationDetailComponent} from '../../app/preparation/preparation-detail/preparation-detail.component';
import {UIAlert} from '../../services/uiAlert';
import {UIAnalytics} from '../../services/uiAnalytics';
import {UIToast} from '../../services/uiToast';
import {UIPreparationStorage} from '../../services/uiPreparationStorage';
import {UIBrewStorage} from '../../services/uiBrewStorage';

@Component({
  selector: 'preparation-information-card',
  templateUrl: './preparation-information-card.component.html',
  styleUrls: ['./preparation-information-card.component.scss'],
})
export class PreparationInformationCardComponent implements OnInit {

  @Input() public preparation: Preparation;


  @Output() public preparationAction: EventEmitter<any> = new EventEmitter();


  constructor(private readonly uiSettingsStorage: UISettingsStorage,
              private readonly modalController: ModalController,
              private readonly uiPreparationHelper: UIPreparationHelper,
              private readonly uiAlert: UIAlert,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiToast: UIToast,
              private readonly uiPreparationStorage: UIPreparationStorage,
              private readonly uiBrewStorage: UIBrewStorage) {

  }

  public ngOnInit() {


  }


  public getBrewsCount(): number {

    const relatedBrews: Array<Brew> = this.uiPreparationHelper.getAllBrewsForThisPreparation(this.preparation.config.uuid);
    return relatedBrews.length;
  }

  public getWeightCount(): number {

    const relatedBrews: Array<Brew> = this.uiPreparationHelper.getAllBrewsForThisPreparation(this.preparation.config.uuid);
    let grindWeight: number = 0;
    for (const brew of relatedBrews) {
      grindWeight += brew.grind_weight;
    }
    return grindWeight;
  }

  public getDrunkenQuantity(): number {

    const relatedBrews: Array<Brew> = this.uiPreparationHelper.getAllBrewsForThisPreparation(this.preparation.config.uuid);
    let drunkenQuantity: number = 0;
    for (const brew of relatedBrews) {
      drunkenQuantity += brew.brew_quantity;
    }
    return drunkenQuantity / 1000;
  }

  public getBeansCount(): number {

    const relatedBrews: Array<Brew> = this.uiPreparationHelper.getAllBrewsForThisPreparation(this.preparation.config.uuid);
    const distinctBeans = relatedBrews.filter((bean, i, arr) => {
      return arr.indexOf(arr.find((t) => t.bean === bean.bean)) === i;
    });

    return distinctBeans.length;

  }

  private resetSettings() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.resetFilter();
    this.uiSettingsStorage.saveSettings(settings);
  }

  public async show() {
   await this.detail();
  }

  public async showPreparationActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    const popover = await this.modalController.create({
      component: PreparationPopoverActionsComponent,
      id: 'preparation-popover-actions',
      componentProps: {preparation: this.preparation},
      cssClass: 'popover-actions',
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    if (data.role !== undefined) {
      await this.internalPreparationAction(data.role as PREPARATION_ACTION);
      this.preparationAction.emit([data.role as PREPARATION_ACTION, this.preparation]);
    }
  }



  public async internalPreparationAction(action: PREPARATION_ACTION): Promise<void> {
    switch (action) {
      case PREPARATION_ACTION.CUSTOM_PARAMETERS:
        await this.customParameters();
        break;
      case PREPARATION_ACTION.EDIT:
        await this.editPreparation();
        break;
      case PREPARATION_ACTION.DELETE:
        try {
          await this.deletePreparation();
        }catch(ex) {

        }
        break;
      case PREPARATION_ACTION.ARCHIVE:
        await this.archive();
        break;
      case PREPARATION_ACTION.DETAIL:
        await this.detail();
        break;
      default:
        break;
    }
  }




  public async customParameters() {
    const modal = await this.modalController.create({component: PreparationCustomParametersComponent,
      componentProps: {preparation: this.preparation},
      id: 'preparation-custom-parameters'
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async editPreparation() {
    const modal = await this.modalController.create({component: PreparationEditComponent,
      componentProps: {preparation: this.preparation},
      id: 'preparation-edit'
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async detail() {
    const modal = await this.modalController.create({component: PreparationDetailComponent, id:'preparation-detail', componentProps: {preparation: this.preparation}});
    await modal.present();
    await modal.onWillDismiss();
  }

  public deletePreparation(): void {
    this.uiAlert.showConfirm('DELETE_PREPARATION_METHOD_QUESTION', 'SURE_QUESTION', true).then(() => {
        // Yes
        this.uiAnalytics.trackEvent('PREPARATION', 'DELETE');
        this.__deletePreparation();
        this.uiToast.showInfoToast('TOAST_PREPARATION_DELETED_SUCCESSFULLY');
        this.resetSettings();
      },
      () => {
        // No
      });

  }

  public archive() {
    this.preparation.finished = true;
    this.uiPreparationStorage.update(this.preparation);
    this.uiToast.showInfoToast('TOAST_PREPARATION_ARCHIVED_SUCCESSFULLY');
    this.resetSettings();
  }

  private __deletePreparation(): void {
    const brews: Array<Brew> =  this.uiBrewStorage.getAllEntries();
    const deletingBrewIndex: Array<number> = [];
    for (let i = 0; i < brews.length; i++) {
      if (brews[i].method_of_preparation === this.preparation.config.uuid) {
        deletingBrewIndex.push(i);
      }
    }
    for (let i = deletingBrewIndex.length; i--;) {
      this.uiBrewStorage.removeByUUID(brews[deletingBrewIndex[i]].config.uuid);
    }

    this.uiPreparationStorage.removeByObject(this.preparation);
  }



}
