import {Component, OnInit} from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';
import {UIHelper} from '../../../services/uiHelper';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {Mill} from '../../../classes/mill/mill';
import {IMill} from '../../../interfaces/mill/iMill';

@Component({
  selector: 'app-mill-detail',
  templateUrl: './mill-detail.component.html',
  styleUrls: ['./mill-detail.component.scss'],
})
export class MillDetailComponent implements OnInit {

  public mill: IMill;
  public data: Mill = new Mill();


  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               public uiHelper: UIHelper,
               private readonly uiAnalytics: UIAnalytics) {
  }

  public ionViewWillEnter() {
    this.uiAnalytics.trackEvent('MILL', 'DETAIL');
    this.mill = this.navParams.get('mill');
    if (this.mill) {
      const copy: IMill = this.uiHelper.copyData(this.mill);
      this.data.initializeByObject(copy);
    }

  }

  public ngOnInit() {}
  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'mill-detail');
  }


}
