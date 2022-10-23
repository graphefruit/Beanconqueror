import { Component, Input, OnInit } from '@angular/core';
import { Bean } from '../../../classes/bean/bean';
import { ModalController, NavParams, Platform } from '@ionic/angular';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIImage } from '../../../services/uiImage';
import { UIHelper } from '../../../services/uiHelper';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIToast } from '../../../services/uiToast';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIAlert } from '../../../services/uiAlert';
import BEAN_TRACKING from '../../../data/tracking/beanTracking';
import { BREW_ACTION } from '../../../enums/brews/brewAction';
import { Brew } from '../../../classes/brew/brew';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBrewHelper } from '../../../services/uiBrewHelper';

@Component({
  selector: 'app-bean-associated-brews',
  templateUrl: './bean-associated-brews.component.html',
  styleUrls: ['./bean-associated-brews.component.scss'],
})
export class BeanAssociatedBrewsComponent implements OnInit {
  public static COMPONENT_ID = 'bean-associated-brews';
  public data: Bean = new Bean();
  @Input() private readonly bean: Bean;

  public beanBrews: Array<Brew> = [];
  constructor(
    private readonly modalController: ModalController,
    private readonly navParams: NavParams,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiImage: UIImage,
    private readonly uiHelper: UIHelper,
    private readonly uiFileHelper: UIFileHelper,
    private readonly uiToast: UIToast,
    private readonly uiAnalytics: UIAnalytics
  ) {}

  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.SHOW_BREWS
    );

    this.loadBrews();
  }

  public loadBrews() {
    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(
      this.bean.config.uuid
    );

    this.beanBrews = UIBrewHelper.sortBrews(relatedBrews);
  }

  public async brewAction(action: BREW_ACTION, brew: Brew): Promise<void> {
    this.loadBrews();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BeanAssociatedBrewsComponent.COMPONENT_ID
    );
  }

  public ngOnInit() {}
}
