import { Component, Input, OnInit } from '@angular/core';
import { GreenBean } from '../../../../classes/green-bean/green-bean';
import { IGreenBean } from '../../../../interfaces/green-bean/iGreenBean';
import { ModalController, NavParams } from '@ionic/angular';
import { UIGreenBeanStorage } from '../../../../services/uiGreenBeanStorage';
import { UIImage } from '../../../../services/uiImage';
import { UIHelper } from '../../../../services/uiHelper';
import { Bean } from '../../../../classes/bean/bean';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';
import { BEAN_ACTION } from '../../../../enums/beans/beanAction';
import GREEN_BEAN_TRACKING from '../../../../data/tracking/greenBeanTracking';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { Settings } from '../../../../classes/settings/settings';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';

@Component({
  selector: 'app-green-bean-detail',
  templateUrl: './green-bean-detail.component.html',
  styleUrls: ['./green-bean-detail.component.scss'],
})
export class GreenBeanDetailComponent implements OnInit {
  public static COMPONENT_ID: string = 'green-bean-detail';
  public data: GreenBean = new GreenBean();
  @Input() public greenBean: IGreenBean;
  public visibleIndex: any = {};

  public bean_segment = 'general';

  public linkedRoasts: Array<Bean> = [];

  public settings: Settings;
  constructor(
    private readonly modalController: ModalController,
    private readonly navParams: NavParams,
    private readonly uiGreenBeanStorage: UIGreenBeanStorage,
    private readonly uiImage: UIImage,
    private readonly uiHelper: UIHelper,
    private uiBeanHelper: UIBeanHelper,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiSettings: UISettingsStorage
  ) {
    this.settings = this.uiSettings.getSettings();
  }

  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent(
      GREEN_BEAN_TRACKING.TITLE,
      GREEN_BEAN_TRACKING.ACTIONS.DETAIL
    );
    this.data = new GreenBean();
    this.data.initializeByObject(this.greenBean);
    // Add one empty bean information, rest is being updated on start
    this.loadRelatedRoastedBeans();
  }

  private loadRelatedRoastedBeans() {
    this.linkedRoasts = this.getRelatedRoastedBeans();
  }
  private getRelatedRoastedBeans(): Array<Bean> {
    return this.uiBeanHelper.getAllRoastedBeansForThisGreenBean(
      this.greenBean.config.uuid
    );
  }
  public async beanAction(action: BEAN_ACTION, bean: Bean): Promise<void> {
    this.loadRelatedRoastedBeans();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      GreenBeanDetailComponent.COMPONENT_ID
    );
  }

  public ngOnInit() {}
}
