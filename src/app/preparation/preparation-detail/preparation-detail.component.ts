import { Component, OnInit } from '@angular/core';

import {ModalController, NavParams} from '@ionic/angular';
import {UIHelper} from '../../../services/uiHelper';
import {Preparation} from '../../../classes/preparation/preparation';
import {IPreparation} from '../../../interfaces/preparation/iPreparation';
import {PREPARATION_STYLE_TYPE} from '../../../enums/preparations/preparationStyleTypes';
import {PreparationTool} from '../../../classes/preparation/preparationTool';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {Brew} from '../../../classes/brew/brew';
import PREPARATION_TRACKING from '../../../data/tracking/preparationTracking';
import {UIAnalytics} from '../../../services/uiAnalytics';

@Component({
  selector: 'app-preparation-detail',
  templateUrl: './preparation-detail.component.html',
  styleUrls: ['./preparation-detail.component.scss'],
})
export class PreparationDetailComponent implements OnInit {
  public static COMPONENT_ID: string = 'preparation-detail';
  public preparation: IPreparation;
  public data: Preparation = new Preparation();

  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  private brews: Array<Brew> = [];
  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               public uiHelper: UIHelper,
               private readonly uiBrewStorage: UIBrewStorage,
               private readonly uiAnalytics: UIAnalytics) {
  }

  public ionViewWillEnter() {
    this.uiAnalytics.trackEvent(PREPARATION_TRACKING.TITLE, PREPARATION_TRACKING.ACTIONS.DETAIL);
    this.preparation = this.navParams.get('preparation');
    if (this.preparation) {
      const copy: IPreparation = this.uiHelper.copyData(this.preparation);
      this.data.initializeByObject(copy);
    }
    this.brews = this.uiBrewStorage.getAllEntries();
  }

  public getUsedTimes(_tool: PreparationTool) {
      return this.brews.filter((e) => e.method_of_preparation === this.data.config.uuid && e.method_of_preparation_tools.includes(_tool.config.uuid)).length;
  }

  public ngOnInit() {}
  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,PreparationDetailComponent.COMPONENT_ID);
  }


}
