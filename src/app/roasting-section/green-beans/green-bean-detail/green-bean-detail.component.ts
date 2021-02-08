import {Component, Input, OnInit} from '@angular/core';
import {GreenBean} from '../../../../classes/green-bean/green-bean';
import {IGreenBean} from '../../../../interfaces/green-bean/iGreenBean';
import {ModalController, NavParams} from '@ionic/angular';
import {UIGreenBeanStorage} from '../../../../services/uiGreenBeanStorage';
import {UIImage} from '../../../../services/uiImage';
import {UIHelper} from '../../../../services/uiHelper';
import {UIAnalytics} from '../../../../services/uiAnalytics';

@Component({
  selector: 'app-green-bean-detail',
  templateUrl: './green-bean-detail.component.html',
  styleUrls: ['./green-bean-detail.component.scss'],
})
export class GreenBeanDetailComponent implements OnInit {

  public data: GreenBean = new GreenBean();
  @Input() public greenBean: IGreenBean;
  public visibleIndex: any = {};

  public bean_segment = 'general';

  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               private readonly uiGreenBeanStorage: UIGreenBeanStorage,
               private readonly uiImage: UIImage,
               public uiHelper: UIHelper,
               private readonly uiAnalytics: UIAnalytics) {

  }


  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent('GREEN_BEAN', 'DETAIL');
    this.data = new GreenBean();
    this.data.initializeByObject(this.greenBean);
    // Add one empty bean information, rest is being updated on start

  }


  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'green-bean-detail');
  }


  public ngOnInit() {}
}
