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
import { BeanProto } from '../../generated/src/classes/bean/bean';
import { Config } from '../../classes/objectConfig/objectConfig';

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
    console.log(protoBean);

    /*  protoBean.name = _bean.name;
    if (_bean.roastingDate) {
      protoBean.roastingDate = _bean.roastingDate;
    }
    if (_bean.note) {
      protoBean.note = _bean.note;
    }
    if (_bean.roaster) {
      protoBean.roaster = _bean.roaster;
    }
    if (_bean.roast) {
      protoBean.roast = _bean.roast;
    }
    if (_bean.beanMix) {
      protoBean.beanMix = _bean.beanMix;
    }
    if (_bean.buyDate) {
      protoBean.buyDate = _bean.buyDate;
    }
    if (_bean.roast_custom) {
      protoBean.roast_custom = _bean.roast_custom;
    }
    if (_bean.aromatics) {
      protoBean.aromatics = _bean.aromatics;
    }
    if (_bean.weight) {
      protoBean.weight = _bean.weight;
    }
    if (_bean.finished) {
      protoBean.finished = _bean.finished;
    }
    if (_bean.cost) {
      protoBean.cost = _bean.cost;
    }
    if (_bean.bean_roasting_type) {
      protoBean.bean_roasting_type = _bean.bean_roasting_type;
    }
    if (_bean.decaffeinated) {
      protoBean.decaffeinated = _bean.decaffeinated;
    }
    if (_bean.url) {
      protoBean.url = _bean.url;
    }
    if (_bean.url) {
      protoBean.url = _bean.url;
    }
    if (_bean.ean_article_number) {
      protoBean.ean_article_number = _bean.ean_article_number;
    }
    if (_bean.bean_information) {
      protoBean.bean_information = [];

      for (const info of _bean.bean_information) {
        const beanInformation: any= {};
        if (info.country){
          beanInformation.country = info.country;
        }
        if (info.region){
          beanInformation.region = info.region;
        }
        if (info.farm){
          beanInformation.farm = info.farm;
        }
        if (info.farmer){
          beanInformation.farmer = info.farmer;
        }
        if (info.elevation){
          beanInformation.elevation = info.elevation;
        }
        if (info.harvest_time){
          beanInformation.harvest_time = info.harvest_time;
        }
        if (info.variety){
          beanInformation.variety = info.variety;
        }
        if (info.processing){
          beanInformation.processing = info.processing;
        }
        if (info.certification){
          beanInformation.certification = info.certification;
        }
        if (info.percentage){
          beanInformation.percentage = info.percentage;
        }
        if (info.purchasing_price){
          beanInformation.purchasingPrice = info.purchasing_price;
        }

        if (info.fob_price){
          beanInformation.fob_price = info.fob_price;
        }
        protoBean.beanInformation.push(beanInformation);
      }

    }

    if (_bean.cupping_points) {
      protoBean.cupping_points = _bean.cupping_points;
    }
    if (_bean.roast_range) {
      protoBean.roast_range = _bean.roast_range;
    }
    if (_bean.qr_code) {
      protoBean.qr_code = _bean.qr_code;
    }

*/

    const bytes = BeanProto.encode(protoBean).finish();

    const base64String = this.uiHelper.encode(bytes); //btoa(String.fromCharCode(...new Uint8Array(bytes)));

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
    //await this.socialShare.share(beanMessage,null,null,null);

    //decode

    /** const stringifyBean = JSURL.stringify(_bean);
     const compressedBean = LZString.compressToEncodedURIComponent(stringifyBean);


     const loops = Math.ceil(compressedBean.length / 400);

     let jsonParams = '';
     for (let i=0;i<loops;i++) {
        if (jsonParams === '') {
          jsonParams = 'shareUserBean'+ i + '=' + compressedBean.substr(0,400);
        }
        else {
          jsonParams += '&shareUserBean'+ i + '=' + compressedBean.substr(i*400,400);
        }
      }



     const beanMessage: string = 'https://beanconqueror.com?' + jsonParams;
     this.uiLog.debug(beanMessage);
     this.uiAnalytics.trackEvent(BEAN_TRACKING.TITLE, BEAN_TRACKING.ACTIONS.SHARE);
     await this.socialShare.share(beanMessage,null,null,null);
     }
     catch (ex) {

    }**/
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
