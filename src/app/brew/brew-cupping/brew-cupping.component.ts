import {Component, OnInit, ViewChild} from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';
import {Brew} from '../../../classes/brew/brew';
import {Settings} from '../../../classes/settings/settings';
import {IBrew} from '../../../interfaces/brew/iBrew';
import {UIHelper} from '../../../services/uiHelper';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';

import {UIToast} from '../../../services/uiToast';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {CuppingRadarComponent} from '../../../components/cupping-radar/cupping-radar.component';
import {UIAnalytics} from '../../../services/uiAnalytics';

@Component({
  selector: 'brew-cupping',
  templateUrl: './brew-cupping.component.html',
  styleUrls: ['./brew-cupping.component.scss'],
})
export class BrewCuppingComponent implements OnInit {


  public data: Brew = new Brew();
  public settings: Settings;

  @ViewChild('radar', {static: false}) public radar: CuppingRadarComponent;
  private brew: IBrew;

  constructor(private readonly modalController: ModalController,
              private readonly navParams: NavParams,
              public uiHelper: UIHelper,
              private readonly uiSettingsStorage: UISettingsStorage,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiToast: UIToast,
              private uiAnalytics: UIAnalytics) {

    this.settings = this.uiSettingsStorage.getSettings();

    // Moved from ionViewDidEnter, because of Ionic issues with ion-range

  }

  public ionViewWillEnter() {
    this.uiAnalytics.trackEvent('BREW', 'CUPPING');
    this.brew = this.navParams.get('brew');
    if (this.brew) {
      const copy: IBrew = this.uiHelper.copyData(this.brew);
      this.data.initializeByObject(copy);
      this.radar.setCuppingValues(this.data.cupping);
    }
  }

  public ngOnInit(): void {
  }

  public updateBrew(): void {
    this.data.cupping = this.radar.getCuppingValues();

    this.uiBrewStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_BREW_EDITED_SUCCESSFULLY');
    this.dismiss();
  }

  public async dismiss() {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'brew-cup');


  }
}
