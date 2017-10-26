/**Interfaces**/
import {ISettings} from "../../interfaces/settings/iSettings";
/**Classes**/
import {Config} from "../objectConfig/objectConfig";
/**Enums**/
import {BREW_VIEW_ENUM} from '../../enums/settings/brewView';
export class Settings implements ISettings {
  public brew_view:BREW_VIEW_ENUM;
  public time: boolean;
  public grind_size: boolean;
  public weight: boolean;
  public method_of_preparation: boolean;
  public water_flow: boolean;
  public bean_type: boolean;
  public brew_temperature: boolean;
  public note: boolean;
  public attachments:boolean;
  public rating:boolean;
  public config: Config;


  public initializeByObject(brewObj: ISettings) {
    Object.assign(this, brewObj)
  }

  constructor() {
    this.brew_view = BREW_VIEW_ENUM.SINGLE_PAGE;
    this.time = true;
    this.grind_size = true;
    this.weight = true;
    this.method_of_preparation = true;
    this.water_flow = true;
    this.bean_type = true;
    this.brew_temperature = true;
    this.note = true;
    this.attachments= true;
    this.rating= true;
    this.config = new Config();
  }


}
