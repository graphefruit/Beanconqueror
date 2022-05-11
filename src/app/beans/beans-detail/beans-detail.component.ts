import {Component, OnInit, ViewChild} from '@angular/core';

import {ModalController, NavParams} from '@ionic/angular';
import {UIHelper} from '../../../services/uiHelper';
import {IBean} from '../../../interfaces/bean/iBean';
import {Bean} from '../../../classes/bean/bean';
import {NgxStarsComponent} from 'ngx-stars';
import {ROASTS_ENUM} from '../../../enums/beans/roasts';
import {BEAN_MIX_ENUM} from '../../../enums/beans/mix';
import {BEAN_ROASTING_TYPE_ENUM} from '../../../enums/beans/beanRoastingType';
import {UIAnalytics} from '../../../services/uiAnalytics';
import BEAN_TRACKING from '../../../data/tracking/beanTracking';
import moment from 'moment';

@Component({
  selector: 'app-beans-detail',
  templateUrl: './beans-detail.component.html',
  styleUrls: ['./beans-detail.component.scss'],
})
export class BeansDetailComponent implements OnInit {

  public static COMPONENT_ID:string = 'bean-detail';
  public roast_enum = ROASTS_ENUM;
  public mixEnum = BEAN_MIX_ENUM;
  public beanRoastingTypeEnum = BEAN_ROASTING_TYPE_ENUM;
  public bean: IBean;
  public data: Bean = new Bean();
  public visibleIndex: any = {};
  @ViewChild('beanStars', {read: NgxStarsComponent, static: false}) public beanStars: NgxStarsComponent;
  @ViewChild('beanRating', {read: NgxStarsComponent, static: false}) public beanRating: NgxStarsComponent;


  public bean_segment = 'general';
  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               public uiHelper: UIHelper,
               private readonly uiAnalytics: UIAnalytics) {
  }

  public ionViewWillEnter() {
    this.uiAnalytics.trackEvent(BEAN_TRACKING.TITLE, BEAN_TRACKING.ACTIONS.DETAIL);
    this.bean = this.navParams.get('bean');
    if (this.bean) {
      const copy: IBean = this.uiHelper.copyData(this.bean);
      this.data.initializeByObject(copy);
    }
    this.beanStars.setRating(this.data.roast_range);
    this.beanRating.setRating(this.data.rating);


  }
  public ngOnInit() {}
  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,BeansDetailComponent.COMPONENT_ID);
  }
  public getRoastEnum(_key: ROASTS_ENUM) {
    for (const key in ROASTS_ENUM) {
      if (ROASTS_ENUM[key] === _key) {
        return (key as ROASTS_ENUM);
      }
    }
    return '';
  }

  public openURL() {
    if (this.data.url) {
      this.uiHelper.openExternalWebpage(this.data.url);
    }
  }

  public getRoastLengthFormat() {

      return moment(new Date()).startOf('day')
        .seconds(this.data.bean_roast_information.roast_length)
        .format('HH:mm:ss');


  }

}
