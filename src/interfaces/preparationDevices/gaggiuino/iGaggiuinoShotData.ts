import { BrewFlow } from '../../../classes/brew/brewFlow';

export interface IGaggiuinoShotData {
  id: number;
  timestamp: number;
  profileName: string;
  brewFlow: BrewFlow;
  rawData: any;
}
