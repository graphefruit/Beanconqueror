import { Component, inject, Input, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonBadge,
  IonButton,
  IonCard,
  IonCheckbox,
  IonCol,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonRange,
  IonRow,
  IonSegment,
  IonSegmentButton,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { create, globeOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';
import moment from 'moment';
import { NgxStarsComponent, NgxStarsModule } from 'ngx-stars';

import { Bean } from '../../../classes/bean/bean';
import { Settings } from '../../../classes/settings/settings';
import { BeanDetailSortInformationComponent } from '../../../components/beans/detail/bean-detail-sort-information/bean-detail-sort-information.component';
import { HeaderButtonComponent } from '../../../components/header/header-button.component';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { PhotoViewComponent } from '../../../components/photo-view/photo-view.component';
import BEAN_TRACKING from '../../../data/tracking/beanTracking';
import { BEAN_ROASTING_TYPE_ENUM } from '../../../enums/beans/beanRoastingType';
import { BEAN_MIX_ENUM } from '../../../enums/beans/mix';
import { ROASTS_ENUM } from '../../../enums/beans/roasts';
import { IBean } from '../../../interfaces/bean/iBean';
import { BeanFieldVisiblePipe } from '../../../pipes/bean/beanFieldVisible';
import { FormatDatePipe } from '../../../pipes/formatDate';
import { ToFixedPipe } from '../../../pipes/toFixed';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'app-beans-detail',
  templateUrl: './beans-detail.component.html',
  styleUrls: ['./beans-detail.component.scss'],
  imports: [
    FormsModule,
    NgxStarsModule,
    PhotoViewComponent,
    BeanDetailSortInformationComponent,
    TranslatePipe,
    FormatDatePipe,
    ToFixedPipe,
    BeanFieldVisiblePipe,
    HeaderComponent,
    HeaderDismissButtonComponent,
    HeaderButtonComponent,
    IonHeader,
    IonButton,
    IonIcon,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonItem,
    IonRange,
    IonBadge,
    IonCheckbox,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class BeansDetailComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  uiHelper = inject(UIHelper);
  private readonly uiAnalytics = inject(UIAnalytics);
  readonly uiBeanHelper = inject(UIBeanHelper);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiBeanStorage = inject(UIBeanStorage);

  public static readonly COMPONENT_ID: string = 'bean-detail';
  public roast_enum = ROASTS_ENUM;
  public mixEnum = BEAN_MIX_ENUM;
  public beanRoastingTypeEnum = BEAN_ROASTING_TYPE_ENUM;
  public data: Bean = new Bean();
  public visibleIndex: any = {};
  @ViewChild('beanStars', { read: NgxStarsComponent, static: false })
  public beanStars: NgxStarsComponent;
  @ViewChild('beanRating', { read: NgxStarsComponent, static: false })
  public beanRating: NgxStarsComponent;

  public settings: Settings = undefined;
  public bean_segment = 'general';
  public maxBeanRating: number = 5;

  @Input('bean') public bean: IBean;

  constructor() {
    addIcons({ create, globeOutline });
  }

  public ionViewDidEnter() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.DETAIL,
    );

    this.loadBean();
  }

  public loadBean() {
    if (this.bean) {
      const copy: IBean = this.uiHelper.copyData(this.bean);
      this.data.initializeByObject(copy);
    }
    setTimeout(() => {
      if (this.beanStars?.setRating) {
        this.beanStars.setRating(this.data.roast_range);
      }

      if (this.hasCustomRatingRange() === false) {
        if (this.beanRating?.setRating) {
          this.beanRating.setRating(this.data.rating);
        }
      }
    }, 150);
  }
  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
    this.maxBeanRating = this.settings.bean_rating;
  }

  public async edit() {
    await this.uiBeanHelper.editBean(this.data);

    this.bean = this.uiBeanStorage.getByUUID(this.data.config.uuid);
    this.loadBean();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BeansDetailComponent.COMPONENT_ID,
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
    return (
      this.settings?.bean_rating !== 5 || this.settings.bean_rating_steps !== 1
    );
  }
}
