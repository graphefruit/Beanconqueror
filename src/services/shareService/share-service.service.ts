import { Injectable } from '@angular/core';
import { SocialSharing } from '@ionic-native/social-sharing/ngx';
import { Bean } from '../../classes/bean/bean';

import { TranslateService } from '@ngx-translate/core';
import { UIHelper } from '../uiHelper';
import { Brew } from '../../classes/brew/brew';
import { UIAnalytics } from '../uiAnalytics';
import BREW_TRACKING from '../../data/tracking/brewTracking';
import BEAN_TRACKING from '../../data/tracking/beanTracking';

import { UILog } from '../uiLog';
import {
  BeanMix,
  BeanProto,
  BeanRoastingType,
  Roast,
} from '../../generated/src/classes/bean/bean';
import { Config } from '../../classes/objectConfig/objectConfig';
import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { ROASTS_ENUM } from '../../enums/beans/roasts';
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';

@Injectable({
  providedIn: 'root',
})
export class ShareService {
  constructor(
    private readonly socialShare: SocialSharing,
    private readonly translate: TranslateService,
    private readonly uiHelper: UIHelper,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiLog: UILog
  ) {}

  public async shareBean(_bean: Bean) {
    // try {

    const protoBean: any = BeanProto.fromJSON(_bean);
    protoBean.config = new Config();
    protoBean.attachments = [];
    protoBean.favourite = false;
    protoBean.rating = 0;
    protoBean.archived = false;

    if (_bean.bean_roasting_type === ('UNKNOWN' as BEAN_ROASTING_TYPE_ENUM)) {
      protoBean.bean_roasting_type =
        BeanRoastingType.UNKNOWN_BEAN_ROASTING_TYPE;
    }
    if (_bean.roast === ('UNKNOWN' as ROASTS_ENUM)) {
      protoBean.roast = Roast.UNKNOWN_ROAST;
    }

    if (_bean.beanMix === ('UNKNOWN' as BEAN_MIX_ENUM)) {
      protoBean.beanMix = BeanMix.UNKNOWN_BEAN_MIX;
    }
    const bytes = BeanProto.encode(protoBean).finish();

    const base64String = this.uiHelper.encode(bytes);

    const loops = Math.ceil(base64String.length / 400);

    let jsonParams = '';
    for (let i = 0; i < loops; i++) {
      if (jsonParams === '') {
        jsonParams = 'shareUserBean' + i + '=' + base64String.substr(0, 400);
      } else {
        jsonParams +=
          '&shareUserBean' + i + '=' + base64String.substr(i * 400, 400);
      }
    }

    const beanMessage: string = 'https://beanconqueror.com?' + jsonParams;
    this.uiLog.debug(beanMessage);
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.SHARE
    );
    try {
      await this.socialShare.share(beanMessage, null, null, null);
    } catch (ex) {}
  }

  public async shareBrew(_brew: Brew) {
    try {
      const brewMessage: string = this.generateBrewMessage(_brew);
      this.uiAnalytics.trackEvent(
        BREW_TRACKING.TITLE,
        BREW_TRACKING.ACTIONS.SHARE
      );
      await this.socialShare.share(brewMessage, null, null, null);
    } catch (ex) {}
  }

  private generateBeanMessage(_bean: Bean) {
    let message: string = '';
    message += `${this.translate.instant('BEAN_DATA_NAME')}: ${_bean.name}\n`;
    message += `${this.translate.instant('BEAN_DATA_ROASTER')}: ${
      _bean.roaster
    }\n`;
    message += `${this.translate.instant(
      'BEAN_DATA_ROASTING_DATE'
    )}: ${this.uiHelper.formateDatestr(_bean.roastingDate, 'DD.MM.YYYY')}\n`;
    message += `${this.translate.instant('BEAN_DATA_WEIGHT')}: ${
      _bean.weight
    }\n`;
    message += `${this.translate.instant('BEAN_DATA_COST')}: ${_bean.cost}\n`;
    message += `${this.translate.instant('BEAN_DATA_AROMATICS')}: ${
      _bean.aromatics
    }\n`;

    if (_bean.url) {
      message += `${this.translate.instant('BEAN_DATA_URL')}: ${_bean.url}\n`;
    }
    return message;
  }

  private generateBrewMessage(_brew: Brew) {
    let message: string = '';
    message += `${this.translate.instant('BREW_DATA_BEAN_TYPE')}: ${
      _brew.getBean().name
    }\n`;
    message += `${this.translate.instant('BREW_DATA_PREPARATION_METHOD')}: ${
      _brew.getPreparation().name
    }\n`;
    message += `${this.translate.instant('BREW_DATA_MILL')}: ${
      _brew.getMill().name
    }\n`;

    if (_brew.grind_size) {
      message += `${this.translate.instant('BREW_DATA_GRIND_SIZE')}: ${
        _brew.grind_size
      }\n`;
    }

    if (_brew.grind_weight > 0) {
      message += `${this.translate.instant('BREW_DATA_GRIND_WEIGHT')}: ${
        _brew.grind_weight
      }\n`;
    }

    if (_brew.brew_temperature > 0) {
      message += `${this.translate.instant('BREW_DATA_BREW_TEMPERATURE')}: ${
        _brew.brew_temperature
      }\n`;
    }

    if (_brew.getCalculatedBeanAge() > -1) {
      message += `${this.translate.instant(
        'BREW_INFORMATION_BEAN_AGE'
      )}: ${_brew.getCalculatedBeanAge()}\n`;
    }

    if (_brew.brew_quantity > 0) {
      message += `${this.translate.instant('BREW_DATA_BREW_QUANTITY')}: ${
        _brew.brew_quantity
      }\n`;
    }
    if (_brew.brew_beverage_quantity > 0) {
      message += `${this.translate.instant(
        'BREW_DATA_BREW_BEVERAGE_QUANTITY'
      )}: ${_brew.brew_beverage_quantity}\n`;
    }
    if (_brew.coffee_blooming_time > 0) {
      message += `${this.translate.instant(
        'BREW_DATA_COFFEE_BLOOMING_TIME'
      )}: ${_brew.coffee_blooming_time}\n`;
    }
    if (_brew.coffee_first_drip_time > 0) {
      message += `${this.translate.instant(
        'BREW_DATA_COFFEE_FIRST_DRIP_TIME'
      )}: ${_brew.coffee_first_drip_time}\n`;
    }
    if (_brew.brew_time > 0) {
      message += `${this.translate.instant(
        'BREW_DATA_CALCULATED_COFFEE_BREW_TIME'
      )}: ${_brew.getFormattedCoffeeBrewTime()}\n`;
    }

    if (_brew.note) {
      message += `${this.translate.instant('BREW_DATA_NOTES')}: ${
        _brew.note
      }\n`;
    }

    return message;
  }
}
