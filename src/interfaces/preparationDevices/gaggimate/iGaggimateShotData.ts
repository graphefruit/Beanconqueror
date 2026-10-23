import { BrewFlow } from '../../../classes/brew/brewFlow';

export interface IGaggimateShotData {
  id: number;
  profile: string;
  profileId: string;
  timestamp: number;
  duration: number;
  volume: number;
  rating: number;
  incomplete: boolean;
  avgTemp: number;
  targetTemp: number;
  maxPressure: number;
  avgFlow: number;
  notes: any;
  brewFlow: BrewFlow;
}
