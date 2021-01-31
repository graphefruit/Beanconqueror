import {IBeanRoastInformation} from '../../interfaces/bean/iBeanRoastInformation';


export class BeanRoastInformation implements IBeanRoastInformation {

  public drop_temperature: number;
  public roast_length: number;
  public roaster_machine: string;
  public green_bean_weight:number;
  public outside_temperature:number;
  public humidity:number;
  public bean_uuid: string;

  constructor() {
    this.drop_temperature = 0;
    this.roast_length = 0;
    this.roaster_machine = '';
    this.green_bean_weight = 0;
    this.outside_temperature = 0;
    this.humidity= 0;
    this.bean_uuid = '';
  }

  public initializeByObject(beanObj: IBeanRoastInformation): void {
    Object.assign(this, beanObj);
  }

}
