import {Component, Input, OnInit} from '@angular/core';
import {Bean} from '../../../classes/bean/bean';
import {ROASTS_ENUM} from '../../../enums/beans/roasts';
import {BEAN_MIX_ENUM} from '../../../enums/beans/mix';
import {IBean} from '../../../interfaces/bean/iBean';
import {ModalController, NavParams} from '@ionic/angular';
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {UIImage} from '../../../services/uiImage';
import {UIHelper} from '../../../services/uiHelper';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {Brew} from '../../../classes/brew/brew';

@Component({
  selector: 'beans-information',
  templateUrl: './beans-information.component.html',
  styleUrls: ['./beans-information.component.scss'],
})
export class BeansInformationComponent implements OnInit {

  public data: Bean = new Bean();
  public roastsEnum = ROASTS_ENUM;
  public mixEnum = BEAN_MIX_ENUM;
  @Input() private bean: IBean;

  constructor(private readonly navParams: NavParams,
              private readonly modalController: ModalController,
              private readonly uiBeanStorage: UIBeanStorage,
              private readonly uiImage: UIImage,
              private readonly uiHelper: UIHelper,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiBrewStorage: UIBrewStorage) {
    this.data.roastingDate = new Date().toISOString();
  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent('BEAN', 'INFORMATION');
    //  this.bean = this.navParams.get('BEAN');
    this.data.initializeByObject(this.bean);
  }

  public countGoodBrews() {
    let counter: number = 0;
    const brews: Array<Brew> = this.__getAllBrewsForThisBean();
    for (const brew of brews) {
      if (brew.isGoodBrew()) {
        counter++;
      }
    }

    return counter;
  }

  public countBadBrews() {
    let counter: number = 0;
    const brews: Array<Brew> = this.__getAllBrewsForThisBean();
    for (const brew of brews) {
      if (brew.isBadBrew()) {
        counter++;
      }
    }

    return counter;
  }

  public countBrews() {
    let counter: number = 0;
    const brews: Array<Brew> = this.__getAllBrewsForThisBean();
    for (const brew of brews) {
      counter++;
    }

    return counter;
  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    });
  }

  public ngOnInit() {
  }

  private __getAllBrewsForThisBean(): Array<Brew> {
    const brewsForThisBean: Array<Brew> = [];
    const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
    const beanUUID: string = this.data.config.uuid;
    for (const brew of brews) {
      if (brew.bean === beanUUID) {
        brewsForThisBean.push(brew);
      }
    }
    return brewsForThisBean;
  }

}
