import {ServerBean} from '../../models/bean/serverBean';
import {Bean} from '../../classes/bean/bean';
import {BEAN_MIX_ENUM} from '../../enums/beans/mix';
import {BEAN_ROASTING_TYPE_ENUM} from '../../enums/beans/beanRoastingType';
import {IBeanInformation} from '../../interfaces/bean/iBeanInformation';
import {UIFileHelper} from '../../services/uiFileHelper';
import {IAttachment} from '../../interfaces/server/iAttachment';

export class BeanMapper {

  constructor() {

  }

  public async mapServerToClientBean(_serverResponse: ServerBean): Promise<Bean> {
    return new Promise<Bean>(async (resolve, reject) => {
      try {
        const newBean: Bean = new Bean();
        newBean.name = _serverResponse.name;
        newBean.roaster = _serverResponse.roaster;

        newBean.aromatics = _serverResponse.aromatics;
        newBean.weight = _serverResponse.weight;
        newBean.qr_code = _serverResponse.qr_code;
        newBean.cost = _serverResponse.cost;
        newBean.cupping_points = _serverResponse.cupping_points + '';
        newBean.decaffeinated = _serverResponse.decaffeinated;
        newBean.ean_article_number = _serverResponse.ean_article_number;
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

        switch (_serverResponse.bean_roasting_type) {
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
