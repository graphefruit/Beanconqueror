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
        if ( _serverResponse.roastingDate !== null &&  _serverResponse.roastingDate !== ''){
          newBean.roastingDate = _serverResponse.roastingDate;
        }
        newBean.url = _serverResponse.url;

        newBean.beanMix = {
          0: 'UNKNOWN' as BEAN_MIX_ENUM,
          1: 'SINGLE_ORIGIN' as BEAN_MIX_ENUM,
          2: 'BLEND' as BEAN_MIX_ENUM,
        }[_serverResponse.beanMix];


        newBean.roast = {
          0:'UNKNOWN' as ROASTS_ENUM,
          1: 'CINNAMON_ROAST' as ROASTS_ENUM,
          2: 'AMERICAN_ROAST' as ROASTS_ENUM,
          3: 'NEW_ENGLAND_ROAST' as ROASTS_ENUM,
          4: 'HALF_CITY_ROAST' as ROASTS_ENUM,
          5: 'MODERATE_LIGHT_ROAST' as ROASTS_ENUM,
          6: 'CITY_ROAST' as ROASTS_ENUM,
          7: 'CITY_PLUS_ROAST' as ROASTS_ENUM,
          8: 'FULL_CITY_ROAST' as ROASTS_ENUM,
          9: 'FULL_CITY_PLUS_ROAST' as ROASTS_ENUM,
          10: 'ITALIAN_ROAST' as ROASTS_ENUM,
          11: 'VIEANNA_ROAST' as ROASTS_ENUM,
          12: 'FRENCH_ROAST' as ROASTS_ENUM,
          13: 'CUSTOM_ROAST' as ROASTS_ENUM,
        }[_serverResponse.roast];

        if (newBean.roast === ROASTS_ENUM.CUSTOM_ROAST) {
          newBean.roast_custom = _serverResponse.roast_custom;
        }


        newBean.bean_roasting_type = {
          0: 'FILTER' as BEAN_ROASTING_TYPE_ENUM,
          1: 'ESPRESSO' as BEAN_ROASTING_TYPE_ENUM,
          2: 'OMNI' as BEAN_ROASTING_TYPE_ENUM,
          3: 'UNKNOWN' as BEAN_ROASTING_TYPE_ENUM,
        }[_serverResponse.bean_roasting_type];

        for (const information of _serverResponse.bean_information) {
          const iInformation = {} as IBeanInformation;
          iInformation.certification = information.certification;
          iInformation.country = information.country;
          iInformation.elevation = information.elevation;
          iInformation.farm = information.farm;
          iInformation.farmer = information.farmer;
          iInformation.harvest_time = information.harvest_time;
          iInformation.percentage = information.percentage;
          iInformation.processing = information.processing;
          iInformation.region = information.region;
          iInformation.variety = information.variety;
          iInformation.purchasing_price = information.purchasing_price;
          iInformation.fob_price = information.fob_price;
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
