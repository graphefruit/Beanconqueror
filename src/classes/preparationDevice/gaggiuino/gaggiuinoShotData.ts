import { IGaggiuinoShotData } from '../../../interfaces/preparationDevices/gaggiuino/iGaggiuinoShotData';
import { BrewFlow } from '../../brew/brewFlow';

export class GaggiuinoShotData implements IGaggiuinoShotData {
  public id: number;
  public timestamp: number;
  public profileName: string;
  public brewFlow: BrewFlow;
  public rawData: any;
  constructor() {
    this.id = 0;
    this.timestamp = 0;
    this.profileName = '';
    this.brewFlow = new BrewFlow();
    this.rawData = undefined;
  }
}
