import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Settings} from '../../classes/settings/settings';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {PopoverController} from '@ionic/angular';
import {Mill} from '../../classes/mill/mill';
import {MILL_ACTION} from '../../enums/mills/millActions';
import {MillPopoverActionsComponent} from '../../app/mill/mill-popover-actions/mill-popover-actions.component';
import {Brew} from '../../classes/brew/brew';
import {UIMillHelper} from '../../services/uiMillHelper';
import {UIBrewHelper} from '../../services/uiBrewHelper';

@Component({
  selector: 'mill-information-card',
  templateUrl: './mill-information-card.component.html',
  styleUrls: ['./mill-information-card.component.scss'],
})
export class MillInformationCardComponent implements OnInit {

  @Input() public mill: Mill;


  @Output() public millAction: EventEmitter<any> = new EventEmitter();

  public settings: Settings;

  constructor(private readonly uiSettingsStorage: UISettingsStorage,
              private readonly popoverCtrl: PopoverController,
              private readonly uiMillHelper: UIMillHelper) {
    this.settings = this.uiSettingsStorage.getSettings();

  }

  public ngOnInit() {


  }

  public getBrewsCount(): number {

    const relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(this.mill.config.uuid);
    return relatedBrews.length;
  }

  public getWeightCount(): number {

    const relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(this.mill.config.uuid);
    let grindWeight: number = 0;
    for (const brew of relatedBrews) {
      grindWeight += brew.grind_weight;
    }
    return grindWeight;
  }

  public getBeansCount(): number {

    const relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(this.mill.config.uuid);
    const distinctBeans = relatedBrews.filter((bean, i, arr) => {
      return arr.indexOf(arr.find((t) => t.bean === bean.bean)) === i;
    });

    return distinctBeans.length;

  }
  public lastUsed(): number {

    let relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(this.mill.config.uuid);
    if (relatedBrews.length > 0) {
      relatedBrews = UIBrewHelper.sortBrews(relatedBrews);
      return relatedBrews[0].config.unix_timestamp;
    }
    return -1;



  }



  public async showMillActions(event): Promise<void> {
    const popover = await this.popoverCtrl.create({
      component: MillPopoverActionsComponent,
      event,
      translucent: true,
      componentProps: {mill: this.mill},
      id:'mill-popover-actions'
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    this.millAction.emit([data.role as MILL_ACTION, this.mill]);
  }
}
