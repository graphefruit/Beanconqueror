import {ServerBean} from '../../models/bean/serverBean';
import {Bean} from '../../classes/bean/bean';
import {BEAN_MIX_ENUM} from '../../enums/beans/mix';
import {BEAN_ROASTING_TYPE_ENUM} from '../../enums/beans/beanRoastingType';
import {IBeanInformation} from '../../interfaces/bean/iBeanInformation';
import {UIFileHelper} from '../../services/uiFileHelper';

export class BeanMapper {

  constructor() {

  }

  public mapServerToClientBean(_serverResponse: ServerBean) {
    const newBean: Bean = new Bean();
    newBean.name = _serverResponse.name;
    newBean.aromatics = _serverResponse.aromatics;
    newBean.weight = _serverResponse.weight;
    newBean.qr_code = _serverResponse.qrCodeId;
    newBean.cost = _serverResponse.cost;
    newBean.cupping_points = _serverResponse.cuppingPoints + '';
    newBean.decaffeinated = _serverResponse.decaffeinated;
    newBean.ean_article_number = _serverResponse.eanArticleNumber;
    newBean.note = _serverResponse.note;
    newBean.roastingDate = _serverResponse.roastingDate;
    newBean.roast_range = _serverResponse.roastRange;
    newBean.url = _serverResponse.url;

    switch (_serverResponse.beanMix) {
      case 0:
        newBean.beanMix = BEAN_MIX_ENUM.UNKNOWN;
        break;
      case 1:
        newBean.beanMix = BEAN_MIX_ENUM.SINGLE_ORIGIN;
        break;
      case 2:
        newBean.beanMix = BEAN_MIX_ENUM.BLEND;
        break;
    }

    switch (_serverResponse.roastingType) {
      case 0:
        newBean.bean_roasting_type = BEAN_ROASTING_TYPE_ENUM.UNKNOWN;
        break;
      case 1:
        newBean.bean_roasting_type = BEAN_ROASTING_TYPE_ENUM.FILTER;
        break;
      case 2:
        newBean.bean_roasting_type = BEAN_ROASTING_TYPE_ENUM.ESPRESSO;
        break;
      case 3:
        newBean.bean_roasting_type = BEAN_ROASTING_TYPE_ENUM.OMNI;
        break;
    }


    for (const information of _serverResponse.beanInformation) {
      const iInformation = {} as IBeanInformation;
      iInformation.certification =information.certification;
      iInformation.country = information.country;
      iInformation.elevation = information.elevation;
      iInformation.farm = information.farm;
      iInformation.farmer = information.farmer;
      iInformation.harvest_time = information.harvestTime;
      iInformation.percentage = information.percentage;
      iInformation.processing = information.processing;
      iInformation.region = information.region;
      iInformation.variety = information.variety;
      newBean.bean_information.push(iInformation);
    }
/*
    const uiFileHelper: UIFileHelper = new UIFileHelper();
    for (const attachment of _serverResponse.attachments) {

      const entry = await this.uiFileHelper.downloadExternalFile('https://maxbean.de/wp-content/uploads/2020/08/maxspecial.png',undefined,'.png');
      console.log(entry);

    }*/


  }
}
