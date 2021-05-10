import {Injectable} from '@angular/core';
import {SocialSharing} from '@ionic-native/social-sharing/ngx';
import {Bean} from '../../classes/bean/bean';
import {TranslateService} from '@ngx-translate/core';
import {UIHelper} from '../uiHelper';
import {Brew} from '../../classes/brew/brew';
import {UIAnalytics} from '../uiAnalytics';
import BREW_TRACKING from '../../data/tracking/brewTracking';
import BEAN_TRACKING from '../../data/tracking/beanTracking';

@Injectable({
  providedIn: 'root'
})
export class ShareService {

  constructor(private readonly socialShare: SocialSharing,
              private readonly translate: TranslateService,
              private readonly uiHelper: UIHelper,
              private readonly uiAnalytics: UIAnalytics) {

  }


  private generateBeanMessage(_bean: Bean) {
    let message: string = '';
    message += `${this.translate.instant('BEAN_DATA_NAME')}: ${_bean.name}\n`;
    message += `${this.translate.instant('BEAN_DATA_ROASTER')}: ${_bean.roaster}\n`;
    message += `${this.translate.instant('BEAN_DATA_ROASTING_DATE')}: ${this.uiHelper.formateDatestr(_bean.roastingDate,'DD.MM.YYYY')}\n`;
    message += `${this.translate.instant('BEAN_DATA_WEIGHT')}: ${_bean.weight}\n`;
    message += `${this.translate.instant('BEAN_DATA_COST')}: ${_bean.cost}\n`;
    message += `${this.translate.instant('BEAN_DATA_AROMATICS')}: ${_bean.aromatics}\n`;

    if (_bean.url) {
      message += `${this.translate.instant('BEAN_DATA_URL')}: ${_bean.url}\n`;
    }
    return message;
  }

  private generateBrewMessage(_brew: Brew) {
    let message: string = '';
    message += `${this.translate.instant('BREW_DATA_BEAN_TYPE')}: ${_brew.getBean().name}\n`;
    message += `${this.translate.instant('BREW_DATA_PREPARATION_METHOD')}: ${_brew.getPreparation().name}\n`;
    message += `${this.translate.instant('BREW_DATA_MILL')}: ${_brew.getMill().name}\n`;

    if (_brew.grind_size) {
      message += `${this.translate.instant('BREW_DATA_GRIND_SIZE')}: ${_brew.grind_size}\n`;
    }

    if (_brew.grind_weight > 0) {
      message += `${this.translate.instant('BREW_DATA_GRIND_WEIGHT')}: ${_brew.grind_weight}\n`;
    }


    if (_brew.brew_temperature > 0) {
      message += `${this.translate.instant('BREW_DATA_BREW_TEMPERATURE')}: ${_brew.brew_temperature}\n`;
    }

    if (_brew.getCalculatedBeanAge()>-1) {
      message += `${this.translate.instant('BREW_INFORMATION_BEAN_AGE')}: ${_brew.getCalculatedBeanAge()}\n`;
    }

    if (_brew.brew_quantity > 0) {
      message += `${this.translate.instant('BREW_DATA_BREW_QUANTITY')}: ${_brew.brew_quantity}\n`;
    }
    if (_brew.brew_beverage_quantity > 0) {
      message += `${this.translate.instant('BREW_DATA_BREW_BEVERAGE_QUANTITY')}: ${_brew.brew_beverage_quantity}\n`;
    }
    if (_brew.coffee_blooming_time > 0) {
      message += `${this.translate.instant('BREW_DATA_COFFEE_BLOOMING_TIME')}: ${_brew.coffee_blooming_time}\n`;
    }
    if (_brew.coffee_first_drip_time > 0) {
      message += `${this.translate.instant('BREW_DATA_COFFEE_FIRST_DRIP_TIME')}: ${_brew.coffee_first_drip_time}\n`;
    }
    if (_brew.brew_time > 0) {
      message += `${this.translate.instant('BREW_DATA_CALCULATED_COFFEE_BREW_TIME')}: ${_brew.getFormattedCoffeeBrewTime()}\n`;
    }

    if (_brew.note) {
      message += `${this.translate.instant('BREW_DATA_NOTES')}: ${_brew.note}\n`;
    }

    return message;
  }

  public async shareBean(_bean: Bean) {
    try {
      const beanMessage: string = this.generateBeanMessage(_bean);
      this.uiAnalytics.trackEvent(BEAN_TRACKING.TITLE, BEAN_TRACKING.ACTIONS.SHARE);
      await this.socialShare.share(beanMessage,null,null,null);
    }
    catch (ex) {

    }
  }


  public async shareBrew(_brew: Brew) {
    try {
      const brewMessage: string = this.generateBrewMessage(_brew);
      this.uiAnalytics.trackEvent(BREW_TRACKING.TITLE, BREW_TRACKING.ACTIONS.SHARE);
      await this.socialShare.share(brewMessage,null,null,null)
    }
    catch (ex) {

    }

  }

}
