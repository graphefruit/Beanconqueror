import {ServerBean} from '../../models/bean/serverBean';
import {Bean} from '../../classes/bean/bean';
import {BEAN_MIX_ENUM} from '../../enums/beans/mix';
import {BEAN_ROASTING_TYPE_ENUM} from '../../enums/beans/beanRoastingType';
import {IBeanInformation} from '../../interfaces/bean/iBeanInformation';
import {UIFileHelper} from '../../services/uiFileHelper';
import {IAttachment} from '../../interfaces/server/iAttachment';
import {ROASTS_ENUM} from '../../enums/beans/roasts';

export class BeanMapper {

  constructor() {

  }

  public async mapServerToClientBean(_serverResponse: ServerBean): Promise<Bean> {
    return new Promise<Bean>(async (resolve, reject) => {
      try {
        const newBean: Bean = new Bean();
        newBean.name = _serverResponse.name;
        newBean.roaster = _serverResponse.roaster;
        newBean.roast_range = _serverResponse.roast_range;
        newBean.aromatics = _serverResponse.aromatics;
        newBean.weight = _serverResponse.weight;
        newBean.qr_code = _serverResponse.qr_code;
        newBean.cost = _serverResponse.cost;
        newBean.cupping_points = _serverResponse.cupping_points + '';
        newBean.decaffeinated = _serverResponse.decaffeinated;
        newBean.ean_article_number = _serverResponse.ean_article_number;
        newBean.note = _serverResponse.note;
        newBean.roastingDate = _serverResponse.roastingDate;
        newBean.url = _serverResponse.url;

        switch (_serverResponse.beanMix) {
          case 0:
            newBean.beanMix = 'UNKNOWN' as BEAN_MIX_ENUM;
            break;
          case 1:
            newBean.beanMix = 'SINGLE_ORIGIN' as BEAN_MIX_ENUM;
            break;
          case 2:
            newBean.beanMix = 'BLEND' as BEAN_MIX_ENUM;
            break;
        }

        switch (_serverResponse.roast) {
          case 0:
            newBean.roast = 'UNKNOWN' as ROASTS_ENUM;
            break;
          case 1:
            newBean.roast = 'CINNAMON_ROAST' as ROASTS_ENUM;
            break;
          case 2:
            newBean.roast = 'AMERICAN_ROAST' as ROASTS_ENUM;
            break;
          case 3:
            newBean.roast = 'NEW_ENGLAND_ROAST' as ROASTS_ENUM;
            break;
          case 4:
            newBean.roast = 'HALF_CITY_ROAST' as ROASTS_ENUM;
            break;
          case 5:
            newBean.roast = 'MODERATE_LIGHT_ROAST' as ROASTS_ENUM;
            break;
          case 6:
            newBean.roast = 'CITY_ROAST' as ROASTS_ENUM;
            break;
          case 7:
            newBean.roast = 'CITY_PLUS_ROAST' as ROASTS_ENUM;
            break;
          case 8:
            newBean.roast = 'FULL_CITY_ROAST' as ROASTS_ENUM;
            break;
          case 9:
            newBean.roast = 'FULL_CITY_PLUS_ROAST' as ROASTS_ENUM;
            break;
          case 10:
            newBean.roast = 'ITALIAN_ROAST' as ROASTS_ENUM;
            break;
          case 11:
            newBean.roast = 'VIEANNA_ROAST' as ROASTS_ENUM;
            break;
          case 12:
            newBean.roast = 'FRENCH_ROAST' as ROASTS_ENUM;
            break;
          case 13:
            newBean.roast = 'CUSTOM_ROAST' as ROASTS_ENUM;
            newBean.roast_custom = _serverResponse.roast_custom;
            break;

        }



        switch (_serverResponse.bean_roasting_type) {
          case 0:
            newBean.bean_roasting_type = 'FILTER' as BEAN_ROASTING_TYPE_ENUM;

            break;
          case 1:
            newBean.bean_roasting_type = 'ESPRESSO' as BEAN_ROASTING_TYPE_ENUM;
            break;
          case 2:
            newBean.bean_roasting_type = 'OMNI' as BEAN_ROASTING_TYPE_ENUM;
            break;
          case 3:
            newBean.bean_roasting_type = 'UNKNOWN' as BEAN_ROASTING_TYPE_ENUM;
            break;
        }


        for (const information of _serverResponse.bean_information) {
          const iInformation = {} as IBeanInformation;
          iInformation.certification = information.certification;
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

        resolve(newBean);

      }
      catch(ex) {
        resolve(null);
      }

    });
  }

  public async downloadAndAttachAttachments(_bean: Bean, attachments: Array<IAttachment>) {
    try {
      const uiFileHelper: UIFileHelper = UIFileHelper.getInstance();
      for (const attachment of attachments) {

        const entry: string = await uiFileHelper.downloadExternalFile(attachment.uri, undefined, attachment.extension);
        _bean.attachments.push(entry);

      }
    }
    catch(ex) {

    }
  }
}
