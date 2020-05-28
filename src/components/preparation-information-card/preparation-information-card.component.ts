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


  public brewCounts(): number {

    const relatedBrews: Array<Brew> = this.uiPreparationHelper.getAllBrewsForThisPreparation(this.preparation.config.uuid);
    return relatedBrews.length;
  }

  public async showPreparationActions(event): Promise<void> {
    const popover = await this.popoverCtrl.create({
      component: PreparationPopoverActionsComponent,
      event,
      translucent: true,
      componentProps: {preparation: this.preparation}
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    this.preparationAction.emit([data.role as PREPARATION_ACTION, this.preparation]);
  }

}
