import { IGaggimateShotData } from '../../../interfaces/preparationDevices/gaggimate/iGaggimateShotData';
import { BrewFlow } from '../../brew/brewFlow';

export class GaggimateShotData implements IGaggimateShotData {
  public id: number;
  public profile: string;
  public profileId: string;
  public timestamp: number;
  public duration: number;
  public volume: number;
  public rating: number;
  public incomplete: boolean;
  public avgTemp: number;
  public maxPressure: number;
  public avgFlow: number;
  public notes: any;
  public brewFlow: BrewFlow;

  constructor() {
    this.id = 0;
    this.profile = '';
    this.profileId = '';
    this.timestamp = 0;
    this.duration = 0;
    this.volume = 0;
    this.rating = 0;
    this.incomplete = false;
    this.avgTemp = 0;
    this.maxPressure = 0;
    this.avgFlow = 0;
    this.notes = {};
    this.brewFlow = new BrewFlow();
  }
}
