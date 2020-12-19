import {Component, OnInit} from '@angular/core';
import {NavParams, PopoverController} from '@ionic/angular';
import {UIHelper} from '../../../services/uiHelper';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {Preparation} from '../../../classes/preparation/preparation';
import {IPreparation} from '../../../interfaces/preparation/iPreparation';
import {PREPARATION_ACTION} from '../../../enums/preparations/preparationAction';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';

@Component({
  selector: 'preparation-popover-actions',
  templateUrl: './preparation-popover-actions.component.html',
  styleUrls: ['./preparation-popover-actions.component.scss'],
})
export class PreparationPopoverActionsComponent implements OnInit {


  public data: Preparation = new Preparation();

  constructor(private readonly popoverController: PopoverController,
              private readonly navParams: NavParams,
              private readonly uiHelper: UIHelper,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiSettingsStorage: UISettingsStorage) {
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const preparation: IPreparation = this.uiHelper.copyData(this.navParams.get('preparation'));

    this.data.initializeByObject(preparation);
  }

  public ionViewDidEnter(): void {
    this.uiAnalytics.trackEvent('PREPARATION', 'POPOVER_ACTIONS');
  }

  public ngOnInit() {

  }



  public getStaticActions(): any {
    return PREPARATION_ACTION;
  }

  public async choose(_type: string): Promise<void> {
    this.popoverController.dismiss(undefined, _type, 'preparation-popover-actions')
  }

}
