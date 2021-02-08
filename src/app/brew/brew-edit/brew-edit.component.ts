import { Component, OnInit, ViewChild} from '@angular/core';
import {UIHelper} from '../../../services/uiHelper';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {IBrew} from '../../../interfaces/brew/iBrew';
import {ModalController, NavParams, Platform} from '@ionic/angular';
import {Brew} from '../../../classes/brew/brew';
import moment from 'moment';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {UIToast} from '../../../services/uiToast';
import {UIBrewHelper} from '../../../services/uiBrewHelper';
import {BrewBrewingComponent} from '../../../components/brews/brew-brewing/brew-brewing.component';


@Component({
  selector: 'brew-edit',
  templateUrl: './brew-edit.component.html',
  styleUrls: ['./brew-edit.component.scss'],
})
export class BrewEditComponent implements OnInit {


  @ViewChild('brewBrewing', {read: BrewBrewingComponent, static: false}) public brewBrewing: BrewBrewingComponent;
  public data: Brew = new Brew();


  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               private readonly uiBrewStorage: UIBrewStorage,
               private readonly uiHelper: UIHelper,
               private readonly uiAnalytics: UIAnalytics,
               private readonly uiToast: UIToast,
               private readonly platform: Platform,
               private readonly uiBrewHelper: UIBrewHelper) {

    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const brew: IBrew = this.uiHelper.copyData(this.navParams.get('brew'));

    if (brew !== undefined) {
      this.data.initializeByObject(brew);
    }

  }

  public ionViewDidEnter(): void {
    this.uiAnalytics.trackEvent('BREW', 'EDIT');
  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'brew-edit');
  }

  public updateBrew(): void {
    const newUnix = moment(this.brewBrewing.customCreationDate).unix();
    if (newUnix !== this.data.config.unix_timestamp) {
      this.data.config.unix_timestamp = newUnix;
    }
    this.uiBrewHelper.cleanInvisibleBrewData(this.data);
    this.uiBrewStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_BREW_EDITED_SUCCESSFULLY');
    this.dismiss();
  }

  public ngOnInit() {}


}
