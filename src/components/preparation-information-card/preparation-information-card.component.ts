import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Settings} from '../../classes/settings/settings';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {PopoverController} from '@ionic/angular';
import {Preparation} from '../../classes/preparation/preparation';
import {PREPARATION_ACTION} from '../../enums/preparations/preparationAction';
import {PreparationPopoverActionsComponent} from '../../app/preparation/preparation-popover-actions/preparation-popover-actions.component';
import {Brew} from '../../classes/brew/brew';
import {UIPreparationHelper} from '../../services/uiPreparationHelper';

@Component({
  selector: 'preparation-information-card',
  templateUrl: './preparation-information-card.component.html',
  styleUrls: ['./preparation-information-card.component.scss'],
})
export class PreparationInformationCardComponent implements OnInit {

  @Input() public preparation: Preparation;


  @Output() public preparationAction: EventEmitter<any> = new EventEmitter();

  public settings: Settings;

  constructor(private readonly uiSettingsStorage: UISettingsStorage,
              private readonly popoverCtrl: PopoverController,
              private uiPreparationHelper: UIPreparationHelper) {
    this.settings = this.uiSettingsStorage.getSettings();

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
  public async showPreparationActions(event): Promise<void> {
    const popover = await this.popoverCtrl.create({
      component: PreparationPopoverActionsComponent,
      event,
      translucent: true,
      id: 'preparation-popover-actions',
      componentProps: {preparation: this.preparation}
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    this.preparationAction.emit([data.role as PREPARATION_ACTION, this.preparation]);
  }


}
