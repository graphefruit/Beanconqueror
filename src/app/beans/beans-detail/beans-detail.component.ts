import { Component, OnInit, ViewChild } from '@angular/core';

import { ModalController, NavParams } from '@ionic/angular';
import { UIHelper } from '../../../services/uiHelper';
import { IBean } from '../../../interfaces/bean/iBean';
import { Bean } from '../../../classes/bean/bean';
import { NgxStarsComponent } from 'ngx-stars';
import { ROASTS_ENUM } from '../../../enums/beans/roasts';
import { BEAN_MIX_ENUM } from '../../../enums/beans/mix';
import { BEAN_ROASTING_TYPE_ENUM } from '../../../enums/beans/beanRoastingType';
import { UIAnalytics } from '../../../services/uiAnalytics';
import BEAN_TRACKING from '../../../data/tracking/beanTracking';
import moment from 'moment';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';
import { UIBeanHelper } from '../../../services/uiBeanHelper';

@Component({
  selector: 'app-beans-detail',
  templateUrl: './beans-detail.component.html',
  styleUrls: ['./beans-detail.component.scss'],
})
export class BeansDetailComponent implements OnInit {
  public static COMPONENT_ID: string = 'bean-detail';
  public roast_enum = ROASTS_ENUM;
  public mixEnum = BEAN_MIX_ENUM;
  public beanRoastingTypeEnum = BEAN_ROASTING_TYPE_ENUM;
  public bean: IBean;
  public data: Bean = new Bean();
  public visibleIndex: any = {};
  @ViewChild('beanStars', { read: NgxStarsComponent, static: false })
  public beanStars: NgxStarsComponent;
  @ViewChild('beanRating', { read: NgxStarsComponent, static: false })
  public beanRating: NgxStarsComponent;

  public settings: Settings = undefined;
  public bean_segment = 'general';
  public maxBeanRating: number = 5;
  constructor(
    private readonly modalController: ModalController,
    private readonly navParams: NavParams,
    public uiHelper: UIHelper,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiSettings: UISettingsStorage,
    public readonly uiBeanHelper: UIBeanHelper,
    private readonly uiSettingsStorage: UISettingsStorage
  ) {}

  public ionViewDidEnter() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.DETAIL
    );
    this.bean = this.navParams.get('bean');

    if (this.bean) {
      const copy: IBean = this.uiHelper.copyData(this.bean);
      this.data.initializeByObject(copy);
    }
    setTimeout(() => {
      if (this.beanStars && this.beanStars?.setRating) {
        this.beanStars.setRating(this.data.roast_range);
      }

      if (this.hasCustomRatingRange() === false) {
        if (this.beanRating && this.beanRating?.setRating) {
          this.beanRating.setRating(this.data.rating);
        }
      }
    }, 150);
  }
  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
    this.maxBeanRating = this.settings.bean_rating;
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BeansDetailComponent.COMPONENT_ID
    );
  }
  public getRoastEnum(_key: ROASTS_ENUM) {
    for (const key in ROASTS_ENUM) {
      if (ROASTS_ENUM[key] === _key) {
        return key as ROASTS_ENUM;
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
    return moment(new Date())
      .startOf('day')
      .seconds(this.data.bean_roast_information.roast_length)
      .format('HH:mm:ss');
  }
  public hasCustomRatingRange(): boolean {
    if (this.settings) {
      if (this.settings.bean_rating !== 5) {
        return true;
      } else if (this.settings.bean_rating_steps !== 1) {
        return true;
      }
    }
    return false;
  }
}
